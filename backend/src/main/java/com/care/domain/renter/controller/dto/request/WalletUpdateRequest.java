package com.care.domain.renter.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class WalletUpdateRequest {

    @NotBlank
    private String walletAddress;
}
