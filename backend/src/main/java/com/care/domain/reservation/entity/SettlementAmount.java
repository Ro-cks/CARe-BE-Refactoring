package com.care.domain.reservation.entity;

import jakarta.persistence.Embeddable;

@Embeddable
public record SettlementAmount(long value) {
    public SettlementAmount {
        if (value < 0) throw new IllegalArgumentException("정산 금액은 0 이상이어야 합니다.");
    }

    public static SettlementAmount noFault() {
        return new SettlementAmount(0);
    }

    public boolean isNoFault() {
        return value == 0;
    }
}