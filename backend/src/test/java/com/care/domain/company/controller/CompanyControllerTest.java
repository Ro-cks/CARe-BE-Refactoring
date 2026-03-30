package com.care.domain.company.controller;

import com.care.domain.company.service.CompanyService;
import com.care.domain.reservation.controller.dto.response.DisputeSummaryResponse;
import com.care.domain.reservation.service.DisputeService;
import com.care.domain.reservation.service.ReservationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CompanyController.class)
@AutoConfigureMockMvc(addFilters = false)
class CompanyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CompanyService companyService;

    @MockitoBean
    private ReservationService reservationService;

    @MockitoBean
    private DisputeService disputeService;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void 업체_분쟁_목록_조회_API_성공() throws Exception {
        DisputeSummaryResponse item = new DisputeSummaryResponse(
                "dispute-1",
                "reservation-1",
                "car-1",
                "12가3456",
                "Hyundai",
                "Sonata",
                "renter-name",
                120000,
                "OPEN",
                LocalDateTime.now()
        );

        given(disputeService.getCompanyDisputes(nullable(String.class)))
                .willReturn(List.of(item));

        mockMvc.perform(get("/companies/me/disputes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].disputeId").value("dispute-1"))
                .andExpect(jsonPath("$[0].reservationId").value("reservation-1"))
                .andExpect(jsonPath("$[0].carId").value("car-1"))
                .andExpect(jsonPath("$[0].claimAmount").value(120000))
                .andExpect(jsonPath("$[0].status").value("OPEN"));
    }
}
