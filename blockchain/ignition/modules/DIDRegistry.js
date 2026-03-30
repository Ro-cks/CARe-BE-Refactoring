const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DIDRegistryModule", (m) => {
  const didRegistry = m.contract("DIDRegistry"); // DIDRegistry.sol을 배포
  return { didRegistry };
});
