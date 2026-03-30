package com.care.domain.renter.entity;

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
@Table(name = "renter_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RenterNotification extends BaseEntity {

    private static final String DISPUTE_CREATED_TYPE = "DISPUTE_CREATED";
    private static final String DISPUTE_CREATED_TITLE = "분쟁이 접수되었습니다.";
    private static final String SETTLEMENT_REQUESTED_TYPE = "SETTLEMENT_REQUESTED";
    private static final String SETTLEMENT_COMPLETED_TYPE = "SETTLEMENT_COMPLETED";
    private static final String RESERVATION_CREATED_TYPE = "RESERVATION_CREATED";
    private static final String RESERVATION_COMPLETED_TYPE = "RESERVATION_COMPLETED";

    @Id
    @Column(name = "notification_id", length = 100)
    private String notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "renter_id", referencedColumnName = "user_id", nullable = false)
    private Renter renter;

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

    public static RenterNotification disputeCreated(Renter renter,
                                                    String reservationId,
                                                    String disputeId,
                                                    String reason) {
        if (renter == null) {
            throw new IllegalArgumentException("renter는 필수입니다.");
        }
        if (reservationId == null || reservationId.isBlank()) {
            throw new IllegalArgumentException("reservationId는 필수입니다.");
        }
        if (disputeId == null || disputeId.isBlank()) {
            throw new IllegalArgumentException("disputeId는 필수입니다.");
        }

        RenterNotification notification = new RenterNotification();
        notification.notificationId = UUID.randomUUID().toString();
        notification.renter = renter;
        notification.notificationType = DISPUTE_CREATED_TYPE;
        notification.title = DISPUTE_CREATED_TITLE;
        notification.message = buildDisputeCreatedMessage(reservationId, reason);
        notification.disputeId = disputeId;
        notification.reservationId = reservationId;
        notification.read = false;
        notification.readAt = null;
        return notification;
    }

    public static RenterNotification settlementRequested(Renter renter,
                                                         String reservationId,
                                                         String disputeId,
                                                         long finalAmount) {
        if (renter == null) {
            throw new IllegalArgumentException("renter는 필수입니다.");
        }
        if (reservationId == null || reservationId.isBlank()) {
            throw new IllegalArgumentException("reservationId는 필수입니다.");
        }
        if (disputeId == null || disputeId.isBlank()) {
            throw new IllegalArgumentException("disputeId는 필수입니다.");
        }

        RenterNotification notification = new RenterNotification();
        notification.notificationId = UUID.randomUUID().toString();
        notification.renter = renter;
        notification.notificationType = SETTLEMENT_REQUESTED_TYPE;
        notification.title = "업체가 정산에 동의했습니다.";
        String shortId = reservationId.substring(0, Math.min(8, reservationId.length())).toUpperCase();
        String amountMsg = finalAmount == 0 ? "무과실 인정 (환불)" : finalAmount + " CARE";
        notification.message = "예약 #" + shortId + " — " + amountMsg + "\n최종 동의 여부를 확인해주세요.";
        notification.disputeId = disputeId;
        notification.reservationId = reservationId;
        notification.read = false;
        notification.readAt = null;
        return notification;
    }

    public static RenterNotification settlementCompleted(Renter renter,
                                                         String reservationId,
                                                         String disputeId,
                                                         String settlementStatus,
                                                         long finalAmount) {
        if (renter == null) {
            throw new IllegalArgumentException("renter는 필수입니다.");
        }
        if (reservationId == null || reservationId.isBlank()) {
            throw new IllegalArgumentException("reservationId는 필수입니다.");
        }
        if (disputeId == null || disputeId.isBlank()) {
            throw new IllegalArgumentException("disputeId는 필수입니다.");
        }

        RenterNotification notification = new RenterNotification();
        notification.notificationId = UUID.randomUUID().toString();
        notification.renter = renter;
        notification.notificationType = SETTLEMENT_COMPLETED_TYPE;
        notification.title = "분쟁 정산이 완료되었습니다.";
        String shortId2 = reservationId.substring(0, Math.min(8, reservationId.length())).toUpperCase();
        String statusMsg = "REFUNDED".equals(settlementStatus) ? "무과실 처리 (전액 환불)" : finalAmount + " CARE 차감";
        notification.message = "예약 #" + shortId2 + " 분쟁 정산이 완료되었습니다.\n" + statusMsg;
        notification.disputeId = disputeId;
        notification.reservationId = reservationId;
        notification.read = false;
        notification.readAt = null;
        return notification;
    }

    public static RenterNotification reservationCreated(Renter renter, String reservationId, String modelName, int totalPrice) {
        RenterNotification n = new RenterNotification();
        n.notificationId = UUID.randomUUID().toString();
        n.renter = renter;
        n.notificationType = RESERVATION_CREATED_TYPE;
        n.title = "예약이 완료되었습니다.";
        n.message = modelName + " 예약이 확정되었습니다. 결제 금액: " + totalPrice + " CARE";
        n.reservationId = reservationId;
        n.read = false;
        return n;
    }

    public static RenterNotification reservationCompleted(Renter renter, String reservationId, String modelName) {
        RenterNotification n = new RenterNotification();
        n.notificationId = UUID.randomUUID().toString();
        n.renter = renter;
        n.notificationType = RESERVATION_COMPLETED_TYPE;
        n.title = "반납이 완료되었습니다.";
        n.message = modelName + " 차량 반납이 정상적으로 처리되었습니다. 이용해주셔서 감사합니다.";
        n.reservationId = reservationId;
        n.read = false;
        return n;
    }

    public void markAsRead() {
        if (this.read) {
            return;
        }
        this.read = true;
        this.readAt = LocalDateTime.now();
    }

    private static String buildDisputeCreatedMessage(String reservationId, String reason) {
        String shortId = reservationId.substring(0, Math.min(8, reservationId.length())).toUpperCase();
        if (reason == null || reason.isBlank()) {
            return "예약 #" + shortId + "에서 새로운 분쟁이 접수되었습니다.";
        }
        return "예약 #" + shortId + "에서 새로운 분쟁이 접수되었습니다.\n사유: " + reason;
    }
}
