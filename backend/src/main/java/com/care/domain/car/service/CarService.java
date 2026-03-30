package com.care.domain.car.service;

import com.care.domain.car.controller.dto.request.CarRegisterRequest;
import com.care.domain.car.controller.dto.request.CarReviewRequest;
import com.care.domain.car.controller.dto.response.CarDetailResponse;
import com.care.domain.car.controller.dto.response.CarImageResponse;
import com.care.domain.car.controller.dto.response.CarListResponse;
import com.care.domain.car.controller.dto.response.CarRegisterResponse;
import com.care.domain.car.controller.dto.response.CarReviewResponse;
import com.care.domain.car.controller.dto.response.CarSummaryResponse;
import com.care.domain.car.controller.dto.response.ReturnReportResponse;
import com.care.domain.car.entity.CarImage;
import com.care.domain.car.entity.CarImage.Side;
import com.care.domain.car.entity.CarSize;
import com.care.domain.car.entity.CarModel;
import com.care.domain.car.entity.OwnedCar;
import com.care.domain.car.event.CarRegisteredEvent;
import com.care.domain.car.exception.CarErrorCode;
import com.care.domain.car.repository.CarImageRepository;
import com.care.domain.car.repository.CarModelRepository;
import com.care.domain.car.repository.OwnedCarRepository;
import com.care.domain.company.entity.Company;
import com.care.domain.company.exception.CompanyErrorCode;
import com.care.domain.company.repository.CompanyRepository;
import com.care.domain.reservation.entity.Reservation;
import com.care.domain.reservation.entity.Review;
import com.care.domain.reservation.exception.ReservationErrorCode;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.reservation.repository.ReviewRepository;
import com.care.domain.scan.repository.ScratchRepository;
import com.care.global.ai.AiScratchSimilarityClient;
import com.care.global.ai.AiScratchSimilarityResult;
import com.care.global.exception.BusinessException;
import com.care.global.ipfs.PinataService;
import com.care.global.s3.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CarService {

    private final OwnedCarRepository ownedCarRepository;
    private final CarImageRepository carImageRepository;
    private final CompanyRepository companyRepository;
    private final CarModelRepository carModelRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;
    private final ScratchRepository scratchRepository;
        private final AiScratchSimilarityClient aiScratchSimilarityClient;
    private final S3Service s3Service;
    private final PinataService pinataService;
    private final ApplicationEventPublisher eventPublisher;

        @Value("${ai.scratch.similarity-threshold:60.0}")
        private double similarityThreshold;

    /**
     * 차량 등록
     * 1) side별 이미지 S3 + IPFS 업로드 ({modelName}/{carId}/{side}.jpg)
     * 2) OwnedCar DB 저장 (PENDING) + CarImage 4개 저장
     * 3) CarRegisteredEvent 발행 → 비동기로 NFT 민팅
     */
    @Transactional
    public CarRegisterResponse registerCar(String companyId, CarRegisterRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new BusinessException(CompanyErrorCode.COMPANY_NOT_FOUND));

        CarModel carModel = carModelRepository.findById(request.modelId())
                .orElseThrow(() -> new BusinessException(CarErrorCode.CAR_MODEL_NOT_FOUND));

        String carId = UUID.randomUUID().toString();
        String modelFolder = carModel.getModelName().replace(" ", "-");

        // side → MultipartFile 매핑
        Map<Side, MultipartFile> sideImages = new LinkedHashMap<>();
        sideImages.put(Side.FRONT,       request.frontImage());
        sideImages.put(Side.REAR,        request.rearImage());
        sideImages.put(Side.FRONT_LEFT,  request.frontLeftImage());
        sideImages.put(Side.FRONT_RIGHT, request.frontRightImage());
        sideImages.put(Side.REAR_LEFT,   request.rearLeftImage());
        sideImages.put(Side.REAR_RIGHT,  request.rearRightImage());

        // 1. OwnedCar 저장 (PENDING)
        OwnedCar car = OwnedCar.create(carId, company, carModel, request.plateNumber(), request.dailyPrice());
        ownedCarRepository.save(car);

        // 2. side별 S3 + IPFS 업로드 → CarImage 저장
        Map<Side, String> s3Urls = new LinkedHashMap<>();
        Map<String, String> ipfsCids = new LinkedHashMap<>();

        for (Map.Entry<Side, MultipartFile> entry : sideImages.entrySet()) {
            Side side = entry.getKey();
            MultipartFile file = entry.getValue();

            String s3Key = modelFolder + "/" + carId + "/" + side.name() + ".jpg";
            String s3Url = s3Service.uploadToKey(file, s3Key);
            log.info("[CarService] S3 업로드 완료 | side: {}, url: {}", side, s3Url);

            String ipfsCid = pinataService.uploadImage(file, "car-" + carId + "-" + side.name());
            log.info("[CarService] IPFS 업로드 완료 | side: {}, cid: {}", side, ipfsCid);

            carImageRepository.save(CarImage.create(UUID.randomUUID().toString(), car, side, s3Url, ipfsCid));

            s3Urls.put(side, s3Url);
            ipfsCids.put(side.name(), ipfsCid);
        }

        log.info("[CarService] 차량 저장 완료 | carId: {}", carId);

        // 3. 이벤트 발행 (트랜잭션 커밋 후 비동기 NFT 민팅)
        eventPublisher.publishEvent(new CarRegisteredEvent(
                carId,
                company.getWalletAddress(),
                car.getPlateNumber(),
                carModel.getBrand(),
                carModel.getModelName(),
                carModel.getFuelType(),
                ipfsCids
        ));

        return CarRegisterResponse.of(car, s3Urls);
    }

    /**
     * 렌터 차량 목록 조회 (브랜드, 공항 필터)
     */
    @Transactional(readOnly = true)
    public List<CarSummaryResponse> getCarSummaryList(String brand, String airportCode, CarSize carSize) {
        return ownedCarRepository.findActiveCarsByFilter(brand, airportCode, carSize).stream()
                .map(car -> {
                    String frontImageUrl = carImageRepository
                            .findByCarCarIdAndSide(car.getCarId(), Side.FRONT)
                            .map(CarImage::getS3Url)
                            .orElse(null);
                    return CarSummaryResponse.of(car, frontImageUrl);
                })
                .toList();
    }

    /**
     * 렌터 소유 차량 목록 조회 (Reservation 기반)
     */
    @Transactional(readOnly = true)
    public List<CarSummaryResponse> getRenterOwnedCarList(String renterId) {
        return reservationRepository.findByRenterUserId(renterId).stream()
                .map(reservation -> {
                    OwnedCar car = reservation.getOwnedCar();
                    String frontImageUrl = carImageRepository
                            .findByCarCarIdAndSide(car.getCarId(), Side.FRONT)
                            .map(CarImage::getS3Url)
                            .orElse(null);
                    return CarSummaryResponse.of(car, frontImageUrl);
                })
                .toList();
    }

    /**
     * 회사 차량 목록 조회
     */
    @Transactional(readOnly = true)
    public List<CarListResponse> getCarList(String companyId) {
        return ownedCarRepository.findByCompanyCompanyId(companyId).stream()
                .map(car -> {
                    String frontImageUrl = carImageRepository
                            .findByCarCarIdAndSide(car.getCarId(), Side.FRONT)
                            .map(CarImage::getS3Url)
                            .orElse(null);
                    return CarListResponse.of(car, frontImageUrl);
                })
                .toList();
    }

    /**
     * 차량 상세 조회
     */
    @Transactional(readOnly = true)
    public CarDetailResponse getCarDetail(String carId) {
        OwnedCar car = ownedCarRepository.findById(carId)
                .orElseThrow(() -> new BusinessException(CarErrorCode.CAR_NOT_FOUND));

        List<CarImageResponse> images = carImageRepository.findByCarCarId(carId).stream()
                .map(CarImageResponse::from)
                .toList();

        return CarDetailResponse.of(car, images);
    }

    /**
     * 차량 리뷰 작성
     */
    @Transactional
    public CarReviewResponse createReview(String carId, CarReviewRequest request) {
        OwnedCar car = ownedCarRepository.findById(carId)
                .orElseThrow(() -> new BusinessException(CarErrorCode.CAR_NOT_FOUND));
        Reservation reservation = reservationRepository.findByReservationId(request.reservationId())
                .orElseThrow(() -> new BusinessException(ReservationErrorCode.RESERVATION_NOT_FOUND));
        Review review = Review.create(UUID.randomUUID().toString(), reservation, car, request.rating(), request.content());
        reviewRepository.save(review);
        return CarReviewResponse.from(review);
    }

    /**
     * 차량 리뷰 목록 조회
     */
    @Transactional(readOnly = true)
    public List<CarReviewResponse> getCarReviews(String carId) {
        ownedCarRepository.findById(carId)
                .orElseThrow(() -> new BusinessException(CarErrorCode.CAR_NOT_FOUND));
        return reviewRepository.findByOwnedCarCarId(carId).stream()
                .map(CarReviewResponse::from)
                .toList();
    }

    /**
     * 차량 반납 리포트 조회
     */
    @Transactional
    public ReturnReportResponse getReturnReport(String carId, String reservationId) {
        ownedCarRepository.findById(carId)
                .orElseThrow(() -> new BusinessException(CarErrorCode.CAR_NOT_FOUND));
        var scratches = reservationId != null
                ? scratchRepository.findByOwnedCar_CarIdAndReservation_ReservationId(carId, reservationId)
                : scratchRepository.findByOwnedCar_CarId(carId);
        List<ReturnReportResponse.ComparisonDetail> comparisons = reservationId != null
                ? buildComparisons(scratches)
                : List.of();

        return ReturnReportResponse.of(reservationId, carId, scratches, similarityThreshold, comparisons);
    }

    private List<ReturnReportResponse.ComparisonDetail> buildComparisons(List<com.care.domain.reservation.entity.Scratch> scratches) {
        List<com.care.domain.reservation.entity.Scratch> beforeScratches = scratches.stream()
                .filter(scratch -> "BEFORE".equalsIgnoreCase(scratch.getLogType()))
                .filter(scratch -> !scratch.isManual())
                .filter(scratch -> scratch.getCropS3Url() != null && !scratch.getCropS3Url().isBlank())
                .toList();

        List<com.care.domain.reservation.entity.Scratch> afterScratches = scratches.stream()
                .filter(scratch -> "AFTER".equalsIgnoreCase(scratch.getLogType()))
                .filter(scratch -> !scratch.isManual())
                .filter(scratch -> scratch.getCropS3Url() != null && !scratch.getCropS3Url().isBlank())
                .toList();

        return afterScratches.stream()
                .map(after -> compareWithBestBefore(beforeScratches, after))
                .toList();
    }

    private ReturnReportResponse.ComparisonDetail compareWithBestBefore(
            List<com.care.domain.reservation.entity.Scratch> beforeScratches,
            com.care.domain.reservation.entity.Scratch afterScratch
    ) {
        List<com.care.domain.reservation.entity.Scratch> candidates = beforeScratches.stream()
                .filter(before -> before.getCarPart().equalsIgnoreCase(afterScratch.getCarPart()))
                .toList();

        if (candidates.isEmpty()) {
            return new ReturnReportResponse.ComparisonDetail(
                    null,
                    afterScratch.getLogId(),
                    null,
                    afterScratch.getCropS3Url(),
                    0.0,
                    0.0,
                    true,
                    true
            );
        }

        if (afterScratch.getAiSimilarity() != null) {
            String cachedBeforeUrl = afterScratch.getAiBeforeCropS3Url() != null
                    ? afterScratch.getAiBeforeCropS3Url()
                    : candidates.stream()
                    .filter(b -> b.getLogId().equals(afterScratch.getAiBeforeLogId()))
                    .findFirst()
                    .map(com.care.domain.reservation.entity.Scratch::getCropS3Url)
                    .orElse(null);
            boolean warning = afterScratch.getAiSimilarity() < similarityThreshold;
            return new ReturnReportResponse.ComparisonDetail(
                    afterScratch.getAiBeforeLogId(),
                    afterScratch.getLogId(),
                    cachedBeforeUrl,
                    afterScratch.getCropS3Url(),
                    afterScratch.getAiSimilarity(),
                    afterScratch.getAiDiffScore(),
                    warning,
                    false
            );
        }

        com.care.domain.reservation.entity.Scratch bestBefore = null;
        double bestSimilarity = -1.0;
        double bestDiffScore = 100.0;

        for (com.care.domain.reservation.entity.Scratch before : candidates) {
            try {
                AiScratchSimilarityResult result = aiScratchSimilarityClient.compareByUrls(
                        before.getCropS3Url(),
                        afterScratch.getCropS3Url()
                );
                double similarityPercent = normalizeToPercent(result.similarity());
                if (similarityPercent > bestSimilarity) {
                    bestSimilarity = similarityPercent;
                    bestDiffScore = result.diffScore();
                    bestBefore = before;
                }
            } catch (Exception e) {
                log.warn("[ReturnReport] AI 유사도 비교 실패 | beforeLogId: {}, afterLogId: {}, reason: {}",
                        before.getLogId(), afterScratch.getLogId(), e.getMessage());
            }
        }

        if (bestBefore == null) {
            return new ReturnReportResponse.ComparisonDetail(
                    null,
                    afterScratch.getLogId(),
                    null,
                    afterScratch.getCropS3Url(),
                    0.0,
                    100.0,
                    true,
                    false
            );
        }

        afterScratch.cacheAiComparison(bestBefore.getLogId(), bestSimilarity, bestDiffScore, bestBefore.getCropS3Url());

        boolean warning = bestSimilarity < similarityThreshold;
        return new ReturnReportResponse.ComparisonDetail(
                bestBefore.getLogId(),
                afterScratch.getLogId(),
                bestBefore.getCropS3Url(),
                afterScratch.getCropS3Url(),
                bestSimilarity,
                bestDiffScore,
                warning,
                false
        );
    }

    private double normalizeToPercent(double similarity) {
        if (similarity <= 1.0) {
            return similarity * 100.0;
        }
        return similarity;
    }

    /**
     * 특정 차량의 이미지 목록 조회 (S3 URL + IPFS CID)
     */
    @Transactional(readOnly = true)
    public List<CarImageResponse> getCarImages(String companyId, String carId) {
        OwnedCar car = ownedCarRepository.findById(carId)
                .orElseThrow(() -> new BusinessException(CarErrorCode.CAR_NOT_FOUND));

        if (!car.getCompany().getCompanyId().equals(companyId)) {
            throw new BusinessException(CarErrorCode.CAR_NOT_OWNED_BY_COMPANY);
        }

        return carImageRepository.findByCarCarId(carId).stream()
                .map(CarImageResponse::from)
                .toList();
    }
}
