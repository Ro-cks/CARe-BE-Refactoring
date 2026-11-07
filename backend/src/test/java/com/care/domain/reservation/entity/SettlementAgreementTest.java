package com.care.domain.reservation.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SettlementAgreementTest {

    private static final SettlementAmount FIFTY_THOUSAND = new SettlementAmount(50_000);
    private static final SettlementAmount THIRTY_THOUSAND = new SettlementAmount(30_000);

    @Test
    void 상대가_같은_금액에_동의하면_합의가_완료된다() {
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);
        agreement.agree(Party.RENTER, FIFTY_THOUSAND);

        assertThat(agreement.isCompleted()).isTrue();
    }

    @Test
    void 상대가_다른_금액을_제안하면_합의가_완료되지_않는다() {
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);
        agreement.agree(Party.RENTER, THIRTY_THOUSAND);

        assertThat(agreement.isCompleted()).isFalse();
    }

    @Test
    void 역제안_후_원래_금액으로_돌아오면_상대가_다시_동의해야_한다() {
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);
        agreement.agree(Party.RENTER, THIRTY_THOUSAND);
        agreement.agree(Party.RENTER, FIFTY_THOUSAND);
        assertThat(agreement.isCompleted()).isFalse();

        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);
        assertThat(agreement.isCompleted()).isTrue();
    }

    @Test
    void 같은_사람이_같은_금액으로_다시_요청해도_합의가_완료되지_않는다() {
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);
        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);

        assertThat(agreement.isCompleted()).isFalse();
    }

    @Test
    void 합의가_완료된_뒤_요청하면_에러가_난다() {
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);
        agreement.agree(Party.RENTER, FIFTY_THOUSAND);

        assertThatThrownBy(() -> agreement.agree(Party.RENTER, THIRTY_THOUSAND))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 금액이_null이면_에러가_난다() {
        SettlementAgreement agreement = new SettlementAgreement();

        assertThatThrownBy(() -> agreement.agree(Party.COMPANY, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 첫_제안이면_BEGIN을_반환한다() {
        SettlementAgreement agreement = new SettlementAgreement();

        assertThat(agreement.agree(Party.COMPANY, FIFTY_THOUSAND)).isEqualTo(AgreementResult.BEGIN);
    }

    @Test
    void 역제안이면_COUNTER를_반환한다() {
        SettlementAgreement agreement = new SettlementAgreement();
        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);

        assertThat(agreement.agree(Party.RENTER, THIRTY_THOUSAND)).isEqualTo(AgreementResult.COUNTER);
    }

    @Test
    void 중복_요청이면_DUPLICATED를_반환한다() {
        SettlementAgreement agreement = new SettlementAgreement();
        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);

        assertThat(agreement.agree(Party.COMPANY, FIFTY_THOUSAND)).isEqualTo(AgreementResult.DUPLICATED);
    }

    @Test
    void 합의가_완료되면_COMPLETED를_반환한다() {
        SettlementAgreement agreement = new SettlementAgreement();
        agreement.agree(Party.COMPANY, FIFTY_THOUSAND);

        assertThat(agreement.agree(Party.RENTER, FIFTY_THOUSAND)).isEqualTo(AgreementResult.COMPLETED);
    }
}