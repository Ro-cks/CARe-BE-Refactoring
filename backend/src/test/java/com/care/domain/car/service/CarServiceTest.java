package com.care.domain.car.service;

import com.care.domain.car.controller.dto.request.CarRegisterRequest;
import com.care.domain.car.controller.dto.response.CarRegisterResponse;
import com.care.domain.car.entity.CarImage.Side;
import com.care.domain.car.entity.CarModel;
import com.care.domain.car.entity.CarSize;
import com.care.domain.car.entity.OwnedCar;
import com.care.domain.car.exception.CarErrorCode;
import com.care.domain.car.repository.CarImageRepository;
import com.care.domain.car.repository.CarModelRepository;
import com.care.domain.car.repository.OwnedCarRepository;
import com.care.domain.company.entity.Company;
import com.care.domain.company.exception.CompanyErrorCode;
import com.care.domain.company.repository.CompanyRepository;
import com.care.global.blockchain.CarNftService;
import com.care.global.exception.BusinessException;
import com.care.global.ipfs.PinataService;
import com.care.global.s3.S3Service;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CarServiceTest {

    @Autowired CarService carService;
    @Autowired CompanyRepository companyRepository;
    @Autowired CarModelRepository carModelRepository;
    @Autowired OwnedCarRepository ownedCarRepository;
    @Autowired CarImageRepository carImageRepository;

    @MockitoBean S3Service s3Service;
    @MockitoBean CarNftService carNftService;
    @MockitoBean PinataService pinataService;

    private static final String COMPANY_ID = "company-test-1";
    private static final String MODEL_ID = "model-test-1";
    private static final int DAILY_PRICE = 120000;

    @BeforeEach
    void setUp() {
        Company company = Company.of(
            COMPANY_ID,
            "테스트렌터카",
            "test@company.com",
            "hashedpw",
            "ICN",
            "ko",
            null
        );
        companyRepository.save(company);

        CarModel carModel = CarModel.create(MODEL_ID, "현대", "아이오닉5", "전기", CarSize.MEDIUM);
        carModelRepository.save(carModel);

        given(s3Service.uploadToKey(any(), any())).willReturn("https://test.cloudfront.net/아이오닉5/car-id/FRONT.jpg");
        given(pinataService.uploadImage(any(), any())).willReturn("QmTestImageCid");
    }

    @Test
    void 차량_등록_성공_PENDING_상태로_저장된다() {
        // given
        CarRegisterRequest request = makeRequest(MODEL_ID, "12가3456");

        // when
        CarRegisterResponse response = carService.registerCar(COMPANY_ID, request);

        // then
        assertThat(response.carId()).isNotBlank();
        assertThat(response.plateNumber()).isEqualTo("12가3456");
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.imageUrls()).containsKeys(
            "FRONT",
            "REAR",
            "FRONT_LEFT",
            "FRONT_RIGHT",
            "REAR_LEFT",
            "REAR_RIGHT"
        );

        OwnedCar saved = ownedCarRepository.findById(response.carId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(OwnedCar.Status.PENDING);
        assertThat(saved.getNftTokenId()).isNull();

        List<?> images = carImageRepository.findByCarCarId(response.carId());
        assertThat(images).hasSize(6);
    }

    @Test
    void 존재하지_않는_companyId로_등록하면_COMPANY_NOT_FOUND() {
        CarRegisterRequest request = makeRequest(MODEL_ID, "12가3456");

        assertThatThrownBy(() -> carService.registerCar("없는-회사-id", request))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(CompanyErrorCode.COMPANY_NOT_FOUND));
    }

    @Test
    void 존재하지_않는_modelId로_등록하면_CAR_MODEL_NOT_FOUND() {
        CarRegisterRequest request = makeRequest("없는-모델-id", "12가3456");

        assertThatThrownBy(() -> carService.registerCar(COMPANY_ID, request))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(CarErrorCode.CAR_MODEL_NOT_FOUND));
    }

    private CarRegisterRequest makeRequest(String modelId, String plateNumber) {
        MockMultipartFile img = new MockMultipartFile("image", "car.jpg", "image/jpeg", new byte[]{1, 2, 3});
        return new CarRegisterRequest(modelId, plateNumber, DAILY_PRICE, img, img, img, img, img, img);
    }
}
