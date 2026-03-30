package com.care.domain.renter.service;

import com.care.domain.renter.controller.dto.request.DocumentVerifyRequest;
import com.care.domain.renter.controller.dto.response.DocumentVerifyResponse;
import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.entity.RenterDocument;
import com.care.domain.renter.repository.RenterDocumentRepository;
import com.care.domain.renter.repository.RenterRepository;
import com.care.global.blockchain.DIDRegistryService;
import com.care.global.external.apick.ApickVerifyClient;
import com.care.global.vc.VcService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final RenterRepository renterRepository;
    private final RenterDocumentRepository renterDocumentRepository;
    private final ApickVerifyClient apickVerifyClient;
    private final DIDRegistryService didRegistryService;
    private final VcService vcService;

    @Value("${blockchain.chain-id}")
    private long chainId;

    @Value("${blockchain.issuer-address:}")
    private String issuerAddress;

    @Transactional
    public DocumentVerifyResponse verifyDocument(String userId, DocumentVerifyRequest request) {
        Renter renter = renterRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        boolean verified = switch (request.getDocType()) {
            case PASSPORT -> apickVerifyClient.verifyPassport(
                    request.getPassportName(),
                    request.getPassportNo(),
                    request.getBirthDate(),
                    request.getIssueDate(),
                    request.getExpiryDate()
            );
            case INT_LICENSE -> apickVerifyClient.verifyDriverLicense(
                    request.getBirthY(),
                    request.getBirthM(),
                    request.getBirthD(),
                    request.getName(),
                    request.getLicenZero(),
                    request.getLicenFirst(),
                    request.getLicenSecond(),
                    request.getLicenThird()
            );
        };

        // 기존 서류 있으면 업데이트, 없으면 신규 저장
        RenterDocument doc = renterDocumentRepository
                .findByRenter_UserIdAndDocType(userId, request.getDocType())
                .orElse(RenterDocument.of(UUID.randomUUID().toString(), renter, request.getDocType(), verified));

        if (verified) doc.markVerified();
        renterDocumentRepository.save(doc);

        // 양쪽 인증 완료 시 DID + VC 비동기 발급
        if (verified && !renter.isDidVerified() && renter.getWalletAddress() != null) {
            List<RenterDocument> docs = renterDocumentRepository.findAllByRenter_UserId(userId);
            boolean passportDone = docs.stream()
                    .anyMatch(d -> d.getDocType() == RenterDocument.DocType.PASSPORT && d.isVerified());
            boolean licenseDone = docs.stream()
                    .anyMatch(d -> d.getDocType() == RenterDocument.DocType.INT_LICENSE && d.isVerified());

            if (passportDone && licenseDone) {
                issueDidAndVcAsync(userId);
            }
        }

        return new DocumentVerifyResponse(doc.getDocId(), doc.getDocType(), verified);
    }

    /**
     * DID 등록 + VC 발급 (비동기)
     * 블록체인 트랜잭션이 오래 걸리므로 @Async로 백그라운드 처리
     * 기존 registerDid() 로직이 이 메서드로 통합됨
     */
    @Async
    public void issueDidAndVcAsync(String userId) {
        try {
            Renter renter = renterRepository.findById(userId).orElseThrow();

            // 1. DID URI 생성
            String didUri = didRegistryService.buildDidUri(renter.getWalletAddress());

            // 2. 이미 등록된 경우 스킵, 아니면 DIDRegistry 컨트랙트에 온체인 등록
            if (!didRegistryService.isRegistered(didUri)) {
                didRegistryService.registerDID(didUri, null);
            }

            // 3. DB 업데이트
            renter.updateDid(didUri);
            renterRepository.save(renter);
            log.info("[DID] 등록 완료 - userId: {}, didUri: {}", userId, didUri);

            // 4. VC 발급 (Issuer DID + Holder DID)
            String issuerDid = "did:ethr:" + chainId + ":"
                    + (issuerAddress == null || issuerAddress.isEmpty() ? "issuer" : issuerAddress.toLowerCase());
            String vcCid = vcService.issueIdentityVc(didUri, issuerDid);

            // 5. VC CID DB 저장
            renter.updateVcCid(vcCid);
            renterRepository.save(renter);
            log.info("[VC] 발급 완료 - userId: {}, CID: {}", userId, vcCid);

        } catch (Exception e) {
            log.error("[DID/VC] 발급 실패 - userId: {}, error: {}", userId, e.getMessage(), e);
        }
    }
}
