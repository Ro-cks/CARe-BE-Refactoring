package com.care.domain.reservation.entity;

import java.util.Arrays;

public enum SettlementStatus {
    PENDING,
    COMPLETED,
    REFUNDED;

    public static SettlementStatus from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("정산 상태값이 비어 있습니다.");
        }

        return Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 정산 상태값입니다: " + value));
    }
}