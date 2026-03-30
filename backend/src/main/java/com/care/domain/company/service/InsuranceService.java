package com.care.domain.company.service;

import com.care.domain.company.controller.dto.response.InsuranceResponse;
import com.care.domain.company.entity.Company;
import com.care.domain.company.entity.Insurance;
import com.care.domain.company.exception.CompanyErrorCode;
import com.care.domain.company.repository.CompanyRepository;
import com.care.domain.company.repository.InsuranceRepository;
import com.care.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InsuranceService {

    private final InsuranceRepository insuranceRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<InsuranceResponse> getInsuranceList(String companyId) {
        return insuranceRepository.findByCompanyCompanyId(companyId).stream()
                .map(InsuranceResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public InsuranceResponse getInsurance(String insuranceId) {
        return insuranceRepository.findById(insuranceId)
                .map(InsuranceResponse::from)
                .orElseThrow(() -> new BusinessException(CompanyErrorCode.INSURANCE_NOT_FOUND));
    }

    // API 테스트용 보험 등록 추가
    @Transactional
    public InsuranceResponse createInsurance(String companyId, String name, String description, int price) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new BusinessException(CompanyErrorCode.COMPANY_NOT_FOUND));
        Insurance insurance = Insurance.create(UUID.randomUUID().toString(), company, name, description, price);
        return InsuranceResponse.from(insuranceRepository.save(insurance));
    }
}
