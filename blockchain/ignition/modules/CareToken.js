const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * CareToken 배포 모듈
 * 실행: npx hardhat ignition deploy ignition/modules/CareToken.js --network ssafy
 * 배포 후 backend/.env의 MOCK_USDC_ADDRESS를 새 주소로 업데이트
 */
const CareTokenModule = buildModule("CareTokenModule", (m) => {
  const careToken = m.contract("CareToken");
  return { careToken };
});

module.exports = CareTokenModule;
