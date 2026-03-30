package com.care.domain.renter.controller.dto.response;

import com.care.domain.renter.entity.RenterDocument;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DocumentVerifyResponse {
    private String docId;
    private RenterDocument.DocType docType;
    private boolean verified;
}
