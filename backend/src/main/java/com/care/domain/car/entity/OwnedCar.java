package com.care.domain.car.entity;

import com.care.domain.company.entity.Company;
import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "owned_car")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OwnedCar extends BaseEntity {

    public enum Status { PENDING, ACTIVE, FAILED }

    @Id
    @Column(name = "car_id", length = 100)
    private String carId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id", nullable = false)
    private CarModel carModel;

    @Column(name = "plate_number", length = 100, nullable = false)
    private String plateNumber;

    @Column(name = "nft_token_id", length = 100)
    private String nftTokenId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private Status status;

    @Column(name = "daily_price", nullable = false)
    private int dailyPrice;

    public static OwnedCar create(String carId, Company company, CarModel carModel, String plateNumber, int dailyPrice) {
        OwnedCar car = new OwnedCar();
        car.carId = carId;
        car.company = company;
        car.carModel = carModel;
        car.plateNumber = plateNumber;
        car.dailyPrice = dailyPrice;
        car.status = Status.PENDING;
        return car;
    }

    public void activate(String nftTokenId) {
        this.nftTokenId = nftTokenId;
        this.status = Status.ACTIVE;
    }

    public void fail() {
        this.status = Status.FAILED;
    }
}
