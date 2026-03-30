package com.care.domain.reservation.controller;

import com.care.domain.reservation.controller.dto.request.ReservationCreateRequest;
import com.care.domain.reservation.controller.dto.response.ReservationCreateResponse;
import com.care.domain.reservation.controller.dto.response.ReservationDetailResponse;
import com.care.domain.reservation.controller.dto.response.ReservationReturnResponse;
import com.care.domain.car.controller.dto.response.ReturnReportResponse;
import com.care.domain.reservation.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequiredArgsConstructor
@RequestMapping("/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    /**
     * POST /reservations
     * 예약 생성 (결제 포함)
     */
    @PostMapping
    public ResponseEntity<ReservationCreateResponse> createReservation(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody ReservationCreateRequest request) {
        ReservationCreateResponse response = reservationService.createReservation(userId, request);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{reservationId}")
                .buildAndExpand(response.reservationId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    /**
     * GET /reservations/{reservationId}
     * 예약 상세 조회
     */
    @GetMapping("/{reservationId}")
    public ResponseEntity<ReservationDetailResponse> getReservationDetail(@PathVariable String reservationId) {
        return ResponseEntity.ok(reservationService.getReservationDetail(reservationId));
    }

    /**
     * POST /reservations/{reservationId}/return
     * 반납 완료 처리 + 반납 리포트 생성 트리거
     */
    @PostMapping("/{reservationId}/return")
    public ResponseEntity<ReservationReturnResponse> completeReservation(
            @AuthenticationPrincipal String userId,
            @PathVariable String reservationId
    ) {
        return ResponseEntity.ok(reservationService.completeReservation(userId, reservationId));
    }

    /**
     * GET /reservations/{reservationId}/return-report
     * 예약 단위 반납 리포트 조회
     */
    @GetMapping("/{reservationId}/return-report")
    public ResponseEntity<ReturnReportResponse> getReturnReport(
            @PathVariable String reservationId,
            @RequestParam(required = false, defaultValue = "false") boolean fresh
    ) {
        return ResponseEntity.ok(reservationService.getReturnReportByReservation(reservationId, fresh));
    }
}
