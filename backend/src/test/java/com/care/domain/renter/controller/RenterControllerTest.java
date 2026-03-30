package com.care.domain.renter.controller;

import com.care.domain.car.service.CarService;
import com.care.domain.renter.controller.dto.response.RenterNotificationResponse;
import com.care.domain.renter.service.DocumentService;
import com.care.domain.renter.service.RenterNotificationService;
import com.care.domain.renter.service.RenterService;
import com.care.domain.renter.service.RenterTokenService;
import com.care.domain.reservation.service.ReservationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RenterController.class)
@AutoConfigureMockMvc(addFilters = false)
class RenterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DocumentService documentService;

    @MockitoBean
    private RenterService renterService;

    @MockitoBean
    private RenterTokenService renterTokenService;

    @MockitoBean
    private RenterNotificationService renterNotificationService;

    @MockitoBean
    private CarService carService;

    @MockitoBean
    private ReservationService reservationService;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void 렌터_알림_목록_조회_API_성공() throws Exception {
        RenterNotificationResponse item = new RenterNotificationResponse(
                "noti-1",
                "DISPUTE_CREATED",
                "분쟁이 접수되었습니다.",
                "예약 reservation-1에서 새로운 분쟁이 접수되었습니다.",
                "reservation-1",
                "dispute-1",
                false,
                null,
                LocalDateTime.now()
        );

        given(renterNotificationService.getMyNotifications(nullable(String.class)))
                .willReturn(List.of(item));

        mockMvc.perform(get("/renters/me/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].notificationId").value("noti-1"))
                .andExpect(jsonPath("$[0].notificationType").value("DISPUTE_CREATED"))
                .andExpect(jsonPath("$[0].reservationId").value("reservation-1"))
                .andExpect(jsonPath("$[0].disputeId").value("dispute-1"))
                .andExpect(jsonPath("$[0].read").value(false));
    }

    @Test
    void 렌터_알림_읽음처리_API_성공() throws Exception {
        RenterNotificationResponse response = new RenterNotificationResponse(
                "noti-1",
                "DISPUTE_CREATED",
                "분쟁이 접수되었습니다.",
                "예약 reservation-1에서 새로운 분쟁이 접수되었습니다.",
                "reservation-1",
                "dispute-1",
                true,
                LocalDateTime.now(),
                LocalDateTime.now().minusMinutes(1)
        );

        given(renterNotificationService.markAsRead(nullable(String.class), anyString()))
                .willReturn(response);

        mockMvc.perform(patch("/renters/me/notifications/{notificationId}/read", "noti-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notificationId").value("noti-1"))
                .andExpect(jsonPath("$.read").value(true));
    }

        @Test
        void 렌터_알림_SSE_구독_API_성공() throws Exception {
                given(renterNotificationService.subscribe(nullable(String.class)))
                                .willReturn(new SseEmitter(60_000L));

                mockMvc.perform(get("/renters/me/notifications/subscribe"))
                                .andExpect(request().asyncStarted());
        }
}
