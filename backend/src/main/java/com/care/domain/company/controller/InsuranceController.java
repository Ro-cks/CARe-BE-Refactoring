package com.care.domain.company.controller;

import com.care.domain.company.controller.dto.response.InsuranceResponse;
import com.care.domain.company.service.InsuranceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/insurances")
public class InsuranceController {

    private final InsuranceService insuranceService;

    /**
     * GET /insurances?companyId=xxx
     * 회사별 보험 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<InsuranceResponse>> getInsuranceList(@RequestParam String companyId) {
        return ResponseEntity.ok(insuranceService.getInsuranceList(companyId));
    }

    /**
     * GET /insurances/{insuranceId}
     * 보험 상세 조회
     */
    @GetMapping("/{insuranceId}")
    public ResponseEntity<InsuranceResponse> getInsurance(@PathVariable String insuranceId) {
        return ResponseEntity.ok(insuranceService.getInsurance(insuranceId));
    }

    /**
     * POST /insurances
     * 보험 등록 (업체)
     */
    @PostMapping
    public ResponseEntity<InsuranceResponse> createInsurance(
            @AuthenticationPrincipal String companyId,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        int price = (int) body.get("price");
        return ResponseEntity.ok(insuranceService.createInsurance(companyId, name, description, price));
    }
}
