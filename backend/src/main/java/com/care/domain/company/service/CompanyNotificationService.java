package com.care.domain.company.service;

import com.care.domain.company.controller.dto.response.CompanyNotificationResponse;
import com.care.domain.company.entity.Company;
import com.care.domain.company.entity.CompanyNotification;
import com.care.domain.company.repository.CompanyNotificationRepository;
import com.care.domain.reservation.entity.Dispute;
import com.care.domain.reservation.entity.Scratch;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyNotificationService {

    private static final long SSE_TIMEOUT_MILLIS = 60L * 60L * 1000L;

    private final CompanyNotificationRepository companyNotificationRepository;
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> emitterStore = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String companyId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);

        // compute()로 원자적 처리 — race condition 방지
        emitterStore.compute(companyId, (key, existing) -> {
            if (existing != null && !existing.isEmpty()) {
                log.info("[SSE-COMPANY] 기존 연결 강제 종료 | companyId={} | 연결 수={}", companyId, existing.size());
                for (SseEmitter old : existing) {
                    try { old.complete(); } catch (Exception ignored) {}
                }
            }
            CopyOnWriteArrayList<SseEmitter> newList = new CopyOnWriteArrayList<>();
            newList.add(emitter);
            return newList;
        });

        log.info("[SSE-COMPANY] 구독 시작 | companyId={} | 현재 연결 수=1", companyId);
        logActiveSubscribers();

        emitter.onCompletion(() -> {
            removeEmitter(companyId, emitter);
            log.info("[SSE-COMPANY] 연결 종료(completion) | companyId={}", companyId);
        });
        emitter.onTimeout(() -> {
            removeEmitter(companyId, emitter);
            emitter.complete();
            log.info("[SSE-COMPANY] 연결 타임아웃 | companyId={}", companyId);
        });
        emitter.onError(throwable -> {
            removeEmitter(companyId, emitter);
            emitter.completeWithError(throwable);
            log.warn("[SSE-COMPANY] 연결 에러 | companyId={} | error={}", companyId, throwable.getMessage());
        });

        sendEvent(companyId, emitter, "CONNECTED", Map.of("message", "company notification stream connected"));
        return emitter;
    }

    @Transactional
    public void createDefenseSubmittedNotification(Company company, Dispute dispute, Scratch defenseScratch) {
        CompanyNotification notification = CompanyNotification.defenseSubmitted(company, dispute, defenseScratch);
        CompanyNotification saved = companyNotificationRepository.save(notification);
        pushNotification(company.getCompanyId(), CompanyNotificationResponse.from(saved));
    }

    @Transactional
    public void createSettlementRequestedNotification(Company company, Dispute dispute, long finalAmount) {
        CompanyNotification notification = CompanyNotification.settlementRequested(company, dispute, finalAmount);
        CompanyNotification saved = companyNotificationRepository.save(notification);
        pushNotification(company.getCompanyId(), CompanyNotificationResponse.from(saved));
    }

    @Transactional
    public void createSettlementCompletedNotification(
            Company company,
            Dispute dispute,
            String settlementStatus,
            long finalAmount
    ) {
        CompanyNotification notification = CompanyNotification
                .settlementCompleted(company, dispute, settlementStatus, finalAmount);
        CompanyNotification saved = companyNotificationRepository.save(notification);
        pushNotification(company.getCompanyId(), CompanyNotificationResponse.from(saved));
    }

    @Transactional(readOnly = true)
    public List<CompanyNotificationResponse> getMyNotifications(String companyId) {
        return companyNotificationRepository.findByCompany_CompanyIdOrderByCreatedAtDesc(companyId)
                .stream()
                .map(CompanyNotificationResponse::from)
                .toList();
    }

    @Transactional
    public CompanyNotificationResponse markAsRead(String companyId, String notificationId) {
        CompanyNotification notification = companyNotificationRepository
                .findByNotificationIdAndCompany_CompanyId(notificationId, companyId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다: " + notificationId));

        notification.markAsRead();
        return CompanyNotificationResponse.from(notification);
    }

    @Scheduled(fixedRate = 15000)
    public void sendHeartbeat() {
        int totalConnections = emitterStore.values().stream().mapToInt(List::size).sum();
        if (totalConnections == 0) return;

        log.debug("[SSE-COMPANY] Heartbeat 전송 | 구독자 수={} | 연결 수={}", emitterStore.size(), totalConnections);
        emitterStore.forEach((companyId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                sendEvent(companyId, emitter, "HEARTBEAT", Map.of("message", "ping"));
            }
        });
    }

    private void logActiveSubscribers() {
        if (emitterStore.isEmpty()) {
            log.info("[SSE-COMPANY] 현재 구독자 없음");
            return;
        }
        emitterStore.forEach((companyId, emitters) ->
            log.info("[SSE-COMPANY] 구독 중 | companyId={} | 연결 수={}", companyId, emitters.size())
        );
    }

    private void pushNotification(String companyId, CompanyNotificationResponse response) {
        List<SseEmitter> emitters = emitterStore.get(companyId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            sendEvent(companyId, emitter, "NOTIFICATION", response);
        }
    }

    private void sendEvent(String companyId, SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException | IllegalStateException e) {
            removeEmitter(companyId, emitter);
        }
    }

    private void removeEmitter(String companyId, SseEmitter emitter) {
        List<SseEmitter> emitters = emitterStore.get(companyId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emitterStore.remove(companyId);
        }
    }
}
