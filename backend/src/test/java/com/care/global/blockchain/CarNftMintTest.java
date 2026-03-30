package com.care.global.blockchain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * CarNFT 실제 민팅 통합 테스트
 * - SSAFY 블록체인 네트워크에 실제 트랜잭션을 전송합니다.
 * - 배포자 private key가 필요합니다 (onlyOwner).
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:blockchain-local.properties")
class CarNftMintTest {

    // 민팅 대상 지갑 (테스트용 — 배포자 주소 사용)
    private static final String TO_ADDRESS = "0x270A5A0016201D643bE8c788BD79C97938E07ff5";

    @Autowired
    CarNftService carNftService;

    @Test
    void NFT_민팅_실제_트랜잭션_테스트() throws Exception {
        String tokenUri = "ipfs://QmTestCarMetadata_" + System.currentTimeMillis();

        String tokenId = carNftService.mint(TO_ADDRESS, tokenUri);

        System.out.println("===========================================");
        System.out.println("✅ NFT 민팅 성공");
        System.out.println("   tokenId  : " + tokenId);
        System.out.println("   to       : " + TO_ADDRESS);
        System.out.println("   tokenUri : " + tokenUri);
        System.out.println("===========================================");

        assertThat(tokenId).isNotBlank();
    }
}
