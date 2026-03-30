package com.care.domain.reservation.controller;

import com.care.domain.reservation.controller.dto.response.SmartKeyResponse;
import com.care.domain.reservation.service.SmartKeyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/reservations/{reservationId}/smart-key")
@RequiredArgsConstructor
public class SmartKeyController {

    private final SmartKeyService smartKeyService;

    /** 스마트키 발급 */
    @PostMapping
    public ResponseEntity<SmartKeyResponse> issue(
            @AuthenticationPrincipal String userId,
            @PathVariable String reservationId) {
        return ResponseEntity.ok(smartKeyService.issueSmartKey(userId, reservationId));
    }

    /** 잠금 해제 */
    @PostMapping("/unlock")
    public ResponseEntity<SmartKeyResponse> unlock(
            @AuthenticationPrincipal String userId,
            @PathVariable String reservationId) {
        return ResponseEntity.ok(smartKeyService.unlock(userId, reservationId));
    }

    /** 잠금 설정 */
    @PostMapping("/lock")
    public ResponseEntity<SmartKeyResponse> lock(
            @AuthenticationPrincipal String userId,
            @PathVariable String reservationId) {
        return ResponseEntity.ok(smartKeyService.lock(userId, reservationId));
    }

    /** 상태 조회 */
    @GetMapping("/status")
    public ResponseEntity<SmartKeyResponse> status(
            @PathVariable String reservationId) {
        return ResponseEntity.ok(smartKeyService.getStatus(reservationId));
    }

    /** 스마트키 회수 (반납 시 호출) */
    @PostMapping("/revoke")
    public ResponseEntity<Void> revoke(
            @PathVariable String reservationId) {
        smartKeyService.revokeSmartKey(reservationId);
        return ResponseEntity.ok().build();
    }
}
