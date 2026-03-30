package com.care.domain.reservation.service;

import com.care.domain.reservation.controller.dto.response.SmartKeyResponse;
import com.care.domain.reservation.entity.Reservation;
import com.care.domain.reservation.entity.SmartKey;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.reservation.repository.SmartKeyRepository;
import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.repository.RenterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmartKeyService {

    private final SmartKeyRepository smartKeyRepository;
    private final ReservationRepository reservationRepository;
    private final RenterRepository renterRepository;

    /** 스마트키 발급 (did_verified = true 확인) */
    @Transactional
    public SmartKeyResponse issueSmartKey(String userId, String reservationId) {
        Renter renter = renterRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        if (!renter.isDidVerified()) {
            throw new IllegalStateException("신원 인증이 완료되지 않았습니다. 여권 및 면허증 인증을 먼저 완료해주세요.");
        }

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 예약입니다."));

        // 예약 기간 확인
        validateReservationPeriod(reservation);

        // 기존 키가 있으면 반환, 회수/만료된 경우 새로 발급
        Optional<SmartKey> existing = smartKeyRepository.findByReservation_ReservationId(reservationId);
        if (existing.isPresent()) {
            SmartKey existingKey = existing.get();
            if (existingKey.isActive() && !existingKey.isExpired()) {
                return new SmartKeyResponse(existingKey);
            }
            smartKeyRepository.delete(existingKey);
            smartKeyRepository.flush();
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        SmartKey key = SmartKey.issue(
                UUID.randomUUID().toString(),
                reservation,
                token,
                reservation.getReturnDate()
        );
        return new SmartKeyResponse(smartKeyRepository.save(key));
    }

    /** 잠금 해제 */
    @Transactional
    public SmartKeyResponse unlock(String userId, String reservationId) {
        SmartKey key = getValidKey(reservationId);
        key.unlock();
        return new SmartKeyResponse(key);
    }

    /** 잠금 설정 */
    @Transactional
    public SmartKeyResponse lock(String userId, String reservationId) {
        SmartKey key = getValidKey(reservationId);
        key.lock();
        return new SmartKeyResponse(key);
    }

    /** 상태 조회 */
    @Transactional(readOnly = true)
    public SmartKeyResponse getStatus(String reservationId) {
        SmartKey key = smartKeyRepository.findByReservation_ReservationId(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("발급된 스마트키가 없습니다."));
        return new SmartKeyResponse(key);
    }

    /** 스마트키 회수 (반납 시) */
    @Transactional
    public void revokeSmartKey(String reservationId) {
        smartKeyRepository.findByReservation_ReservationId(reservationId)
                .ifPresent(SmartKey::revoke);
    }

    /**
     * 만료된 스마트키 자동 회수 (1분마다 실행)
     * 반납일이 지난 active 상태 키를 자동으로 revoke
     */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void autoRevokeExpiredKeys() {
        List<SmartKey> expiredKeys = smartKeyRepository.findAllByActiveTrueAndExpiresAtBefore(LocalDateTime.now());
        if (expiredKeys.isEmpty()) return;

        expiredKeys.forEach(key -> {
            key.revoke();
            log.info("[SmartKey] 자동 반납 처리 - reservationId: {}", key.getReservation().getReservationId());
        });
    }

    // ── 내부 메서드 ──────────────────────────────────────────────────────────

    private SmartKey getValidKey(String reservationId) {
        SmartKey key = smartKeyRepository.findByReservation_ReservationId(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("발급된 스마트키가 없습니다."));
        if (!key.isActive()) throw new IllegalStateException("회수된 스마트키입니다.");
        if (key.isExpired()) throw new IllegalStateException("만료된 스마트키입니다.");

        // 예약 기간 외 조작 불가
        validateReservationPeriod(key.getReservation());
        return key;
    }

    private void validateReservationPeriod(Reservation reservation) {
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(reservation.getPickupDate())) {
            throw new IllegalStateException("픽업 시작일 이전에는 스마트키를 사용할 수 없습니다.");
        }
        if (now.isAfter(reservation.getReturnDate())) {
            throw new IllegalStateException("반납일이 지난 예약입니다. 스마트키가 자동 회수됩니다.");
        }
    }
}
