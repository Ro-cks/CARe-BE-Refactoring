package com.care.domain.company.controller;

import com.care.domain.company.controller.dto.request.BizVerifyRequest;
import com.care.domain.company.controller.dto.response.BizVerifyResponse;
import com.care.domain.company.controller.dto.response.CompanyNotificationResponse;
import com.care.domain.company.controller.dto.response.CompanyProfileResponse;
import com.care.domain.company.service.CompanyNotificationService;
import com.care.domain.company.service.CompanyService;
import com.care.domain.reservation.controller.dto.response.DisputeSummaryResponse;
import com.care.domain.reservation.controller.dto.response.ReservationSummaryResponse;
import com.care.domain.reservation.service.DisputeService;
import com.care.domain.reservation.service.ReservationService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/companies/me")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;
    private final ReservationService reservationService;
    private final DisputeService disputeService;
    private final CompanyNotificationService companyNotificationService;

    // 프로필 조회 api
    @GetMapping
    public ResponseEntity<CompanyProfileResponse> getProfile(@AuthenticationPrincipal String companyId) {
        return ResponseEntity.ok(companyService.getProfile(companyId));
    }

    // 서류 검증 api
    @PostMapping("/biz-verify")
    public ResponseEntity<BizVerifyResponse> verifyBusiness(
            @AuthenticationPrincipal String companyId,
            @Valid @RequestBody BizVerifyRequest request) {
        return ResponseEntity.ok(companyService.verifyBusiness(companyId, request));
    }

    /**
     * GET /companies/me/reservations
     * 회사 예약 목록 조회
     */
    @GetMapping("/reservations")
    public ResponseEntity<List<ReservationSummaryResponse>> getReservations(@AuthenticationPrincipal String companyId) {
        return ResponseEntity.ok(reservationService.getCompanyReservations(companyId));
    }

    /**
     * GET /companies/me/disputes
     * 회사 분쟁 목록 조회
     */
    @GetMapping("/disputes")
    public ResponseEntity<List<DisputeSummaryResponse>> getDisputes(@AuthenticationPrincipal String companyId) {
        return ResponseEntity.ok(disputeService.getCompanyDisputes(companyId));
    }

    /**
     * GET /companies/me/notifications
     * 업체 알림 목록 조회
     */
    @GetMapping("/notifications")
    public ResponseEntity<List<CompanyNotificationResponse>> getNotifications(
            @AuthenticationPrincipal String companyId
    ) {
        return ResponseEntity.ok(companyNotificationService.getMyNotifications(companyId));
    }

    /**
     * GET /companies/me/notifications/subscribe
     * 업체 알림 SSE 구독
     */
    @GetMapping(value = "/notifications/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeNotifications(@AuthenticationPrincipal String companyId,
                                             HttpServletResponse response) {
        response.addHeader("X-Accel-Buffering", "no");
        return companyNotificationService.subscribe(companyId);
    }

    /**
     * PATCH /companies/me/notifications/{notificationId}/read
     * 업체 알림 읽음 처리
     */
    @PatchMapping("/notifications/{notificationId}/read")
    public ResponseEntity<CompanyNotificationResponse> markNotificationAsRead(
            @AuthenticationPrincipal String companyId,
            @PathVariable String notificationId
    ) {
        return ResponseEntity.ok(companyNotificationService.markAsRead(companyId, notificationId));
    }
}
