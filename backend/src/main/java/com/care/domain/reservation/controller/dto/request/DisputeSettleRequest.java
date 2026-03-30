package com.care.domain.reservation.controller.dto.request;

import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;

import java.util.Locale;

@Getter
public class DisputeSettleRequest {

    @PositiveOrZero
    private Long finalAmount;

    // Legacy schema compatibility
    @PositiveOrZero
    private Long companyRefundAmount;

    // Legacy schema compatibility
    @PositiveOrZero
    private Long renterRefundAmount;

    private String status;

    // Legacy schema compatibility
    private String resolution;

    public long getFinalAmount() {
        if (finalAmount != null) {
            return finalAmount;
        }

        long companyAmount = companyRefundAmount == null ? 0L : companyRefundAmount;
        long renterAmount = renterRefundAmount == null ? 0L : renterRefundAmount;

        if (companyAmount > 0L) {
            return companyAmount;
        }
        if (renterAmount > 0L) {
            return renterAmount;
        }
        if (companyRefundAmount != null) {
            return companyRefundAmount;
        }
        if (renterRefundAmount != null) {
            return renterRefundAmount;
        }
        return 0L;
    }

    public String getStatus() {
        if (status != null && !status.isBlank()) {
            return status;
        }

        if (resolution != null && !resolution.isBlank()) {
            return normalizeResolution(resolution);
        }

        if (companyRefundAmount != null || renterRefundAmount != null) {
            long companyAmount = companyRefundAmount == null ? 0L : companyRefundAmount;
            long renterAmount = renterRefundAmount == null ? 0L : renterRefundAmount;

            if (companyAmount > 0L && renterAmount <= 0L) {
                return "COMPLETED";
            }
            if (renterAmount > 0L && companyAmount <= 0L) {
                return "REFUNDED";
            }
        }

        return status;
    }

    private String normalizeResolution(String value) {
        String normalized = value.trim().toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "COMPANY_WIN", "APPROVED", "ACCEPTED", "PAY_TO_COMPANY", "CHARGED" -> "COMPLETED";
            case "RENTER_WIN", "REJECTED", "REFUND", "PAY_TO_RENTER" -> "REFUNDED";
            default -> normalized;
        };
    }
}
