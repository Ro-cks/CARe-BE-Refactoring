package com.care.domain.auth.controller;

import com.care.domain.auth.controller.dto.request.CompanySignUpRequest;
import com.care.domain.auth.controller.dto.request.LoginRequest;
import com.care.domain.auth.controller.dto.request.RenterSignUpRequest;
import com.care.domain.auth.controller.dto.response.TokenResponse;
import com.care.domain.auth.service.AuthService;
import com.care.global.jwt.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    // 임대인 회원가입
    @PostMapping("/renter/register")
    public ResponseEntity<Void> renterSignUp(@Valid @RequestBody RenterSignUpRequest request) {
        authService.renterSignUp(request);
        return ResponseEntity.ok().build();
    }

    // 임차인 회원가입
    @PostMapping("/company/register")
    public ResponseEntity<Void> companySignUp(@Valid @RequestBody CompanySignUpRequest request) {
        authService.companySignUp(request);
        return ResponseEntity.ok().build();
    }

    // 임대인 로그인
    @PostMapping("/renter/login")
    public ResponseEntity<TokenResponse> renterLogin(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.renterLogin(request));
    }

    // 임차인 로그인
    @PostMapping("/company/login")
    public ResponseEntity<TokenResponse> companyLogin(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.companyLogin(request));
    }
    
    // 로그아웃
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String bearer,
                                       @AuthenticationPrincipal String userId) {
        String token = bearer.substring(7);
        authService.logout(token, userId);
        return ResponseEntity.ok().build();
    }

    // 토큰 갱신
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestHeader("Authorization") String bearer) {
        String token = bearer.substring(7);
        return ResponseEntity.ok(authService.refresh(token));
    }
}
