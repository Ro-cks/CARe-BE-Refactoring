package com.care.domain.reservation.controller.dto.response;

import com.care.domain.reservation.entity.Dispute;

import java.time.LocalDateTime;

public record DisputeSummaryResponse(
        String disputeId,
        String reservationId,
        String carId,
        String plateNumber,
        String brand,
        String modelName,
        String renterName,
        int claimAmount,
        String status,
        boolean hasDefense,
        LocalDateTime createdAt
) {
    public static DisputeSummaryResponse from(Dispute dispute) {
        return new DisputeSummaryResponse(
                dispute.getDisputeId(),
                dispute.getReservation().getReservationId(),
                dispute.getReservation().getOwnedCar().getCarId(),
                dispute.getReservation().getOwnedCar().getPlateNumber(),
                dispute.getReservation().getOwnedCar().getCarModel().getBrand(),
                dispute.getReservation().getOwnedCar().getCarModel().getModelName(),
                dispute.getReservation().getRenter().getName(),
                dispute.getClaimAmount(),
                dispute.getStatusEnum().name(),
                dispute.getDefenseScratch() != null,
                dispute.getCreatedAt()
        );
    }
}