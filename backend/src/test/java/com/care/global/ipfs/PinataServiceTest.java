package com.care.global.ipfs;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PinataServiceTest {

    @Autowired
    private PinataService pinataService;

    @Test
    void IPFS_이미지_업로드_테스트() throws Exception {
        InputStream is = getClass().getResourceAsStream("/img.png");
        MockMultipartFile file = new MockMultipartFile("img.png", "img.png", "image/png", is);

        String cid = pinataService.uploadImage(file, "test-img");

        System.out.println("CID : " + cid);
        System.out.println("URL : https://gateway.pinata.cloud/ipfs/" + cid);

        assertThat(cid).isNotBlank();
    }
}
