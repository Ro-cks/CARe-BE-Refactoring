package com.care.domain.reservation.controller.dto.response;

import com.care.domain.reservation.entity.Dispute;

import java.time.LocalDateTime;

public record DisputeDefenseResponse(
		String disputeId,
		String reservationId,
		String defenseLogId,
		String status,
		LocalDateTime updatedAt
) {
	public static DisputeDefenseResponse from(Dispute dispute) {
		return new DisputeDefenseResponse(
				dispute.getDisputeId(),
				dispute.getReservation().getReservationId(),
				dispute.getDefenseScratch() != null ? dispute.getDefenseScratch().getLogId() : null,
				dispute.getStatus(),
				dispute.getUpdatedAt()
		);
	}
}
