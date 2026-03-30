package com.care.domain.company.controller.dto.response;

import com.care.domain.company.entity.Insurance;

public record InsuranceResponse(
        String insuranceId,
        String companyId,
        String companyName,
        String name,
        String description,
        int price
) {
    public static InsuranceResponse from(Insurance insurance) {
        return new InsuranceResponse(
                insurance.getInsuranceId(),
                insurance.getCompany().getCompanyId(),
                insurance.getCompany().getName(),
                insurance.getName(),
                insurance.getDescription(),
                insurance.getPrice()
        );
    }
}
