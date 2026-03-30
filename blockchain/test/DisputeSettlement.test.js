const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DisputeSettlement", function () {
  async function deployFixture() {
    const [owner, operator, company, renter, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DisputeSettlement");
    const contract = await Factory.deploy(owner.address);
    await contract.waitForDeployment();

    return { contract, owner, operator, company, renter, outsider };
  }

  it("records settlement only after dual consent and emits SettlementRecorded", async function () {
    const { contract, owner, company, renter } = await deployFixture();

    const settlementKey = ethers.keccak256(ethers.toUtf8Bytes("settlement-1"));
    const finalAmount = 125000;

    await contract
      .connect(owner)
      .initializeSettlementAgreement(settlementKey, company.address, renter.address, finalAmount);
    await contract.connect(company).agreeSettlement(settlementKey);
    await contract.connect(renter).agreeSettlement(settlementKey);

    await expect(contract.connect(owner).recordSettlement(settlementKey, finalAmount))
      .to.emit(contract, "SettlementRecorded");

    expect(await contract.isSettled(settlementKey)).to.equal(true);

    const stored = await contract.getSettlement(settlementKey);
    expect(stored.finalAmount).to.equal(finalAmount);
    expect(stored.recordedBy).to.equal(owner.address);
    expect(stored.recordedAt).to.be.gt(0);
  });

  it("allows registered operator to initialize and record after both consents", async function () {
    const { contract, owner, operator, company, renter } = await deployFixture();

    const settlementKey = ethers.keccak256(ethers.toUtf8Bytes("settlement-2"));
    const finalAmount = 99000;

    await contract.connect(owner).setSettlementOperator(operator.address, true);
    await contract
      .connect(operator)
      .initializeSettlementAgreement(settlementKey, company.address, renter.address, finalAmount);
    await contract.connect(company).agreeSettlement(settlementKey);
    await contract.connect(renter).agreeSettlement(settlementKey);
    await contract.connect(operator).recordSettlement(settlementKey, finalAmount);

    const stored = await contract.getSettlement(settlementKey);
    expect(stored.finalAmount).to.equal(finalAmount);
    expect(stored.recordedBy).to.equal(operator.address);
  });

  it("rejects recording before both parties agree", async function () {
    const { contract, owner, company, renter } = await deployFixture();

    const settlementKey = ethers.keccak256(ethers.toUtf8Bytes("settlement-3"));
    const finalAmount = 30000;

    await contract
      .connect(owner)
      .initializeSettlementAgreement(settlementKey, company.address, renter.address, finalAmount);
    await contract.connect(company).agreeSettlement(settlementKey);

    await expect(contract.connect(owner).recordSettlement(settlementKey, finalAmount))
      .to.be.revertedWithCustomError(contract, "SettlementConsentIncomplete");
  });

  it("rejects finalAmount mismatch with agreed amount", async function () {
    const { contract, owner, company, renter } = await deployFixture();

    const settlementKey = ethers.keccak256(ethers.toUtf8Bytes("settlement-4"));
    await contract
      .connect(owner)
      .initializeSettlementAgreement(settlementKey, company.address, renter.address, 50000);
    await contract.connect(company).agreeSettlement(settlementKey);
    await contract.connect(renter).agreeSettlement(settlementKey);

    await expect(contract.connect(owner).recordSettlement(settlementKey, 51000))
      .to.be.revertedWithCustomError(contract, "SettlementAmountMismatch");
  });

  it("rejects duplicate settlement keys", async function () {
    const { contract, owner, company, renter } = await deployFixture();

    const settlementKey = ethers.keccak256(ethers.toUtf8Bytes("settlement-5"));
    await contract
      .connect(owner)
      .initializeSettlementAgreement(settlementKey, company.address, renter.address, 1);
    await contract.connect(company).agreeSettlement(settlementKey);
    await contract.connect(renter).agreeSettlement(settlementKey);
    await contract.connect(owner).recordSettlement(settlementKey, 1);

    await expect(contract.connect(owner).recordSettlement(settlementKey, 2))
      .to.be.revertedWithCustomError(contract, "AlreadySettled");
  });

  it("rejects non-operators", async function () {
    const { contract, owner, company, renter, outsider } = await deployFixture();

    const settlementKey = ethers.keccak256(ethers.toUtf8Bytes("settlement-6"));
    await contract
      .connect(owner)
      .initializeSettlementAgreement(settlementKey, company.address, renter.address, 123);
    await contract.connect(company).agreeSettlement(settlementKey);
    await contract.connect(renter).agreeSettlement(settlementKey);

    await expect(contract.connect(outsider).recordSettlement(settlementKey, 123))
      .to.be.revertedWithCustomError(contract, "NotSettlementOperator");
  });

  it("rejects consent from non-participants", async function () {
    const { contract, owner, company, renter, outsider } = await deployFixture();

    const settlementKey = ethers.keccak256(ethers.toUtf8Bytes("settlement-7"));
    await contract
      .connect(owner)
      .initializeSettlementAgreement(settlementKey, company.address, renter.address, 77777);

    await expect(contract.connect(outsider).agreeSettlement(settlementKey))
      .to.be.revertedWithCustomError(contract, "NotSettlementParticipant");
  });

  it("allows operator to relay participant agreements", async function () {
    const { contract, owner, operator, company, renter } = await deployFixture();

    const settlementKey = ethers.keccak256(ethers.toUtf8Bytes("settlement-8"));
    const finalAmount = 55555;

    await contract.connect(owner).setSettlementOperator(operator.address, true);
    await contract
      .connect(operator)
      .initializeSettlementAgreement(settlementKey, company.address, renter.address, finalAmount);

    await contract.connect(operator).agreeSettlementByOperator(settlementKey, company.address);
    await contract.connect(operator).agreeSettlementByOperator(settlementKey, renter.address);

    await expect(contract.connect(operator).recordSettlement(settlementKey, finalAmount))
      .to.emit(contract, "SettlementRecorded");
  });
});
