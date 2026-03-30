package com.care.domain.reservation.repository;

import com.care.domain.reservation.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, String> {
    Optional<Report> findByReservation_ReservationId(String reservationId);
}
