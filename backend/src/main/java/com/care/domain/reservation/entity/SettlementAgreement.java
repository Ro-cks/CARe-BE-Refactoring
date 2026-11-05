package com.care.domain.reservation.entity;

public class SettlementAgreement {

    private Long amount;              // 제안 금액 (제안 전에는 null)
    private SettlementStatus status;  // 제안 결과 (제안 전에는 null)
    private boolean companyAgreed;
    private boolean renterAgreed;

    public void agree(Party party, long amount, SettlementStatus status) {
        if (!isValidInput(amount, status)) throw new IllegalArgumentException("잘못된 입력입니다.");
        if (isCompleted()) throw new IllegalStateException("이미 합의가 완료되었습니다.");

        // 1. 현재 제안과 다르면 양쪽 동의를 지운다
        if (isDifferentProposal(amount, status)) {
            companyAgreed = false;
            renterAgreed = false;
        }

        // 2. 요청 조건을 현재 제안으로 저장한다
        this.amount = amount;
        this.status = status;

        if (party == Party.COMPANY) {
            companyAgreed = true;
        } else {
            renterAgreed = true;
        }
    }

    private boolean isValidInput(long amount, SettlementStatus status) {
        if (amount < 0) return false;

        if (status == null || status == SettlementStatus.PENDING) return false;

        return true;
    }

    private boolean isDifferentProposal(long amount, SettlementStatus status) {
        // 아직 제안이 없으면 false
        if (this.status == null) return false;

        // 금액이나 결과가 다르면 true, 모두 같으면 false
        return (this.amount != amount) || (this.status != status);
    }

    public boolean isCompleted() {

        return companyAgreed && renterAgreed;
    }
}