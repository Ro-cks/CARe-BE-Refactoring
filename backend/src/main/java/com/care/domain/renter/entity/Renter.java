package com.care.domain.renter.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "renter")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Renter extends BaseEntity {

    @Id
    @Column(name = "user_id", length = 100)
    private String userId;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "email", length = 100, nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", length = 255, nullable = false)
    private String passwordHash;

    @Column(name = "wallet_address", length = 100, unique = true)
    private String walletAddress;

    @Column(name = "privy_wallet_id", length = 100)
    private String privyWalletId;

    @Column(name = "did_uri", length = 100)
    private String didUri;

    @Column(name = "did_verified", nullable = false)
    private boolean didVerified = false;

    @Column(name = "vc_cid", length = 255)
    private String vcCid;

    @Column(name = "language_code", length = 10)
    private String languageCode;

    public static Renter of(String userId, String name, String email, String passwordHash, String languageCode, String walletAddress) {
        Renter renter = new Renter();
        renter.userId = userId;
        renter.name = name;
        renter.email = email;
        renter.passwordHash = passwordHash;
        renter.languageCode = languageCode;
        renter.walletAddress = walletAddress;
        renter.didVerified = false;
        return renter;
    }

    public void updateDid(String didUri) {
        this.didUri = didUri;
        this.didVerified = true;
    }

    public void updatePrivyWallet(String walletAddress, String privyWalletId) {
        this.walletAddress = walletAddress;
        this.privyWalletId = privyWalletId;
    }

    public void updateVcCid(String vcCid) {
        this.vcCid = vcCid;
    }

    public void updateLanguage(String languageCode) {
        this.languageCode = languageCode;
    }
}
