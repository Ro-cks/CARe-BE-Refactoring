package com.care.domain.reservation.entity;

import com.care.domain.car.entity.OwnedCar;
import com.care.domain.company.entity.Insurance;
import com.care.domain.renter.entity.Renter;
import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reservation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Reservation extends BaseEntity {

    @Id
    @Column(name = "reservation_id", length = 100)
    private String reservationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Renter renter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private OwnedCar ownedCar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insurance_id", nullable = false)
    private Insurance insurance;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "smart_contract_address", length = 100, nullable = false)
    private String smartContractAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "deposit_status")
    private DepositStatus depositStatus;

    @Column(name = "before_scan_tx_hash", length = 100)
    private String beforeScanTxHash;

    @Column(name = "after_scan_tx_hash", length = 100)
    private String afterScanTxHash;

    @Column(name = "payment_tx_hash", length = 100)
    private String paymentTxHash;

    @Column(name = "pickup_date")
    private LocalDateTime pickupDate;

    @Column(name = "return_date")
    private LocalDateTime returnDate;

    @Column(name = "total_price")
    private int totalPrice;

    public enum DepositStatus {
        SAFE, LOCKED, DEDUCTED
    }

    public static Reservation create(Renter renter, OwnedCar ownedCar, Insurance insurance,
                                     LocalDateTime pickupDate, LocalDateTime returnDate,
                                     int totalPrice, String paymentTxHash) {
        Reservation r = new Reservation();
        r.reservationId = UUID.randomUUID().toString();
        r.renter = renter;
        r.ownedCar = ownedCar;
        r.insurance = insurance;
        r.status = "RESERVED";
        r.smartContractAddress = "";
        r.depositStatus = DepositStatus.SAFE;
        r.pickupDate = pickupDate;
        r.returnDate = returnDate;
        r.totalPrice = totalPrice;
        r.paymentTxHash = paymentTxHash;
        return r;
    }

    public void updateStatusToInUse() {
        this.status = "IN_USE";
    }

    public void updateStatusToAfterScan() {
        this.status = "AFTER_SCAN";
    }

    public void updateStatusToCompleted() {
        this.status = "COMPLETED";
    }

    public void lockDeposit() {
        this.depositStatus = DepositStatus.LOCKED;
    }

    public void deductDeposit() {
        this.depositStatus = DepositStatus.DEDUCTED;
    }

    public void safeDeposit() {
        this.depositStatus = DepositStatus.SAFE;
    }
}
