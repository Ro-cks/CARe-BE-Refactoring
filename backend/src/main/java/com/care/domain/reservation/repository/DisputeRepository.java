package com.care.domain.reservation.repository;

import com.care.domain.reservation.entity.Dispute;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DisputeRepository extends JpaRepository<Dispute, String> {

    Optional<Dispute> findByDisputeId(String disputeId);
    Optional<Dispute> findByReservation_ReservationId(String reservationId);
    boolean existsByReservation_ReservationId(String reservationId);
    Optional<Dispute> findByDisputeIdAndReservation_ReservationId(String disputeId, String reservationId);
    List<Dispute> findByReservation_OwnedCar_Company_CompanyIdOrderByCreatedAtDesc(String companyId);
    boolean existsByTargetScratch_LogIdAndStatusNotIn(String logId, List<String> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Dispute d where d.disputeId = :disputeId")
    Optional<Dispute> findByDisputeIdForUpdate(@Param("disputeId") String disputeId);
}
