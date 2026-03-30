package com.care.domain.renter.service;

import com.care.domain.renter.controller.dto.response.RenterProfileResponse;
import com.care.domain.renter.entity.Renter;
import com.care.domain.renter.entity.RenterDocument;
import com.care.domain.renter.repository.RenterDocumentRepository;
import com.care.domain.renter.repository.RenterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RenterService {

    private final RenterRepository renterRepository;
    private final RenterDocumentRepository renterDocumentRepository;

    @Transactional(readOnly = true)
    public RenterProfileResponse getProfile(String userId) {
        Renter renter = renterRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
        List<RenterDocument> documents = renterDocumentRepository.findAllByRenter_UserId(userId);
        return new RenterProfileResponse(renter, documents);
    }
}
