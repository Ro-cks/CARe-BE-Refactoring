package com.care.domain.reservation.controller.dto.response;

import java.time.LocalDateTime;

public record DisputeSettleResponse(
    String settlementId,
    String reservationId,
    long finalAmount,
    String status,
    LocalDateTime settledAt,
    String txHash
) {
    public static DisputeSettleResponse of(
            String settlementId,
            String reservationId,
            long finalAmount,
            String status,
            LocalDateTime settledAt,
            String txHash
    ) {
        return new DisputeSettleResponse(
                settlementId,
                reservationId,
                finalAmount,
                status,
                settledAt,
                txHash
        );
    }
}
