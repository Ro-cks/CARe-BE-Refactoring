package com.care.domain.reservation.entity;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;

@Embeddable
public class SettlementAgreement {

    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "settlement_final_amount"))
    private SettlementAmount amount;  // 현재 제안 금액 (제안 전에는 null)

    @Column(name = "company_settlement_agreed", nullable = false)
    private boolean companyAgreed;

    @Column(name = "renter_settlement_agreed", nullable = false)
    private boolean renterAgreed;

    public AgreementResult agree(Party party, SettlementAmount amount) {
        if (amount == null) throw new IllegalArgumentException("정산 금액은 필수입니다.");
        if (isCompleted()) throw new IllegalStateException("이미 합의가 완료되었습니다.");

        AgreementResult result = decideResult(party, amount);

        // 1. 역제안이면 양쪽 동의를 지운다
        if (result == AgreementResult.COUNTER) {
            companyAgreed = false;
            renterAgreed = false;
        }

        // 2. 요청 금액을 현재 제안으로 저장한다
        this.amount = amount;

        // 3. 요청자의 동의를 기록한다
        if (party == Party.COMPANY) {
            companyAgreed = true;
        } else {
            renterAgreed = true;
        }

        return result;
    }

    public boolean isCompleted() {
        return companyAgreed && renterAgreed;
    }

    private AgreementResult decideResult(Party party, SettlementAmount amount) {
        if (this.amount == null) return AgreementResult.BEGIN;
        if (!this.amount.equals(amount)) return AgreementResult.COUNTER;
        if (isAgreedBy(party)) return AgreementResult.DUPLICATED;
        return AgreementResult.COMPLETED;
    }

    private boolean isAgreedBy(Party party) {
        return party == Party.COMPANY ? companyAgreed : renterAgreed;
    }
}