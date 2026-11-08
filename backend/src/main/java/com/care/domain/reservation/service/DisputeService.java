package com.care.domain.reservation.service;

import com.care.domain.company.service.CompanyNotificationService;
import com.care.domain.renter.service.RenterNotificationService;
import com.care.domain.reservation.controller.dto.request.DisputeCreateRequest;
import com.care.domain.reservation.controller.dto.request.DisputeDefenseRequest;
import com.care.domain.reservation.controller.dto.request.DisputeSettleRequest;
import com.care.domain.reservation.controller.dto.response.*;
import com.care.domain.reservation.entity.*;
import com.care.domain.reservation.repository.DisputeRepository;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.scan.repository.ScratchRepository;
import com.care.global.ai.AiScratchSimilarityClient;
import com.care.global.ai.AiScratchSimilarityResult;
import com.care.global.blockchain.CareTokenService;
import com.care.global.blockchain.DisputeSettlementService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DisputeService {

	private final DisputeRepository disputeRepository;
	private final ReservationRepository reservationRepository;
	private final ScratchRepository scratchRepository;
	private final DisputeSettlementService disputeSettlementService;
	private final CareTokenService careTokenService;
	private final AiScratchSimilarityClient aiScratchSimilarityClient;
	private final RenterNotificationService renterNotificationService;
	private final CompanyNotificationService companyNotificationService;
	private final ObjectMapper objectMapper;

	@Value("${ai.scratch.similarity-threshold:60.0}")
	private double similarityThreshold;

	@Transactional
	public DisputeCreateResponse createDispute(String requesterId,
											   String reservationId,
											   DisputeCreateRequest request) {
		Reservation reservation = reservationRepository.findByReservationId(reservationId)
				.orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다: " + reservationId));

		validateCompanyAccess(requesterId, reservation);
		if (disputeRepository.existsByReservation_ReservationId(reservationId)) {
			throw new IllegalArgumentException("해당 예약 건에는 이미 분쟁이 생성되어 있습니다.");
		}

		Scratch targetScratch = scratchRepository.findById(request.getTargetLogId())
				.orElseThrow(() -> new IllegalArgumentException("대상 흠집 로그를 찾을 수 없습니다: " + request.getTargetLogId()));

		validateScratchBelongsToReservation(targetScratch, reservationId);
		validateLogType(targetScratch, "AFTER", "targetLogId는 AFTER 로그여야 합니다.");

		boolean hasActiveDispute = disputeRepository.existsByTargetScratch_LogIdAndStatusNotIn(
				targetScratch.getLogId(), List.of(DisputeStatus.COMPLETED.name(), "RESOLVED"));
		if (hasActiveDispute || targetScratch.isDisputed()) {
			throw new IllegalArgumentException("이미 분쟁이 진행 중인 흠집입니다.");
		}

		Dispute dispute = Dispute.create(
				reservation,
				targetScratch,
				request.getReason(),
				request.getClaimAmount()
		);

		captureReturnReportSnapshot(dispute, reservationId, targetScratch);

		targetScratch.markDisputed();
		reservation.lockDeposit();
		Dispute saved = disputeRepository.save(dispute);
		renterNotificationService.createDisputeCreatedNotification(reservation.getRenter(), saved);
		return DisputeCreateResponse.from(saved);
	}

	private void captureReturnReportSnapshot(Dispute dispute, String reservationId, Scratch targetScratch) {
		List<Scratch> beforeScratches = scratchRepository.findByReservation_ReservationIdAndLogType(reservationId, "BEFORE")
				.stream()
				.filter(scratch -> !scratch.isManual())
				.filter(scratch -> scratch.getCropS3Url() != null && !scratch.getCropS3Url().isBlank())
				.toList();

		List<Scratch> candidates = beforeScratches.stream()
				.filter(before -> before.getCarPart().equalsIgnoreCase(targetScratch.getCarPart()))
				.toList();

		if (candidates.isEmpty()) {
			dispute.captureReturnReportSnapshot(
					null,
					null,
					targetScratch.getCropS3Url(),
					0.0,
					100.0,
					similarityThreshold,
					true
			);
			return;
		}

		Scratch bestBefore = null;
		double bestSimilarity = -1.0;
		double bestDiffScore = 100.0;

		for (Scratch before : candidates) {
			try {
				AiScratchSimilarityResult result = aiScratchSimilarityClient
						.compareByUrls(before.getCropS3Url(), targetScratch.getCropS3Url());
				double similarityPercent = normalizeToPercent(result.similarity());
				if (similarityPercent > bestSimilarity) {
					bestSimilarity = similarityPercent;
					bestDiffScore = result.diffScore();
					bestBefore = before;
				}
			} catch (Exception ignored) {
				// 개별 비교 실패는 skip하고 나머지 후보로 계속 진행
			}
		}

		if (bestBefore == null) {
			dispute.captureReturnReportSnapshot(
					null,
					null,
					targetScratch.getCropS3Url(),
					0.0,
					100.0,
					similarityThreshold,
					true
			);
			return;
		}

		boolean warning = bestSimilarity < similarityThreshold;
		dispute.captureReturnReportSnapshot(
				bestBefore.getLogId(),
				bestBefore.getCropS3Url(),
				targetScratch.getCropS3Url(),
				bestSimilarity,
				bestDiffScore,
				similarityThreshold,
				warning
		);
	}

	private double normalizeToPercent(double similarity) {
		if (similarity <= 1.0) {
			return similarity * 100.0;
		}
		return similarity;
	}

	@Transactional(readOnly = true)
	public List<DisputeSummaryResponse> getCompanyDisputes(String companyId) {
		return disputeRepository.findByReservation_OwnedCar_Company_CompanyIdOrderByCreatedAtDesc(companyId)
				.stream()
				.map(DisputeSummaryResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public DisputeDetailResponse getDisputeDetail(String requesterId, String disputeId) {
		Dispute dispute = disputeRepository.findByDisputeId(disputeId)
				.orElseThrow(() -> new IllegalArgumentException("분쟁을 찾을 수 없습니다: " + disputeId));

		validateParticipantAccess(requesterId, dispute.getReservation());
		return DisputeDetailResponse.from(dispute);
	}

	@Transactional(readOnly = true)
	public DisputeDetailResponse getDisputeDetail(String requesterId,
												  String reservationId,
												  String disputeId) {
		Dispute dispute = disputeRepository.findByDisputeIdAndReservation_ReservationId(disputeId, reservationId)
				.orElseThrow(() -> new IllegalArgumentException("분쟁을 찾을 수 없습니다: " + disputeId));

		validateParticipantAccess(requesterId, dispute.getReservation());
		return DisputeDetailResponse.from(dispute);
	}

	@Transactional(readOnly = true)
	public List<DisputePreviousScratchResponse> getReservationScratchLogs(String requesterId,
																		  String reservationId) {
		Reservation reservation = reservationRepository.findByReservationId(reservationId)
				.orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다: " + reservationId));

		validateParticipantAccess(requesterId, reservation);

		String targetLogId = disputeRepository.findByReservation_ReservationId(reservationId)
				.map(d -> d.getTargetScratch().getLogId())
				.orElse(null);

		String carId = reservation.getOwnedCar().getCarId();
		List<Scratch> allScratches = scratchRepository.findByOwnedCar_CarId(carId);

		return allScratches.stream()
				.filter(scratch -> !scratch.isManual())
				.filter(scratch -> scratch.getCropS3Url() != null && !scratch.getCropS3Url().isBlank())
				.filter(scratch -> !scratch.getLogId().equals(targetLogId))
				.map(DisputePreviousScratchResponse::from)
				.toList();
	}

	@Transactional
	public DisputeAiAnalysisResponse getDisputeAiAnalysis(String requesterId, String disputeId) {
		Dispute dispute = disputeRepository.findByDisputeId(disputeId)
				.orElseThrow(() -> new IllegalArgumentException("분쟁을 찾을 수 없습니다: " + disputeId));

		Reservation reservation = dispute.getReservation();
		validateParticipantAccess(requesterId, reservation);

		if (dispute.getAiAnalysisReport() != null) {
			try {
				return objectMapper.readValue(dispute.getAiAnalysisReport(), DisputeAiAnalysisResponse.class);
			} catch (Exception e) {
				// 파싱 실패 시 재생성
			}
		}

		String reservationId = reservation.getReservationId();
		List<Scratch> beforeScratches = scratchRepository.findByReservation_ReservationIdAndLogType(reservationId, "BEFORE")
				.stream()
				.filter(scratch -> !scratch.isManual())
				.filter(scratch -> scratch.getCropS3Url() != null && !scratch.getCropS3Url().isBlank())
				.toList();
		List<Scratch> afterScratches = scratchRepository.findByReservation_ReservationIdAndLogType(reservationId, "AFTER")
				.stream()
				.filter(scratch -> !scratch.isManual())
				.filter(scratch -> scratch.getCropS3Url() != null && !scratch.getCropS3Url().isBlank())
				.toList();

		List<DisputeAiAnalysisResponse.ComparisonItem> comparisons = new ArrayList<>();
		for (Scratch before : beforeScratches) {
			for (Scratch after : afterScratches) {
				AiScratchSimilarityResult result = aiScratchSimilarityClient
						.compareByUrls(before.getCropS3Url(), after.getCropS3Url());
				comparisons.add(new DisputeAiAnalysisResponse.ComparisonItem(
						before.getLogId(),
						after.getLogId(),
						before.getCropS3Url(),
						after.getCropS3Url(),
						result.similarity(),
						result.diffScore()
				));
			}
		}

		DisputeAiAnalysisResponse response = new DisputeAiAnalysisResponse(
				dispute.getDisputeId(),
				reservationId,
				beforeScratches.size(),
				afterScratches.size(),
				comparisons
		);

		try {
			dispute.cacheAiAnalysis(objectMapper.writeValueAsString(response));
		} catch (Exception e) {
			// 캐시 저장 실패해도 응답은 정상 반환
		}

		return response;
	}
	@Transactional
	public DisputeDefenseResponse defendDispute(String requesterId,
												String reservationId,
												String disputeId,
												DisputeDefenseRequest request) {
		Dispute dispute = disputeRepository.findByDisputeIdAndReservation_ReservationId(disputeId, reservationId)
				.orElseThrow(() -> new IllegalArgumentException("분쟁을 찾을 수 없습니다: " + disputeId));

		validateRenterAccess(requesterId, dispute.getReservation());

		Scratch defenseScratch = scratchRepository.findById(request.getDefenseLogId())
				.orElseThrow(() -> new IllegalArgumentException("방어 흠집 로그를 찾을 수 없습니다: " + request.getDefenseLogId()));

		validateScratchBelongsToCar(defenseScratch, dispute.getReservation().getOwnedCar().getCarId());

		dispute.defend(defenseScratch);
		companyNotificationService.createDefenseSubmittedNotification(
				dispute.getReservation().getOwnedCar().getCompany(),
				dispute,
				defenseScratch
		);
		return DisputeDefenseResponse.from(dispute);
	}

	private void validateCompanyAccess(String requesterId, Reservation reservation) {
		String companyId = reservation.getOwnedCar().getCompany().getCompanyId();
		if (!companyId.equals(requesterId)) {
			throw new IllegalArgumentException("분쟁 생성 권한이 없습니다.");
		}
	}

	private void validateRenterAccess(String requesterId, Reservation reservation) {
		String renterId = reservation.getRenter().getUserId();
		if (!renterId.equals(requesterId)) {
			throw new IllegalArgumentException("분쟁 방어 권한이 없습니다.");
		}
	}

	private void validateParticipantAccess(String requesterId, Reservation reservation) {
		String renterId = reservation.getRenter().getUserId();
		String companyId = reservation.getOwnedCar().getCompany().getCompanyId();
		if (!renterId.equals(requesterId) && !companyId.equals(requesterId)) {
			throw new IllegalArgumentException("분쟁 조회 권한이 없습니다.");
		}
	}

	private void validateScratchBelongsToReservation(Scratch scratch, String reservationId) {
		String scratchReservationId = scratch.getReservation().getReservationId();
		if (!reservationId.equals(scratchReservationId)) {
			throw new IllegalArgumentException("해당 예약의 흠집 로그가 아닙니다.");
		}
	}

	private void validateScratchBelongsToCar(Scratch scratch, String carId) {
		String scratchCarId = scratch.getOwnedCar().getCarId();
		if (!carId.equals(scratchCarId)) {
			throw new IllegalArgumentException("해당 차량의 흠집 로그가 아닙니다.");
		}
	}

	private void validateLogType(Scratch scratch, String expectedLogType, String errorMessage) {
		if (!expectedLogType.equalsIgnoreCase(scratch.getLogType())) {
			throw new IllegalArgumentException(errorMessage);
		}
	}

	@Transactional
	public DisputeSettleResponse settleDispute(String requesterId, String disputeId, DisputeSettleRequest request) {
		Dispute dispute = disputeRepository.findByDisputeId(disputeId)
				.orElseThrow(() -> new IllegalArgumentException("존재하지 않는 분쟁입니다: " + disputeId));
		Reservation reservation = dispute.getReservation();
		validateParticipantAccess(requesterId, reservation);

		if (dispute.getStatusEnum() == DisputeStatus.COMPLETED) {
			throw new IllegalStateException("이미 정산이 완료된 분쟁입니다.");
		}

		SettlementAmount amount = new SettlementAmount(request.getFinalAmount());
		if (amount.value() > reservation.getTotalPrice()) {
			throw new IllegalArgumentException("최종 정산 금액은 예약 시 최대부담금을 초과할 수 없습니다.");
		}

		String companyWallet = reservation.getOwnedCar().getCompany().getWalletAddress();
		String renterWallet = reservation.getRenter().getWalletAddress();
		validateSettlementWallets(companyWallet, renterWallet);

		boolean requesterIsCompany = reservation.getOwnedCar().getCompany().getCompanyId().equals(requesterId);
		Party party = requesterIsCompany ? Party.COMPANY : Party.RENTER;
		String requesterWallet = requesterIsCompany ? companyWallet : renterWallet;

		AgreementResult result = dispute.agreeSettlement(party, amount);

		switch (result) {
			case BEGIN -> {
				// 온체인 합의 초기화
				initializeAgreementOnChain(disputeId, companyWallet, renterWallet, amount);
				// 온체인 동의
				agreeOnChain(disputeId, requesterWallet);
				// 상대에게 정산 요청 알림
				notifySettlementRequested(party, reservation, dispute, amount);
			}
			case COUNTER -> {
				// 온체인 동의 → 상대에게 정산 요청 알림
				// 온체인 동의
				agreeOnChain(disputeId, requesterWallet);
				// 상대에게 정산 요청 알림
				notifySettlementRequested(party, reservation, dispute, amount);
			}
			case DUPLICATED -> { }
			case COMPLETED -> {
				// 온체인 동의 → 정산 완료 처리
				// 온체인 동의
				agreeOnChain(disputeId, requesterWallet);

				// 정산 완료 처리
				return completeSettlement(dispute, reservation, amount, companyWallet, renterWallet);
			}
		}

		return DisputeSettleResponse.of(
				disputeId, reservation.getReservationId(), amount.value(),
				DisputeStatus.OPEN.name(), null, null);
	}

	private void initializeAgreementOnChain(String disputeId, String companyWallet, String renterWallet, SettlementAmount amount) {
		try {
			disputeSettlementService.initializeSettlementAgreement(disputeId, companyWallet, renterWallet, amount.value());
		} catch (Exception e) {
			throw new RuntimeException("온체인 합의 반영에 실패했습니다.", e);
		}
	}

	private void agreeOnChain(String disputeId, String participantWallet) {
		try {
			disputeSettlementService.agreeSettlementByOperator(disputeId, participantWallet);
		} catch (Exception e) {
			throw new RuntimeException("온체인 합의 반영에 실패했습니다.", e);
		}
	}

	private void notifySettlementRequested(Party requester, Reservation reservation, Dispute dispute, SettlementAmount amount) {
		if (requester == Party.COMPANY) {
			renterNotificationService.createSettlementRequestedNotification(reservation.getRenter(), dispute, amount.value());
		} else {
			companyNotificationService.createSettlementRequestedNotification(reservation.getOwnedCar().getCompany(), dispute, amount.value());
		}
	}

	private DisputeSettleResponse completeSettlement(Dispute dispute, Reservation reservation, SettlementAmount amount,
													 String companyWallet, String renterWallet) {
		String txHash;
		try {
			txHash = disputeSettlementService.recordSettlement(dispute.getDisputeId(), amount.value());
		} catch (Exception e) {
			throw new RuntimeException("온체인 정산 처리에 실패했습니다.", e);
		}

		if (amount.isNoFault()) {
			reservation.safeDeposit();
		} else {
			try {
				txHash = careTokenService.transfer(renterWallet, companyWallet, amount.value());
			} catch (Exception e) {
				throw new RuntimeException("자동 이체에 실패했습니다.", e);
			}
			reservation.deductDeposit();
		}

		dispute.resolve();
		dispute.getTargetScratch().clearDisputed();

		String settlementStatus = dispute.getSettlementStatus();
		renterNotificationService.createSettlementCompletedNotification(
				reservation.getRenter(), dispute, settlementStatus, amount.value());
		companyNotificationService.createSettlementCompletedNotification(
				reservation.getOwnedCar().getCompany(), dispute, settlementStatus, amount.value());

		return DisputeSettleResponse.of(
				dispute.getDisputeId(), reservation.getReservationId(), amount.value(),
				settlementStatus, LocalDateTime.now(), txHash);
	}

	private void validateSettlementWallets(String companyWallet, String renterWallet) {
		if (renterWallet == null || renterWallet.isBlank()) {
			throw new IllegalArgumentException("임차인 지갑 주소가 없습니다.");
		}
		if (companyWallet == null || companyWallet.isBlank()) {
			throw new IllegalArgumentException("임대인 지갑 주소가 없습니다.");
		}
	}
}
