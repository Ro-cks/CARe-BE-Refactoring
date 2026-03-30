package com.care.domain.scan.service;

import com.care.domain.reservation.entity.Scratch;
import com.care.domain.scan.dto.ScanResponseDto;
import com.care.domain.scan.repository.ScratchRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScanService {

    private final ScratchRepository scratchRepository;
    private final ScanPersistService scanPersistService;
    private final ObjectMapper objectMapper;

    @Value("${AI_YOLO_URL:http://localhost:8000}")
    private String aiServerUrl;

    // ── 픽업 전 스캔
    public List<ScanResponseDto> scanBefore(String reservationId, String zone, MultipartFile image) {
        return detect(reservationId, zone, "BEFORE", image);
    }

    // ── 반납 후 스캔
    public List<ScanResponseDto> scanAfter(String reservationId, String zone, MultipartFile image) {
        return detect(reservationId, zone, "AFTER", image);
    }

    // ── 스캔 결과 조회
    @Transactional(readOnly = true)
    public List<ScanResponseDto> getScanResult(String reservationId, String logType) {
        List<Scratch> scratches = scratchRepository
                .findByReservation_ReservationIdAndLogType(reservationId, logType);
        return ScanResponseDto.fromList(scratches);
    }

    // ── FastAPI 호출 (트랜잭션 밖) + DB 저장 (트랜잭션 안, 별도 서비스)
    private List<ScanResponseDto> detect(String reservationId, String zone,
                                         String logType, MultipartFile image) {
        // 1) AI 서버 호출 — 트랜잭션 밖에서 (S3 업로드 포함)
        Map<String, Object> response;
        try {
            response = callFastApi(image, zone, logType);
        } catch (Exception e) {
            log.warn("[Scan] AI 서버 호출 실패, 흠집 없음으로 처리 - zone: {}, reason: {}", zone, e.getMessage());
            response = Collections.emptyMap();
        }
        List<Map<String, Object>> defects =
                (List<Map<String, Object>>) response.get("defects");

        // 2) DB 저장 — 별도 서비스의 @Transactional 메서드로 호출
        return scanPersistService.saveDetectResult(reservationId, zone, logType, defects);
    }

    // ── FastAPI /detect 호출 (HttpURLConnection 직접 사용)
    private Map<String, Object> callFastApi(MultipartFile image,
                                            String zone, String logType) {
        String boundary = "----Boundary" + UUID.randomUUID().toString().replace("-", "");
        String url = aiServerUrl + "/api/v1/scratches/detect";

        try {
            byte[] imageBytes = image.getBytes();
            String filename = image.getOriginalFilename();
            if (filename == null || filename.isBlank()) filename = "capture.jpg";

            log.info("[Scan] callFastApi - filename: {}, size: {} bytes", filename, imageBytes.length);

            HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
            conn.setDoOutput(true);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(30000);

            try (OutputStream os = conn.getOutputStream()) {
                // image 파트
                writeFilePart(os, boundary, "image", filename, "image/jpeg", imageBytes);
                // zone 파트
                writeFormField(os, boundary, "zone", zone);
                // log_type 파트
                writeFormField(os, boundary, "log_type", logType);
                // 종료 boundary
                os.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            int status = conn.getResponseCode();
            InputStream is = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();
            String responseBody = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            is.close();
            conn.disconnect();

            if (status != 200) {
                throw new RuntimeException("AI 서버 응답 " + status + ": " + responseBody);
            }

            return objectMapper.readValue(responseBody, new TypeReference<>() {});
        } catch (Exception e) {
            log.error("[Scan] FastAPI 호출 실패: {}", e.getMessage());
            throw new RuntimeException("흠집 감지 서버 호출 실패: " + e.getMessage());
        }
    }

    private void writeFilePart(OutputStream os, String boundary, String fieldName,
                                String filename, String contentType, byte[] data) throws IOException {
        os.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        os.write(("Content-Disposition: form-data; name=\"" + fieldName + "\"; filename=\"" + filename + "\"\r\n")
                .getBytes(StandardCharsets.UTF_8));
        os.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        os.write(data);
        os.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private void writeFormField(OutputStream os, String boundary,
                                 String fieldName, String value) throws IOException {
        os.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        os.write(("Content-Disposition: form-data; name=\"" + fieldName + "\"\r\n\r\n")
                .getBytes(StandardCharsets.UTF_8));
        os.write(value.getBytes(StandardCharsets.UTF_8));
        os.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    @Transactional(readOnly = true)
    public List<ScanResponseDto> getScanResultByZone(String reservationId, String logType, String zone) {
        List<Scratch> scratches = scratchRepository
                .findByReservation_ReservationIdAndLogTypeAndCarPart(reservationId, logType, zone);
        return ScanResponseDto.fromList(scratches);
    }
}
