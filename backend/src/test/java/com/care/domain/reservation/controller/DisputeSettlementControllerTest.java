package com.care.domain.reservation.controller;

import com.care.domain.reservation.controller.dto.response.DisputeAiAnalysisResponse;
import com.care.domain.reservation.controller.dto.response.DisputeDetailResponse;
import com.care.domain.reservation.controller.dto.response.DisputeSettleResponse;
import com.care.domain.reservation.service.DisputeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DisputeSettlementController.class)
@AutoConfigureMockMvc(addFilters = false)
class DisputeSettlementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DisputeService disputeService;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void 분쟁_상세_단건조회_API_성공() throws Exception {
        DisputeDetailResponse response = new DisputeDetailResponse(
                "dispute-1",
                "reservation-1",
                "after-log-1",
                null,
                "OPEN",
                "문콕 흔적 확인",
                120000,
                null,
                null,
                null,
                null,
                null,
                null,
                false,
                null,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        given(disputeService.getDisputeDetail(nullable(String.class), anyString()))
                .willReturn(response);

        mockMvc.perform(get("/disputes/{disputeId}", "dispute-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disputeId").value("dispute-1"))
                .andExpect(jsonPath("$.reservationId").value("reservation-1"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void 분쟁_AI_분석_API_성공() throws Exception {
        DisputeAiAnalysisResponse.ComparisonItem item = new DisputeAiAnalysisResponse.ComparisonItem(
                "before-log-1",
                "after-log-1",
                "https://example.com/before.jpg",
                "https://example.com/after.jpg",
                0.88,
                0.12
        );

        DisputeAiAnalysisResponse response = new DisputeAiAnalysisResponse(
                "dispute-1",
                "reservation-1",
                1,
                1,
                List.of(item)
        );

        given(disputeService.getDisputeAiAnalysis(nullable(String.class), anyString()))
                .willReturn(response);

        mockMvc.perform(get("/disputes/{disputeId}/ai-analysis", "dispute-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disputeId").value("dispute-1"))
                .andExpect(jsonPath("$.reservationId").value("reservation-1"))
                .andExpect(jsonPath("$.beforeCount").value(1))
                .andExpect(jsonPath("$.afterCount").value(1))
                .andExpect(jsonPath("$.comparisons[0].beforeLogId").value("before-log-1"))
                .andExpect(jsonPath("$.comparisons[0].afterLogId").value("after-log-1"));
    }

    @Test
    void 분쟁_정산_API_성공_현재_스키마() throws Exception {
        DisputeSettleResponse response = DisputeSettleResponse.of(
                "dispute-1",
                "reservation-1",
                100000L,
                "PENDING",
                null,
                null
        );

        given(disputeService.settleDispute(nullable(String.class), anyString(), any()))
                .willReturn(response);

        String body = """
                {
                  "finalAmount": 100000,
                  "status": "COMPLETED"
                }
                """;

        mockMvc.perform(post("/disputes/{disputeId}/settle", "dispute-1")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settlementId").value("dispute-1"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void 분쟁_정산_API_성공_레거시_스키마() throws Exception {
        DisputeSettleResponse response = DisputeSettleResponse.of(
                "dispute-legacy",
                "reservation-legacy",
                70000L,
                "PENDING",
                null,
                null
        );

        given(disputeService.settleDispute(nullable(String.class), anyString(), any()))
                .willReturn(response);

        String body = """
                {
                  "companyRefundAmount": 70000,
                  "resolution": "COMPANY_WIN"
                }
                """;

        mockMvc.perform(post("/disputes/{disputeId}/settle", "dispute-legacy")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settlementId").value("dispute-legacy"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }
}
