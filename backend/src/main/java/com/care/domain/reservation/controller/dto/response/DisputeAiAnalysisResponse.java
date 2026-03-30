package com.care.domain.reservation.controller.dto.response;

import java.util.List;

public record DisputeAiAnalysisResponse(
        String disputeId,
        String reservationId,
        int beforeCount,
        int afterCount,
        List<ComparisonItem> comparisons
) {
    public record ComparisonItem(
            String beforeLogId,
            String afterLogId,
            String beforeCropS3Url,
            String afterCropS3Url,
            double similarity,
            double diffScore
    ) {
    }
}