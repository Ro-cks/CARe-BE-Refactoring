package com.care.domain.reservation.exception;

import com.care.global.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum ReservationErrorCode implements ErrorCode {

    RESERVATION_NOT_FOUND("존재하지 않는 예약입니다.", HttpStatus.NOT_FOUND),
    CAR_NOT_FOUND("존재하지 않는 차량입니다.", HttpStatus.NOT_FOUND),
    INSURANCE_NOT_FOUND("존재하지 않는 보험입니다.", HttpStatus.NOT_FOUND),
    WALLET_NOT_REGISTERED("지갑이 등록되지 않았습니다.", HttpStatus.BAD_REQUEST),
    RESERVATION_ACCESS_DENIED("해당 예약에 접근할 권한이 없습니다.", HttpStatus.FORBIDDEN),
    PAYMENT_FAILED("결제에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    INSUFFICIENT_BALANCE("잔액이 부족합니다.", HttpStatus.BAD_REQUEST),
    INVALID_DATE("반납일은 픽업일 이후여야 합니다.", HttpStatus.BAD_REQUEST),
    INVALID_RETURN_STATUS("현재 예약 상태에서는 반납 완료 처리를 할 수 없습니다.", HttpStatus.BAD_REQUEST);

    private final String message;
    private final HttpStatus httpStatus;
}
