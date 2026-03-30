package com.care.domain.car.controller.dto.response;

import com.care.domain.reservation.entity.Review;

import java.time.LocalDateTime;

public record CarReviewResponse(
        String reviewId,
        String reservationId,
        int rating,
        String content,
        LocalDateTime createdAt
) {
    public static CarReviewResponse from(Review review) {
        return new CarReviewResponse(
                review.getReviewId(),
                review.getReservation().getReservationId(),
                review.getRating(),
                review.getContent(),
                review.getCreatedAt()
        );
    }
}
