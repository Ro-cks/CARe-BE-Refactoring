package com.care.domain.reservation.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "smart_key")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SmartKey extends BaseEntity {

    @Id
    @Column(name = "smart_key_id", length = 100)
    private String smartKeyId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false, unique = true)
    private Reservation reservation;

    @Column(name = "token", length = 255, nullable = false, unique = true)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "lock_status", length = 20, nullable = false)
    private LockStatus lockStatus = LockStatus.LOCKED;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public enum LockStatus {
        LOCKED, UNLOCKED
    }

    public static SmartKey issue(String smartKeyId, Reservation reservation, String token, LocalDateTime expiresAt) {
        SmartKey key = new SmartKey();
        key.smartKeyId = smartKeyId;
        key.reservation = reservation;
        key.token = token;
        key.expiresAt = expiresAt;
        key.active = true;
        key.lockStatus = LockStatus.LOCKED;
        return key;
    }

    public void unlock() {
        this.lockStatus = LockStatus.UNLOCKED;
    }

    public void lock() {
        this.lockStatus = LockStatus.LOCKED;
    }

    public void revoke() {
        this.active = false;
        this.revokedAt = LocalDateTime.now();
        this.lockStatus = LockStatus.LOCKED;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }
}
