package com.care.domain.company.entity;

import com.care.domain.reservation.entity.Dispute;
import com.care.domain.reservation.entity.Scratch;
import com.care.global.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "company_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompanyNotification extends BaseEntity {

    private static final String DEFENSE_SUBMITTED_TYPE = "DEFENSE_SUBMITTED";
    private static final String SETTLEMENT_REQUESTED_TYPE = "SETTLEMENT_REQUESTED";
    private static final String SETTLEMENT_COMPLETED_TYPE = "SETTLEMENT_COMPLETED";

    @Id
    @Column(name = "notification_id", length = 100)
    private String notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", referencedColumnName = "company_id", nullable = false)
    private Company company;

    @Column(name = "notification_type", length = 50, nullable = false)
    private String notificationType;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "dispute_id", length = 100)
    private String disputeId;

    @Column(name = "reservation_id", length = 100)
    private String reservationId;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    public static CompanyNotification defenseSubmitted(Company company, Dispute dispute, Scratch defenseScratch) {
        if (company == null) {
            throw new IllegalArgumentException("company는 필수입니다.");
        }
        if (dispute == null) {
            throw new IllegalArgumentException("dispute는 필수입니다.");
        }

        CompanyNotification notification = new CompanyNotification();
        notification.notificationId = UUID.randomUUID().toString();
        notification.company = company;
        notification.notificationType = DEFENSE_SUBMITTED_TYPE;
        notification.title = "렌터가 증거를 제출했습니다.";
        notification.message = buildDefenseSubmittedMessage(dispute, defenseScratch);
        notification.disputeId = dispute.getDisputeId();
        notification.reservationId = dispute.getReservation().getReservationId();
        notification.read = false;
        notification.readAt = null;
        return notification;
    }

    public static CompanyNotification settlementRequested(Company company, Dispute dispute, long finalAmount) {
        if (company == null) {
            throw new IllegalArgumentException("company는 필수입니다.");
        }
        if (dispute == null) {
            throw new IllegalArgumentException("dispute는 필수입니다.");
        }

        CompanyNotification notification = new CompanyNotification();
        notification.notificationId = UUID.randomUUID().toString();
        notification.company = company;
        notification.notificationType = SETTLEMENT_REQUESTED_TYPE;
        notification.title = "렌터가 정산에 동의했습니다.";
        notification.message = "예약 " + dispute.getReservation().getReservationId()
                + " 분쟁에서 렌터 동의가 완료되었습니다. 정산 금액: " + finalAmount + "원";
        notification.disputeId = dispute.getDisputeId();
        notification.reservationId = dispute.getReservation().getReservationId();
        notification.read = false;
        notification.readAt = null;
        return notification;
    }

    public static CompanyNotification settlementCompleted(
            Company company,
            Dispute dispute,
            String settlementStatus,
            long finalAmount
    ) {
        if (company == null) {
            throw new IllegalArgumentException("company는 필수입니다.");
        }
        if (dispute == null) {
            throw new IllegalArgumentException("dispute는 필수입니다.");
        }

        CompanyNotification notification = new CompanyNotification();
        notification.notificationId = UUID.randomUUID().toString();
        notification.company = company;
        notification.notificationType = SETTLEMENT_COMPLETED_TYPE;
        notification.title = "분쟁 정산이 완료되었습니다.";
        notification.message = "예약 " + dispute.getReservation().getReservationId()
                + " 분쟁이 최종 정산되었습니다. 상태: " + settlementStatus + ", 금액: " + finalAmount + "원";
        notification.disputeId = dispute.getDisputeId();
        notification.reservationId = dispute.getReservation().getReservationId();
        notification.read = false;
        notification.readAt = null;
        return notification;
    }

    public void markAsRead() {
        if (this.read) {
            return;
        }
        this.read = true;
        this.readAt = LocalDateTime.now();
    }

    private static String buildDefenseSubmittedMessage(Dispute dispute, Scratch defenseScratch) {
        if (defenseScratch == null) {
            return "예약 " + dispute.getReservation().getReservationId() + " 분쟁에 렌터가 증거를 제출했습니다.";
        }
        return "예약 " + dispute.getReservation().getReservationId()
                + " 분쟁에 렌터가 증거를 제출했습니다. 부위: " + defenseScratch.getCarPart();
    }
}
