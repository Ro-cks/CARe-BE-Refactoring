package com.care.domain.reservation.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dispute")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Dispute extends BaseEntity {

    @Id
    @Column(name = "dispute_id", length = 100)
    private String disputeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    // 업체가 문제 삼은 반납 후 흠집 기록
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_log_id", nullable = false)
    private Scratch targetScratch;

    // 고객이 방어 시 제출한 흠집 기록 (방어 전까지 null)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "defense_log_id")
    private Scratch defenseScratch;

    @Column(name = "reason", columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "claim_amount", nullable = false)
    private int claimAmount;

    @Column(name = "settlement_final_amount")
    private Long settlementFinalAmount;

    @Column(name = "settlement_status", length = 20)
    private String settlementStatus;

    @Column(name = "company_settlement_agreed", nullable = false)
    private boolean companySettlementAgreed;

    @Column(name = "renter_settlement_agreed", nullable = false)
    private boolean renterSettlementAgreed;

    @Column(name = "settlement_agreed_at")
    private LocalDateTime settlementAgreedAt;

    @Column(name = "snapshot_before_log_id", length = 100)
    private String snapshotBeforeLogId;

    @Column(name = "snapshot_before_crop_s3_url", length = 255)
    private String snapshotBeforeCropS3Url;

    @Column(name = "snapshot_after_crop_s3_url", length = 255)
    private String snapshotAfterCropS3Url;

    @Column(name = "snapshot_similarity")
    private Double snapshotSimilarity;

    @Column(name = "snapshot_diff_score")
    private Double snapshotDiffScore;

    @Column(name = "snapshot_threshold")
    private Double snapshotThreshold;

    @Column(name = "snapshot_warning", nullable = false)
    private boolean snapshotWarning;

    @Column(name = "snapshot_captured_at")
    private LocalDateTime snapshotCapturedAt;

    @Column(name = "ai_analysis_report", columnDefinition = "LONGTEXT")
    private String aiAnalysisReport;

    @Column(name = "ai_analysis_cached_at")
    private LocalDateTime aiAnalysisCachedAt;

    public static Dispute create(Reservation reservation,
                                 Scratch targetScratch,
                                 String reason,
                                 int claimAmount) {
        if (reservation == null) {
            throw new IllegalArgumentException("reservation은 필수입니다.");
        }
        if (targetScratch == null) {
            throw new IllegalArgumentException("targetScratch는 필수입니다.");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("분쟁 사유는 필수입니다.");
        }
        if (claimAmount <= 0) {
            throw new IllegalArgumentException("청구 금액은 0보다 커야 합니다.");
        }

        Dispute dispute = new Dispute();
        dispute.disputeId = UUID.randomUUID().toString();
        dispute.reservation = reservation;
        dispute.targetScratch = targetScratch;
        dispute.reason = reason;
        dispute.claimAmount = claimAmount;
        dispute.companySettlementAgreed = false;
        dispute.renterSettlementAgreed = false;
        dispute.snapshotWarning = false;
        dispute.setStatus(DisputeStatus.OPEN);
        return dispute;
    }

    public void captureReturnReportSnapshot(
            String beforeLogId,
            String beforeCropS3Url,
            String afterCropS3Url,
            double similarity,
            double diffScore,
            double threshold,
            boolean warning
    ) {
        this.snapshotBeforeLogId = beforeLogId;
        this.snapshotBeforeCropS3Url = beforeCropS3Url;
        this.snapshotAfterCropS3Url = afterCropS3Url;
        this.snapshotSimilarity = similarity;
        this.snapshotDiffScore = diffScore;
        this.snapshotThreshold = threshold;
        this.snapshotWarning = warning;
        this.snapshotCapturedAt = LocalDateTime.now();
    }

    public void cacheAiAnalysis(String reportJson) {
        this.aiAnalysisReport = reportJson;
        this.aiAnalysisCachedAt = LocalDateTime.now();
    }

    public DisputeStatus getStatusEnum() {
        return DisputeStatus.from(this.status);
    }

    public void setStatus(DisputeStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("분쟁 상태는 필수입니다.");
        }
        this.status = status.name();
    }

    public void defend(Scratch defenseScratch) {
        if (defenseScratch == null) {
            throw new IllegalArgumentException("defenseScratch는 필수입니다.");
        }
        assertStatus(DisputeStatus.OPEN);

        this.defenseScratch = defenseScratch;
    }

    public void resolve() {
        DisputeStatus current = getStatusEnum();
        if (current != DisputeStatus.OPEN) {
            throw new IllegalStateException("현재 상태에서는 해결 처리할 수 없습니다: " + current.name());
        }
        setStatus(DisputeStatus.COMPLETED);
    }

    public void proposeSettlement(long finalAmount, SettlementStatus settlementStatus) {
        if (finalAmount < 0) {
            throw new IllegalArgumentException("최종 정산 금액은 0 이상이어야 합니다.");
        }
        if (settlementStatus == null || settlementStatus == SettlementStatus.PENDING) {
            throw new IllegalArgumentException("정산 상태는 COMPLETED 또는 REFUNDED여야 합니다.");
        }

        this.settlementFinalAmount = finalAmount;
        this.settlementStatus = settlementStatus.name();
    }

    public boolean isCounterProposal(long finalAmount, SettlementStatus settlementStatus) {
        if (this.settlementFinalAmount == null || this.settlementStatus == null) {
            return false;
        }
        return this.settlementFinalAmount != finalAmount || !this.settlementStatus.equals(settlementStatus.name());
    }

    public void resetSettlementAgreements() {
        this.companySettlementAgreed = false;
        this.renterSettlementAgreed = false;
        this.settlementAgreedAt = null;
    }

    public void agreeSettlementByCompany() {
        this.companySettlementAgreed = true;
        if (isSettlementFullyAgreed()) {
            this.settlementAgreedAt = LocalDateTime.now();
        }
    }

    public void agreeSettlementByRenter() {
        this.renterSettlementAgreed = true;
        if (isSettlementFullyAgreed()) {
            this.settlementAgreedAt = LocalDateTime.now();
        }
    }

    public boolean isSettlementFullyAgreed() {
        return this.companySettlementAgreed && this.renterSettlementAgreed;
    }

    private void assertStatus(DisputeStatus expected) {
        DisputeStatus current = getStatusEnum();
        if (current != expected) {
            throw new IllegalStateException(
                    "분쟁 상태가 올바르지 않습니다. expected=" + expected.name() + ", current=" + current.name());
        }
    }
}
