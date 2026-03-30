package com.care.domain.renter.controller.dto.response;

import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.entity.RenterDocument;
import lombok.Getter;

import java.util.List;

@Getter
public class RenterProfileResponse {

    private final String userId;
    private final String name;
    private final String email;
    private final String walletAddress;
    private final String didUri;
    private final boolean didVerified;
    private final String languageCode;
    private final List<DocumentInfo> documents;

    public RenterProfileResponse(Renter renter, List<RenterDocument> documents) {
        this.userId = renter.getUserId();
        this.name = renter.getName();
        this.email = renter.getEmail();
        this.walletAddress = renter.getWalletAddress();
        this.didUri = renter.getDidUri();
        this.didVerified = renter.isDidVerified();
        this.languageCode = renter.getLanguageCode();
        this.documents = documents.stream()
                .map(DocumentInfo::new)
                .toList();
    }

    @Getter
    public static class DocumentInfo {
        private final String docId;
        private final RenterDocument.DocType docType;
        private final boolean verified;

        public DocumentInfo(RenterDocument doc) {
            this.docId = doc.getDocId();
            this.docType = doc.getDocType();
            this.verified = doc.isVerified();
        }
    }
}
