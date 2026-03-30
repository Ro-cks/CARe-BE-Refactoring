package com.care.domain.scan.repository;

import com.care.domain.reservation.entity.Scratch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScratchRepository extends JpaRepository<Scratch, String> {

    // reservation.reservationId 로 탐색
    List<Scratch> findByReservation_ReservationIdAndLogType(
            String reservationId, String logType);

    List<Scratch> findByReservation_ReservationId(String reservationId);

    // ownedCar.carId 로 탐색
    List<Scratch> findByOwnedCar_CarId(String carId);

    List<Scratch> findByOwnedCar_CarIdAndReservation_ReservationId(String carId, String reservationId);
    List<Scratch> findByReservation_ReservationIdAndLogTypeAndCarPart(
            String reservationId, String logType, String carPart);
}