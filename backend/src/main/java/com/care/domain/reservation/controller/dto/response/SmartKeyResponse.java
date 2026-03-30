package com.care.domain.reservation.controller.dto.response;

import com.care.domain.reservation.entity.SmartKey;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class SmartKeyResponse {
    private final String smartKeyId;
    private final String token;
    private final String lockStatus;
    private final boolean active;
    private final LocalDateTime expiresAt;

    public SmartKeyResponse(SmartKey key) {
        this.smartKeyId = key.getSmartKeyId();
        this.token = key.getToken();
        this.lockStatus = key.getLockStatus().name();
        this.active = key.isActive();
        this.expiresAt = key.getExpiresAt();
    }
}
