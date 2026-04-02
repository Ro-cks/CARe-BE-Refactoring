package com.care.domain.reservation.service;

import com.care.domain.company.service.CompanyNotificationService;
import com.care.domain.reservation.controller.dto.request.DisputeCreateRequest;
import com.care.domain.reservation.controller.dto.request.DisputeDefenseRequest;
import com.care.domain.reservation.controller.dto.request.DisputeSettleRequest;
import com.care.domain.reservation.controller.dto.response.DisputeAiAnalysisResponse;
import com.care.domain.reservation.controller.dto.response.DisputeCreateResponse;
import com.care.domain.reservation.controller.dto.response.DisputeDefenseResponse;
import com.care.domain.reservation.controller.dto.response.DisputeDetailResponse;
import com.care.domain.reservation.controller.dto.response.DisputePreviousScratchResponse;
import com.care.domain.reservation.controller.dto.response.DisputeSettleResponse;
import com.care.domain.reservation.controller.dto.response.DisputeSummaryResponse;
import com.care.domain.reservation.entity.Dispute;
import com.care.domain.reservation.entity.DisputeStatus;
import com.care.domain.reservation.entity.Reservation;
import com.care.domain.reservation.entity.SettlementStatus;
import com.care.domain.reservation.entity.Scratch;
import com.care.domain.reservation.repository.DisputeRepository;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.renter.service.RenterNotificationService;
import com.care.domain.scan.repository.ScratchRepository;
import com.care.global.blockchain.CareTokenService;
import com.care.global.blockchain.DisputeSettlementService;
import com.care.global.ai.AiScratchSimilarityClient;
import com.care.global.ai.AiScratchSimilarityResult;
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

	@Transactional
	public void resetDisputeToOpen(String disputeId) {
		Dispute dispute = disputeRepository.findByDisputeId(disputeId)
				.orElseThrow(() -> new IllegalArgumentException("분쟁을 찾을 수 없습니다: " + disputeId));

		Reservation reservation = dispute.getReservation();

		dispute.resetToOpen();
		dispute.getTargetScratch().markDisputed();
		reservation.lockDeposit();
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

		SettlementStatus targetStatus = SettlementStatus.from(request.getStatus());
		if (targetStatus == SettlementStatus.PENDING) {
			throw new IllegalArgumentException("정산 API에서는 PENDING 상태를 사용할 수 없습니다.");
		}

		long finalAmount = request.getFinalAmount();
		long maxBurden = reservation.getTotalPrice();
		if (finalAmount > maxBurden) {
			throw new IllegalArgumentException("최종 정산 금액은 예약 시 최대부담금을 초과할 수 없습니다.");
		}

		String companyWallet = reservation.getOwnedCar().getCompany().getWalletAddress();
		String renterWallet = reservation.getRenter().getWalletAddress();
		validateSettlementWallets(companyWallet, renterWallet);

		String companyId = reservation.getOwnedCar().getCompany().getCompanyId();
		boolean requesterIsCompany = companyId.equals(requesterId);
		boolean hadAnyAgreementBefore = dispute.isCompanySettlementAgreed() || dispute.isRenterSettlementAgreed();

		if (dispute.isCounterProposal(finalAmount, targetStatus)) {
			dispute.resetSettlementAgreements();
		}
		dispute.proposeSettlement(finalAmount, targetStatus);

		boolean alreadyAgreedByRequester = requesterIsCompany
				? dispute.isCompanySettlementAgreed()
				: dispute.isRenterSettlementAgreed();

		if (!alreadyAgreedByRequester) {
			if (requesterIsCompany) {
				dispute.agreeSettlementByCompany();
			} else {
				dispute.agreeSettlementByRenter();
			}

			try {
				if (!hadAnyAgreementBefore) {
					disputeSettlementService.initializeSettlementAgreement(
							disputeId,
							companyWallet,
							renterWallet,
							finalAmount
					);
				}

				disputeSettlementService.agreeSettlementByOperator(
						disputeId,
						requesterIsCompany ? companyWallet : renterWallet
				);
			} catch (Exception e) {
				throw new RuntimeException("온체인 합의 반영에 실패했습니다.", e);
			}
		}

		if (!dispute.isSettlementFullyAgreed()) {
			if (!alreadyAgreedByRequester) {
				if (requesterIsCompany) {
					renterNotificationService.createSettlementRequestedNotification(
							reservation.getRenter(),
							dispute,
							finalAmount
					);
				} else {
					companyNotificationService.createSettlementRequestedNotification(
							reservation.getOwnedCar().getCompany(),
							dispute,
							finalAmount
					);
				}
			}
			return DisputeSettleResponse.of(
					disputeId,
					reservation.getReservationId(),
					finalAmount,
					DisputeStatus.OPEN.name(),
					null,
					null
			);
		}

		String settlementRecordTxHash;
		try {
			settlementRecordTxHash = disputeSettlementService.recordSettlement(
					disputeId,
					finalAmount
			);
		} catch (Exception e) {
			throw new RuntimeException("온체인 정산 처리에 실패했습니다.", e);
		}

		String usdcTxHash = settlementRecordTxHash;
		if (finalAmount > 0) {
			try {
				usdcTxHash = transferUsdcByStatus(reservation, finalAmount, targetStatus);
			} catch (Exception e) {
				throw new RuntimeException("자동 이체에 실패했습니다.", e);
			}
		}
		dispute.resolve();
		dispute.getTargetScratch().clearDisputed();
		if (targetStatus == SettlementStatus.COMPLETED) {
			reservation.deductDeposit();
		} else {
			reservation.safeDeposit();
		}
		renterNotificationService.createSettlementCompletedNotification(
				reservation.getRenter(),
				dispute,
				targetStatus.name(),
				finalAmount
		);
		companyNotificationService.createSettlementCompletedNotification(
				reservation.getOwnedCar().getCompany(),
				dispute,
				targetStatus.name(),
				finalAmount
		);

		return DisputeSettleResponse.of(
				disputeId,
				reservation.getReservationId(),
				finalAmount,
				targetStatus.name(),
				LocalDateTime.now(),
				usdcTxHash
		);
	}

	private String transferUsdcByStatus(Reservation reservation, long finalAmount, SettlementStatus targetStatus) throws Exception {
		String renterWallet = reservation.getRenter().getWalletAddress();
		String companyWallet = reservation.getOwnedCar().getCompany().getWalletAddress();
		validateSettlementWallets(companyWallet, renterWallet);

		double amount = (double) finalAmount;
		if (targetStatus == SettlementStatus.COMPLETED) {
			return careTokenService.transfer(renterWallet, companyWallet, amount);
		}
		if (targetStatus == SettlementStatus.REFUNDED) {
			return careTokenService.transfer(companyWallet, renterWallet, amount);
		}

		throw new IllegalArgumentException("지원하지 않는 정산 상태입니다: " + targetStatus.name());
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
