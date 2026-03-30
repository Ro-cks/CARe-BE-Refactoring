package com.care.domain.reservation.repository;

import com.care.domain.reservation.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, String> {

    List<Review> findByOwnedCarCarId(String carId);

    List<Review> findByReservation_ReservationId(String reservationId);
}
