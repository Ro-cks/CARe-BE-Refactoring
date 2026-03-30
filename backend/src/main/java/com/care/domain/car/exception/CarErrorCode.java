package com.care.domain.car.exception;

import com.care.global.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum CarErrorCode implements ErrorCode {

    CAR_NOT_FOUND("존재하지 않는 차량입니다.", HttpStatus.NOT_FOUND),
    CAR_MODEL_NOT_FOUND("존재하지 않는 차량 모델입니다.", HttpStatus.NOT_FOUND),
    CAR_NOT_OWNED_BY_COMPANY("해당 회사의 차량이 아닙니다.", HttpStatus.FORBIDDEN);

    private final String message;
    private final HttpStatus httpStatus;
}
