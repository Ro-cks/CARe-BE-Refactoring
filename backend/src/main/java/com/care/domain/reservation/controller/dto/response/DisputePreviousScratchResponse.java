package com.care.domain.reservation.controller.dto.response;

import com.care.domain.reservation.entity.Scratch;

import java.time.LocalDateTime;

public record DisputePreviousScratchResponse(
        String logId,
        String logType,
        String carPart,
        float coordX,
        float coordY,
        String originalS3Url,
        String cropS3Url,
        String proofIpfsCid,
        boolean isManual,
        boolean isDisputed,
        LocalDateTime createdAt
) {
    public static DisputePreviousScratchResponse from(Scratch scratch) {
        return new DisputePreviousScratchResponse(
                scratch.getLogId(),
                scratch.getLogType(),
                scratch.getCarPart(),
                scratch.getCoordX(),
                scratch.getCoordY(),
                scratch.getOriginalS3Url(),
                scratch.getCropS3Url(),
                scratch.getProofIpfsCid(),
                scratch.isManual(),
                scratch.isDisputed(),
                scratch.getCreatedAt()
        );
    }
}
