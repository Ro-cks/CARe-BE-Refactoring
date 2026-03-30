package com.care.domain.reservation.entity;

import java.util.Arrays;

public enum DisputeStatus {
    OPEN,
    COMPLETED;

    public static DisputeStatus from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("분쟁 상태값이 비어 있습니다.");
        }

        String normalized = value.trim().toUpperCase();
        if ("DEFENDED".equals(normalized) || "PENDING".equals(normalized)) {
            normalized = OPEN.name();
        }
        if ("RESOLVED".equals(normalized)) {
            normalized = COMPLETED.name();
        }
        final String canonical = normalized;

        return Arrays.stream(values())
            .filter(status -> status.name().equals(canonical))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 분쟁 상태값입니다: " + value));
    }
}