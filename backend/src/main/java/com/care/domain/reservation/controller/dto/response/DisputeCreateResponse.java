package com.care.domain.reservation.controller.dto.response;

import com.care.domain.reservation.entity.Dispute;

import java.time.LocalDateTime;

public record DisputeCreateResponse(
		String disputeId,
		String reservationId,
		String targetLogId,
		String status,
		int claimAmount,
		String reason,
		LocalDateTime createdAt
) {
	public static DisputeCreateResponse from(Dispute dispute) {
		return new DisputeCreateResponse(
				dispute.getDisputeId(),
				dispute.getReservation().getReservationId(),
				dispute.getTargetScratch().getLogId(),
				dispute.getStatus(),
				dispute.getClaimAmount(),
				dispute.getReason(),
				dispute.getCreatedAt()
		);
	}
}
