package com.care.domain.renter.controller.dto.response;

import com.care.domain.renter.entity.RenterNotification;

import java.time.LocalDateTime;

public record RenterNotificationResponse(
        String notificationId,
        String notificationType,
        String title,
        String message,
        String reservationId,
        String disputeId,
    boolean read,
        LocalDateTime readAt,
        LocalDateTime createdAt
) {
    public static RenterNotificationResponse from(RenterNotification notification) {
        return new RenterNotificationResponse(
                notification.getNotificationId(),
                notification.getNotificationType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getReservationId(),
                notification.getDisputeId(),
                notification.isRead(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
