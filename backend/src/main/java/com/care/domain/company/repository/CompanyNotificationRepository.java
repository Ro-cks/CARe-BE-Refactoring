package com.care.domain.company.repository;

import com.care.domain.company.entity.CompanyNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompanyNotificationRepository extends JpaRepository<CompanyNotification, String> {

    List<CompanyNotification> findByCompany_CompanyIdOrderByCreatedAtDesc(String companyId);

    Optional<CompanyNotification> findByNotificationIdAndCompany_CompanyId(String notificationId, String companyId);
}
