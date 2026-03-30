package com.care.domain.reservation.controller;

import com.care.domain.reservation.service.AdminReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/reservations")
public class AdminReservationController {

    private final AdminReservationService adminReservationService;

    /**
     * 스크래치가 없는 예약 삭제
     * - scratch 데이터가 존재하면 400 반환
     * - 없으면 연관 데이터(notification, report, smartkey, review, dispute) 포함 전체 삭제
     */
    @DeleteMapping("/{reservationId}")
    public ResponseEntity<Map<String, String>> deleteReservationIfNoScratch(
            @PathVariable String reservationId
    ) {
        adminReservationService.deleteReservationIfNoScratch(reservationId);
        return ResponseEntity.ok(Map.of(
                "reservationId", reservationId,
                "message", "예약 및 연관 데이터가 삭제되었습니다."
        ));
    }
}
