package com.care.domain.renter.controller.dto.request;

import com.care.domain.renter.entity.RenterDocument;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class DocumentVerifyRequest {

    @NotNull
    private RenterDocument.DocType docType; // PASSPORT or INT_LICENSE

    // 여권
    private String passportName;
    private String passportNo;      // 여권번호
    private String birthDate;       // 생년월일 (YYYYMMDD)
    private String issueDate;       // 발급일 (YYYYMMDD)
    private String expiryDate;      // 만료일 (YYYYMMDD)

    // 면허증
    private String birthY;
    private String birthM;
    private String birthD;
    private String name;
    private String licenZero;
    private String licenFirst;
    private String licenSecond;
    private String licenThird;

}
