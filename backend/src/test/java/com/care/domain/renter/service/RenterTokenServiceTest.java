package com.care.domain.renter.service;

import com.care.domain.renter.controller.dto.response.TokenChargeResponse;
import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.exception.RenterErrorCode;
import com.care.domain.renter.repository.RenterRepository;
import com.care.global.blockchain.CareTokenService;
import com.care.global.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RenterTokenServiceTest {

    @Autowired RenterTokenService renterTokenService;
    @Autowired RenterRepository renterRepository;

    @MockitoBean CareTokenService careTokenService;

    private static final String USER_ID       = "renter-test-1";
    private static final String WALLET        = "0xAbc1234567890000000000000000000000000001";
    private static final String TX_HASH       = "0xdeadbeef";
    // 10.5 CARE = 10_500_000 (decimals: 6)
    private static final BigInteger RAW_BAL   = BigInteger.valueOf(10_500_000L);

    @BeforeEach
    void setUp() {
        Renter renter = Renter.of(USER_ID, "테스터", "tester@care.com", "hashed", "ko", WALLET);
        renterRepository.save(renter);
    }

    // ── charge() ─────────────────────────────────────────────────────────────

    @Test
    void 토큰_충전_성공() throws Exception {
        given(careTokenService.faucet(any(), anyDouble())).willReturn(TX_HASH);
        given(careTokenService.balanceOf(any())).willReturn(RAW_BAL);

        TokenChargeResponse response = renterTokenService.charge(USER_ID, 10.5);

        assertThat(response.walletAddress()).isEqualTo(WALLET);
        assertThat(response.chargedAmount()).isEqualTo(10.5);
        assertThat(response.txHash()).isEqualTo(TX_HASH);
        assertThat(response.balance()).isEqualTo("10.5");
    }

    @Test
    void 존재하지_않는_userId로_충전하면_RENTER_NOT_FOUND() {
        assertThatThrownBy(() -> renterTokenService.charge("없는-유저", 10.0))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(RenterErrorCode.RENTER_NOT_FOUND));
    }

    @Test
    void 지갑_주소_없는_사용자가_충전하면_WALLET_NOT_REGISTERED() {
        Renter noWallet = Renter.of("no-wallet-user", "지갑없음", "nowallet@care.com", "hashed", "ko", null);
        renterRepository.save(noWallet);

        assertThatThrownBy(() -> renterTokenService.charge("no-wallet-user", 10.0))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(RenterErrorCode.WALLET_NOT_REGISTERED));
    }

    @Test
    void 블록체인_오류_발생_시_TOKEN_CHARGE_FAILED() throws Exception {
        given(careTokenService.faucet(any(), anyDouble())).willThrow(new RuntimeException("RPC 연결 실패"));

        assertThatThrownBy(() -> renterTokenService.charge(USER_ID, 10.0))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(RenterErrorCode.TOKEN_CHARGE_FAILED));
    }

    // ── getBalance() ─────────────────────────────────────────────────────────

    @Test
    void 잔액_조회_성공() throws Exception {
        given(careTokenService.balanceOf(any())).willReturn(RAW_BAL);

        String balance = renterTokenService.getBalance(USER_ID);

        assertThat(balance).isEqualTo("10.5");
    }

    @Test
    void 존재하지_않는_userId로_잔액조회하면_RENTER_NOT_FOUND() {
        assertThatThrownBy(() -> renterTokenService.getBalance("없는-유저"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(RenterErrorCode.RENTER_NOT_FOUND));
    }

    @Test
    void 블록체인_오류_발생_시_TOKEN_BALANCE_FAILED() throws Exception {
        given(careTokenService.balanceOf(any())).willThrow(new RuntimeException("RPC 연결 실패"));

        assertThatThrownBy(() -> renterTokenService.getBalance(USER_ID))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(RenterErrorCode.TOKEN_BALANCE_FAILED));
    }
}
