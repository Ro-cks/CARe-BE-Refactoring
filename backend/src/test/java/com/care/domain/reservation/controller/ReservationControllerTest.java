package com.care.domain.reservation.controller;

import com.care.domain.reservation.controller.dto.response.ReservationReturnResponse;
import com.care.domain.reservation.service.ReservationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReservationController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReservationService reservationService;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void 예약_반납_완료_API_성공() throws Exception {
        ReservationReturnResponse response = new ReservationReturnResponse(
                "reservation-1",
                "COMPLETED",
                true,
                2,
                1,
                3,
                LocalDateTime.now()
        );

        given(reservationService.completeReservation(nullable(String.class), anyString()))
                .willReturn(response);

        mockMvc.perform(post("/reservations/{reservationId}/return", "reservation-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reservationId").value("reservation-1"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.reportGenerated").value(true))
                .andExpect(jsonPath("$.beforeScratchCount").value(2))
                .andExpect(jsonPath("$.afterScratchCount").value(1))
                .andExpect(jsonPath("$.totalScratchCount").value(3));
    }
}
