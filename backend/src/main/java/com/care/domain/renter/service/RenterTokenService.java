package com.care.domain.renter.service;

import com.care.domain.renter.controller.dto.response.TokenChargeResponse;
import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.exception.RenterErrorCode;
import com.care.domain.renter.repository.RenterRepository;
import com.care.global.blockchain.CareTokenService;
import com.care.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class RenterTokenService {

    private final RenterRepository renterRepository;
    private final CareTokenService careTokenService;

    /**
     * CARE 토큰 충전
     * faucet(walletAddress, amount) 호출 후 잔액 조회
     */
    public TokenChargeResponse charge(String userId, double amount) {
        Renter renter = renterRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(RenterErrorCode.RENTER_NOT_FOUND));

        String walletAddress = renter.getWalletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            throw new BusinessException(RenterErrorCode.WALLET_NOT_REGISTERED);
        }

        try {
            String txHash = careTokenService.faucet(walletAddress, amount);
            log.info("[RenterToken] 충전 완료 | userId: {}, amount: {} CARE, txHash: {}", userId, amount, txHash);

            BigInteger rawBalance = careTokenService.balanceOf(walletAddress);
            String balance = rawBalance.toString();

            return new TokenChargeResponse(walletAddress, amount, txHash, balance);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[RenterToken] 충전 실패 | userId: {}, error: {}", userId, e.getMessage());
            throw new BusinessException(RenterErrorCode.TOKEN_CHARGE_FAILED);
        }
    }

    /**
     * CARE 토큰 환전 (원화 출금)
     * 렌터 지갑에서 burn 후 발행처 지갑에 faucet → 총 발행량 유지
     */
    public TokenChargeResponse exchange(String userId, double amount) {
        Renter renter = renterRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(RenterErrorCode.RENTER_NOT_FOUND));

        String walletAddress = renter.getWalletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            throw new BusinessException(RenterErrorCode.WALLET_NOT_REGISTERED);
        }

        try {
            String contractAddress = careTokenService.getTokenContractAddress();
            String txHash = careTokenService.transfer(walletAddress, contractAddress, amount);
            log.info("[RenterToken] 환전 완료 | userId: {}, amount: {} CARE, txHash: {}", userId, amount, txHash);

            BigInteger rawBalance = careTokenService.balanceOf(walletAddress);
            String balance = rawBalance.toString();

            return new TokenChargeResponse(walletAddress, amount, txHash, balance);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[RenterToken] 환전 실패 | userId: {}, error: {}", userId, e.getMessage());
            throw new BusinessException(RenterErrorCode.TOKEN_EXCHANGE_FAILED);
        }
    }

    /**
     * CARE 토큰 잔액 조회
     */
    public String getBalance(String userId) {
        Renter renter = renterRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(RenterErrorCode.RENTER_NOT_FOUND));

        String walletAddress = renter.getWalletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            throw new BusinessException(RenterErrorCode.WALLET_NOT_REGISTERED);
        }

        try {
            BigInteger rawBalance = careTokenService.balanceOf(walletAddress);
            return rawBalance.toString();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[RenterToken] 잔액 조회 실패 | userId: {}, error: {}", userId, e.getMessage());
            throw new BusinessException(RenterErrorCode.TOKEN_BALANCE_FAILED);
        }
    }
}
