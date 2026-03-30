package com.care.domain.car.controller;

import com.care.domain.car.controller.dto.response.CarDetailResponse;
import com.care.domain.car.controller.dto.response.CarReviewResponse;
import com.care.domain.car.controller.dto.response.CarSummaryResponse;
import com.care.domain.car.controller.dto.response.ReturnReportResponse;
import com.care.domain.car.entity.CarSize;
import com.care.domain.car.service.CarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;



@RestController
@RequiredArgsConstructor
@RequestMapping("/cars")
public class CarController {

    private final CarService carService;

    /**
     * GET /cars?brand=현대&countryCode=KR&airportCode=ICN&carSize=SMALL
     * 차량 목록 조회 - 필터 (공통, 파라미터 없으면 전체 조회)
     */
    @GetMapping
    public ResponseEntity<List<CarSummaryResponse>> getCarList(
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) CarSize carSize
    ) {
        return ResponseEntity.ok(carService.getCarSummaryList(brand, airportCode, carSize));
    }

    /**
     * GET /cars/{carId}
     * 차량 상세 조회 (공통)
     */
    @GetMapping("/{carId}")
    public ResponseEntity<CarDetailResponse> getCarDetail(@PathVariable String carId) {
        return ResponseEntity.ok(carService.getCarDetail(carId));
    }

    /**
     * GET /cars/{carId}/reviews
     * 차량 리뷰 목록 조회
     */
    @GetMapping("/{carId}/reviews")
    public ResponseEntity<List<CarReviewResponse>> getCarReviews(@PathVariable String carId) {
        return ResponseEntity.ok(carService.getCarReviews(carId));
    }

    /**
     * GET /cars/{carId}/return-report?reservationId=xxx
     * 차량 반납 리포트 조회 (reservationId 없으면 전체)
     */
    @GetMapping("/{carId}/return-report")
    public ResponseEntity<ReturnReportResponse> getReturnReport(
            @PathVariable String carId,
            @RequestParam(required = false) String reservationId
    ) {
        return ResponseEntity.ok(carService.getReturnReport(carId, reservationId));
    }
}
