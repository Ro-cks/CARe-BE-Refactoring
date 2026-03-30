package com.care.domain.car.event;

import com.care.domain.car.repository.OwnedCarRepository;
import com.care.global.blockchain.CarNftService;
import com.care.global.ipfs.PinataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * 차량 등록 이벤트 리스너
 * 1) NFT 메타데이터 JSON → IPFS(Pinata) 업로드
 * 2) CarNFT.safeMint → tokenId 획득
 * 3) OwnedCar 상태 ACTIVE 업데이트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CarEventListener {

    private final CarNftService carNftService;
    private final PinataService pinataService;
    private final OwnedCarRepository ownedCarRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCarRegistered(CarRegisteredEvent event) {
        log.info("[CarEvent] NFT 민팅 시작 | carId: {}", event.carId());
        try {
            // 1. NFT 메타데이터 JSON 생성 (이미지 CID 4개 포함)
            String metadataJson = buildMetadata(event);

            // 2. 메타데이터 IPFS 업로드 → CID
            String cid = pinataService.uploadJson(metadataJson, "car-" + event.carId());
            String tokenUri = "ipfs://" + cid;
            log.info("[CarEvent] 메타데이터 IPFS 업로드 완료 | cid: {}", cid);

            // 3. NFT 민팅 → tokenId
            String tokenId = carNftService.mint(event.companyWalletAddress(), tokenUri);
            log.info("[CarEvent] NFT 민팅 완료 | tokenId: {}", tokenId);

            // 4. OwnedCar 상태 ACTIVE 업데이트
            ownedCarRepository.findById(event.carId()).ifPresent(car -> {
                car.activate(tokenId);
                ownedCarRepository.save(car);
            });

            log.info("[CarEvent] 차량 등록 완료 | carId: {}, tokenId: {}", event.carId(), tokenId);

        } catch (Exception e) {
            log.error("[CarEvent] NFT 민팅 실패 | carId: {}", event.carId(), e);
            ownedCarRepository.findById(event.carId()).ifPresent(car -> {
                car.fail();
                ownedCarRepository.save(car);
            });
        }
    }

    private String buildMetadata(CarRegisteredEvent event) {
        Map<String, String> cids = event.imageCids();
        String frontCid = cids.getOrDefault("FRONT", "");

        // images 객체: { "FRONT": "ipfs://...", "REAR": "ipfs://...", ... }
        String imagesJson = cids.entrySet().stream()
                .map(e -> "\"" + e.getKey() + "\":\"ipfs://" + e.getValue() + "\"")
                .collect(Collectors.joining(",", "{", "}"));

        return "{"
                + "\"name\":\"Car - " + event.plateNumber() + "\","
                + "\"description\":\"" + event.brand() + " " + event.modelName() + "\","
                + "\"image\":\"ipfs://" + frontCid + "\","
                + "\"images\":" + imagesJson + ","
                + "\"attributes\":["
                + "{\"trait_type\":\"Brand\",\"value\":\"" + event.brand() + "\"},"
                + "{\"trait_type\":\"Model\",\"value\":\"" + event.modelName() + "\"},"
                + "{\"trait_type\":\"Fuel Type\",\"value\":\"" + event.fuelType() + "\"},"
                + "{\"trait_type\":\"Plate Number\",\"value\":\"" + event.plateNumber() + "\"}"
                + "]}";
    }
}
