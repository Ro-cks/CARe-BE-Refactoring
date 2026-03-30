package com.care.domain.reservation.controller;

import com.care.domain.reservation.controller.dto.response.DisputeCreateResponse;
import com.care.domain.reservation.controller.dto.response.DisputeDefenseResponse;
import com.care.domain.reservation.controller.dto.response.DisputeDetailResponse;
import com.care.domain.reservation.controller.dto.response.DisputePreviousScratchResponse;
import com.care.domain.reservation.service.DisputeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DisputeController.class)
@AutoConfigureMockMvc(addFilters = false)
class DisputeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DisputeService disputeService;

        @MockitoBean
        private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void 분쟁_생성_API_성공() throws Exception {
        DisputeCreateResponse response = new DisputeCreateResponse(
                "dispute-1",
                "reservation-1",
                "after-log-1",
                "OPEN",
                120000,
                "문콕 흔적 확인",
                LocalDateTime.now()
        );

        given(disputeService.createDispute(nullable(String.class), anyString(), any()))
                .willReturn(response);

        String body = """
                {
                  "targetLogId": "after-log-1",
                  "reason": "문콕 흔적 확인",
                  "claimAmount": 120000
                }
                """;

        mockMvc.perform(post("/reservations/{reservationId}/disputes", "reservation-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/reservations/reservation-1/disputes/dispute-1"))
                .andExpect(jsonPath("$.disputeId").value("dispute-1"))
                .andExpect(jsonPath("$.reservationId").value("reservation-1"))
                .andExpect(jsonPath("$.targetLogId").value("after-log-1"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.claimAmount").value(120000));
    }

    @Test
    void 분쟁_생성_API_실패_요청값_검증() throws Exception {
        String invalidBody = """
                {
                  "targetLogId": "",
                  "reason": "",
                  "claimAmount": 0
                }
                """;

        mockMvc.perform(post("/reservations/{reservationId}/disputes", "reservation-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 분쟁_상세조회_API_성공() throws Exception {
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

        given(disputeService.getDisputeDetail(nullable(String.class), anyString(), anyString()))
                .willReturn(response);

        mockMvc.perform(get("/reservations/{reservationId}/disputes/{disputeId}", "reservation-1", "dispute-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disputeId").value("dispute-1"))
                .andExpect(jsonPath("$.reservationId").value("reservation-1"))
                .andExpect(jsonPath("$.targetLogId").value("after-log-1"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
        void 예약_탐지_흠집_로그_조회_API_성공() throws Exception {
        DisputePreviousScratchResponse item1 = new DisputePreviousScratchResponse(
                "before-log-1",
                "BEFORE",
                "FRONT",
                10.0f,
                20.0f,
                "https://example.com/original1.jpg",
                "https://example.com/crop1.jpg",
                "QmCid1",
                false,
                false,
                LocalDateTime.now()
        );
        DisputePreviousScratchResponse item2 = new DisputePreviousScratchResponse(
                "after-log-1",
                "AFTER",
                "REAR",
                15.0f,
                25.0f,
                "https://example.com/original2.jpg",
                "https://example.com/crop2.jpg",
                "QmCid2",
                false,
                false,
                LocalDateTime.now()
        );

        given(disputeService.getReservationScratchLogs(nullable(String.class), anyString()))
                .willReturn(List.of(item1, item2));

        mockMvc.perform(get("/reservations/{reservationId}/disputes/scratch-logs", "reservation-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].logId").value("before-log-1"))
                .andExpect(jsonPath("$[0].logType").value("BEFORE"))
                .andExpect(jsonPath("$[1].logId").value("after-log-1"))
                .andExpect(jsonPath("$[1].logType").value("AFTER"));
    }

    @Test
        void 분쟁_방어_API_PATCH_성공() throws Exception {
        DisputeDefenseResponse response = new DisputeDefenseResponse(
                "dispute-1",
                "reservation-1",
                "before-log-1",
                "DEFENDED",
                LocalDateTime.now()
        );

        given(disputeService.defendDispute(nullable(String.class), anyString(), anyString(), any()))
                .willReturn(response);

        String body = objectMapper.writeValueAsString(new DefenseBody("before-log-1"));

        mockMvc.perform(patch("/reservations/{reservationId}/disputes/{disputeId}/defense", "reservation-1", "dispute-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disputeId").value("dispute-1"))
                .andExpect(jsonPath("$.defenseLogId").value("before-log-1"))
                .andExpect(jsonPath("$.status").value("DEFENDED"));
    }

    @Test
    void 분쟁_방어_API_POST_하위호환_성공() throws Exception {
        DisputeDefenseResponse response = new DisputeDefenseResponse(
                "dispute-1",
                "reservation-1",
                "before-log-1",
                "DEFENDED",
                LocalDateTime.now()
        );

        given(disputeService.defendDispute(nullable(String.class), anyString(), anyString(), any()))
                .willReturn(response);

        String body = objectMapper.writeValueAsString(new DefenseBody("before-log-1"));

        mockMvc.perform(post("/reservations/{reservationId}/disputes/{disputeId}/defense", "reservation-1", "dispute-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disputeId").value("dispute-1"))
                .andExpect(jsonPath("$.defenseLogId").value("before-log-1"))
                .andExpect(jsonPath("$.status").value("DEFENDED"));
    }

    @Test
    void 분쟁_방어_API_실패_요청값_검증() throws Exception {
        String invalidBody = """
                {
                  "defenseLogId": ""
                }
                """;

        mockMvc.perform(post("/reservations/{reservationId}/disputes/{disputeId}/defense", "reservation-1", "dispute-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidBody))
                .andExpect(status().isBadRequest());
    }

    private record DefenseBody(String defenseLogId) {
    }
}
