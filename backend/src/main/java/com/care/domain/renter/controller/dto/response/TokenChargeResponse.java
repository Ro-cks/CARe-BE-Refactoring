package com.care.domain.renter.controller.dto.response;

public record TokenChargeResponse(
        String walletAddress,
        double chargedAmount,
        String txHash,
        String balance  // 충전 후 잔액 (CARE 단위)
) {}
