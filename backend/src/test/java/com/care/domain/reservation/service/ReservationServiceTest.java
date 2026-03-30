package com.care.domain.reservation.service;

import com.care.domain.reservation.controller.dto.response.ReservationReturnResponse;
import com.care.domain.reservation.entity.Reservation;
import com.care.domain.reservation.exception.ReservationErrorCode;
import com.care.domain.reservation.repository.ReservationRepository;
import com.care.domain.scan.repository.ScratchRepository;
import com.care.global.blockchain.CareTokenService;
import com.care.global.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private com.care.domain.car.repository.OwnedCarRepository ownedCarRepository;

    @Mock
    private com.care.domain.company.repository.InsuranceRepository insuranceRepository;

    @Mock
    private com.care.domain.renter.repository.RenterRepository renterRepository;

    @Mock
    private ScratchRepository scratchRepository;

    @Mock
    private CareTokenService careTokenService;

    @InjectMocks
    private ReservationService reservationService;

    @Test
    void 반납_완료_성공_IN_USE_상태() {
        Reservation reservation = mock(Reservation.class);
        com.care.domain.renter.entity.Renter renter = mock(com.care.domain.renter.entity.Renter.class);

        given(reservationRepository.findByReservationId("rsv-1")).willReturn(Optional.of(reservation));
        given(reservation.getRenter()).willReturn(renter);
        given(renter.getUserId()).willReturn("renter-1");
        given(reservation.getStatus()).willReturn("IN_USE", "COMPLETED");
        given(scratchRepository.findByReservation_ReservationIdAndLogType("rsv-1", "BEFORE"))
                .willReturn(Collections.emptyList());
        given(scratchRepository.findByReservation_ReservationIdAndLogType("rsv-1", "AFTER"))
                .willReturn(Collections.emptyList());

        ReservationReturnResponse response = reservationService.completeReservation("renter-1", "rsv-1");

        assertThat(response.reservationId()).isEqualTo("rsv-1");
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.reportGenerated()).isTrue();
        assertThat(response.totalScratchCount()).isZero();
        assertThat(response.returnedAt()).isBeforeOrEqualTo(LocalDateTime.now());
        verify(reservation).updateStatusToCompleted();
    }

    @Test
    void 반납_완료_실패_권한없음() {
        Reservation reservation = mock(Reservation.class);
        com.care.domain.renter.entity.Renter renter = mock(com.care.domain.renter.entity.Renter.class);

        given(reservationRepository.findByReservationId("rsv-1")).willReturn(Optional.of(reservation));
        given(reservation.getRenter()).willReturn(renter);
        given(renter.getUserId()).willReturn("another-renter");

        assertThatThrownBy(() -> reservationService.completeReservation("renter-1", "rsv-1"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ReservationErrorCode.RESERVATION_ACCESS_DENIED);
    }

    @Test
    void 반납_완료_성공_이미_COMPLETED_면_상태유지() {
        Reservation reservation = mock(Reservation.class);
        com.care.domain.renter.entity.Renter renter = mock(com.care.domain.renter.entity.Renter.class);

        given(reservationRepository.findByReservationId("rsv-1")).willReturn(Optional.of(reservation));
        given(reservation.getRenter()).willReturn(renter);
        given(renter.getUserId()).willReturn("renter-1");
        given(reservation.getStatus()).willReturn("COMPLETED", "COMPLETED");
        given(scratchRepository.findByReservation_ReservationIdAndLogType("rsv-1", "BEFORE"))
                .willReturn(Collections.emptyList());
        given(scratchRepository.findByReservation_ReservationIdAndLogType("rsv-1", "AFTER"))
                .willReturn(Collections.emptyList());

        ReservationReturnResponse response = reservationService.completeReservation("renter-1", "rsv-1");

        assertThat(response.status()).isEqualTo("COMPLETED");
        verify(reservation, never()).updateStatusToCompleted();
    }
}
