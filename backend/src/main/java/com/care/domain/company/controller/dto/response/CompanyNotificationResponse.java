package com.care.domain.company.controller.dto.response;

import com.care.domain.company.entity.CompanyNotification;

import java.time.LocalDateTime;

public record CompanyNotificationResponse(
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
    public static CompanyNotificationResponse from(CompanyNotification notification) {
        return new CompanyNotificationResponse(
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
