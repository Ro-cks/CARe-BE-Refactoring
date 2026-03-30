package com.care.global.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiScratchSimilarityClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gms.api-key:}")
    private String gmsApiKey;

    private static final String GMS_URL = "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
    private static final String PROMPT =
            "두 차량 흠집 이미지를 비교하세요. 첫 번째는 기준(반납 전) 흠집, 두 번째는 대상(반납 후) 흠집입니다. " +
            "흠집의 형태, 크기, 위치, 외관을 분석하여 동일한 흠집인지 판단하세요. " +
            "반드시 다음 JSON만 반환하세요 (설명 없이): " +
            "{\"similarity\": <0.0~1.0>, \"diff_score\": <0.0~1.0>} " +
            "similarity는 동일 흠집일수록 1.0에 가깝고, diff_score는 1.0 - similarity 입니다.";

    /**
     * 두 흠집 이미지 URL을 GMS(Claude Vision API)로 비교하여 유사도 반환
     */
    @SuppressWarnings("unchecked")
    public AiScratchSimilarityResult compareByUrls(String refCropS3Url, String targetCropS3Url) {
        byte[] refBytes = restTemplate.getForObject(refCropS3Url, byte[].class);
        byte[] targetBytes = restTemplate.getForObject(targetCropS3Url, byte[].class);

        if (refBytes == null || targetBytes == null) {
            throw new IllegalStateException("흠집 이미지 다운로드 실패");
        }

        String refBase64 = Base64.getEncoder().encodeToString(refBytes);
        String targetBase64 = Base64.getEncoder().encodeToString(targetBytes);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        inlineData(refBase64, detectMediaType(refCropS3Url)),
                                        inlineData(targetBase64, detectMediaType(targetCropS3Url)),
                                        Map.of("text", PROMPT)
                                )
                        )
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", gmsApiKey);

        Map<String, Object> response = (Map<String, Object>) restTemplate.postForObject(
                GMS_URL,
                new HttpEntity<>(requestBody, headers),
                Map.class
        );

        if (response == null) {
            throw new IllegalStateException("GMS API 응답이 비어 있습니다.");
        }

        String textContent = extractTextContent(response);
        return parseResult(textContent);
    }

    @SuppressWarnings("unchecked")
    private String extractTextContent(Map<String, Object> response) {
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalStateException("GMS 응답에 candidates가 없습니다.");
        }
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        if (content == null) {
            throw new IllegalStateException("GMS 응답에 content가 없습니다.");
        }
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) {
            throw new IllegalStateException("GMS 응답에 parts가 없습니다.");
        }
        Object text = parts.get(0).get("text");
        if (text == null) {
            throw new IllegalStateException("GMS 응답 parts에 text가 없습니다.");
        }
        return text.toString();
    }

    private AiScratchSimilarityResult parseResult(String text) {
        try {
            // JSON 블록만 추출 (Claude가 앞뒤에 텍스트를 붙이는 경우 대비)
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start == -1 || end == -1) {
                throw new IllegalStateException("응답에서 JSON을 찾을 수 없습니다: " + text);
            }
            String json = text.substring(start, end + 1);
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {});
            double similarity = toDouble(parsed.get("similarity"));
            double diffScore = toDouble(parsed.get("diff_score"));
            log.info("[GMS Similarity] similarity={}, diffScore={}", similarity, diffScore);
            return new AiScratchSimilarityResult(similarity, diffScore);
        } catch (Exception e) {
            throw new IllegalStateException("GMS 응답 파싱 실패: " + text, e);
        }
    }

    private Map<String, Object> inlineData(String base64Data, String mimeType) {
        return Map.of(
                "inlineData", Map.of(
                        "mimeType", mimeType,
                        "data", base64Data
                )
        );
    }

    private String detectMediaType(String url) {
        String lower = url.toLowerCase();
        if (lower.contains(".png")) return "image/png";
        if (lower.contains(".gif")) return "image/gif";
        if (lower.contains(".webp")) return "image/webp";
        return "image/jpeg";
    }

    private double toDouble(Object value) {
        if (value instanceof Number n) return n.doubleValue();
        if (value == null) return 0.0;
        return Double.parseDouble(value.toString());
    }
}
