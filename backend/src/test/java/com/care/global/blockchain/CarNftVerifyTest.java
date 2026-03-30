package com.care.global.blockchain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * CarNFT 온체인 조회 테스트 (블록 익스플로러 없을 때 코드로 직접 확인)
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:blockchain-local.properties")
class CarNftVerifyTest {

    @Value("${blockchain.contracts.car-nft}")
    private String carNftAddress;

    @org.springframework.beans.factory.annotation.Autowired
    private Web3j web3j;

    /**
     * tokenId를 입력하면 ownerOf + tokenURI를 온체인에서 직접 조회합니다.
     * 확인하고 싶은 tokenId로 변경하세요.
     */
    @Test
    void NFT_온체인_조회() throws Exception {
        BigInteger tokenId = BigInteger.valueOf(0); // ← 확인할 tokenId 입력

        String owner = callOwnerOf(tokenId);
        String uri   = callTokenURI(tokenId);

        System.out.println("===========================================");
        System.out.println("🔍 NFT 온체인 조회 결과");
        System.out.println("   컨트랙트  : " + carNftAddress);
        System.out.println("   tokenId   : " + tokenId);
        System.out.println("   owner     : " + owner);
        System.out.println("   tokenURI  : " + uri);
        System.out.println("===========================================");

        assertThat(owner).isNotBlank();
        assertThat(uri).startsWith("ipfs://");
    }

    private String callOwnerOf(BigInteger tokenId) throws Exception {
        Function function = new Function(
                "ownerOf",
                Collections.singletonList(new Uint256(tokenId)),
                Collections.singletonList(new TypeReference<Address>() {})
        );
        List<Type> result = ethCall(function);
        return result.get(0).getValue().toString();
    }

    private String callTokenURI(BigInteger tokenId) throws Exception {
        Function function = new Function(
                "tokenURI",
                Collections.singletonList(new Uint256(tokenId)),
                Collections.singletonList(new TypeReference<Utf8String>() {})
        );
        List<Type> result = ethCall(function);
        return result.get(0).getValue().toString();
    }

    private List<Type> ethCall(Function function) throws Exception {
        String encodedFunction = FunctionEncoder.encode(function);
        EthCall response = web3j.ethCall(
                Transaction.createEthCallTransaction(null, carNftAddress, encodedFunction),
                DefaultBlockParameterName.LATEST
        ).send();

        if (response.hasError()) {
            throw new RuntimeException("ethCall 실패: " + response.getError().getMessage());
        }

        return FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());
    }
}
