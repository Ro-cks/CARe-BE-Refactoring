package com.care.domain.renter.repository;

import com.care.domain.renter.entity.RenterDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RenterDocumentRepository extends JpaRepository<RenterDocument, String> {
    List<RenterDocument> findAllByRenter_UserId(String userId);
    Optional<RenterDocument> findByRenter_UserIdAndDocType(String userId, RenterDocument.DocType docType);
}
