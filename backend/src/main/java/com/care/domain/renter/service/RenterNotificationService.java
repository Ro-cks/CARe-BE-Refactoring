package com.care.domain.renter.service;

import com.care.domain.renter.controller.dto.response.RenterNotificationResponse;
import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.entity.RenterNotification;
import com.care.domain.renter.repository.RenterNotificationRepository;
import com.care.domain.reservation.entity.Dispute;
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
public class RenterNotificationService {

    private static final long SSE_TIMEOUT_MILLIS = 60L * 60L * 1000L;

    private final RenterNotificationRepository renterNotificationRepository;
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> emitterStore = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);

        // compute()로 원자적 처리 — race condition 방지
        emitterStore.compute(userId, (key, existing) -> {
            if (existing != null && !existing.isEmpty()) {
                log.info("[SSE-RENTER] 기존 연결 강제 종료 | userId={} | 연결 수={}", userId, existing.size());
                for (SseEmitter old : existing) {
                    try { old.complete(); } catch (Exception ignored) {}
                }
            }
            CopyOnWriteArrayList<SseEmitter> newList = new CopyOnWriteArrayList<>();
            newList.add(emitter);
            return newList;
        });

        log.info("[SSE-RENTER] 구독 시작 | userId={} | 현재 연결 수=1", userId);
        logActiveSubscribers();

        emitter.onCompletion(() -> {
            removeEmitter(userId, emitter);
            log.info("[SSE-RENTER] 연결 종료(completion) | userId={}", userId);
        });
        emitter.onTimeout(() -> {
            removeEmitter(userId, emitter);
            emitter.complete();
            log.info("[SSE-RENTER] 연결 타임아웃 | userId={}", userId);
        });
        emitter.onError(throwable -> {
            removeEmitter(userId, emitter);
            emitter.completeWithError(throwable);
            log.warn("[SSE-RENTER] 연결 에러 | userId={} | error={}", userId, throwable.getMessage());
        });

        sendEvent(userId, emitter, "CONNECTED", Map.of("message", "notification stream connected"));
        return emitter;
    }

    @Transactional
    public void createDisputeCreatedNotification(Renter renter, Dispute dispute) {
        if (renter == null) {
            throw new IllegalArgumentException("렌터 정보가 없습니다.");
        }
        if (dispute == null) {
            throw new IllegalArgumentException("분쟁 정보가 없습니다.");
        }

        RenterNotification notification = RenterNotification.disputeCreated(
                renter,
                dispute.getReservation().getReservationId(),
                dispute.getDisputeId(),
                dispute.getReason()
        );
            RenterNotification saved = renterNotificationRepository.save(notification);
            pushNotification(renter.getUserId(), RenterNotificationResponse.from(saved));
    }

    @Transactional
    public void createSettlementRequestedNotification(Renter renter, Dispute dispute, long finalAmount) {
        if (renter == null) {
            throw new IllegalArgumentException("렌터 정보가 없습니다.");
        }
        if (dispute == null) {
            throw new IllegalArgumentException("분쟁 정보가 없습니다.");
        }

        RenterNotification notification = RenterNotification.settlementRequested(
                renter,
                dispute.getReservation().getReservationId(),
                dispute.getDisputeId(),
                finalAmount
        );
        RenterNotification saved = renterNotificationRepository.save(notification);
        pushNotification(renter.getUserId(), RenterNotificationResponse.from(saved));
    }

    @Transactional
    public void createSettlementCompletedNotification(
            Renter renter,
            Dispute dispute,
            String settlementStatus,
            long finalAmount
    ) {
        if (renter == null) {
            throw new IllegalArgumentException("렌터 정보가 없습니다.");
        }
        if (dispute == null) {
            throw new IllegalArgumentException("분쟁 정보가 없습니다.");
        }

        RenterNotification notification = RenterNotification.settlementCompleted(
                renter,
                dispute.getReservation().getReservationId(),
                dispute.getDisputeId(),
                settlementStatus,
                finalAmount
        );
        RenterNotification saved = renterNotificationRepository.save(notification);
        pushNotification(renter.getUserId(), RenterNotificationResponse.from(saved));
    }

    @Transactional
    public void createReservationCreatedNotification(Renter renter, String reservationId, String modelName, int totalPrice) {
        RenterNotification notification = RenterNotification.reservationCreated(renter, reservationId, modelName, totalPrice);
        RenterNotification saved = renterNotificationRepository.save(notification);
        pushNotification(renter.getUserId(), RenterNotificationResponse.from(saved));
    }

    @Transactional
    public void createReservationCompletedNotification(Renter renter, String reservationId, String modelName) {
        RenterNotification notification = RenterNotification.reservationCompleted(renter, reservationId, modelName);
        RenterNotification saved = renterNotificationRepository.save(notification);
        pushNotification(renter.getUserId(), RenterNotificationResponse.from(saved));
    }

    @Transactional(readOnly = true)
    public List<RenterNotificationResponse> getMyNotifications(String userId) {
        return renterNotificationRepository.findByRenter_UserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(RenterNotificationResponse::from)
                .toList();
    }

    @Transactional
    public RenterNotificationResponse markAsRead(String userId, String notificationId) {
        RenterNotification notification = renterNotificationRepository
                .findByNotificationIdAndRenter_UserId(notificationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다: " + notificationId));

        notification.markAsRead();
        return RenterNotificationResponse.from(notification);
    }

    @Scheduled(fixedRate = 15000)
    public void sendHeartbeat() {
        int totalConnections = emitterStore.values().stream().mapToInt(List::size).sum();
        if (totalConnections == 0) return;

        log.debug("[SSE-RENTER] Heartbeat 전송 | 구독자 수={} | 연결 수={}", emitterStore.size(), totalConnections);
        emitterStore.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                sendEvent(userId, emitter, "HEARTBEAT", Map.of("message", "ping"));
            }
        });
    }

    private void logActiveSubscribers() {
        if (emitterStore.isEmpty()) {
            log.info("[SSE-RENTER] 현재 구독자 없음");
            return;
        }
        emitterStore.forEach((userId, emitters) ->
            log.info("[SSE-RENTER] 구독 중 | userId={} | 연결 수={}", userId, emitters.size())
        );
    }

    private void pushNotification(String userId, RenterNotificationResponse response) {
        List<SseEmitter> emitters = emitterStore.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            log.warn("[SSE-RENTER] push 실패 — 구독 중인 emitter 없음 | userId={} | emitterStore keys={}", userId, emitterStore.keySet());
            return;
        }
        log.info("[SSE-RENTER] 알림 push | userId={} | type={}", userId, response.notificationType());
        for (SseEmitter emitter : emitters) {
            sendEvent(userId, emitter, "NOTIFICATION", response);
        }
    }

    private void sendEvent(String userId, SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException | IllegalStateException e) {
            log.warn("[SSE-RENTER] 이벤트 전송 실패, emitter 제거 | userId={} | event={} | error={}", userId, eventName, e.getMessage());
            removeEmitter(userId, emitter);
        }
    }

    private void removeEmitter(String userId, SseEmitter emitter) {
        List<SseEmitter> emitters = emitterStore.get(userId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emitterStore.remove(userId);
        }
    }
}
