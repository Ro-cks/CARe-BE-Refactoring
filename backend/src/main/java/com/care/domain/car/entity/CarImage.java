package com.care.domain.car.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "car_image")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CarImage extends BaseEntity {

    public enum Side { FRONT, REAR, FRONT_LEFT, FRONT_RIGHT, REAR_LEFT, REAR_RIGHT }

    @Id
    @Column(name = "id", length = 100)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private OwnedCar car;

    @Enumerated(EnumType.STRING)
    @Column(name = "side", length = 15, nullable = false)
    private Side side;

    @Column(name = "s3_url", length = 500, nullable = false)
    private String s3Url;

    @Column(name = "ipfs_cid", length = 200, nullable = false)
    private String ipfsCid;

    public static CarImage create(String id, OwnedCar car, Side side, String s3Url, String ipfsCid) {
        CarImage image = new CarImage();
        image.id = id;
        image.car = car;
        image.side = side;
        image.s3Url = s3Url;
        image.ipfsCid = ipfsCid;
        return image;
    }
}
