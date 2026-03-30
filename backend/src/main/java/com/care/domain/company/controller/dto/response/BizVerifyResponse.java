package com.care.domain.company.controller.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BizVerifyResponse {
    private String bizNo;
    private boolean verified;
}
