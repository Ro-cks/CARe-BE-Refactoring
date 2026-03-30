package com.care.global.s3;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:blockchain-local.properties")
class S3ServiceTest {

    @Autowired
    private S3Client s3Client;

    @Autowired
    private S3Service s3Service;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Test
    void S3_버킷_연결_확인() {
        assertThatCode(() ->
                s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build())
        ).doesNotThrowAnyException();

        System.out.println("S3 버킷 연결 성공: " + bucket);
    }

    @Test
    void 이미지_업로드_후_URL_접근_테스트() throws Exception {
        InputStream is = getClass().getResourceAsStream("/img.png");
        MockMultipartFile file = new MockMultipartFile("img.png", "img.png", "image/png", is);

        String url = s3Service.upload(file, "test/character/짱구");
        System.out.println("업로드된 URL: " + url);

        // URL 접근 가능 여부 확인
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setRequestMethod("GET");
        connection.connect();
        int status = connection.getResponseCode();
        System.out.println("HTTP 응답 코드: " + status);

        assertThat(url).startsWith("https://");
        assertThat(url).contains("test/character");
        assertThat(status).isEqualTo(200);
    }
}
