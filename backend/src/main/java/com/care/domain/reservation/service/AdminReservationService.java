package com.care.domain.reservation.service;

import com.care.domain.company.repository.CompanyNotificationRepository;
import com.care.domain.renter.repository.RenterNotificationRepository;
import com.care.domain.reservation.entity.Dispute;
import com.care.domain.reservation.entity.Report;
import com.care.domain.reservation.entity.Review;
import com.care.domain.reservation.entity.Scratch;
import com.care.domain.reservation.entity.SmartKey;
import com.care.domain.reservation.repository.DisputeRepository;
import com.care.domain.reservation.repository.ReportRepository;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.reservation.repository.ReviewRepository;
import com.care.domain.reservation.repository.SmartKeyRepository;
import com.care.domain.scan.repository.ScratchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminReservationService {

    private final ReservationRepository reservationRepository;
    private final ScratchRepository scratchRepository;
    private final DisputeRepository disputeRepository;
    private final SmartKeyRepository smartKeyRepository;
    private final ReviewRepository reviewRepository;
    private final ReportRepository reportRepository;
    private final RenterNotificationRepository renterNotificationRepository;
    private final CompanyNotificationRepository companyNotificationRepository;

    @Transactional
    public void deleteScratchForce(String logId) {
        Scratch scratch = scratchRepository.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 흠집입니다: " + logId));

        // target_log_id로 참조된 경우: dispute 삭제 후 예약 deposit 원복
        disputeRepository.findByTargetScratch_LogId(logId).ifPresent(dispute -> {
            dispute.getReservation().safeDeposit();
            disputeRepository.delete(dispute);
        });

        // defense_log_id로 참조된 경우: dispute의 defense만 초기화
        disputeRepository.findByDefenseScratch_LogId(logId).forEach(Dispute::clearDefenseScratch);

        scratchRepository.delete(scratch);
    }

    @Transactional
    public int deleteScratchesByDate(LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.plusDays(1).atStartOfDay();
        List<Scratch> scratches = scratchRepository.findByCreatedAtBetween(from, to);

        for (Scratch scratch : scratches) {
            String logId = scratch.getLogId();

            disputeRepository.findByTargetScratch_LogId(logId).ifPresent(dispute -> {
                dispute.getReservation().safeDeposit();
                disputeRepository.delete(dispute);
            });

            disputeRepository.findByDefenseScratch_LogId(logId).forEach(Dispute::clearDefenseScratch);
        }

        scratchRepository.deleteAll(scratches);
        return scratches.size();
    }

    @Transactional
    public void deleteReservationIfNoScratch(String reservationId) {
        if (!reservationRepository.existsById(reservationId)) {
            throw new IllegalArgumentException("존재하지 않는 예약입니다: " + reservationId);
        }

        List<?> scratches = scratchRepository.findByReservation_ReservationId(reservationId);
        if (!scratches.isEmpty()) {
            throw new IllegalStateException("스크래치 데이터가 존재하는 예약은 삭제할 수 없습니다. (scratch count: " + scratches.size() + ")");
        }

        // 알림 삭제 (string 참조이므로 FK 제약 없음)
        renterNotificationRepository.deleteByReservationId(reservationId);
        companyNotificationRepository.deleteByReservationId(reservationId);

        // Report (→ ReportItem cascade 삭제)
        reportRepository.findByReservation_ReservationId(reservationId)
                .ifPresent(reportRepository::delete);

        // SmartKey
        smartKeyRepository.findByReservation_ReservationId(reservationId)
                .ifPresent(smartKeyRepository::delete);

        // Review
        List<Review> reviews = reviewRepository.findByReservation_ReservationId(reservationId);
        reviewRepository.deleteAll(reviews);

        // Dispute (scratch 없으면 보통 없지만 혹시 모를 경우 처리)
        disputeRepository.findByReservation_ReservationId(reservationId)
                .ifPresent(disputeRepository::delete);

        // Reservation
        reservationRepository.deleteById(reservationId);
    }
}
