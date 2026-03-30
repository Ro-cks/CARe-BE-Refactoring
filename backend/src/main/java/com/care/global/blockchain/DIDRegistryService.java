package com.care.global.blockchain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Hash;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.response.PollingTransactionReceiptProcessor;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;

/**
 * DIDRegistry 컨트랙트 호출 서비스
 * did:ethr:{chainId}:{walletAddress} 형식의 DID를 온체인에 등록/조회
 */
@Lazy
@Slf4j
@Service
public class DIDRegistryService {

    private final Web3j web3j;
    private final Credentials credentials;

    @Value("${blockchain.contracts.did-registry}")
    private String didRegistryAddress;

    @Value("${blockchain.chain-id}")
    private long chainId;

    public DIDRegistryService(Web3j web3j, Credentials credentials) {
        this.web3j = web3j;
        this.credentials = credentials;
    }

    /**
     * DID 등록 — registerDID(bytes32 didHash, bytes32 docHash)
     *
     * @param didUri  DID URI (did:ethr:{chainId}:{walletAddress})
     * @param docHash DID Document 해시 (IPFS CID를 bytes32로 변환한 값, 없으면 빈 해시)
     * @return 트랜잭션 해시
     */
    public String registerDID(String didUri, String docHash) throws Exception {
        byte[] didHashBytes = Hash.sha3(didUri.getBytes(StandardCharsets.UTF_8));
        byte[] docHashBytes = docHash != null
                ? Numeric.hexStringToByteArray(docHash)
                : new byte[32];

        Function function = new Function(
                "registerDID",
                Arrays.asList(
                        new Bytes32(didHashBytes),
                        new Bytes32(docHashBytes)
                ),
                Collections.emptyList()
        );

        String txHash = sendFunction(function);
        log.info("[DIDRegistry] registerDID → didUri: {} | txHash: {}", didUri, txHash);

        waitForReceipt(txHash);
        return txHash;
    }

    /**
     * DID 등록 여부 확인 — isRegistered(bytes32 didHash)
     *
     * @param didUri DID URI
     * @return 등록 여부
     */
    public boolean isRegistered(String didUri) throws Exception {
        byte[] didHashBytes = Hash.sha3(didUri.getBytes(StandardCharsets.UTF_8));

        Function function = new Function(
                "isRegistered",
                Collections.singletonList(new Bytes32(didHashBytes)),
                Collections.singletonList(new TypeReference<Bool>() {})
        );

        String encoded = FunctionEncoder.encode(function);
        EthCall response = web3j.ethCall(
                Transaction.createEthCallTransaction(
                        credentials.getAddress(), didRegistryAddress, encoded),
                DefaultBlockParameterName.LATEST
        ).send();

        String result = response.getValue();
        // 결과 마지막 바이트가 1이면 true
        return result != null && result.endsWith("1");
    }

    /**
     * DID URI 생성 헬퍼
     * did:ethr:{chainId}:{walletAddress}
     */
    public String buildDidUri(String walletAddress) {
        return "did:ethr:" + chainId + ":" + walletAddress.toLowerCase();
    }

    // ── Raw Transaction 서명 후 전송 ──────────────────────────────────────────
    private String sendFunction(Function function) throws Exception {
        String encoded = FunctionEncoder.encode(function);

        BigInteger nonce = web3j
                .ethGetTransactionCount(credentials.getAddress(), DefaultBlockParameterName.PENDING)
                .send()
                .getTransactionCount();

        BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
        BigInteger gasLimit = BigInteger.valueOf(200_000);

        RawTransaction rawTx = RawTransaction.createTransaction(
                nonce, gasPrice, gasLimit, didRegistryAddress, BigInteger.ZERO, encoded);

        byte[] signed = TransactionEncoder.signMessage(rawTx, chainId, credentials);
        EthSendTransaction response = web3j.ethSendRawTransaction(Numeric.toHexString(signed)).send();

        if (response.hasError()) {
            throw new RuntimeException("TX error: " + response.getError().getMessage());
        }
        return response.getTransactionHash();
    }

    // 트랜잭션 채굴 대기 (최대 60초)
    private TransactionReceipt waitForReceipt(String txHash) throws Exception {
        PollingTransactionReceiptProcessor processor =
                new PollingTransactionReceiptProcessor(web3j, 2000, 30);
        TransactionReceipt receipt = processor.waitForTransactionReceipt(txHash);
        if (!"0x1".equals(receipt.getStatus())) {
            throw new RuntimeException("[DIDRegistry] TX reverted: " + txHash);
        }
        return receipt;
    }
}
