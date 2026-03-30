package com.care.domain.renter.exception;

import com.care.global.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum RenterErrorCode implements ErrorCode {

    RENTER_NOT_FOUND("존재하지 않는 사용자입니다.", HttpStatus.NOT_FOUND),
    WALLET_NOT_REGISTERED("지갑 주소가 등록되지 않은 사용자입니다.", HttpStatus.BAD_REQUEST),
    TOKEN_CHARGE_FAILED("토큰 충전 중 오류가 발생했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    TOKEN_BALANCE_FAILED("잔액 조회 중 오류가 발생했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    TOKEN_EXCHANGE_FAILED("환전 중 오류가 발생했습니다.", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String message;
    private final HttpStatus httpStatus;
}
