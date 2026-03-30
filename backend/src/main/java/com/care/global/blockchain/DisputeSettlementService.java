package com.care.global.blockchain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Hash;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;

@Lazy
@Slf4j
@Service
public class DisputeSettlementService {

	private final Web3j web3j;
	private final Credentials credentials;

	@Value("${blockchain.contracts.dispute-settlement}")
	private String disputeSettlementAddress;

	@Value("${blockchain.chain-id}")
	private long chainId;

	public DisputeSettlementService(Web3j web3j, Credentials credentials) {
		this.web3j = web3j;
		this.credentials = credentials;
	}

	/**
	 * 정산 합의 메타를 온체인에 초기화
	 */
	public String initializeSettlementAgreement(String settlementId,
											 String companyWallet,
											 String renterWallet,
											 long finalAmount) throws Exception {
		Function function = new Function(
				"initializeSettlementAgreement",
				Arrays.asList(
						toBytes32Key(settlementId),
						new Address(companyWallet),
						new Address(renterWallet),
						new Uint256(BigInteger.valueOf(finalAmount))
				),
				Collections.emptyList()
		);
		String txHash = sendFunction(function);
		log.info("[DisputeSettlement] 합의 초기화 완료 | settlementId: {}, finalAmount: {}, txHash: {}",
				settlementId, finalAmount, txHash);
		return txHash;
	}

	/**
	 * 정산 참여자(업체/렌터) 동의를 operator가 릴레이 처리
	 */
	public String agreeSettlementByOperator(String settlementId, String participantWallet) throws Exception {
		Function function = new Function(
				"agreeSettlementByOperator",
				Arrays.asList(toBytes32Key(settlementId), new Address(participantWallet)),
				Collections.emptyList()
		);
		String txHash = sendFunction(function);
		log.info("[DisputeSettlement] 합의 동의 반영 완료 | settlementId: {}, participant: {}, txHash: {}",
				settlementId, participantWallet, txHash);
		return txHash;
	}

	/**
	 * 정산 결과를 온체인에 기록
	 */
	public String recordSettlement(String settlementId, long finalAmount) throws Exception {
		Function function = new Function(
				"recordSettlement",
				Arrays.asList(toBytes32Key(settlementId), new Uint256(BigInteger.valueOf(finalAmount))),
				Collections.emptyList()
		);
		String txHash = sendFunction(function);
		log.info("[DisputeSettlement] 정산 기록 완료 | settlementId: {}, finalAmount: {}, txHash: {}",
				settlementId, finalAmount, txHash);
		return txHash;
	}

	private Bytes32 toBytes32Key(String settlementId) {
		byte[] hashBytes = Numeric.hexStringToByteArray(Hash.sha3String(settlementId));
		return new Bytes32(hashBytes);
	}

	private String sendFunction(Function function) throws Exception {
		String encoded = FunctionEncoder.encode(function);

		BigInteger nonce = web3j
				.ethGetTransactionCount(credentials.getAddress(), DefaultBlockParameterName.PENDING)
				.send()
				.getTransactionCount();

		BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
		BigInteger gasLimit = BigInteger.valueOf(200_000);

		RawTransaction rawTx = RawTransaction.createTransaction(
				nonce, gasPrice, gasLimit, disputeSettlementAddress, BigInteger.ZERO, encoded);

		byte[] signed = TransactionEncoder.signMessage(rawTx, chainId, credentials);
		EthSendTransaction response = web3j.ethSendRawTransaction(Numeric.toHexString(signed)).send();

		if (response.hasError()) {
			throw new RuntimeException("TX error: " + response.getError().getMessage());
		}
		return response.getTransactionHash();
	}
}
