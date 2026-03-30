package com.care.domain.reservation.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class DisputeDefenseRequest {

	@NotBlank
	private String defenseLogId;
}
