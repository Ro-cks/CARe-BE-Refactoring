package com.care.domain.renter.repository;

import com.care.domain.renter.entity.Renter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RenterRepository extends JpaRepository<Renter, String> {
    boolean existsByEmail(String email);
    Optional<Renter> findByEmail(String email);
}
