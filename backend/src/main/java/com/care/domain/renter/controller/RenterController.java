package com.care.domain.renter.controller;

import com.care.domain.car.controller.dto.request.CarReviewRequest;
import com.care.domain.car.controller.dto.response.CarReviewResponse;
import com.care.domain.car.controller.dto.response.CarSummaryResponse;
import com.care.domain.car.service.CarService;
import com.care.domain.reservation.controller.dto.response.ReservationDetailResponse;
import com.care.domain.reservation.controller.dto.response.ReservationSummaryResponse;
import com.care.domain.reservation.service.ReservationService;
import com.care.domain.renter.controller.dto.request.DocumentVerifyRequest;
import com.care.domain.renter.controller.dto.request.TokenChargeRequest;
import com.care.domain.renter.controller.dto.response.DocumentVerifyResponse;
import com.care.domain.renter.controller.dto.response.RenterNotificationResponse;
import com.care.domain.renter.controller.dto.response.RenterProfileResponse;
import com.care.domain.renter.controller.dto.response.TokenChargeResponse;
import com.care.domain.renter.service.DocumentService;
import com.care.domain.renter.service.RenterNotificationService;
import com.care.domain.renter.service.RenterService;
import com.care.domain.renter.service.RenterTokenService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/renters/me")
@RequiredArgsConstructor
public class RenterController {

    private final DocumentService documentService;
    private final RenterService renterService;
    private final RenterTokenService renterTokenService;
    private final RenterNotificationService renterNotificationService;
    private final CarService carService;
    private final ReservationService reservationService;

    // 프로필 조회 api
    @GetMapping
    public ResponseEntity<RenterProfileResponse> getProfile(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(renterService.getProfile(userId));
    }

    // 서류 검증 api (둘 다 완료 시 DID+VC 자동 발급)
    @PostMapping("/documents")
    public ResponseEntity<DocumentVerifyResponse> verifyDocument(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody DocumentVerifyRequest request) {
        return ResponseEntity.ok(documentService.verifyDocument(userId, request));
    }

    /**
     * POST /renters/me/token/charge
     * CARE 토큰 충전
     */
    @PostMapping("/token/charge")
    public ResponseEntity<TokenChargeResponse> chargeToken(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody TokenChargeRequest request) {
        return ResponseEntity.ok(renterTokenService.charge(userId, request.amount()));
    }

    /**
     * POST /renters/me/token/exchange
     * CARE 토큰 환전 (토큰 → 원화)
     */
    @PostMapping("/token/exchange")
    public ResponseEntity<TokenChargeResponse> exchangeToken(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody TokenChargeRequest request) {
        return ResponseEntity.ok(renterTokenService.exchange(userId, request.amount()));
    }

    /**
     * GET /renters/me/cars
     * 렌터 소유 차량 목록 조회
     */
    @GetMapping("/cars")
    public ResponseEntity<List<CarSummaryResponse>> getMyCars(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(carService.getRenterOwnedCarList(userId));
    }

    /**
     * POST /renters/me/cars/{carId}/reviews
     * 차량 리뷰 작성
     */
    @PostMapping("/cars/{carId}/reviews")
    public ResponseEntity<CarReviewResponse> createReview(
            @PathVariable String carId,
            @Valid @RequestBody CarReviewRequest request
    ) {
        return ResponseEntity.ok(carService.createReview(carId, request));
    }

    /**
     * GET /renters/me/reservations
     * 렌터 예약 목록 조회
     */
    @GetMapping("/reservations")
    public ResponseEntity<List<ReservationSummaryResponse>> getMyReservations(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(reservationService.getRenterReservations(userId));
    }


    /**
     * GET /renters/me/token/balance
     * CARE 토큰 잔액 조회
     */
    @GetMapping("/token/balance")
    public ResponseEntity<Map<String, String>> getBalance(
            @AuthenticationPrincipal String userId) {
        String balance = renterTokenService.getBalance(userId);
        return ResponseEntity.ok(Map.of("balance", balance));
    }

    /**
     * GET /renters/me/notifications
     * 렌터 알림 목록 조회
     */
    @GetMapping("/notifications")
    public ResponseEntity<List<RenterNotificationResponse>> getNotifications(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(renterNotificationService.getMyNotifications(userId));
    }

    /**
     * GET /renters/me/notifications/subscribe
     * 렌터 알림 SSE 구독
     */
    @GetMapping(value = "/notifications/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeNotifications(@AuthenticationPrincipal String userId,
                                             HttpServletResponse response) {
        response.addHeader("X-Accel-Buffering", "no");
        return renterNotificationService.subscribe(userId);
    }

    /**
     * PATCH /renters/me/notifications/{notificationId}/read
     * 렌터 알림 읽음 처리
     */
    @PatchMapping("/notifications/{notificationId}/read")
    public ResponseEntity<RenterNotificationResponse> markNotificationAsRead(
            @AuthenticationPrincipal String userId,
            @PathVariable String notificationId) {
        return ResponseEntity.ok(renterNotificationService.markAsRead(userId, notificationId));
    }
}
