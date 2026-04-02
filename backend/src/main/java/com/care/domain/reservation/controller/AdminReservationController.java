package com.care.domain.reservation.controller;

import com.care.domain.reservation.service.AdminReservationService;
import com.care.domain.reservation.service.DisputeService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/reservations")
public class AdminReservationController {

    private final AdminReservationService adminReservationService;
    private final DisputeService disputeService;

    /**
     * 스크래치가 없는 예약 삭제
     * - scratch 데이터가 존재하면 400 반환
     * - 없으면 연관 데이터(notification, report, smartkey, review, dispute) 포함 전체 삭제
     */
    @DeleteMapping("/scratches/{logId}")
    public ResponseEntity<Map<String, String>> deleteScratchForce(
            @PathVariable String logId
    ) {
        adminReservationService.deleteScratchForce(logId);
        return ResponseEntity.ok(Map.of(
                "logId", logId,
                "message", "흠집이 삭제되었습니다."
        ));
    }

    @DeleteMapping("/scratches")
    public ResponseEntity<Map<String, Object>> deleteScratchesByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        int count = adminReservationService.deleteScratchesByDate(date);
        return ResponseEntity.ok(Map.of(
                "date", date.toString(),
                "deletedCount", count,
                "message", count + "개의 흠집이 삭제되었습니다."
        ));
    }

    @PostMapping("/disputes/{disputeId}/reset")
    public ResponseEntity<Map<String, String>> resetDisputeToOpen(
            @PathVariable String disputeId
    ) {
        disputeService.resetDisputeToOpen(disputeId);
        return ResponseEntity.ok(Map.of(
                "disputeId", disputeId,
                "message", "분쟁이 OPEN 상태로 초기화되었습니다."
        ));
    }

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
