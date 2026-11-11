package com.care.domain.renter.repository;

import com.care.domain.renter.entity.RenterNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RenterNotificationRepository extends JpaRepository<RenterNotification, String> {

    List<RenterNotification> findByRenter_UserIdOrderByCreatedAtDesc(String userId);

    Optional<RenterNotification> findByNotificationIdAndRenter_UserId(String notificationId, String userId);
}
