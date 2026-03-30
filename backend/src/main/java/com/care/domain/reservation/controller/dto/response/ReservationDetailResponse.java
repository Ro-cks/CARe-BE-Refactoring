package com.care.domain.reservation.controller.dto.response;

import com.care.domain.reservation.entity.Reservation;

import java.time.LocalDateTime;

public record ReservationDetailResponse(
        String reservationId,
        String status,
        String smartContractAddress,
        String depositStatus,
        String disputeId,
        int totalPrice,
        LocalDateTime pickupDate,
        LocalDateTime returnDate,
        String beforeScanTxHash,
        String afterScanTxHash,
        RenterInfo renter,
        CarInfo car,
        InsuranceInfo insurance
) {
    public record RenterInfo(
            String renterId,
            String name,
            String email
    ) {}

    public record CarInfo(
            String carId,
            String plateNumber,
            String brand,
            String modelName
    ) {}

    public record InsuranceInfo(
            String insuranceId,
            String name,
            int price
    ) {}

    public static ReservationDetailResponse from(Reservation r, String disputeId) {
        return new ReservationDetailResponse(
                r.getReservationId(),
                r.getStatus(),
                r.getSmartContractAddress(),
                r.getDepositStatus() != null ? r.getDepositStatus().name() : null,
                disputeId,
                r.getTotalPrice(),
                r.getPickupDate(),
                r.getReturnDate(),
                r.getBeforeScanTxHash(),
                r.getAfterScanTxHash(),
                new RenterInfo(
                        r.getRenter().getUserId(),
                        r.getRenter().getName(),
                        r.getRenter().getEmail()
                ),
                new CarInfo(
                        r.getOwnedCar().getCarId(),
                        r.getOwnedCar().getPlateNumber(),
                        r.getOwnedCar().getCarModel().getBrand(),
                        r.getOwnedCar().getCarModel().getModelName()
                ),
                new InsuranceInfo(
                        r.getInsurance().getInsuranceId(),
                        r.getInsurance().getName(),
                        r.getInsurance().getPrice()
                )
        );
    }
}
