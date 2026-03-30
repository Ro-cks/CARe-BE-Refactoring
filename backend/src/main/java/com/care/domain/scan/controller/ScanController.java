package com.care.domain.scan.controller;

import com.care.domain.scan.dto.ScanResponseDto;
import com.care.domain.scan.service.ScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/scan")
@RequiredArgsConstructor
public class ScanController {

    private final ScanService scanService;

    // 픽업 전 스캔
    @PostMapping("/{reservationId}/before")
    public ResponseEntity<List<ScanResponseDto>> scanBefore(
            @PathVariable String reservationId,
            @RequestParam String zone,
            @RequestParam MultipartFile image
    ) {
        List<ScanResponseDto> result = scanService.scanBefore(reservationId, zone, image);
        return ResponseEntity.ok(result);
    }

    // 반납 후 스캔
    @PostMapping("/{reservationId}/after")
    public ResponseEntity<List<ScanResponseDto>> scanAfter(
            @PathVariable String reservationId,
            @RequestParam String zone,
            @RequestParam MultipartFile image
    ) {
        List<ScanResponseDto> result = scanService.scanAfter(reservationId, zone, image);
        return ResponseEntity.ok(result);
    }

    // 스캔 결과 조회
    @GetMapping("/{reservationId}")
    public ResponseEntity<List<ScanResponseDto>> getScanResult(
            @PathVariable String reservationId,
            @RequestParam(defaultValue = "BEFORE") String logType
    ) {
        List<ScanResponseDto> result = scanService.getScanResult(reservationId, logType);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{reservationId}/result")
    public ResponseEntity<List<ScanResponseDto>> getScanResult(
            @PathVariable String reservationId,
            @RequestParam String logType,
            @RequestParam(required = false) String zone) {
        if (zone != null) {
            return ResponseEntity.ok(scanService.getScanResultByZone(reservationId, logType, zone));
        }
        return ResponseEntity.ok(scanService.getScanResult(reservationId, logType));
    }
}