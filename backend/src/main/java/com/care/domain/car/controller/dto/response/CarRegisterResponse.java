package com.care.domain.car.controller.dto.response;

import com.care.domain.car.entity.CarImage;
import com.care.domain.car.entity.OwnedCar;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record CarRegisterResponse(
        String carId,
        String plateNumber,
        String status,
        Map<String, String> imageUrls  // side -> S3 URL
) {
    public static CarRegisterResponse of(OwnedCar car, Map<CarImage.Side, String> imageUrls) {
        Map<String, String> urls = imageUrls.entrySet().stream()
                .collect(Collectors.toMap(e -> e.getKey().name(), Map.Entry::getValue));
        return new CarRegisterResponse(
                car.getCarId(),
                car.getPlateNumber(),
                car.getStatus().name(),
                urls
        );
    }
}
