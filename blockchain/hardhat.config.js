require("@nomicfoundation/hardhat-toolbox");

// 1. 환경변수 경로 설정 (백엔드와 공유하는 경로 기준)
// 만약 블록체인 폴더 내의 .env를 쓴다면 require("dotenv").config(); 로 수정하세요.
require("dotenv").config({ path: "../backend/.env" });

// 2. 환경변수 안전하게 가져오기 (없을 경우 빌드 에러 방지를 위한 더미 값 설정)
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "a".repeat(64);
const SSAFY_RPC_URL = process.env.RPC_URL || process.env.SSAFY_RPC_URL || "https://rpc.ssafy-blockchain.com";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // 3. 최적화 옵션을 포함한 솔리디티 설정 (가져온 브랜치 방식 채택)
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // 4. 로컬 네트워크 (가져온 브랜치 내용)
    localhost: { 
      url: "http://127.0.0.1:8545" 
    },
    // 5. Amoy 네트워크 (현재 브랜치 내용)
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
    // 6. SSAFY 네트워크 (두 브랜치 통합)
    ssafy: {
      url: SSAFY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 31221,
    },
  },
};