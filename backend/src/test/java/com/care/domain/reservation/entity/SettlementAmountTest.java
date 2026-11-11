package com.care.domain.reservation.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SettlementAmountTest {

    @Test
    void 금액이_음수면_에러가_난다() {

        assertThatThrownBy(() -> new SettlementAmount(-1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 무과실이면_0원이다() {

        assertThat(SettlementAmount.noFault().isNoFault()).isTrue();
    }

    @Test
    void 금액이_있으면_무과실이_아니다() {

        assertThat(new SettlementAmount(50_000).isNoFault()).isFalse();
    }
}
