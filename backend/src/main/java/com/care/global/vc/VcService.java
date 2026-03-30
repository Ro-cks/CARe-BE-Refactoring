package com.care.global.vc;

import com.care.global.ipfs.PinataService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// W3C Verifiable Credential 발급 서비스
// 참고 : https://www.w3.org/TR/vc-data-model/

@Slf4j
@Service
@RequiredArgsConstructor
public class VcService {

    private final Credentials credentials; // Issuer 서버 지갑
    private final PinataService pinataService;
    private final ObjectMapper objectMapper;

    @Value("${blockchain.chain-id}")
    private long chainId;

    /**
     * 임차인 신원 VC 발급
     * - 여권 + 국제면허증 인증 완료 후 호출
     * - W3C VC JSON 생성 → Issuer 서명 → IPFS 업로드
     *
     * @param holderDid 사용자 DID URI
     * @param issuerDid Issuer(서비스) DID URI
     * @return IPFS CID
     */
    public String issueIdentityVc(String holderDid, String issuerDid) throws Exception {
        String vcId = "urn:uuid:" + UUID.randomUUID();
        String issuanceDate = Instant.now().toString();

        // W3C VC JSON 구조
        Map<String, Object> vc = new LinkedHashMap<>();
        vc.put("@context", List.of(
                "https://www.w3.org/2018/credentials/v1"
        ));
        vc.put("id", vcId);
        vc.put("type", List.of("VerifiableCredential", "IdentityCredential"));
        vc.put("issuer", issuerDid);
        vc.put("issuanceDate", issuanceDate);

        // credentialSubject: 인증 내용
        Map<String, Object> subject = new LinkedHashMap<>();
        subject.put("id", holderDid);
        subject.put("passportVerified", true);
        subject.put("internationalLicenseVerified", true);
        vc.put("credentialSubject", subject);

        // Issuer 개인키로 서명
        String vcJson = objectMapper.writeValueAsString(vc);
        String signature = signVc(vcJson);

        // proof 추가
        Map<String, Object> proof = new LinkedHashMap<>();
        proof.put("type", "EthereumPersonalSignature2021");
        proof.put("created", issuanceDate);
        proof.put("verificationMethod", issuerDid);
        proof.put("proofPurpose", "assertionMethod");
        proof.put("jws", signature);
        vc.put("proof", proof);

        // 최종 VC JSON
        String signedVcJson = objectMapper.writeValueAsString(vc);
        log.info("[VC] 발급 완료 - holder: {}, vcId: {}", holderDid, vcId);

        // IPFS 업로드
        String cid = pinataService.uploadJson(signedVcJson, "vc-" + UUID.randomUUID());
        log.info("[VC] IPFS 업로드 완료 - CID: {}", cid);

        return cid;
    }

    // Issuer 개인키로 VC JSON 서명
    private String signVc(String vcJson) {
        byte[] messageBytes = vcJson.getBytes(StandardCharsets.UTF_8);
        Sign.SignatureData sig = Sign.signPrefixedMessage(messageBytes, credentials.getEcKeyPair());

        byte[] sigBytes = new byte[65];
        System.arraycopy(sig.getR(), 0, sigBytes, 0, 32);
        System.arraycopy(sig.getS(), 0, sigBytes, 32, 32);
        sigBytes[64] = sig.getV()[0];

        return Numeric.toHexString(sigBytes);
    }
}
