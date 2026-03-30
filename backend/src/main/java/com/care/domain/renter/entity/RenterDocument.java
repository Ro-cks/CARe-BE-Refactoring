package com.care.domain.renter.entity;

import com.care.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "renter_document")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RenterDocument extends BaseEntity {

    @Id
    @Column(name = "doc_id", length = 100)
    private String docId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Renter renter;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 20)
    private DocType docType;

    @Column(name = "verified", nullable = false)
    private boolean verified = false;

    @Column(name = "verified_at")
    private java.time.LocalDateTime verifiedAt;

    // 인증해야 하는 서류 타입 정의 (여권, 면허증)
    public enum DocType {
        PASSPORT, INT_LICENSE
    }

    public static RenterDocument of(String docId, Renter renter, DocType docType, boolean verified) {
        RenterDocument doc = new RenterDocument();
        doc.docId = docId;
        doc.renter = renter;
        doc.docType = docType;
        doc.verified = verified;
        if (verified) doc.verifiedAt = java.time.LocalDateTime.now();
        return doc;
    }

    public void markVerified() {
        this.verified = true;
        this.verifiedAt = java.time.LocalDateTime.now();
    }
}
