package com.care.domain.renter.controller.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record TokenChargeRequest(
        @NotNull
        @DecimalMin(value = "0.000001", message = "충전 금액은 0보다 커야 합니다.")
        Double amount
) {}
