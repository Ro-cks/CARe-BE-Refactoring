package com.care.domain.company.service;

import com.care.domain.company.controller.dto.request.BizVerifyRequest;
import com.care.domain.company.controller.dto.response.BizVerifyResponse;
import com.care.domain.company.controller.dto.response.CompanyProfileResponse;
import com.care.domain.company.entity.Company;
import com.care.domain.company.repository.CompanyRepository;
import com.care.global.external.nts.NtsVerifyClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final NtsVerifyClient ntsVerifyClient;

    @Transactional(readOnly = true)
    public CompanyProfileResponse getProfile(String companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 업체입니다."));
        return new CompanyProfileResponse(company);
    }

    @Transactional
    public BizVerifyResponse verifyBusiness(String companyId, BizVerifyRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 업체입니다."));

        boolean verified = ntsVerifyClient.verifyBusiness(
                request.getBizNo(),
                request.getStartDt(),
                request.getRepresentativeName()
        );

        if (verified) {
            company.updateBizVerified(request.getBizNo());
        }

        return new BizVerifyResponse(request.getBizNo(), verified);
    }
}
