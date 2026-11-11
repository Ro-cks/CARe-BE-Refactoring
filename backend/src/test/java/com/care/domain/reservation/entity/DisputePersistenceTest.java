package com.care.domain.reservation.entity;

import com.care.domain.car.entity.CarModel;
import com.care.domain.car.entity.CarSize;
import com.care.domain.car.entity.OwnedCar;
import com.care.domain.company.entity.Company;
import com.care.domain.company.entity.Insurance;
import com.care.domain.renter.entity.Renter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DisputePersistenceTest {

    @Autowired
    private TestEntityManager em;

    @Test
    void 정산_합의_상태가_기존_컬럼에_저장되고_다시_읽힌다() {
        Dispute dispute = persistDispute();
        dispute.agreeSettlement(Party.COMPANY, new SettlementAmount(50_000));

        em.flush();
        em.clear();

        Dispute found = em.find(Dispute.class, dispute.getDisputeId());
        assertThat(found.getSettlementFinalAmount()).isEqualTo(50_000L);
        assertThat(found.isCompanySettlementAgreed()).isTrue();
        assertThat(found.isRenterSettlementAgreed()).isFalse();

        Object savedAmount = em.getEntityManager()
                .createNativeQuery("select settlement_final_amount from dispute where dispute_id = :id")
                .setParameter("id", dispute.getDisputeId())
                .getSingleResult();
        assertThat(((Number) savedAmount).longValue()).isEqualTo(50_000L);
    }

    @Test
    void 제안이_없으면_정산_금액은_null로_읽힌다() {
        Dispute dispute = persistDispute();

        em.flush();
        em.clear();

        Dispute found = em.find(Dispute.class, dispute.getDisputeId());
        assertThat(found.getSettlementFinalAmount()).isNull();
        assertThat(found.getSettlementStatus()).isNull();
    }

    private Dispute persistDispute() {
        Company company = em.persist(Company.of("company-1", "업체", "company@test.com", "pw", "PUS", "ko", "0xcompany"));
        Renter renter = em.persist(Renter.of("renter-1", "렌터", "renter@test.com", "pw", "ko", "0xrenter"));
        CarModel carModel = em.persist(CarModel.create("model-1", "Hyundai", "Sonata", "GASOLINE", CarSize.MEDIUM));
        OwnedCar car = em.persist(OwnedCar.create("car-1", company, carModel, "12가3456", 50_000));
        Insurance insurance = em.persist(Insurance.create("insurance-1", company, "기본 보험", "설명", 10_000));
        Reservation reservation = em.persist(Reservation.create(
                renter, car, insurance, LocalDateTime.now(), LocalDateTime.now().plusDays(1), 200_000, "0xpayment"));
        Scratch scratch = em.persist(Scratch.builder()
                .logId("after-log-1").reservation(reservation).ownedCar(car)
                .logType("AFTER").carPart("FRONT").coordX(0f).coordY(0f)
                .originalS3Url("https://example.com/original.jpg")
                .cropS3Url("https://example.com/crop.jpg")
                .isManual(false).isDisputed(false)
                .build());
        return em.persist(Dispute.create(reservation, scratch, "사유", 50_000));
    }
}