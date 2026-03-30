package com.care.domain.reservation.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "report")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report extends BaseEntity {

    @Id
    @Column(name = "report_id", length = 36)
    private String reportId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false, unique = true)
    private Reservation reservation;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "similarity_threshold", nullable = false)
    private double similarityThreshold;

    @Column(name = "warning_count", nullable = false)
    private int warningCount;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReportItem> items = new ArrayList<>();

    public static Report create(String reportId, Reservation reservation, double similarityThreshold,
                                int warningCount, List<ReportItem> items) {
        Report report = new Report();
        report.reportId = reportId;
        report.reservation = reservation;
        report.generatedAt = LocalDateTime.now();
        report.similarityThreshold = similarityThreshold;
        report.warningCount = warningCount;
        items.forEach(item -> {
            item.assignReport(report);
            report.items.add(item);
        });
        return report;
    }
}
