package com.care.domain.company.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "company")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Company extends BaseEntity {

    @Id
    @Column(name = "company_id", length = 100)
    private String companyId;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "email", length = 100, nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", length = 255, nullable = false)
    private String passwordHash;

    @Column(name = "biz_number", length = 50)
    private String bizNumber;

    @Column(name = "wallet_address", length = 100, unique = true)
    private String walletAddress;

    @Column(name = "privy_wallet_id", length = 100)
    private String privyWalletId;

    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Column(name = "city", length = 50)
    private String city;

    @Column(name = "airport_code", length = 10, nullable = false)
    private String airportCode;

    @Column(name = "detail_address", length = 255)
    private String detailAddress;

    @Column(name = "language_code", length = 10)
    private String languageCode;

    @Column(name = "did_verified", nullable = false)
    private boolean didVerified = false;

    // 정적 팩토리 메서드 -> new 대신 of()로 Company 객체를 생성 및 반환
    // 나중에 추가되는 정보들은 null로 처리 (
    public static Company of(String companyId, String name, String email, String passwordHash, String airportCode, String languageCode, String walletAddress) {
        Company company = new Company();
        company.companyId = companyId;
        company.name = name;
        company.email = email;
        company.passwordHash = passwordHash;
        company.airportCode = airportCode;
        company.languageCode = languageCode;
        company.walletAddress = walletAddress;
        return company;
    }

    // DID 발급 시 사업자등록번호 확인용
    public void updateBizVerified(String bizNo) {
        this.bizNumber = bizNo;
    }

    public void updatePrivyWallet(String walletAddress, String privyWalletId) {
        this.walletAddress = walletAddress;
        this.privyWalletId = privyWalletId;
    }

    public void updateLanguage(String languageCode) {
        this.languageCode = languageCode;
    }
}
