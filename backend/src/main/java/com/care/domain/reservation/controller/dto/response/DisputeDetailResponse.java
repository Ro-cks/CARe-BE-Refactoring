package com.care.domain.reservation.controller.dto.response;

import com.care.domain.reservation.entity.Dispute;

import java.time.LocalDateTime;

public record DisputeDetailResponse(
		String disputeId,
		String reservationId,
		String targetLogId,
		String targetCarPart,
		String targetOriginalS3Url,
		String targetCropS3Url,
		String defenseLogId,
		String defenseOriginalS3Url,
		String defenseCropS3Url,
		String status,
		String reason,
		int claimAmount,
		Long settlementFinalAmount,
		String settlementStatus,
		boolean companySettlementAgreed,
		boolean renterSettlementAgreed,
		LocalDateTime settlementAgreedAt,
		String snapshotBeforeLogId,
		String snapshotBeforeCropS3Url,
		String snapshotAfterCropS3Url,
		Double snapshotSimilarity,
		Double snapshotDiffScore,
		Double snapshotThreshold,
		boolean snapshotWarning,
		LocalDateTime snapshotCapturedAt,
		LocalDateTime createdAt,
		LocalDateTime updatedAt
) {
	public static DisputeDetailResponse from(Dispute dispute) {
		return new DisputeDetailResponse(
				dispute.getDisputeId(),
				dispute.getReservation().getReservationId(),
				dispute.getTargetScratch().getLogId(),
				dispute.getTargetScratch().getCarPart(),
				dispute.getTargetScratch().getOriginalS3Url(),
				dispute.getTargetScratch().getCropS3Url(),
				dispute.getDefenseScratch() != null ? dispute.getDefenseScratch().getLogId() : null,
				dispute.getDefenseScratch() != null ? dispute.getDefenseScratch().getOriginalS3Url() : null,
				dispute.getDefenseScratch() != null ? dispute.getDefenseScratch().getCropS3Url() : null,
				dispute.getStatusEnum().name(),
				dispute.getReason(),
				dispute.getClaimAmount(),
				dispute.getSettlementFinalAmount(),
				dispute.getSettlementStatus(),
				dispute.isCompanySettlementAgreed(),
				dispute.isRenterSettlementAgreed(),
				dispute.getSettlementAgreedAt(),
				dispute.getSnapshotBeforeLogId(),
				dispute.getSnapshotBeforeCropS3Url(),
				dispute.getSnapshotAfterCropS3Url(),
				dispute.getSnapshotSimilarity(),
				dispute.getSnapshotDiffScore(),
				dispute.getSnapshotThreshold(),
				dispute.isSnapshotWarning(),
				dispute.getSnapshotCapturedAt(),
				dispute.getCreatedAt(),
				dispute.getUpdatedAt()
		);
	}
}
