package com.care.domain.car.controller.dto.response;

import com.care.domain.car.entity.CarImage;
import com.care.domain.car.entity.CarSize;
import com.care.domain.car.entity.OwnedCar;

import java.util.List;

public record CarDetailResponse(
        String carId,
        String plateNumber,
        String status,
        String nftTokenId,
        String brand,
        String modelName,
        String fuelType,
        CarSize carSize,
        String companyName,
        String countryCode,
        String airportCode,
        String thumbnailUrl,
        int dailyPrice,
        List<CarImageResponse> images
) {
    public static CarDetailResponse of(OwnedCar car, List<CarImageResponse> images) {
        return new CarDetailResponse(
                car.getCarId(),
                car.getPlateNumber(),
                car.getStatus().name(),
                car.getNftTokenId(),
                car.getCarModel().getBrand(),
                car.getCarModel().getModelName(),
                car.getCarModel().getFuelType(),
                car.getCarModel().getCarSize(),
                car.getCompany().getName(),
                car.getCompany().getCountryCode(),
                car.getCompany().getAirportCode(),
                car.getCarModel().getThumbnailUrl(),
                car.getDailyPrice(),
                images
        );
    }
}
