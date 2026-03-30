package com.care.domain.reservation.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;

@Getter
public class DisputeCreateRequest {

	@NotBlank
	private String targetLogId;

	@NotBlank
	private String reason;

	@Positive
	private int claimAmount;
}
