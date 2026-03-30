package com.care.global.blockchain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.response.PollingTransactionReceiptProcessor;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * CarNFT 컨트랙트 호출 서비스
 * 차량 등록 시 ERC-721 NFT를 민팅합니다.
 */
@Lazy
@Slf4j
@Service
public class CarNftService {

    // ERC-721 Transfer 이벤트 시그니처 해시
    private static final String TRANSFER_TOPIC =
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    private final Web3j web3j;
    private final Credentials credentials;

    @Value("${blockchain.contracts.car-nft}")
    private String carNftAddress;

    @Value("${blockchain.chain-id}")
    private long chainId;

    public CarNftService(Web3j web3j, Credentials credentials) {
        this.web3j = web3j;
        this.credentials = credentials;
    }

    /**
     * NFT 민팅 — safeMint(address to, string tokenURI)
     *
     * @param toAddress 민팅 대상 지갑 주소 (company wallet)
     * @param tokenUri  NFT 메타데이터 URI (예: ipfs://CID)
     * @return 발급된 NFT tokenId (문자열)
     */
    public String mint(String toAddress, String tokenUri) throws Exception {
        Function function = new Function(
                "safeMint",
                Arrays.asList(new Address(toAddress), new Utf8String(tokenUri)),
                Collections.emptyList()
        );

        String txHash = sendFunction(function);
        log.info("[CarNFT] safeMint → {} | tokenURI: {} | txHash: {}", toAddress, tokenUri, txHash);

        TransactionReceipt receipt = waitForReceipt(txHash);
        String tokenId = extractTokenId(receipt);
        log.info("[CarNFT] tokenId: {}", tokenId);
        return tokenId;
    }

    // ── Transfer 이벤트 로그에서 tokenId 추출 ─────────────────────────────────
    private String extractTokenId(TransactionReceipt receipt) {
        List<Log> logs = receipt.getLogs();
        for (Log log : logs) {
            List<String> topics = log.getTopics();
            if (topics.size() >= 4 && TRANSFER_TOPIC.equalsIgnoreCase(topics.get(0))) {
                // topics[3] = indexed tokenId (0x-padded 32 bytes)
                return Numeric.toBigInt(topics.get(3)).toString();
            }
        }
        throw new RuntimeException("[CarNFT] Transfer 이벤트를 찾을 수 없습니다. txHash: "
                + receipt.getTransactionHash());
    }

    // ── Raw Transaction 서명 후 전송 ──────────────────────────────────────────
    private String sendFunction(Function function) throws Exception {
        String encoded = FunctionEncoder.encode(function);

        BigInteger nonce = web3j
                .ethGetTransactionCount(credentials.getAddress(), DefaultBlockParameterName.PENDING)
                .send()
                .getTransactionCount();

        BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
        BigInteger gasLimit = BigInteger.valueOf(300_000);

        RawTransaction rawTx = RawTransaction.createTransaction(
                nonce, gasPrice, gasLimit, carNftAddress, BigInteger.ZERO, encoded);

        byte[] signed = TransactionEncoder.signMessage(rawTx, chainId, credentials);
        EthSendTransaction response = web3j.ethSendRawTransaction(Numeric.toHexString(signed)).send();

        if (response.hasError()) {
            throw new RuntimeException("TX error: " + response.getError().getMessage());
        }
        return response.getTransactionHash();
    }

    // ── 트랜잭션 채굴 대기 (최대 60초) ───────────────────────────────────────
    private TransactionReceipt waitForReceipt(String txHash) throws Exception {
        PollingTransactionReceiptProcessor processor =
                new PollingTransactionReceiptProcessor(web3j, 2000, 30);
        TransactionReceipt receipt = processor.waitForTransactionReceipt(txHash);
        if (!"0x1".equals(receipt.getStatus())) {
            throw new RuntimeException("[CarNFT] TX reverted: " + txHash);
        }
        return receipt;
    }
}
