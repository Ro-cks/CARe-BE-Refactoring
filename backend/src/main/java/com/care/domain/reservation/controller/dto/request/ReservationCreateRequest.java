package com.care.domain.reservation.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;

public record ReservationCreateRequest(
        @NotBlank String carId,
        @NotBlank String insuranceId,
        @NotNull LocalDateTime pickupDate,
        @NotNull LocalDateTime returnDate,
        @NotNull @Positive int totalPrice
) {}
