package com.care.domain.car.controller.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CarReviewRequest(
        @NotBlank String reservationId,
        @NotNull @Min(1) @Max(5) Integer rating,
        @NotBlank String content
) {}
