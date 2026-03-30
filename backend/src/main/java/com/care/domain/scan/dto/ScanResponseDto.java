package com.care.domain.scan.dto;

import com.care.domain.reservation.entity.Scratch;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
@Getter
@Builder
public class ScanResponseDto {

    private String logId;
    private String logType;
    private String carPart;
    private float coordX;
    private float coordY;
    private String originalS3Url;
    private String cropS3Url;
    private String proofIpfsCid;
    private boolean isManual;
    private boolean isDisputed;
    private LocalDateTime createdAt;

    public static ScanResponseDto from(Scratch scratch) {
        return ScanResponseDto.builder()
                .logId(scratch.getLogId())
                .logType(scratch.getLogType())
                .carPart(scratch.getCarPart())
                .coordX(scratch.getCoordX())
                .coordY(scratch.getCoordY())
                .originalS3Url(scratch.getOriginalS3Url())
                .cropS3Url(scratch.getCropS3Url())
                .proofIpfsCid(scratch.getProofIpfsCid())
                .isManual(scratch.isManual())
                .isDisputed(scratch.isDisputed())
                .createdAt(scratch.getCreatedAt())
                .build();
    }

    public static List<ScanResponseDto> fromList(List<Scratch> scratches) {
        return scratches.stream()
                .map(ScanResponseDto::from)
                .collect(Collectors.toList());
    }
}