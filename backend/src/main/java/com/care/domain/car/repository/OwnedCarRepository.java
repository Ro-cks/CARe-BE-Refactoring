package com.care.domain.car.repository;

import com.care.domain.car.entity.CarSize;
import com.care.domain.car.entity.OwnedCar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OwnedCarRepository extends JpaRepository<OwnedCar, String> {
    List<OwnedCar> findByCompanyCompanyId(String companyId);

    @Query("SELECT c FROM OwnedCar c JOIN c.carModel m JOIN c.company co " +
           "WHERE c.status = 'ACTIVE' " +
           "AND (:brand IS NULL OR m.brand = :brand) " +
           "AND (:airportCode IS NULL OR co.airportCode = :airportCode) " +
           "AND (:carSize IS NULL OR m.carSize = :carSize)")
    List<OwnedCar> findActiveCarsByFilter(
            @Param("brand") String brand,
            @Param("airportCode") String airportCode,
            @Param("carSize") CarSize carSize
    );
}
