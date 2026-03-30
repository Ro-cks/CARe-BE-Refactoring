package com.care.domain.reservation.repository;

import com.care.domain.reservation.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, String> {

    Optional<Reservation> findByReservationId(String reservationId);

    List<Reservation> findByRenterUserId(String renterId);

    List<Reservation> findByOwnedCarCompanyCompanyId(String companyId);
}