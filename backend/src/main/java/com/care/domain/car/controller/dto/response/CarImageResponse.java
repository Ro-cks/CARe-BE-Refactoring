package com.care.domain.car.controller.dto.response;

import com.care.domain.car.entity.CarImage;

public record CarImageResponse(
        String side,
        String s3Url,
        String ipfsCid
) {
    public static CarImageResponse from(CarImage image) {
        return new CarImageResponse(
                image.getSide().name(),
                image.getS3Url(),
                image.getIpfsCid()
        );
    }
}
