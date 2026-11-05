package com.care.domain.reservation.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SettlementAgreementTest {

    @Test
    void 상대가_같은_조건에_동의하면_합의가_완료된다() {
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, 50000L, SettlementStatus.COMPLETED);
        agreement.agree(Party.RENTER, 50000L, SettlementStatus.COMPLETED);

        assertThat(agreement.isCompleted()).isTrue();
    }

    @Test
    void 상대가_다른_금액을_제안하면_합의가_완료되지_않는다() {
        // TODO: 업체는 50000원, 렌터는 30000원으로 agree()를 호출하세요.
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, 50000L, SettlementStatus.COMPLETED);
        agreement.agree(Party.RENTER, 30000L, SettlementStatus.COMPLETED);
        // TODO: isCompleted()가 false인지 확인하세요.

        assertThat(agreement.isCompleted()).isFalse();
    }

    @Test
    void 상대가_다른_결과를_제안하면_합의가_완료되지_않는다() {
        // TODO: 업체는 50000원 COMPLETED, 렌터는 50000원 REFUNDED로 agree()를 호출하세요.
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, 50000L, SettlementStatus.COMPLETED);
        agreement.agree(Party.RENTER, 50000L, SettlementStatus.REFUNDED);
        // TODO: isCompleted()가 false인지 확인하세요.
        assertThat(agreement.isCompleted()).isFalse();
    }

    @Test
    void 역제안_후_원래_금액으로_돌아오면_상대가_다시_동의해야_한다() {
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, 50000L, SettlementStatus.COMPLETED);
        agreement.agree(Party.RENTER, 30000L, SettlementStatus.COMPLETED);
        agreement.agree(Party.RENTER, 50000L, SettlementStatus.COMPLETED);
        assertThat(agreement.isCompleted()).isFalse();

        agreement.agree(Party.COMPANY, 50000L, SettlementStatus.COMPLETED);
        assertThat(agreement.isCompleted()).isTrue();
    }

    @Test
    void 같은_사람이_같은_조건으로_다시_요청해도_합의가_완료되지_않는다() {
        // 업체가 같은 조건으로 두 번 agree()를 호출
        SettlementAgreement agreement = new SettlementAgreement();
        agreement.agree(Party.COMPANY, 50000L, SettlementStatus.COMPLETED);
        agreement.agree(Party.COMPANY, 50000L, SettlementStatus.COMPLETED);

        // isCompleted()가 false인지 확인
        assertThat(agreement.isCompleted()).isFalse();
    }

    @Test
    void 합의가_완료된_뒤_요청하면_에러가_난다() {
        // 양측이 같은 조건으로 합의를 완료
        SettlementAgreement agreement = new SettlementAgreement();

        agreement.agree(Party.COMPANY, 50000L, SettlementStatus.COMPLETED);
        agreement.agree(Party.RENTER, 50000L, SettlementStatus.COMPLETED);

        assertThatThrownBy(() -> agreement.agree(Party.RENTER, 30000L, SettlementStatus.COMPLETED))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 금액이_음수면_에러가_난다() {
        SettlementAgreement agreement = new SettlementAgreement();

        assertThatThrownBy(() -> agreement.agree(Party.COMPANY, -1L, SettlementStatus.COMPLETED))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 정산_결과가_null이면_에러가_난다() {
        SettlementAgreement agreement = new SettlementAgreement();

        assertThatThrownBy(() -> agreement.agree(Party.COMPANY, 0, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 정산_결과가_PENDING이면_에러가_난다() {
        SettlementAgreement agreement = new SettlementAgreement();

        assertThatThrownBy(() -> agreement.agree(Party.COMPANY, 0, SettlementStatus.PENDING))
                .isInstanceOf(IllegalArgumentException.class);
    }
}