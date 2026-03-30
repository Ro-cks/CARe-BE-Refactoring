package com.care.domain.reservation.entity;

import com.care.domain.car.entity.OwnedCar;
import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "scratch")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Scratch extends BaseEntity {

    @Id
    @Column(name = "log_id", length = 100)
    private String logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private OwnedCar ownedCar;

    @Column(name = "log_type", length = 50, nullable = false)
    private String logType;

    @Column(name = "car_part", length = 255, nullable = false)
    private String carPart;

    @Column(name = "coord_x", nullable = false)
    private float coordX;

    @Column(name = "coord_y", nullable = false)
    private float coordY;

    @Column(name = "original_s3_url", length = 255, nullable = false)
    private String originalS3Url;

    @Column(name = "crop_s3_url", length = 255, nullable = false)
    private String cropS3Url;

    @Column(name = "proof_ipfs_cid", length = 255)
    private String proofIpfsCid;

    @Column(name = "is_manual", nullable = false)
    private boolean isManual;

    @Column(name = "is_disputed", nullable = false)
    private boolean isDisputed;

    @Column(name = "ai_before_log_id", length = 100)
    private String aiBeforeLogId;

    @Column(name = "ai_similarity")
    private Double aiSimilarity;

    @Column(name = "ai_diff_score")
    private Double aiDiffScore;

    @Column(name = "ai_before_crop_s3_url", length = 255)
    private String aiBeforeCropS3Url;

    public void cacheAiComparison(String beforeLogId, double similarity, double diffScore) {
        this.aiBeforeLogId = beforeLogId;
        this.aiSimilarity = similarity;
        this.aiDiffScore = diffScore;
    }

    public void cacheAiComparison(String beforeLogId, double similarity, double diffScore, String beforeCropS3Url) {
        this.aiBeforeLogId = beforeLogId;
        this.aiSimilarity = similarity;
        this.aiDiffScore = diffScore;
        this.aiBeforeCropS3Url = beforeCropS3Url;
    }

    public void markDisputed() {
        this.isDisputed = true;
    }

    public void clearDisputed() {
        this.isDisputed = false;
    }

}
