package com.care.domain.auth.controller.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CompanySignUpRequest {

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

    @Size(max = 50)
    private String bizNumber;

    @NotBlank
    @Size(max = 10)
    private String airportCode;

    private String languageCode;

    private String walletAddress; // 회원가입 시 Privy로 생성한 지갑 주소

    private String privyWalletId; // Privy 지갑 ID (서명 시 사용)
}
