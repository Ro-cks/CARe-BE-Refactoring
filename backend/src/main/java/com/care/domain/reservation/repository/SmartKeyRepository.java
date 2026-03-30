package com.care.domain.reservation.repository;

import com.care.domain.reservation.entity.SmartKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SmartKeyRepository extends JpaRepository<SmartKey, String> {
    Optional<SmartKey> findByReservation_ReservationId(String reservationId);
    Optional<SmartKey> findByToken(String token);
    List<SmartKey> findAllByActiveTrueAndExpiresAtBefore(LocalDateTime now);
}
