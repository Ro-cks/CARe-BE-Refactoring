package com.care.domain.car.controller.dto.response;

import com.care.domain.reservation.entity.Scratch;

import java.time.LocalDateTime;
import java.util.List;

public record ReturnReportResponse(
        String reservationId,
        String carId,
    List<ScratchDetail> scratches,
    double similarityThreshold,
    int warningCount,
    List<ComparisonDetail> comparisons
) {
    public record ScratchDetail(
            String logId,
            String logType,
            String carPart,
            float coordX,
            float coordY,
            String originalS3Url,
            String cropS3Url,
            String proofIpfsCid,
            boolean isManual,
            boolean isDisputed,
            LocalDateTime createdAt
    ) {
        public static ScratchDetail from(Scratch scratch) {
            return new ScratchDetail(
                    scratch.getLogId(),
                    scratch.getLogType(),
                    scratch.getCarPart(),
                    scratch.getCoordX(),
                    scratch.getCoordY(),
                    scratch.getOriginalS3Url(),
                    scratch.getCropS3Url(),
                    scratch.getProofIpfsCid(),
                    scratch.isManual(),
                    scratch.isDisputed(),
                    scratch.getCreatedAt()
            );
        }
    }

        public record ComparisonDetail(
            String beforeLogId,
            String afterLogId,
            String beforeCropS3Url,
            String afterCropS3Url,
            double similarity,
            double diffScore,
            boolean warning,
            boolean isNewScratch
        ) {
        }

        public static ReturnReportResponse of(
            String reservationId,
            String carId,
            List<Scratch> scratches,
            double similarityThreshold,
            List<ComparisonDetail> comparisons
        ) {
        int warningCount = (int) comparisons.stream().filter(ComparisonDetail::warning).count();
        return new ReturnReportResponse(
                reservationId,
                carId,
            scratches.stream().map(ScratchDetail::from).toList(),
            similarityThreshold,
            warningCount,
            comparisons
        );
    }
}
