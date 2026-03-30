package com.care.domain.company.controller.dto.response;

import com.care.domain.company.entity.Company;
import lombok.Getter;

@Getter
public class CompanyProfileResponse {

    private final String companyId;
    private final String name;
    private final String email;
    private final String bizNumber;
    private final String walletAddress;
    private final String countryCode;
    private final String city;
    private final String detailAddress;
    private final String languageCode;

    public CompanyProfileResponse(Company company) {
        this.companyId = company.getCompanyId();
        this.name = company.getName();
        this.email = company.getEmail();
        this.bizNumber = company.getBizNumber();
        this.walletAddress = company.getWalletAddress();
        this.countryCode = company.getCountryCode();
        this.city = company.getCity();
        this.detailAddress = company.getDetailAddress();
        this.languageCode = company.getLanguageCode();
    }
}
