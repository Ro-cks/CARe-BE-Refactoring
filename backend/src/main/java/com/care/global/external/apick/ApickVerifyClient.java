package com.care.global.external.apick;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

// apick.app 진위 확인 API 클라이언트
// API KEY 미설정 시 Mock(true) 반환 ^_^ 

@Component
@RequiredArgsConstructor
public class ApickVerifyClient {

    private final RestTemplate restTemplate;

    @Value("${apick.api-key:}") // 200 응답을 위해 미설정
    private String apiKey;

    private static final String BASE_URL = "https://apick.app/rest";

    // 임차인 : 여권 진위 확인 (apick /rest/identi_card/3)
    public boolean verifyPassport(String name_passport, String passportNo, String birthDate,
                                   String madeDate, String expiryDate) {

        if (apiKey == null || apiKey.isBlank()) return mockResult();

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("name", name_passport); // 성명
        body.add("pass_num", passportNo); // 여권 번호 (M+8자리)
        body.add("made_date", madeDate); // 발급 일자
        body.add("exp_date", expiryDate); // 만료 일자
        body.add("birth_date", birthDate); // 생년월일

        return callApick("/identi_card/3", body);
    }

    // 임차인 : 운전면허증 진위 확인 (apick /rest/identi_card/2)
    public boolean verifyDriverLicense(String birthY, String birthM, String birthD, String name, String licenZero, String licenFirst, String licenSecond, String licenThird) {

        // Header Key 미설정
        if (apiKey == null || apiKey.isBlank()) return mockResult();

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("birth_y", birthY); // 생년
        body.add("birth_m", birthM); // 생월
        body.add("birth_d", birthD); // 생일
        body.add("name", name); // 성명
        body.add("licen_no0", licenZero); // 운전면서 1,2
        body.add("licen_no1", licenFirst); // 운전면서 3,4
        body.add("licen_no2", licenSecond); // 운전면허 5,6,7,8,9,10
        body.add("licen_no3", licenThird); // 운전면허 11,12

        return callApick("/identi_card/2", body);
    }

    private boolean callApick(String path, MultiValueMap<String, String> body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("CL_AUTH_KEY", apiKey);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(BASE_URL + path, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<?, ?> data = (Map<?, ?>) response.getBody().get("data");
                if (data != null) {
                    return Integer.valueOf(1).equals(data.get("result"));
                }
            }
        } catch (Exception e) {
            // API 호출 실패 시 false
        }
        return false;
    }

    // API KEY 미설정 시 항상 True 반환
    private boolean mockResult() {
        return true;
    }
}
