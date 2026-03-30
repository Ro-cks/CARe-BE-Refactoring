package com.care.domain.car.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "car_model")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CarModel extends BaseEntity {

    @Id
    @Column(name = "model_id", length = 100)
    private String modelId;

    @Column(name = "brand", length = 50, nullable = false)
    private String brand;

    @Column(name = "model_name", length = 100, nullable = false)
    private String modelName;

    @Column(name = "fuel_type", length = 20, nullable = false)
    private String fuelType;

    @Enumerated(EnumType.STRING)
    @Column(name = "car_size", length = 10, nullable = false)
    private CarSize carSize;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "thumbnail_ipfs_cid", length = 200)
    private String thumbnailIpfsCid;

    public static CarModel create(String modelId, String brand, String modelName, String fuelType, CarSize carSize) {
        CarModel carModel = new CarModel();
        carModel.modelId = modelId;
        carModel.brand = brand;
        carModel.modelName = modelName;
        carModel.fuelType = fuelType;
        carModel.carSize = carSize;
        return carModel;
    }

    public void updateThumbnail(String thumbnailUrl, String thumbnailIpfsCid) {
        this.thumbnailUrl = thumbnailUrl;
        this.thumbnailIpfsCid = thumbnailIpfsCid;
    }
}
