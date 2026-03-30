package com.care.domain.company.controller;

import com.care.domain.car.controller.dto.request.CarRegisterRequest;
import com.care.domain.car.controller.dto.response.CarImageResponse;
import com.care.domain.car.controller.dto.response.CarListResponse;
import com.care.domain.car.controller.dto.response.CarRegisterResponse;
import com.care.domain.car.service.CarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/companies/{companyId}/cars")
public class CompanyCarController {

    private final CarService carService;

    /**
     * GET /companies/{companyId}/cars
     * 회사 차량 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<CarListResponse>> getCarList(@PathVariable String companyId) {
        return ResponseEntity.ok(carService.getCarList(companyId));
    }

    /**
     * POST /companies/{companyId}/cars
     * 차량 등록 및 NFT 발급 (비동기)
     */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<CarRegisterResponse> registerCar(
            @PathVariable String companyId,
            @RequestPart String modelId,
            @RequestPart String plateNumber,
            @RequestPart String dailyPrice, // multipart/form-data에서 int 직접 바인딩 불가 → String으로 받아 parseInt 변환
            @RequestPart MultipartFile frontImage,
            @RequestPart MultipartFile rearImage,
            @RequestPart MultipartFile frontLeftImage,
            @RequestPart MultipartFile frontRightImage,
            @RequestPart MultipartFile rearLeftImage,
            @RequestPart MultipartFile rearRightImage
    ) {
        CarRegisterRequest request = new CarRegisterRequest(modelId, plateNumber, Integer.parseInt(dailyPrice), frontImage, rearImage, frontLeftImage, frontRightImage, rearLeftImage, rearRightImage);
        return ResponseEntity.ok(carService.registerCar(companyId, request));
    }

    /**
     * GET /companies/{companyId}/cars/{carId}/images
     * 특정 차량의 이미지 목록 조회 (S3 URL + IPFS CID)
     */
    @GetMapping("/{carId}/images")
    public ResponseEntity<List<CarImageResponse>> getCarImages(
            @PathVariable String companyId,
            @PathVariable String carId
    ) {
        return ResponseEntity.ok(carService.getCarImages(companyId, carId));
    }
}
