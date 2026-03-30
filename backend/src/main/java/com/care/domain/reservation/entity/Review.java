package com.care.domain.reservation.entity;

import com.care.domain.car.entity.OwnedCar;
import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "review")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Review extends BaseEntity {

    @Id
    @Column(name = "review_id", length = 100)
    private String reviewId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private OwnedCar ownedCar;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    public static Review create(String reviewId, Reservation reservation, OwnedCar ownedCar, int rating, String content) {
        Review review = new Review();
        review.reviewId = reviewId;
        review.reservation = reservation;
        review.ownedCar = ownedCar;
        review.rating = rating;
        review.content = content;
        return review;
    }
}
