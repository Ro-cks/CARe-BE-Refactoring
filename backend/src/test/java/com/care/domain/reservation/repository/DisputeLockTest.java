package com.care.domain.reservation.repository;

import com.care.domain.car.entity.CarModel;
import com.care.domain.car.entity.CarSize;
import com.care.domain.car.entity.OwnedCar;
import com.care.domain.company.entity.Company;
import com.care.domain.company.entity.Insurance;
import com.care.domain.renter.entity.Renter;
import com.care.domain.reservation.entity.Dispute;
import com.care.domain.reservation.entity.Reservation;
import com.care.domain.reservation.entity.Scratch;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class DisputeLockTest {

    private static final long HOLD_MILLIS = 500;

    @Autowired
    private DisputeRepository disputeRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private EntityManager em;

    private TransactionTemplate tx;
    private ExecutorService executor;

    @BeforeEach
    void setUp() {
        tx = new TransactionTemplate(transactionManager);
        executor = Executors.newFixedThreadPool(2);
    }

    @AfterEach
    void tearDown() {
        executor.shutdownNow();
    }

    @Test
    void 잠금_조회는_먼저_잠근_트랜잭션이_끝날_때까지_기다린다() throws Exception {
        String disputeId = tx.execute(status -> persistDispute().getDisputeId());

        long waited = measureSecondQueryWait(disputeId, true);

        assertThat(waited).isGreaterThanOrEqualTo(HOLD_MILLIS - 100);
    }

    @Test
    void 잠금_없는_조회는_기다리지_않는다() throws Exception {
        String disputeId = tx.execute(status -> persistDispute().getDisputeId());

        long waited = measureSecondQueryWait(disputeId, false);

        assertThat(waited).isLessThan(HOLD_MILLIS - 100);
    }

    private long measureSecondQueryWait(String disputeId, boolean secondUsesLock) throws Exception {
        CountDownLatch firstLocked = new CountDownLatch(1);

        // 첫 번째 트랜잭션: 잠금을 잡고 HOLD_MILLIS 동안 유지
        executor.submit(() -> tx.executeWithoutResult(status -> {
            disputeRepository.findByDisputeIdForUpdate(disputeId).orElseThrow();
            firstLocked.countDown();
            sleep(HOLD_MILLIS);
        }));

        assertThat(firstLocked.await(5, TimeUnit.SECONDS)).isTrue();
        long start = System.currentTimeMillis();

        // 두 번째 트랜잭션: 같은 분쟁 조회
        Future<?> second = executor.submit(() -> tx.executeWithoutResult(status -> {
            if (secondUsesLock) {
                disputeRepository.findByDisputeIdForUpdate(disputeId).orElseThrow();
            } else {
                disputeRepository.findByDisputeId(disputeId).orElseThrow();
            }
        }));
        second.get(5, TimeUnit.SECONDS);

        return System.currentTimeMillis() - start;
    }

    private Dispute persistDispute() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        Company company = save(Company.of("company-" + id, "업체", id + "@company.com", "pw", "PUS", "ko", "0xcompany-" + id));
        Renter renter = save(Renter.of("renter-" + id, "렌터", id + "@renter.com", "pw", "ko", "0xrenter-" + id));
        CarModel carModel = save(CarModel.create("model-" + id, "Hyundai", "Sonata", "GASOLINE", CarSize.MEDIUM));
        OwnedCar car = save(OwnedCar.create("car-" + id, company, carModel, "12가" + id, 50_000));
        Insurance insurance = save(Insurance.create("insurance-" + id, company, "기본 보험", "설명", 10_000));
        Reservation reservation = save(Reservation.create(
                renter, car, insurance, LocalDateTime.now(), LocalDateTime.now().plusDays(1), 200_000, "0xpayment"));
        Scratch scratch = save(Scratch.builder()
                .logId("log-" + id).reservation(reservation).ownedCar(car)
                .logType("AFTER").carPart("FRONT").coordX(0f).coordY(0f)
                .originalS3Url("https://example.com/original.jpg")
                .cropS3Url("https://example.com/crop.jpg")
                .isManual(false).isDisputed(false)
                .build());
        return save(Dispute.create(reservation, scratch, "사유", 50_000));
    }

    private <T> T save(T entity) {
        em.persist(entity);
        return entity;
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}