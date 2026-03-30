package com.care.domain.car.event;

import java.util.Map;

/**
 * 차량 등록 완료 이벤트
 * CarService가 발행 → CarEventListener가 NFT 민팅 처리
 */
public record CarRegisteredEvent(
        String carId,
        String companyWalletAddress,
        String plateNumber,
        String brand,
        String modelName,
        String fuelType,
        Map<String, String> imageCids  // side(FRONT/REAR/LEFT/RIGHT) -> IPFS CID
) {}
