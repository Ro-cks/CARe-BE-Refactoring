package com.care.domain.car.repository;

import com.care.domain.car.entity.CarImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CarImageRepository extends JpaRepository<CarImage, String> {
    List<CarImage> findByCarCarId(String carId);
    Optional<CarImage> findByCarCarIdAndSide(String carId, CarImage.Side side);
}
