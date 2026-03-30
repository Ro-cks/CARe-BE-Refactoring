package com.care.domain.car.controller.dto.request;

import org.springframework.web.multipart.MultipartFile;

public record CarRegisterRequest(
        String modelId,
        String plateNumber,
        int dailyPrice,
        MultipartFile frontImage,
        MultipartFile rearImage,
        MultipartFile frontLeftImage,
        MultipartFile frontRightImage,
        MultipartFile rearLeftImage,
        MultipartFile rearRightImage
) {}
