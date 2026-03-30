package com.care.domain.reservation.service;

import com.care.domain.car.entity.OwnedCar;
import com.care.domain.car.entity.CarModel;
import com.care.domain.company.entity.Company;
import com.care.domain.reservation.controller.dto.request.DisputeCreateRequest;
import com.care.domain.reservation.controller.dto.request.DisputeDefenseRequest;
import com.care.domain.reservation.controller.dto.request.DisputeSettleRequest;
import com.care.domain.reservation.controller.dto.response.DisputeCreateResponse;
import com.care.domain.reservation.controller.dto.response.DisputeDefenseResponse;
import com.care.domain.reservation.controller.dto.response.DisputeDetailResponse;
import com.care.domain.reservation.controller.dto.response.DisputeAiAnalysisResponse;
import com.care.domain.reservation.controller.dto.response.DisputeSummaryResponse;
import com.care.domain.reservation.controller.dto.response.DisputeSettleResponse;
import com.care.domain.reservation.entity.Dispute;
import com.care.domain.reservation.entity.Reservation;
import com.care.domain.reservation.entity.Scratch;
import com.care.domain.reservation.repository.DisputeRepository;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.service.RenterNotificationService;
import com.care.domain.scan.repository.ScratchRepository;
import com.care.global.ai.AiScratchSimilarityClient;
import com.care.global.ai.AiScratchSimilarityResult;
import com.care.global.blockchain.CareTokenService;
import com.care.global.blockchain.DisputeSettlementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DisputeServiceTest {

    @Mock
    private DisputeRepository disputeRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private ScratchRepository scratchRepository;

    @Mock
    private DisputeSettlementService disputeSettlementService;

    @Mock
    private CareTokenService careTokenService;

    @Mock
    private AiScratchSimilarityClient aiScratchSimilarityClient;

    @Mock
    private RenterNotificationService renterNotificationService;

    @InjectMocks
    private DisputeService disputeService;

    private Reservation reservation;
    private Scratch targetScratch;
    private Scratch defenseScratch;

    @BeforeEach
    void setUp() {
        reservation = mockReservation("reservation-1", "company-1", "renter-1");
        targetScratch = mockScratch("after-log-1", "AFTER", reservation, false);
        defenseScratch = mockScratch("before-log-1", "BEFORE", reservation, false);
        ReflectionTestUtils.setField(disputeService, "similarityThreshold", 60.0);
    }

    @Test
    void 업체_분쟁_목록_조회_성공() {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        given(disputeRepository.findByReservation_OwnedCar_Company_CompanyIdOrderByCreatedAtDesc("company-1"))
                .willReturn(List.of(dispute));

        // when
        List<DisputeSummaryResponse> result = disputeService.getCompanyDisputes("company-1");

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).reservationId()).isEqualTo("reservation-1");
        assertThat(result.get(0).carId()).isEqualTo("car-1");
        assertThat(result.get(0).plateNumber()).isEqualTo("12가3456");
        assertThat(result.get(0).renterName()).isEqualTo("renter-name");
        assertThat(result.get(0).claimAmount()).isEqualTo(50000);
        assertThat(result.get(0).status()).isEqualTo("OPEN");
    }

    @Test
    void 분쟁_상세_단건조회_성공() {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        given(disputeRepository.findByDisputeId("dispute-1"))
                .willReturn(Optional.of(dispute));

        // when
        DisputeDetailResponse result = disputeService.getDisputeDetail("company-1", "dispute-1");

        // then
        assertThat(result.reservationId()).isEqualTo("reservation-1");
        assertThat(result.targetLogId()).isEqualTo("after-log-1");
        assertThat(result.status()).isEqualTo("OPEN");
    }

    @Test
    void 분쟁_생성_성공() {
        // given
        DisputeCreateRequest request = new DisputeCreateRequest();
        setField(request, "targetLogId", "after-log-1");
        setField(request, "reason", "문콕 흔적이 반납 후 확인됨");
        setField(request, "claimAmount", 120000);

        given(reservationRepository.findByReservationId("reservation-1"))
                .willReturn(Optional.of(reservation));
        given(scratchRepository.findById("after-log-1"))
                .willReturn(Optional.of(targetScratch));
        given(scratchRepository.findByReservation_ReservationIdAndLogType("reservation-1", "BEFORE"))
            .willReturn(List.of(defenseScratch));
        given(aiScratchSimilarityClient.compareByUrls(any(), any()))
            .willReturn(new AiScratchSimilarityResult(0.55, 0.12));
        given(disputeRepository.existsByTargetScratch_LogIdAndStatusNot("after-log-1", "RESOLVED"))
                .willReturn(false);
        given(disputeRepository.save(any(Dispute.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        // when
        DisputeCreateResponse response = disputeService.createDispute("company-1", "reservation-1", request);

        // then
        assertThat(response.reservationId()).isEqualTo("reservation-1");
        assertThat(response.targetLogId()).isEqualTo("after-log-1");
        assertThat(response.status()).isEqualTo("OPEN");
        assertThat(response.claimAmount()).isEqualTo(120000);

        verify(targetScratch).markDisputed();

        ArgumentCaptor<Dispute> captor = ArgumentCaptor.forClass(Dispute.class);
        verify(disputeRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("OPEN");
        assertThat(captor.getValue().getSnapshotBeforeLogId()).isEqualTo("before-log-1");
        assertThat(captor.getValue().getSnapshotAfterCropS3Url()).isEqualTo("https://example.com/after-log-1.jpg");
        assertThat(captor.getValue().isSnapshotWarning()).isTrue();
        verify(renterNotificationService).createDisputeCreatedNotification(any(), any());
    }

    @Test
    void 분쟁_생성_실패_target이_AFTER가_아니면_예외() {
        // given
        Scratch beforeScratch = mockScratch("before-log-x", "BEFORE", reservation, false);

        DisputeCreateRequest request = new DisputeCreateRequest();
        setField(request, "targetLogId", "before-log-x");
        setField(request, "reason", "사유");
        setField(request, "claimAmount", 1000);

        given(reservationRepository.findByReservationId("reservation-1"))
                .willReturn(Optional.of(reservation));
        given(scratchRepository.findById("before-log-x"))
                .willReturn(Optional.of(beforeScratch));

        // when & then
        assertThatThrownBy(() -> disputeService.createDispute("company-1", "reservation-1", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("AFTER");
    }

    @Test
    void 분쟁_방어_성공() {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);

        DisputeDefenseRequest request = new DisputeDefenseRequest();
        setField(request, "defenseLogId", "before-log-1");

        given(disputeRepository.findByDisputeIdAndReservation_ReservationId("dispute-1", "reservation-1"))
                .willReturn(Optional.of(dispute));
        given(scratchRepository.findById("before-log-1"))
                .willReturn(Optional.of(defenseScratch));

        // when
        DisputeDefenseResponse response = disputeService.defendDispute("renter-1", "reservation-1", "dispute-1", request);

        // then
        assertThat(response.status()).isEqualTo("DEFENDED");
        assertThat(response.defenseLogId()).isEqualTo("before-log-1");
    }

    @Test
    void 분쟁_상세_조회_실패_참여자가_아니면_예외() {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        given(disputeRepository.findByDisputeIdAndReservation_ReservationId("dispute-1", "reservation-1"))
                .willReturn(Optional.of(dispute));

        // when & then
        assertThatThrownBy(() -> disputeService.getDisputeDetail("other-user", "reservation-1", "dispute-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("조회 권한");
    }

    @Test
    void 분쟁_AI_분석_성공_BEFORE_AFTER_쌍비교() {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        Scratch beforeScratch2 = mockScratch("before-log-2", "BEFORE", reservation, false);
        Scratch afterScratch = mockScratch("after-log-2", "AFTER", reservation, false);

        given(disputeRepository.findByDisputeId("dispute-1"))
            .willReturn(Optional.of(dispute));
        given(scratchRepository.findByReservation_ReservationIdAndLogType("reservation-1", "BEFORE"))
            .willReturn(List.of(defenseScratch, beforeScratch2));
        given(scratchRepository.findByReservation_ReservationIdAndLogType("reservation-1", "AFTER"))
            .willReturn(List.of(afterScratch));
        given(aiScratchSimilarityClient.compareByUrls(any(), any()))
            .willReturn(new AiScratchSimilarityResult(0.91, 0.03));

        // when
        DisputeAiAnalysisResponse result = disputeService.getDisputeAiAnalysis("company-1", "dispute-1");

        // then
        assertThat(result.disputeId()).isNotBlank();
        assertThat(result.reservationId()).isEqualTo("reservation-1");
        assertThat(result.beforeCount()).isEqualTo(2);
        assertThat(result.afterCount()).isEqualTo(1);
        assertThat(result.comparisons()).hasSize(2);
        assertThat(result.comparisons().get(0).similarity()).isEqualTo(0.91);
        verify(aiScratchSimilarityClient, times(2)).compareByUrls(any(), any());
    }

    @Test
    void 분쟁_AI_분석_실패_참여자가_아니면_예외() {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        given(disputeRepository.findByDisputeId("dispute-1"))
            .willReturn(Optional.of(dispute));

        // when & then
        assertThatThrownBy(() -> disputeService.getDisputeAiAnalysis("other-user", "dispute-1"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("조회 권한");
    }

    @Test
    void 예약_탐지_흠집_로그_조회_성공_BEFORE_AFTER() {
        // given
        Scratch afterScratch = mockScratch("after-log-2", "AFTER", reservation, false);

        given(reservationRepository.findByReservationId("reservation-1"))
            .willReturn(Optional.of(reservation));
        given(scratchRepository.findByReservation_ReservationIdAndLogType("reservation-1", "BEFORE"))
            .willReturn(List.of(defenseScratch));
        given(scratchRepository.findByReservation_ReservationIdAndLogType("reservation-1", "AFTER"))
            .willReturn(List.of(afterScratch));

        // when
        var result = disputeService.getReservationScratchLogs("company-1", "reservation-1");

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).logId()).isEqualTo("before-log-1");
        assertThat(result.get(1).logId()).isEqualTo("after-log-2");
        assertThat(result.get(0).logType()).isEqualTo("BEFORE");
        assertThat(result.get(1).logType()).isEqualTo("AFTER");
    }

    @Test
    void 예약_탐지_흠집_로그_조회_실패_참여자가_아니면_예외() {
        // given
        given(reservationRepository.findByReservationId("reservation-1"))
            .willReturn(Optional.of(reservation));

        // when & then
        assertThatThrownBy(() -> disputeService.getReservationScratchLogs("other-user", "reservation-1"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("조회 권한");
    }

    @Test
    void 분쟁_정산_COMPLETED_성공_양측동의_후_실행() throws Exception {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        DisputeSettleRequest request = new DisputeSettleRequest();
        setField(request, "finalAmount", 100000L);
        setField(request, "status", "COMPLETED");

        given(disputeRepository.findByDisputeId("dispute-1")).willReturn(Optional.of(dispute));
        given(disputeSettlementService.recordSettlement(any(), anyLong())).willReturn("0xrecord");
        given(careTokenService.transfer("0xrenter", "0xcompany", 100000d)).willReturn("0xusdc");

        // when
        DisputeSettleResponse first = disputeService.settleDispute("company-1", "dispute-1", request);
        DisputeSettleResponse second = disputeService.settleDispute("renter-1", "dispute-1", request);

        // then
        assertThat(first.status()).isEqualTo("PENDING");
        assertThat(first.txHash()).isNull();

        assertThat(second.finalAmount()).isEqualTo(100000L);
        assertThat(second.status()).isEqualTo("COMPLETED");
        assertThat(second.txHash()).isEqualTo("0xusdc");
        verify(disputeSettlementService, times(1)).initializeSettlementAgreement(anyString(), anyString(), anyString(), anyLong());
        verify(disputeSettlementService, times(2)).agreeSettlementByOperator(anyString(), anyString());
        verify(disputeSettlementService).recordSettlement(any(), anyLong());
        verify(careTokenService).transfer("0xrenter", "0xcompany", 100000d);
        verify(targetScratch).clearDisputed();
    }

    @Test
    void 분쟁_정산_REFUNDED_성공_렌터가_먼저_합의_가능() throws Exception {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        DisputeSettleRequest request = new DisputeSettleRequest();
        setField(request, "finalAmount", 10000L);
        setField(request, "status", "REFUNDED");

        given(disputeRepository.findByDisputeId("dispute-2")).willReturn(Optional.of(dispute));
        given(disputeSettlementService.recordSettlement(any(), anyLong())).willReturn("0xrecord2");
        given(careTokenService.transfer("0xcompany", "0xrenter", 10000d)).willReturn("0xrefund");

        // when
        DisputeSettleResponse first = disputeService.settleDispute("renter-1", "dispute-2", request);
        DisputeSettleResponse second = disputeService.settleDispute("company-1", "dispute-2", request);

        // then
        assertThat(first.status()).isEqualTo("PENDING");
        assertThat(second.status()).isEqualTo("REFUNDED");
        assertThat(second.txHash()).isEqualTo("0xrefund");
        verify(disputeSettlementService, times(1)).initializeSettlementAgreement(anyString(), anyString(), anyString(), anyLong());
        verify(disputeSettlementService, times(2)).agreeSettlementByOperator(anyString(), anyString());
        verify(careTokenService).transfer("0xcompany", "0xrenter", 10000d);
    }

    @Test
    void 분쟁_정산_레거시_요청스키마_호환_성공() throws Exception {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        DisputeSettleRequest request = new DisputeSettleRequest();
        setField(request, "companyRefundAmount", 70000L);
        setField(request, "resolution", "COMPANY_WIN");

        given(disputeRepository.findByDisputeId("dispute-legacy")).willReturn(Optional.of(dispute));
        given(disputeSettlementService.recordSettlement(any(), anyLong())).willReturn("0xrecord-legacy");
        given(careTokenService.transfer("0xrenter", "0xcompany", 70000d)).willReturn("0xusdc-legacy");

        // when
        DisputeSettleResponse first = disputeService.settleDispute("company-1", "dispute-legacy", request);
        DisputeSettleResponse second = disputeService.settleDispute("renter-1", "dispute-legacy", request);

        // then
        assertThat(first.status()).isEqualTo("PENDING");
        assertThat(second.status()).isEqualTo("COMPLETED");
        assertThat(second.finalAmount()).isEqualTo(70000L);
        assertThat(second.txHash()).isEqualTo("0xusdc-legacy");
        verify(disputeSettlementService, times(1)).initializeSettlementAgreement(anyString(), anyString(), anyString(), anyLong());
        verify(disputeSettlementService, times(2)).agreeSettlementByOperator(anyString(), anyString());
        verify(careTokenService).transfer("0xrenter", "0xcompany", 70000d);
    }

    @Test
    void 분쟁_정산_실패_최대부담금_초과() {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        DisputeSettleRequest request = new DisputeSettleRequest();
        setField(request, "finalAmount", 300000L);
        setField(request, "status", "COMPLETED");

        given(disputeRepository.findByDisputeId("dispute-4")).willReturn(Optional.of(dispute));

        // when & then
        assertThatThrownBy(() -> disputeService.settleDispute("company-1", "dispute-4", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("최대부담금");
    }

    @Test
    void 분쟁_정산_실패_Pending_상태요청() {
        // given
        Dispute dispute = Dispute.create(reservation, targetScratch, "사유", 50000);
        DisputeSettleRequest request = new DisputeSettleRequest();
        setField(request, "finalAmount", 1000L);
        setField(request, "status", "PENDING");

        given(disputeRepository.findByDisputeId("dispute-3")).willReturn(Optional.of(dispute));

        // when & then
        assertThatThrownBy(() -> disputeService.settleDispute("company-1", "dispute-3", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PENDING");
    }

    private Reservation mockReservation(String reservationId, String companyId, String renterId) {
        Reservation reservationMock = org.mockito.Mockito.mock(Reservation.class);
        OwnedCar ownedCarMock = org.mockito.Mockito.mock(OwnedCar.class);
        CarModel carModelMock = org.mockito.Mockito.mock(CarModel.class);
        Company companyMock = org.mockito.Mockito.mock(Company.class);
        Renter renterMock = org.mockito.Mockito.mock(Renter.class);

        lenient().when(reservationMock.getReservationId()).thenReturn(reservationId);
        lenient().when(reservationMock.getOwnedCar()).thenReturn(ownedCarMock);
        lenient().when(ownedCarMock.getCompany()).thenReturn(companyMock);
        lenient().when(ownedCarMock.getCarId()).thenReturn("car-1");
        lenient().when(ownedCarMock.getPlateNumber()).thenReturn("12가3456");
        lenient().when(ownedCarMock.getCarModel()).thenReturn(carModelMock);
        lenient().when(carModelMock.getBrand()).thenReturn("Hyundai");
        lenient().when(carModelMock.getModelName()).thenReturn("Sonata");
        lenient().when(companyMock.getCompanyId()).thenReturn(companyId);
        lenient().when(companyMock.getWalletAddress()).thenReturn("0xcompany");
        lenient().when(reservationMock.getRenter()).thenReturn(renterMock);
        lenient().when(renterMock.getUserId()).thenReturn(renterId);
        lenient().when(renterMock.getName()).thenReturn("renter-name");
        lenient().when(renterMock.getWalletAddress()).thenReturn("0xrenter");
        lenient().when(reservationMock.getTotalPrice()).thenReturn(200000);

        return reservationMock;
    }

    private Scratch mockScratch(String logId, String logType, Reservation reservation, boolean isDisputed) {
        Scratch scratchMock = org.mockito.Mockito.mock(Scratch.class);
        lenient().when(scratchMock.getLogId()).thenReturn(logId);
        lenient().when(scratchMock.getLogType()).thenReturn(logType);
        lenient().when(scratchMock.getCarPart()).thenReturn("FRONT");
        lenient().when(scratchMock.getReservation()).thenReturn(reservation);
        lenient().when(scratchMock.getCropS3Url()).thenReturn("https://example.com/" + logId + ".jpg");
        lenient().when(scratchMock.isManual()).thenReturn(false);
        lenient().when(scratchMock.isDisputed()).thenReturn(isDisputed);
        return scratchMock;
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
