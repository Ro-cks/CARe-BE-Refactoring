package com.care.global.external.privy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.Map;

/**
 * Privy Pregenerate Embedded Wallet API
 *
 * - 프론트(renter)는 Node.js 프록시 서버(privy-server.mjs)를 통해 지갑 생성
 * - 백엔드(company 등)는 Node.js 프록시 서버에 HTTP 요청으로 지갑 생성
 */
@Slf4j
@Service
public class PrivyWalletService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${privy.server-url:http://localhost:3001}")
    private String privyServerUrl;

    public PrivyWalletService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * 회원가입 시 Privy 임베디드 지갑 자동 생성
     * @return [walletAddress, privyWalletId] — 실패 시 [null, null]
     */
    public String[] createWalletForUser(String email) {
        log.info("[Privy] createWalletForUser - email: {}", email);

        if (privyServerUrl == null || privyServerUrl.isBlank()) {
            log.warn("[Privy] PRIVY_SERVER_URL 미설정 - 지갑 생성 스킵");
            return new String[]{null, null};
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(
                    Map.of("email", email), headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    privyServerUrl + "/privy/wallet", request, String.class);

            log.info("[Privy] 응답 status: {}", response.getStatusCode());

            JsonNode root = objectMapper.readTree(response.getBody());
            String walletAddress = root.path("walletAddress").asText(null);
            String walletId = root.path("walletId").asText(null);

            if (walletAddress != null) {
                log.info("[Privy] 지갑 생성 완료 - address: {}, walletId: {}", walletAddress, walletId);
                return new String[]{walletAddress, walletId};
            }

            log.warn("[Privy] 응답에 지갑 주소 없음 - body: {}", response.getBody());

        } catch (Exception e) {
            log.error("[Privy] 지갑 생성 실패: {}", e.getMessage(), e);
        }

        return new String[]{null, null};
    }
}

