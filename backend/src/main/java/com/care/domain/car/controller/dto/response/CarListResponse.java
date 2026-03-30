package com.care.domain.car.controller.dto.response;

import com.care.domain.car.entity.CarImage;
import com.care.domain.car.entity.OwnedCar;

public record CarListResponse(
        String carId,
        String plateNumber,
        String status,
        String brand,
        String modelName,
        String fuelType,
        String thumbnailUrl,
        String frontImageUrl,
        int dailyPrice
) {
    public static CarListResponse of(OwnedCar car, String frontImageUrl) {
        return new CarListResponse(
                car.getCarId(),
                car.getPlateNumber(),
                car.getStatus().name(),
                car.getCarModel().getBrand(),
                car.getCarModel().getModelName(),
                car.getCarModel().getFuelType(),
                car.getCarModel().getThumbnailUrl(),
                frontImageUrl,
                car.getDailyPrice()
        );
    }
}
