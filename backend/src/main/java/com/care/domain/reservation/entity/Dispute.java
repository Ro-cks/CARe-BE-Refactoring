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

    @Getter(AccessLevel.NONE)
    @Embedded
    private SettlementAgreement settlementAgreement = new SettlementAgreement();

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

    public AgreementResult agreeSettlement(Party party, SettlementAmount amount) {
        assertStatus(DisputeStatus.OPEN);

        AgreementResult result = settlementAgreement.agree(party, amount);
        if (result == AgreementResult.COMPLETED) {
            this.settlementAgreedAt = LocalDateTime.now();
        }
        return result;
    }

    // 아래는 기존 API 응답(DisputeDetailResponse)을 유지하기 위한 메서드
    public Long getSettlementFinalAmount() {
        SettlementAmount amount = settlementAgreement.getAmount();
        return amount == null ? null : amount.value();
    }

    public String getSettlementStatus() {
        SettlementAmount amount = settlementAgreement.getAmount();
        if (amount == null) return null;
        return amount.isNoFault() ? "REFUNDED" : "COMPLETED";
    }

    public boolean isCompanySettlementAgreed() {
        return settlementAgreement.isCompanyAgreed();
    }

    public boolean isRenterSettlementAgreed() {
        return settlementAgreement.isRenterAgreed();
    }

    private void assertStatus(DisputeStatus expected) {
        DisputeStatus current = getStatusEnum();
        if (current != expected) {
            throw new IllegalStateException(
                    "분쟁 상태가 올바르지 않습니다. expected=" + expected.name() + ", current=" + current.name());
        }
    }
}
