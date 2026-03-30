package com.care.domain.reservation.service;

import com.care.domain.car.entity.OwnedCar;
import com.care.domain.car.repository.OwnedCarRepository;
import com.care.domain.company.entity.Insurance;
import com.care.domain.company.repository.InsuranceRepository;
import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.repository.RenterRepository;
import com.care.domain.renter.service.RenterNotificationService;
import com.care.domain.reservation.controller.dto.request.ReservationCreateRequest;
import com.care.domain.reservation.controller.dto.response.ReservationCreateResponse;
import com.care.domain.reservation.controller.dto.response.ReservationDetailResponse;
import com.care.domain.reservation.controller.dto.response.ReservationReturnResponse;
import com.care.domain.reservation.controller.dto.response.ReservationSummaryResponse;
import com.care.domain.reservation.entity.Report;
import com.care.domain.reservation.entity.ReportItem;
import com.care.domain.reservation.entity.Reservation;
import com.care.domain.car.service.CarService;
import com.care.domain.car.controller.dto.response.ReturnReportResponse;
import com.care.domain.reservation.entity.Scratch;
import com.care.domain.reservation.exception.ReservationErrorCode;
import com.care.domain.reservation.repository.DisputeRepository;
import com.care.domain.reservation.repository.ReportRepository;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.scan.repository.ScratchRepository;
import com.care.global.ai.AiScratchSimilarityClient;
import com.care.global.ai.AiScratchSimilarityResult;
import com.care.global.blockchain.CareTokenService;
import com.care.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final OwnedCarRepository ownedCarRepository;
    private final InsuranceRepository insuranceRepository;
    private final RenterRepository renterRepository;
    private final ScratchRepository scratchRepository;
    private final AiScratchSimilarityClient aiScratchSimilarityClient;
    private final CarService carService;
    private final CareTokenService careTokenService;
    private final ReportRepository reportRepository;
    private final DisputeRepository disputeRepository;
    private final RenterNotificationService renterNotificationService;

    @Value("${ai.scratch.similarity-threshold:60.0}")
    private double similarityThreshold;

    @Transactional
    public ReservationCreateResponse createReservation(String userId, ReservationCreateRequest request) {
        Renter renter = renterRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ReservationErrorCode.WALLET_NOT_REGISTERED));

        OwnedCar car = ownedCarRepository.findById(request.carId())
                .orElseThrow(() -> new BusinessException(ReservationErrorCode.CAR_NOT_FOUND));

        Insurance insurance = insuranceRepository.findById(request.insuranceId())
                .orElseThrow(() -> new BusinessException(ReservationErrorCode.INSURANCE_NOT_FOUND));

        String renterWallet = renter.getWalletAddress();

        if (renterWallet == null || renterWallet.isBlank()) {
            throw new BusinessException(ReservationErrorCode.WALLET_NOT_REGISTERED);
        }

        int totalPrice = request.totalPrice();
        String contractAddress = careTokenService.getTokenContractAddress();

        // 블록체인 결제 (렌터 → 컨트랙트 주소)
        String txHash;
        try {
            txHash = careTokenService.transfer(renterWallet, contractAddress, totalPrice);
        } catch (Exception e) {
            log.error("[Reservation] 결제 실패 | renter={}, amount={}, error={}",
                    userId, totalPrice, e.getMessage());
            throw new BusinessException(ReservationErrorCode.PAYMENT_FAILED);
        }

        Reservation reservation = Reservation.create(renter, car, insurance,
                request.pickupDate(), request.returnDate(), totalPrice, txHash);
        reservationRepository.save(reservation);

        log.info("[Reservation] 예약 생성 | id={}, renter={}, car={}, price={}, txHash={}",
                reservation.getReservationId(), userId, request.carId(), totalPrice, txHash);

        try {
            String modelName = car.getCarModel().getModelName();
            renterNotificationService.createReservationCreatedNotification(renter, reservation.getReservationId(), modelName, totalPrice);
        } catch (Exception e) {
            log.warn("[Reservation] 예약 알림 전송 실패: {}", e.getMessage());
        }

        return ReservationCreateResponse.from(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationSummaryResponse> getRenterReservations(String renterId) {
        return reservationRepository.findByRenterUserId(renterId).stream()
                .map(r -> {
                    var dispute = disputeRepository.findByReservation_ReservationId(r.getReservationId());
                    String disputeId     = dispute.map(d -> d.getDisputeId()).orElse(null);
                    String disputeStatus = dispute.map(d -> d.getStatus()).orElse(null);
                    return ReservationSummaryResponse.from(r, disputeId, disputeStatus);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReservationSummaryResponse> getCompanyReservations(String companyId) {
        return reservationRepository.findByOwnedCarCompanyCompanyId(companyId).stream()
                .map(r -> {
                    var dispute = disputeRepository.findByReservation_ReservationId(r.getReservationId());
                    String disputeId     = dispute.map(d -> d.getDisputeId()).orElse(null);
                    String disputeStatus = dispute.map(d -> d.getStatus()).orElse(null);
                    return ReservationSummaryResponse.from(r, disputeId, disputeStatus);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public ReservationDetailResponse getReservationDetail(String reservationId) {
        Reservation r = reservationRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new BusinessException(ReservationErrorCode.RESERVATION_NOT_FOUND));
        String disputeId = disputeRepository.findByReservation_ReservationId(reservationId)
                .map(d -> d.getDisputeId())
                .orElse(null);
        return ReservationDetailResponse.from(r, disputeId);
    }

    @Transactional
    public ReservationReturnResponse completeReservation(String userId, String reservationId) {
        Reservation reservation = reservationRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new BusinessException(ReservationErrorCode.RESERVATION_NOT_FOUND));

        if (!reservation.getRenter().getUserId().equals(userId)) {
            throw new BusinessException(ReservationErrorCode.RESERVATION_ACCESS_DENIED);
        }

        String status = reservation.getStatus();
        if ("COMPLETED".equals(status)) {
            throw new BusinessException(ReservationErrorCode.INVALID_RETURN_STATUS);
        }

        int beforeScratchCount = scratchRepository
                .findByReservation_ReservationIdAndLogType(reservationId, "BEFORE")
                .size();
        int afterScratchCount = scratchRepository
                .findByReservation_ReservationIdAndLogType(reservationId, "AFTER")
                .size();

        if (!"COMPLETED".equals(status)) {
            reservation.updateStatusToCompleted();
        }

        // 반납 시점에 AI 비교 생성 및 리포트 저장
        try {
            generateAiComparisonsForReservation(reservation);
            saveReport(reservation);
        } catch (Exception e) {
            log.warn("[Reservation] AI 리포트 생성 중 오류 발생: {}", e.getMessage());
        }

        try {
            String modelName = reservation.getOwnedCar().getCarModel().getModelName();
            renterNotificationService.createReservationCompletedNotification(reservation.getRenter(), reservationId, modelName);
        } catch (Exception e) {
            log.warn("[Reservation] 반납 알림 전송 실패: {}", e.getMessage());
        }

        return ReservationReturnResponse.of(
                reservationId,
                reservation.getStatus(),
                beforeScratchCount,
                afterScratchCount,
                java.time.LocalDateTime.now()
        );
    }

    @Transactional
    public ReturnReportResponse getReturnReportByReservation(String reservationId, boolean fresh) {
        Reservation reservation = reservationRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new BusinessException(ReservationErrorCode.RESERVATION_NOT_FOUND));

        if (fresh) {
            try {
                generateAiComparisonsForReservation(reservation);
                saveReport(reservation);
            } catch (Exception e) {
                log.warn("[Reservation] 강제 리포트 생성 실패: {}", e.getMessage());
            }
        }

        Optional<Report> storedReport = reportRepository.findByReservation_ReservationId(reservationId);
        if (storedReport.isPresent()) {
            return buildResponseFromStoredReport(storedReport.get(), reservationId);
        }

        String carId = reservation.getOwnedCar().getCarId();
        return carService.getReturnReport(carId, reservationId);
    }

    private ReturnReportResponse buildResponseFromStoredReport(Report report, String reservationId) {
        String carId = report.getReservation().getOwnedCar().getCarId();
        List<Scratch> scratches = scratchRepository.findByReservation_ReservationId(reservationId);

        List<ReturnReportResponse.ComparisonDetail> comparisons = report.getItems().stream()
                .map(item -> new ReturnReportResponse.ComparisonDetail(
                        item.getBeforeLogId(),
                        item.getAfterLogId(),
                        item.getBeforeCropS3Url(),
                        item.getAfterCropS3Url(),
                        item.getSimilarity(),
                        item.getDiffScore(),
                        item.isWarning(),
                        item.isNewScratch()
                ))
                .toList();

        return ReturnReportResponse.of(reservationId, carId, scratches, report.getSimilarityThreshold(), comparisons);
    }

    private void saveReport(Reservation reservation) {
        String reservationId = reservation.getReservationId();
        List<Scratch> scratches = scratchRepository.findByReservation_ReservationId(reservationId);

        List<Scratch> beforeScratches = scratches.stream()
                .filter(s -> "BEFORE".equalsIgnoreCase(s.getLogType()))
                .filter(s -> !s.isManual())
                .filter(s -> s.getCropS3Url() != null && !s.getCropS3Url().isBlank())
                .toList();

        List<Scratch> afterScratches = scratches.stream()
                .filter(s -> "AFTER".equalsIgnoreCase(s.getLogType()))
                .filter(s -> !s.isManual())
                .filter(s -> s.getCropS3Url() != null && !s.getCropS3Url().isBlank())
                .toList();

        List<ReportItem> items = afterScratches.stream().map(after -> {
            boolean hasBefore = beforeScratches.stream()
                    .anyMatch(b -> b.getCarPart().equalsIgnoreCase(after.getCarPart()));
            boolean isNewScratch = !hasBefore;
            double similarity = after.getAiSimilarity() != null ? after.getAiSimilarity() : 0.0;
            double diffScore = after.getAiDiffScore() != null ? after.getAiDiffScore() : 100.0;
            boolean warning = isNewScratch || similarity < similarityThreshold;

            return ReportItem.create(
                    UUID.randomUUID().toString(),
                    after.getCarPart(),
                    after.getAiBeforeLogId(),
                    after.getLogId(),
                    after.getAiBeforeCropS3Url(),
                    after.getCropS3Url(),
                    similarity,
                    diffScore,
                    isNewScratch,
                    warning
            );
        }).toList();

        reportRepository.findByReservation_ReservationId(reservationId)
                .ifPresent(reportRepository::delete);

        int warningCount = (int) items.stream().filter(ReportItem::isWarning).count();
        Report report = Report.create(UUID.randomUUID().toString(), reservation, similarityThreshold, warningCount, items);
        reportRepository.save(report);

        log.info("[Reservation] AI 리포트 저장 완료 | reservationId={}, items={}, warnings={}",
                reservationId, items.size(), warningCount);
    }

    private void generateAiComparisonsForReservation(Reservation reservation) {
        String reservationId = reservation.getReservationId();

        List<Scratch> scratches = scratchRepository.findByReservation_ReservationId(reservationId);

        List<Scratch> beforeScratches = scratches.stream()
                .filter(scratch -> "BEFORE".equalsIgnoreCase(scratch.getLogType()))
                .filter(scratch -> !scratch.isManual())
                .filter(scratch -> scratch.getCropS3Url() != null && !scratch.getCropS3Url().isBlank())
                .toList();

        List<Scratch> afterScratches = scratches.stream()
                .filter(scratch -> "AFTER".equalsIgnoreCase(scratch.getLogType()))
                .filter(scratch -> !scratch.isManual())
                .filter(scratch -> scratch.getCropS3Url() != null && !scratch.getCropS3Url().isBlank())
                .toList();

        for (Scratch after : afterScratches) {
            if (after.getAiSimilarity() != null) continue;

            List<Scratch> candidates = beforeScratches.stream()
                    .filter(before -> before.getCarPart().equalsIgnoreCase(after.getCarPart()))
                    .toList();

            if (candidates.isEmpty()) {
                after.cacheAiComparison(null, 0.0, 100.0, null);
                continue;
            }

            Scratch bestBefore = null;
            double bestSimilarity = -1.0;
            double bestDiffScore = 100.0;

            for (Scratch before : candidates) {
                try {
                    AiScratchSimilarityResult result = aiScratchSimilarityClient.compareByUrls(
                            before.getCropS3Url(),
                            after.getCropS3Url()
                    );
                    double similarityPercent = normalizeToPercent(result.similarity());
                    if (similarityPercent > bestSimilarity) {
                        bestSimilarity = similarityPercent;
                        bestDiffScore = result.diffScore();
                        bestBefore = before;
                    }
                } catch (Exception e) {
                    log.warn("[Reservation] AI 유사도 비교 실패 | beforeLogId: {}, afterLogId: {}, reason: {}",
                            before.getLogId(), after.getLogId(), e.getMessage());
                }
            }

            if (bestBefore == null) {
                after.cacheAiComparison(null, 0.0, 100.0, null);
            } else {
                after.cacheAiComparison(bestBefore.getLogId(), bestSimilarity, bestDiffScore, bestBefore.getCropS3Url());
            }
        }
    }

    private double normalizeToPercent(double similarity) {
        if (similarity <= 1.0) {
            return similarity * 100.0;
        }
        return similarity;
    }
}
