package com.care.domain.company.exception;

import com.care.global.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum CompanyErrorCode implements ErrorCode {

    COMPANY_NOT_FOUND("존재하지 않는 회사입니다.", HttpStatus.NOT_FOUND),
    INSURANCE_NOT_FOUND("존재하지 않는 보험입니다.", HttpStatus.NOT_FOUND);

    private final String message;
    private final HttpStatus httpStatus;
}
