// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice 정산 최종 금액(finalAmount)을 온체인에 확정 기록하는 컨트랙트
contract DisputeSettlement is Ownable {

    struct Settlement {
        uint256 finalAmount;
        uint256 recordedAt;
        address recordedBy;
    }

    struct SettlementAgreement {
        address company;
        address renter;
        uint256 finalAmount;
        bool companyAgreed;
        bool renterAgreed;
        bool initialized;
    }

    mapping(bytes32 => Settlement) private settlements;
    mapping(bytes32 => SettlementAgreement) private agreements;
    mapping(bytes32 => bool) private settled;
    mapping(address => bool) public settlementOperators;

    event SettlementOperatorUpdated(address indexed operator, bool allowed);
    event SettlementAgreementInitialized(
        bytes32 indexed settlementKey,
        address indexed company,
        address indexed renter,
        uint256 finalAmount,
        address initializedBy
    );
    event SettlementAgreed(
        bytes32 indexed settlementKey,
        address indexed participant,
        bool companyAgreed,
        bool renterAgreed
    );
    event SettlementRecorded(
        bytes32 indexed settlementKey,
        uint256 finalAmount,
        uint256 recordedAt,
        address recordedBy
    );

    error NotSettlementOperator();
    error InvalidOperatorAddress();
    error InvalidSettlementKey();
    error AlreadySettled(bytes32 settlementKey);
    error AgreementAlreadyInitialized(bytes32 settlementKey);
    error AgreementNotInitialized(bytes32 settlementKey);
    error InvalidParticipantAddress();
    error NotSettlementParticipant();
    error AlreadyAgreed();
    error SettlementAmountMismatch(uint256 expected, uint256 provided);
    error SettlementConsentIncomplete(bytes32 settlementKey);

    modifier onlySettlementOperator() {
        if (msg.sender != owner() && !settlementOperators[msg.sender]) {
            revert NotSettlementOperator();
        }
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        if (initialOwner == address(0)) {
            revert InvalidOperatorAddress();
        }
    }

    /// @notice 정산 수행자를 등록/해제합니다. (예: 백엔드 서버 지갑)
    function setSettlementOperator(address operator, bool allowed) external onlyOwner {
        if (operator == address(0)) {
            revert InvalidOperatorAddress();
        }

        settlementOperators[operator] = allowed;
        emit SettlementOperatorUpdated(operator, allowed);
    }

    /// @notice 정산 결과(finalAmount)를 settlementKey 기준으로 1회만 기록합니다.
    function initializeSettlementAgreement(
        bytes32 settlementKey,
        address company,
        address renter,
        uint256 finalAmount
    ) external onlySettlementOperator {
        if (settlementKey == bytes32(0)) {
            revert InvalidSettlementKey();
        }
        if (company == address(0) || renter == address(0)) {
            revert InvalidParticipantAddress();
        }
        if (agreements[settlementKey].initialized) {
            revert AgreementAlreadyInitialized(settlementKey);
        }

        agreements[settlementKey] = SettlementAgreement({
            company: company,
            renter: renter,
            finalAmount: finalAmount,
            companyAgreed: false,
            renterAgreed: false,
            initialized: true
        });

        emit SettlementAgreementInitialized(
            settlementKey,
            company,
            renter,
            finalAmount,
            msg.sender
        );
    }

    /// @notice 업체/렌터가 settlementKey 정산안에 동의합니다.
    function agreeSettlement(bytes32 settlementKey) external {
        _agreeSettlement(settlementKey, msg.sender);
    }

    /// @notice operator가 업체/렌터 동의를 릴레이하여 반영합니다.
    function agreeSettlementByOperator(bytes32 settlementKey, address participant) external onlySettlementOperator {
        _agreeSettlement(settlementKey, participant);
    }

    function _agreeSettlement(bytes32 settlementKey, address participant) internal {
        SettlementAgreement storage agreement = agreements[settlementKey];

        if (!agreement.initialized) {
            revert AgreementNotInitialized(settlementKey);
        }

        if (participant == agreement.company) {
            if (agreement.companyAgreed) {
                revert AlreadyAgreed();
            }
            agreement.companyAgreed = true;
        } else if (participant == agreement.renter) {
            if (agreement.renterAgreed) {
                revert AlreadyAgreed();
            }
            agreement.renterAgreed = true;
        } else {
            revert NotSettlementParticipant();
        }

        emit SettlementAgreed(
            settlementKey,
            participant,
            agreement.companyAgreed,
            agreement.renterAgreed
        );
    }

    /// @notice 정산 결과(finalAmount)를 settlementKey 기준으로 1회만 기록합니다.
    function recordSettlement(
        bytes32 settlementKey,
        uint256 finalAmount
    ) external onlySettlementOperator {
        if (settlementKey == bytes32(0)) {
            revert InvalidSettlementKey();
        }
        if (settled[settlementKey]) {
            revert AlreadySettled(settlementKey);
        }

        SettlementAgreement memory agreement = agreements[settlementKey];
        if (!agreement.initialized) {
            revert AgreementNotInitialized(settlementKey);
        }
        if (!(agreement.companyAgreed && agreement.renterAgreed)) {
            revert SettlementConsentIncomplete(settlementKey);
        }
        if (agreement.finalAmount != finalAmount) {
            revert SettlementAmountMismatch(agreement.finalAmount, finalAmount);
        }

        settlements[settlementKey] = Settlement({
            finalAmount: finalAmount,
            recordedAt: block.timestamp,
            recordedBy: msg.sender
        });
        settled[settlementKey] = true;

        emit SettlementRecorded(
            settlementKey,
            finalAmount,
            block.timestamp,
            msg.sender
        );
    }

    function isSettled(bytes32 settlementKey) external view returns (bool) {
        return settled[settlementKey];
    }

    function getSettlement(bytes32 settlementKey) external view returns (Settlement memory) {
        return settlements[settlementKey];
    }

    function getSettlementAgreement(bytes32 settlementKey) external view returns (SettlementAgreement memory) {
        return agreements[settlementKey];
    }
}
