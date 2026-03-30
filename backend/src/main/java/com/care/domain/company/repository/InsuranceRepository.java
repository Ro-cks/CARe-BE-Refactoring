package com.care.domain.company.repository;

import com.care.domain.company.entity.Insurance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InsuranceRepository extends JpaRepository<Insurance, String> {

    List<Insurance> findByCompanyCompanyId(String companyId);
}
