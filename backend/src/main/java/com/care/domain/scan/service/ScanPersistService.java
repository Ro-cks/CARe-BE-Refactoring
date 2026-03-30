package com.care.domain.scan.service;

import com.care.domain.reservation.entity.Reservation;
import com.care.domain.reservation.entity.Scratch;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.scan.dto.ScanResponseDto;
import com.care.domain.scan.repository.ScratchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScanPersistService {

    private final ScratchRepository scratchRepository;
    private final ReservationRepository reservationRepository;

    @Transactional
    public List<ScanResponseDto> saveDetectResult(String reservationId, String zone,
                                                   String logType, List<Map<String, Object>> defects) {
        Reservation reservation = reservationRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다: " + reservationId));

        if (logType.equals("BEFORE")) {
            reservation.updateStatusToInUse();
        } else {
            reservation.updateStatusToAfterScan();
        }

        if (defects == null || defects.isEmpty()) {
            log.info("[Scan] 흠집 없음 - reservationId: {}, zone: {}", reservationId, zone);
            return Collections.emptyList();
        }

        List<Scratch> scratches = new ArrayList<>();
        for (Map<String, Object> defect : defects) {
            Map<String, Object> bbox = (Map<String, Object>) defect.get("bbox");

            Scratch scratch = Scratch.builder()
                    .logId(UUID.randomUUID().toString())
                    .reservation(reservation)
                    .ownedCar(reservation.getOwnedCar())
                    .logType(logType)
                    .carPart(zone)
                    .coordX(((Number) bbox.get("x")).floatValue())
                    .coordY(((Number) bbox.get("y")).floatValue())
                    .originalS3Url((String) defect.get("original_s3_url"))
                    .cropS3Url((String) defect.get("crop_s3_url"))
                    .proofIpfsCid((String) defect.get("proof_ipfs_cid"))
                    .isManual(false)
                    .isDisputed(false)
                    .build();

            scratches.add(scratchRepository.save(scratch));
        }

        log.info("[Scan] 흠집 {}개 저장 - reservationId: {}, zone: {}",
                scratches.size(), reservationId, zone);
        return ScanResponseDto.fromList(scratches);
    }
}
