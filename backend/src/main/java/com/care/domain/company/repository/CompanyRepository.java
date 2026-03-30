package com.care.domain.company.repository;

import com.care.domain.company.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, String> {
    boolean existsByEmail(String email);
    Optional<Company> findByEmail(String email);
}
