package com.care.global.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ErrorResponse {

    private String message;
    private HttpStatus status;
    private LocalDateTime timestamp;

    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(
                errorCode.getMessage(),
                errorCode.getHttpStatus(),
                LocalDateTime.now()
        );
    }

    public static ErrorResponse of(String message, HttpStatus status) {
        return new ErrorResponse(
                message,
                status,
                LocalDateTime.now()
        );
    }
}
