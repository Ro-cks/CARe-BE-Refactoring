package com.care.domain.company.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class BizVerifyRequest {

    @NotBlank
    private String bizNo;           // 사업자등록번호 (숫자 10자리)

    @NotBlank
    private String startDt;         // 개업일자 (YYYYMMDD)

    @NotBlank
    private String representativeName; // 대표자 성명
}
