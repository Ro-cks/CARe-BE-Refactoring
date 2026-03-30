// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// did:ethr:{chainId}:{address}
// 이더리움 네트워크를 레지스트리로 DID를 온체인에 등록/관리
// 이더리움 주소를 공개키로 사용
contract DIDRegistry {

    // DID 구조체
    struct DIDDocument {
        address controller; // DID 소유자 지갑 주소
        bytes32 docHash; // DID Document 해시 (IPFS CID 등)
        bool deactivated; // 비활성화 여부
        uint256 updatedAt; // 마지막 업데이트 블록 타임스탬프
    }

    // did hash → DIDDocument 매핑
    mapping(bytes32 => DIDDocument) private documents;

    // DID 등록 시 발생하는 이벤트
    event DIDRegistered(bytes32 indexed didHash, address indexed controller, uint256 timestamp);
    // DID 문서 해시 업데이트 시 발생하는 이벤트
    event DIDUpdated(bytes32 indexed didHash, bytes32 newDocHash, uint256 timestamp);
    // DID 비활성화 시 발생하는 이벤트
    event DIDDeactivated(bytes32 indexed didHash, uint256 timestamp);

    // 호출자가 DID 소유자인지 확인
    modifier onlyController(bytes32 didHash) {
        require(documents[didHash].controller == msg.sender, "Not the controller"); // 호출자가 소유자가 아닐 경우
        _;
    }

    // DID 등록
    // didHash : keccak256(did uri) 해시 | docHash : DID Document 해시 (IPFS CID의 bytes32)
    function registerDID(bytes32 didHash, bytes32 docHash) external {
        require(documents[didHash].controller == address(0), "DID already registered"); // 이미 등록된 DID

        documents[didHash] = DIDDocument({
            controller: msg.sender,
            docHash: docHash,
            deactivated: false,
            updatedAt: block.timestamp
        });

        emit DIDRegistered(didHash, msg.sender, block.timestamp);
    }

    // DID Document 해시 업데이트
    function updateDID(bytes32 didHash, bytes32 newDocHash) external onlyController(didHash) {
        require(!documents[didHash].deactivated, "DID is deactivated");

        documents[didHash].docHash = newDocHash;
        documents[didHash].updatedAt = block.timestamp;

        emit DIDUpdated(didHash, newDocHash, block.timestamp);
    }

    // DID 조회
    function resolveDID(bytes32 didHash) external view returns (
        address controller,
        bytes32 docHash,
        bool deactivated,
        uint256 updatedAt
    ) {
        DIDDocument memory doc = documents[didHash];
        return (doc.controller, doc.docHash, doc.deactivated, doc.updatedAt);
    }

    // DID 등록 여부 확인
    function isRegistered(bytes32 didHash) external view returns (bool) {
        return documents[didHash].controller != address(0);
    }

    // DID 비활성화
    function deactivateDID(bytes32 didHash) external onlyController(didHash) {
        documents[didHash].deactivated = true;
        documents[didHash].updatedAt = block.timestamp;

        emit DIDDeactivated(didHash, block.timestamp);
    }
}
