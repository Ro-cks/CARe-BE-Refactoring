package com.care.domain.reservation.controller.dto.response;

import com.care.domain.reservation.entity.Reservation;

import java.time.LocalDateTime;
import java.time.LocalDateTime;

public record ReservationCreateResponse(
        String reservationId,
        String status,
        String carId,
        String insuranceId,
        LocalDateTime pickupDate,
        LocalDateTime returnDate,
        int totalPrice,
        String paymentTxHash
) {
    public static ReservationCreateResponse from(Reservation r) {
        return new ReservationCreateResponse(
                r.getReservationId(),
                r.getStatus(),
                r.getOwnedCar().getCarId(),
                r.getInsurance().getInsuranceId(),
                r.getPickupDate(),
                r.getReturnDate(),
                r.getTotalPrice(),
                r.getPaymentTxHash()
        );
    }
}
