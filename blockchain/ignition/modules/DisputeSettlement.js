const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DisputeSettlementModule", (m) => {
	const initialOwner = m.getAccount(0);
	const disputeSettlement = m.contract("DisputeSettlement", [initialOwner]);

	return { disputeSettlement };
});
