package com.care.domain.car.service;

import com.care.domain.auth.controller.dto.request.CompanySignUpRequest;
import com.care.domain.auth.service.AuthService;
import com.care.domain.car.controller.dto.request.CarRegisterRequest;
import com.care.domain.car.controller.dto.response.CarRegisterResponse;
import com.care.domain.car.entity.CarModel;
import com.care.domain.car.entity.CarSize;
import com.care.domain.car.entity.OwnedCar;
import com.care.domain.car.repository.CarImageRepository;
import com.care.domain.car.repository.CarModelRepository;
import com.care.domain.car.repository.OwnedCarRepository;
import com.care.domain.company.entity.Company;
import com.care.domain.company.repository.CompanyRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.web3j.crypto.Credentials;

import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 차량 등록 전체 플로우 통합 테스트
 * [1] 회사 회원가입 (AuthService)
 * [2] 지갑 할당 (blockchain key → wallet address)
 * [3] 차량 등록 → S3 업로드 → IPFS 업로드 → 이벤트 발행
 * [4] NFT 민팅 완료 (비동기 폴링)
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:blockchain-local.properties")
class CarRegistrationIntegrationTest {

    @Autowired AuthService authService;
    @Autowired CarService carService;
    @Autowired CompanyRepository companyRepository;
    @Autowired CarModelRepository carModelRepository;
    @Autowired OwnedCarRepository ownedCarRepository;

    @Value("${test.company.private-key}")
    private String companyPrivateKey;

    private static final String MODEL_ID = "model-integration-1";
    private static final String TEST_EMAIL = "integration-test@company.com";
    private static final int DAILY_PRICE = 150000;

    @Autowired CarImageRepository carImageRepository;

    @AfterEach
    void tearDown() {
        companyRepository.findByEmail(TEST_EMAIL).ifPresent(company -> {
            ownedCarRepository.findAll().stream()
                    .filter(c -> c.getCompany().getCompanyId().equals(company.getCompanyId()))
                    .forEach(car -> {
                        // car_image(자식) 먼저 삭제 후 owned_car(부모) 삭제
                        carImageRepository.deleteAll(carImageRepository.findByCarCarId(car.getCarId()));
                        ownedCarRepository.delete(car);
                    });
            companyRepository.delete(company);
        });
        carModelRepository.findById(MODEL_ID).ifPresent(carModelRepository::delete);
    }

    @Test
    void 회사_회원가입_지갑할당_차량등록_NFT민팅_전체_플로우() throws Exception {

        // ──────────────────────────────────────────
        // [1] 회사 회원가입
        // ──────────────────────────────────────────
        CompanySignUpRequest signUpRequest = new CompanySignUpRequest(
                "통합테스트렌터카", TEST_EMAIL, "Password1!", null, "ICN", "ko", null, null
        );
        authService.companySignUp(signUpRequest);

        Company company = companyRepository.findByEmail(TEST_EMAIL)
                .orElseThrow(() -> new AssertionError("회사 회원가입 실패"));

        System.out.println("===========================================");
        System.out.println("[1] 회사 회원가입 완료");
        System.out.println("    companyId : " + company.getCompanyId());
        System.out.println("    name      : " + company.getName());
        System.out.println("    email     : " + company.getEmail());
        System.out.println("===========================================");

        // ──────────────────────────────────────────
        // [2] 지갑 할당 (회원가입 후 블록체인 키 연동)
        // ──────────────────────────────────────────
        String walletAddress = Credentials.create(companyPrivateKey).getAddress();
        company.updatePrivyWallet(walletAddress, null);
        companyRepository.save(company);

        System.out.println("[2] 지갑 할당 완료");
        System.out.println("    walletAddress : " + walletAddress);
        System.out.println("===========================================");

        // ──────────────────────────────────────────
        // [3] 차량 모델 등록 (관리자 사전 등록 가정)
        // ──────────────────────────────────────────
        carModelRepository.save(CarModel.create(MODEL_ID, "현대", "아이오닉5", "전기", CarSize.MEDIUM));

        InputStream is = getClass().getResourceAsStream("/testcar.png");
        assertThat(is).as("testcar.png 리소스가 없습니다 (src/test/resources/testcar.png 추가 필요)").isNotNull();
        byte[] imageBytes = is.readAllBytes();

        MockMultipartFile front = new MockMultipartFile("frontImage", "FRONT.png", "image/png", imageBytes);
        MockMultipartFile rear  = new MockMultipartFile("rearImage",  "REAR.png",  "image/png", imageBytes);
        MockMultipartFile frontLeft = new MockMultipartFile("frontLeftImage", "FRONT_LEFT.png", "image/png", imageBytes);
        MockMultipartFile frontRight = new MockMultipartFile("frontRightImage", "FRONT_RIGHT.png", "image/png", imageBytes);
        MockMultipartFile rearLeft = new MockMultipartFile("rearLeftImage", "REAR_LEFT.png", "image/png", imageBytes);
        MockMultipartFile rearRight = new MockMultipartFile("rearRightImage", "REAR_RIGHT.png", "image/png", imageBytes);

        CarRegisterRequest carRequest = new CarRegisterRequest(
            MODEL_ID,
            "99나9999",
            DAILY_PRICE,
            front,
            rear,
            frontLeft,
            frontRight,
            rearLeft,
            rearRight
        );

        // ──────────────────────────────────────────
        // [4] 차량 등록 (S3 + IPFS 업로드 → DB 저장 → 이벤트 발행)
        // ──────────────────────────────────────────
        CarRegisterResponse response = carService.registerCar(company.getCompanyId(), carRequest);

        System.out.println("[3] 차량 등록 요청 완료 (PENDING)");
        System.out.println("    carId       : " + response.carId());
        System.out.println("    plateNumber : " + response.plateNumber());
        System.out.println("    status      : " + response.status());
        response.imageUrls().forEach((side, url) ->
                System.out.println("    S3[" + side + "] : " + url));
        System.out.println("    NFT 민팅 진행 중...");
        System.out.println("===========================================");

        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.imageUrls()).containsKeys(
            "FRONT",
            "REAR",
            "FRONT_LEFT",
            "FRONT_RIGHT",
            "REAR_LEFT",
            "REAR_RIGHT"
        );
        response.imageUrls().values().forEach(url -> assertThat(url).startsWith("https://"));

        // ──────────────────────────────────────────
        // [5] 비동기 NFT 민팅 완료 대기 (최대 60초 폴링)
        // ──────────────────────────────────────────
        OwnedCar car = pollUntilActive(response.carId(), 60);

        System.out.println("[4] NFT 민팅 완료!");
        System.out.println("    carId       : " + car.getCarId());
        System.out.println("    plateNumber : " + car.getPlateNumber());
        System.out.println("    status      : " + car.getStatus());
        System.out.println("    nftTokenId  : " + car.getNftTokenId());
        System.out.println("    owner       : " + walletAddress);
        System.out.println("    contract    : 0xC928858884E7815dBCbd41362F2A79d73983c58A");
        System.out.println("===========================================");

        assertThat(car.getStatus()).isEqualTo(OwnedCar.Status.ACTIVE);
        assertThat(car.getNftTokenId()).isNotBlank();
    }

    private OwnedCar pollUntilActive(String carId, int timeoutSeconds) throws InterruptedException {
        for (int i = 0; i < timeoutSeconds; i++) {
            Thread.sleep(1000);
            OwnedCar car = ownedCarRepository.findById(carId).orElseThrow();
            if (car.getStatus() == OwnedCar.Status.ACTIVE) {
                return car;
            }
        }
        throw new AssertionError("NFT 민팅 타임아웃 (" + timeoutSeconds + "초 초과)");
    }

}
