package com.care.domain.car.controller.dto.response;

import com.care.domain.car.entity.CarSize;
import com.care.domain.car.entity.OwnedCar;

public record CarSummaryResponse(
        String carId,
        String plateNumber,
        String brand,
        String modelName,
        String fuelType,
        CarSize carSize,
        String countryCode,
        String airportCode,
        String companyId,
        String companyName,
        String thumbnailUrl,
        String frontImageUrl,
        int dailyPrice
) {
    public static CarSummaryResponse of(OwnedCar car, String frontImageUrl) {
        return new CarSummaryResponse(
                car.getCarId(),
                car.getPlateNumber(),
                car.getCarModel().getBrand(),
                car.getCarModel().getModelName(),
                car.getCarModel().getFuelType(),
                car.getCarModel().getCarSize(),
                car.getCompany().getCountryCode(),
                car.getCompany().getAirportCode(),
                car.getCompany().getCompanyId(),
                car.getCompany().getName(),
                car.getCarModel().getThumbnailUrl(),
                frontImageUrl,
                car.getDailyPrice()
        );
    }
}
