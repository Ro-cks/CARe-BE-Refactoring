package com.care.global.blockchain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class CareTokenServiceTest {

    @Autowired
    CareTokenService careTokenService;

    private static final String TEST_ADDRESS = "0xd51FEB2369457f206fD162AF45447A3c562118cC";

    @Test
    @DisplayName("balanceOf - 잔액 조회")
    void balanceOf() throws Exception {
        BigInteger balance = careTokenService.balanceOf(TEST_ADDRESS);
        System.out.println("잔액: " + balance + " (micro CARE)");
        assertThat(balance).isGreaterThanOrEqualTo(BigInteger.ZERO);
    }

    @Test
    @DisplayName("faucet - 1 CARE 충전 후 잔액 증가 확인")
    void faucet() throws Exception {
        BigInteger before = careTokenService.balanceOf(TEST_ADDRESS);

        String txHash = careTokenService.faucet(TEST_ADDRESS, 1.0);
        System.out.println("txHash: " + txHash);
        assertThat(txHash).isNotNull().startsWith("0x");

        // 트랜잭션 반영 대기 (SSAFY 체인 블록 생성 대기)
        Thread.sleep(10000);

        BigInteger after = careTokenService.balanceOf(TEST_ADDRESS);
        System.out.println("충전 전: " + before + " / 충전 후: " + after);
        assertThat(after).isGreaterThan(before);
    }

    @Test
    @DisplayName("환전 - 렌터 지갑에서 burn 후 토큰 컨트랙트에 faucet (총 공급량 유지)")
    void exchange() throws Exception {
        String contractAddress = careTokenService.getTokenContractAddress();
        System.out.println("토큰 컨트랙트 주소: " + contractAddress);

        // 1) 테스트 준비: 렌터 지갑에 100 CARE 충전
        careTokenService.faucet(TEST_ADDRESS, 100.0);

        BigInteger renterBefore = careTokenService.balanceOf(TEST_ADDRESS);
        BigInteger contractBefore = careTokenService.balanceOf(contractAddress);
        System.out.println("환전 전 렌터 잔액: " + renterBefore);
        System.out.println("환전 전 컨트랙트 잔액: " + contractBefore);

        // 2) 환전: 렌터 → 컨트랙트 100 CARE transfer (burn + faucet)
        double exchangeAmount = 100;
        String txHash = careTokenService.transfer(TEST_ADDRESS, contractAddress, exchangeAmount);
        System.out.println("환전 txHash: " + txHash);
        assertThat(txHash).isNotNull().startsWith("0x");

        // 3) 잔액 검증
        BigInteger renterAfter = careTokenService.balanceOf(TEST_ADDRESS);
        BigInteger contractAfter = careTokenService.balanceOf(contractAddress);
        System.out.println("환전 후 렌터 잔액: " + renterAfter);
        System.out.println("환전 후 컨트랙트 잔액: " + contractAfter);

        BigInteger expectedBurn = CareTokenService.toCare(exchangeAmount);
        assertThat(renterBefore.subtract(renterAfter)).isEqualTo(expectedBurn);
        assertThat(contractAfter.subtract(contractBefore)).isEqualTo(expectedBurn);
    }
}
