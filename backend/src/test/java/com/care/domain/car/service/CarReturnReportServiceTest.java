package com.care.domain.car.service;

import com.care.domain.car.controller.dto.response.ReturnReportResponse;
import com.care.domain.car.entity.OwnedCar;
import com.care.domain.car.repository.CarImageRepository;
import com.care.domain.car.repository.CarModelRepository;
import com.care.domain.car.repository.OwnedCarRepository;
import com.care.domain.company.repository.CompanyRepository;
import com.care.domain.reservation.entity.Scratch;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.reservation.repository.ReviewRepository;
import com.care.domain.scan.repository.ScratchRepository;
import com.care.global.ai.AiScratchSimilarityClient;
import com.care.global.ai.AiScratchSimilarityResult;
import com.care.global.ipfs.PinataService;
import com.care.global.s3.S3Service;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class CarReturnReportServiceTest {

    @Mock
    private OwnedCarRepository ownedCarRepository;

    @Mock
    private CarImageRepository carImageRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private CarModelRepository carModelRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ScratchRepository scratchRepository;

    @Mock
    private AiScratchSimilarityClient aiScratchSimilarityClient;

    @Mock
    private S3Service s3Service;

    @Mock
    private PinataService pinataService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private CarService carService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(carService, "similarityThreshold", 60.0);
    }

    @Test
    void 반납리포트_유사도_임계치_경고_계산_성공() {
        String carId = "car-1";
        String reservationId = "rsv-1";

        OwnedCar car = mock(OwnedCar.class);
        Scratch before = Scratch.builder()
                .logId("before-1")
                .logType("BEFORE")
                .carPart("front")
                .cropS3Url("https://before-crop")
                .originalS3Url("https://before-original")
                .coordX(10)
                .coordY(20)
                .isManual(false)
                .isDisputed(false)
                .build();

        Scratch after = Scratch.builder()
                .logId("after-1")
                .logType("AFTER")
                .carPart("front")
                .cropS3Url("https://after-crop")
                .originalS3Url("https://after-original")
                .coordX(11)
                .coordY(21)
                .isManual(false)
                .isDisputed(false)
                .build();

        given(ownedCarRepository.findById(carId)).willReturn(Optional.of(car));
        given(scratchRepository.findByOwnedCar_CarIdAndReservation_ReservationId(carId, reservationId))
                .willReturn(List.of(before, after));
        given(aiScratchSimilarityClient.compareByUrls("https://before-crop", "https://after-crop"))
                .willReturn(new AiScratchSimilarityResult(0.55, 0.45));

        ReturnReportResponse response = carService.getReturnReport(carId, reservationId);

        assertThat(response.similarityThreshold()).isEqualTo(60.0);
        assertThat(response.comparisons()).hasSize(1);
        assertThat(response.comparisons().get(0).beforeLogId()).isEqualTo("before-1");
        assertThat(response.comparisons().get(0).afterLogId()).isEqualTo("after-1");
        assertThat(response.comparisons().get(0).similarity()).isCloseTo(55.0, within(0.0001));
        assertThat(response.comparisons().get(0).warning()).isTrue();
        assertThat(response.warningCount()).isEqualTo(1);
    }
}
