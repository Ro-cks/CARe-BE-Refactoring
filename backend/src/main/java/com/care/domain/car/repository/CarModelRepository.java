package com.care.domain.car.repository;

import com.care.domain.car.entity.CarModel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CarModelRepository extends JpaRepository<CarModel, String> {
}
