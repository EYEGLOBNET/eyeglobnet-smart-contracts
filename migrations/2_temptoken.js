const TempToken = artifacts.require("TempToken");
const CrowdSale = artifacts.require("CrowdSale");

module.exports = deployer => {
    deployer.deploy(TempToken);
    deployer.deploy(CrowdSale);
};