package com.care.global.blockchain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
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
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Lazy
@Slf4j
@Service
public class CareTokenService {

    private final Web3j web3j;
    private final Credentials credentials;

    @Value("${blockchain.contracts.mock-usdc}")
    private String careTokenAddress;

    @Value("${blockchain.chain-id}")
    private long chainId;

    // 1원 = 1 CARE
    public static BigInteger toCare(double amount) {
        return BigInteger.valueOf((long) (amount));
    }

    public CareTokenService(Web3j web3j, Credentials credentials) {
        this.web3j = web3j;
        this.credentials = credentials;
    }

    /**
     * 토큰 충전 — faucet(address to, uint256 amount)
     */
    public String faucet(String toAddress, double amount) throws Exception {
        Function function = new Function(
                "faucet",
                Arrays.asList(new Address(toAddress), new Uint256(toCare(amount))),
                Collections.emptyList()
        );
        String txHash = sendFunction(function);
        log.info("[CareToken] faucet {} CARE → {} txHash: {}", amount, toAddress, txHash);
        waitForReceipt(txHash);
        return txHash;
    }

    /**
     * 잔액 조회 — balanceOf(address)
     */
    public BigInteger balanceOf(String address) throws Exception {
        Function function = new Function(
                "balanceOf",
                Collections.singletonList(new Address(address)),
                Collections.singletonList(new TypeReference<Uint256>() {})
        );

        String encoded = FunctionEncoder.encode(function);
        EthCall response = web3j.ethCall(
                Transaction.createEthCallTransaction(credentials.getAddress(), careTokenAddress, encoded),
                DefaultBlockParameterName.LATEST
        ).send();

        List<org.web3j.abi.datatypes.Type> result =
                FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());

        return result.isEmpty() ? BigInteger.ZERO : (BigInteger) result.get(0).getValue();
    }

    /**
     * 토큰 송금 — 서버 관리자 대행 방식
     * renter 잔액에서 차감 후 company에 충전 (faucet 기반 2-step)
     *
     * @param fromAddress 출금 지갑 (renter)
     * @param toAddress   입금 지갑 (company)
     * @param amount      송금액 (CARE 단위)
     * @return 입금 트랜잭션 해시
     */
    public String transfer(String fromAddress, String toAddress, double amount) throws Exception {
        // 잔액 확인
        BigInteger balance = balanceOf(fromAddress);
        BigInteger required = toCare(amount);
        if (balance.compareTo(required) < 0) {
            throw new RuntimeException("잔액 부족: 보유=" + balance.divide(BigInteger.valueOf(1_000_000)) + " CARE, 필요=" + (long) amount + " CARE");
        }

        // burn (출금)
        Function burnFunction = new Function(
                "burn",
                Arrays.asList(new Address(fromAddress), new Uint256(required)),
                Collections.emptyList()
        );
        String burnTxHash = sendFunction(burnFunction);
        log.info("[CareToken] burn {} CARE from {} txHash: {}", amount, fromAddress, burnTxHash);
        waitForReceipt(burnTxHash);

        // faucet (입금)
        Function mintFunction = new Function(
                "faucet",
                Arrays.asList(new Address(toAddress), new Uint256(required)),
                Collections.emptyList()
        );
        String mintTxHash = sendFunction(mintFunction);
        log.info("[CareToken] faucet {} CARE → {} txHash: {}", amount, toAddress, mintTxHash);
        waitForReceipt(mintTxHash);

        return mintTxHash;
    }

    /**
     * 발행처(오너) 지갑 주소 반환
     */
    public String getOwnerAddress() {
        return credentials.getAddress();
    }

    /**
     * 토큰 컨트랙트 주소 반환
     */
    public String getTokenContractAddress() {
        return careTokenAddress;
    }


    // ── 트랜잭션 채굴 대기 (최대 60초) ───────────────────────────────────────
    private TransactionReceipt waitForReceipt(String txHash) throws Exception {
        PollingTransactionReceiptProcessor processor =
                new PollingTransactionReceiptProcessor(web3j, 2000, 30);
        TransactionReceipt receipt = processor.waitForTransactionReceipt(txHash);
        if (!"0x1".equals(receipt.getStatus())) {
            throw new RuntimeException("[CareToken] TX reverted: " + txHash);
        }
        return receipt;
    }

    // ── 내부: Raw Transaction 서명 후 전송 ──────────────────────────────────
    private String sendFunction(Function function) throws Exception {
        String encoded = FunctionEncoder.encode(function);

        BigInteger nonce = web3j
                .ethGetTransactionCount(credentials.getAddress(), DefaultBlockParameterName.PENDING)
                .send()
                .getTransactionCount();

        BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
        BigInteger gasLimit = BigInteger.valueOf(100_000);

        RawTransaction rawTx = RawTransaction.createTransaction(
                nonce, gasPrice, gasLimit, careTokenAddress, BigInteger.ZERO, encoded);

        byte[] signed = TransactionEncoder.signMessage(rawTx, chainId, credentials);
        EthSendTransaction response = web3j.ethSendRawTransaction(Numeric.toHexString(signed)).send();

        if (response.hasError()) {
            throw new RuntimeException("TX error: " + response.getError().getMessage());
        }
        return response.getTransactionHash();
    }
}
