package com.care.domain.auth.controller.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class RenterSignUpRequest {

    @NotBlank
    @Size(max = 100)
    private String name;

    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    @NotBlank
    @Size(min = 8, max = 100)
    private String password;

    private String languageCode;

    private String walletAddress; // 회원가입 시 ethers.js로 생성한 지갑 주소

    private String privyWalletId; // Privy 지갑 ID (서명 시 사용)
}
