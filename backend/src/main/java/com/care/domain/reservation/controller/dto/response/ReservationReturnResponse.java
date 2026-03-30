package com.care.domain.reservation.controller.dto.response;

import java.time.LocalDateTime;

public record ReservationReturnResponse(
        String reservationId,
        String status,
        boolean reportGenerated,
        int beforeScratchCount,
        int afterScratchCount,
        int totalScratchCount,
        LocalDateTime returnedAt
) {
    public static ReservationReturnResponse of(
            String reservationId,
            String status,
            int beforeScratchCount,
            int afterScratchCount,
            LocalDateTime returnedAt
    ) {
        return new ReservationReturnResponse(
                reservationId,
                status,
                true,
                beforeScratchCount,
                afterScratchCount,
                beforeScratchCount + afterScratchCount,
                returnedAt
        );
    }
}