package com.care.domain.reservation.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "report_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportItem extends BaseEntity {

    @Id
    @Column(name = "item_id", length = 36)
    private String itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @Column(name = "car_part", length = 100, nullable = false)
    private String carPart;

    @Column(name = "before_log_id", length = 100)
    private String beforeLogId;

    @Column(name = "after_log_id", length = 100, nullable = false)
    private String afterLogId;

    @Column(name = "before_crop_s3_url", length = 255)
    private String beforeCropS3Url;

    @Column(name = "after_crop_s3_url", length = 255)
    private String afterCropS3Url;

    @Column(name = "similarity", nullable = false)
    private double similarity;

    @Column(name = "diff_score", nullable = false)
    private double diffScore;

    @Column(name = "is_new_scratch", nullable = false)
    private boolean isNewScratch;

    @Column(name = "warning", nullable = false)
    private boolean warning;

    void assignReport(Report report) {
        this.report = report;
    }

    public static ReportItem create(String itemId, String carPart, String beforeLogId, String afterLogId,
                                    String beforeCropS3Url, String afterCropS3Url,
                                    double similarity, double diffScore,
                                    boolean isNewScratch, boolean warning) {
        ReportItem item = new ReportItem();
        item.itemId = itemId;
        item.carPart = carPart;
        item.beforeLogId = beforeLogId;
        item.afterLogId = afterLogId;
        item.beforeCropS3Url = beforeCropS3Url;
        item.afterCropS3Url = afterCropS3Url;
        item.similarity = similarity;
        item.diffScore = diffScore;
        item.isNewScratch = isNewScratch;
        item.warning = warning;
        return item;
    }
}
