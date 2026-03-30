package com.care.global.ai;

/**
 * AI 흠집 비교 결과를 담는 불변 DTO
 * similarity: [0, 1] 범위의 코사인 유사도, diffScore: 피처맵 차이값
 */
public record AiScratchSimilarityResult(
        double similarity,
        double diffScore
) {
}
