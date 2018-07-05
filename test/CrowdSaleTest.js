const CrowdSale = artifacts.require("CrowdSale");
const TempToken = artifacts.require("TempToken");
const DeployedAddresses = artifacts.require("truffle/DeployedAddresses");

contract("CrowdSaleTest", accounts => {
    async function initContracts(exchangeRate) {
        exchangeRate = exchangeRate || 60173469;
        const crowdSaleInstance = await CrowdSale.deployed();
        const tempTokenInstance = await TempToken.deployed();
        await tempTokenInstance.transferOwnership(crowdSaleInstance.address);
        await crowdSaleInstance.start(tempTokenInstance.address, exchangeRate, {from: await crowdSaleInstance.owner()});
        return {
            "tempTokenInstance": tempTokenInstance,
            "crowdSaleInstance": crowdSaleInstance
        }
    }

    function coinsToEth(coins, exchangeRate, bonus){
        const coinsWithoutBonus = coins / (1 + bonus / 100);
        return Math.round(coinsWithoutBonus / (exchangeRate / 1000));
    }

    async function prepareContracts(){
        const exchangeRate = 100000000000; // 100B (1eth = 100M tokens)
        const crowdSaleInstance = await CrowdSale.new({from: accounts[0]});
        const tempTokenInstance = await TempToken.new({from: accounts[1]});
        await tempTokenInstance.transferOwnership(crowdSaleInstance.address, {from: accounts[1]});
        const now = Math.floor(Date.now() / 1000);
        await crowdSaleInstance.start(tempTokenInstance.address, exchangeRate, {from: await crowdSaleInstance.owner()});
        await crowdSaleInstance.setPresaleDates(now - 3000, now - 2000);
        await crowdSaleInstance.setICODates(now - 1000, 7, 7, 7, 7, 7);
        const currentPhase = await crowdSaleInstance.phase.call();
        const currentBonus = (await crowdSaleInstance.bonus_percents(currentPhase));
        const currentBalance = await tempTokenInstance.balanceOf(accounts[1]);
        await crowdSaleInstance.transferICO(accounts[2], currentBalance - 10000 * 10**18);
        return {
            currentBonus: currentBonus,
            crowdSaleInstance: crowdSaleInstance,
            exchangeRate: exchangeRate
        }
    }

    it("sets correct amount of last payer overflow", async () => {
        const {currentBonus, crowdSaleInstance, exchangeRate} = await prepareContracts();
        const secondTransactionAmount = coinsToEth(15000 * 10**18, exchangeRate, currentBonus);
        await crowdSaleInstance.send(secondTransactionAmount, {from: accounts[3]});
        const overflowAmount = await crowdSaleInstance.lastPayerOverflow.call();
        assert.equal(Math.round(overflowAmount.toNumber() / 10**18), 5000);
    });

    it ("sets zero amout for exact amount of tokens", async() => {
        const {currentBonus, crowdSaleInstance, exchangeRate} = await prepareContracts();
        const secondTransactionAmount = coinsToEth(10000 * 10**18, exchangeRate, currentBonus);
        await crowdSaleInstance.send(secondTransactionAmount, {from: accounts[3]});
        const overflowAmount = await crowdSaleInstance.lastPayerOverflow.call();
        assert.equal(Math.round(overflowAmount.toNumber() / 10**18), 0);
    });

    it ("sets zero amout for no overflow", async() => {
        const {currentBonus, crowdSaleInstance, exchangeRate} = await prepareContracts();
        const secondTransactionAmount = coinsToEth(5000 * 10**18, exchangeRate, currentBonus);
        await crowdSaleInstance.send(secondTransactionAmount, {from: accounts[3]});
        const overflowAmount = await crowdSaleInstance.lastPayerOverflow.call();
        assert.equal(Math.round(overflowAmount.toNumber() / 10**18), 0);
    });

    it("gets zero manager", async() => {
        const crowdSale = await CrowdSale.new();
        const manager = await crowdSale.getManager.call();
        assert.equal(manager, "0x0000000000000000000000000000000000000000");
    });

    it("sets manager", async() => {
        const crowdSale = await CrowdSale.new();
        await crowdSale.setManager(accounts[1]);
        const manager = await crowdSale.getManager.call();
        assert.equal(manager, accounts[1]);
    });

    it("does not set manager if called from non-manager", async() => {
        const crowdSale = await CrowdSale.new();
        try{
            await crowdSale.setManager(accounts[1], {from: accounts[2]});
            assert.fail("Sets manager when it shouldn't");
        } catch(e){}
    });

    it("does not allow manager to set a new manager", async() => {
        const crowdSale = await CrowdSale.new();
        await crowdSale.setManager(accounts[1]);
        try{
            await crowdSale.setManager(accounts[2], {from: accounts[1]});
            assert.fail("Allowed to set manager by existing manager");
        } catch(e) {}
    });

    it("does not allow to see current manager for any user", async() => {
        const crowdSale = await CrowdSale.new();
        try{
            await crowdSale.getManager.call({from: accounts[1]});
            assert.fail("Could get manager from non-owner");
        } catch(e){}
    });

    it("sets rate", async() => {
        const crowdSale = await CrowdSale.new();
        await crowdSale.setRate(70000000);
        const exchangeRate = await crowdSale.exchange_rate();
        assert.equal(exchangeRate, 70000000);
    });

    it("does not allow to set zero rate", async() => {
        const crowdSale = await CrowdSale.new();
        try{
            await crowdSale.setRate(0);
            assert.fail("Sets zero rate");
        } catch(e){}
    });

    it("does not allow to set rate for non-manager", async() => {
        const crowdSale = await CrowdSale.new();
        try{
            await crowdSale.setRate(70000000, {from: accounts[1]});
            assert.fail("Allows to set rate for non-manager");
        } catch(e){}
    });

    it("start works as intended", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 70000000);
        assert.equal(await crowdSale.exchange_rate(), 70000000);
    });

    it("does not start without owning temp token", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        try{
            await crowdSale.start(tempToken.address, 70000000);
            assert.fail("Started successfully without owning temp token");
        } catch(e){}
    });

    it("does not start if bad token address is provided", async() => {
        const crowdSale = await CrowdSale.new();
        try{
            await crowdSale.start("0x012345678901234567890123456789012345678901", 70000000);
            assert.fail("Started successfully without owning temp token");
        } catch(e){}
    });

    it("does not start if zero exchange rate is provided", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        try{
            await crowdSale.start(tempToken.address, 0);
            assert.fail("Started successfully with zero exchange rate");
        } catch(e){}
    });

    it("finalize works as intended", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 70000000);
        await crowdSale.finalize();
        const tempTokenOwner = await tempToken.owner();
        assert.equal(tempTokenOwner, accounts[0]);
        try{
            await tempToken.transferICO(accounts[2], 15);
            assert.fail("transferICO allowed after finalize");
        } catch(e) {}
    });

    it("cannot finalize if not started", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        try{
            await crowdSale.finalize();
            assert.fail("Finalized without starting");
        } catch(e) {}
    });

    it("cannot finalize twice", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 70000000);
        await crowdSale.finalize();
        try{
            await crowdSale.finalize();
            assert.fail("Finalized twice");
        } catch(e){}
    });

    it("shows correct phase before start", async() => {
        const crowdSale = await CrowdSale.new();
        const phase = await crowdSale.phase.call();
        assert.equal(phase, -5);
    });

    it("shows correct phase after start", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 70000000);
        const now = Math.floor(Date.now() / 1000);
        await crowdSale.setPresaleDates(now + 10000, now + 20000);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, -4);
    });

    async function constructContractsBeforePresale(){
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 70000000);
        const now = Math.floor(Date.now() / 1000);
        await crowdSale.setPresaleDates(now + 10000, now + 20000);
        return crowdSale;
    }

    it("does not allow transfers before presale", async() => {
        const crowdSale = await constructContractsBeforePresale();
        try {
            await crowdSale.send(10*10**18, {from: accounts[1]});
            assert.fail("Allows transfers before presale");
        } catch(e){}
    });

    it("does not allow ICO transfers before presale", async() => {
        const crowdSale = await constructContractsBeforePresale();
        try {
            await crowdSale.transferICO(accounts[2], 10*10**18, {from: accounts[1]});
            assert.fail("Allows transfer ICO before presale");
        } catch(e){}
    });

    it("gets correct phase between presale and ico", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 70000000);
        const now = Math.floor(Date.now() / 1000);
        await crowdSale.setPresaleDates(now - 20000, now - 10000);
        await crowdSale.setICODates(now + 10000, 7, 7, 7, 7, 7);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, -3);
    });

    it("gets correct phase after ico", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 7000000);
        const now = Math.floor(Date.now() / 1000);
        const oneWeek = 60 * 60 * 24 * 7;
        await crowdSale.setPresaleDates(now - 7 * oneWeek, now -  6 * oneWeek);
        await crowdSale.setICODates(now - 5 * oneWeek, 7, 7, 7, 7, 7);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, -2);
    });

    it("gets correct phase after finalize", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 7000000);
        const now = Math.floor(Date.now() / 1000);
        const oneWeek = 60 * 60 * 24 * 7;
        await crowdSale.setPresaleDates(now - 7 * oneWeek, now -  6 * oneWeek);
        await crowdSale.setICODates(now - 5 * oneWeek, 7, 7, 7, 7, 7);
        await crowdSale.finalize();
        const phase = await crowdSale.phase.call();
        assert.equal(phase, -1);
    });

    it("gets correct phase in presale", async() => {
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, 7000000);
        const now = Math.floor(Date.now() / 1000);
        const oneWeek = 60 * 60 * 24 * 7;
        await crowdSale.setPresaleDates(now - oneWeek, now + oneWeek);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, 0);
    });

    async function buildCrowdSaleForICOTests(icoPhase1StartedBeforeDays, exchangeRate){
        exchangeRate = exchangeRate || 70000000;
        const crowdSale = await CrowdSale.new();
        const tempToken = await TempToken.new();
        await tempToken.transferOwnership(crowdSale.address);
        await crowdSale.start(tempToken.address, exchangeRate);
        const now = Math.floor(Date.now() / 1000);
        const oneWeek = 60 * 60 * 24 * 7;
        const oneDay = 60 * 60 * 24;
        await crowdSale.setPresaleDates(now - 7 * oneWeek, now - 6* oneWeek);
        await crowdSale.setICODates(now - icoPhase1StartedBeforeDays * oneDay, 7, 7, 7, 7, 7);
        return {crowdSale, tempToken};
    }

    it("gets correct phase in ico 1", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(1);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, 1);
    });

    it("gets correct phase in ico 2", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(8);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, 2);
    });

    it("gets correct phase in ico 3", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(15);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, 3);
    });

    it("gets correct phase in ico 4", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(23);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, 4);
    });

    it("gets correct phase in ico 5", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(30);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, 5);
    });

    it("transfer ICO transfers coins as expected", async() => {
        const {crowdSale, tempToken} = await buildCrowdSaleForICOTests(1);
        const ownerBalance = await tempToken.balanceOf(await tempToken.wallet());
        await crowdSale.transferICO(accounts[1], 5000 * 10**18);
        const ownerBalanceAfterTranfer = await tempToken.balanceOf(await tempToken.wallet());
        const receiverBalance = await tempToken.balanceOf(accounts[1]);
        assert.equal(ownerBalanceAfterTranfer, ownerBalance - 5000 * 10**18);
        assert.equal(receiverBalance, 5000*10**18);
    });

    it("transfer ICO does not run before ICO", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(-1);
        try{
            await crowdSale.transferICO(accounts[1], 5000 * 10**18);
            assert.fail("transfer ICO allowed before ICO");
        } catch(e){}
    });

    it("transfer ICO does not transfer more coins that available", async() => {
        const {crowdSale, tempToken} = await buildCrowdSaleForICOTests(1);
        const ownerBalance = await tempToken.balanceOf(await tempToken.wallet());
        await crowdSale.transferICO(accounts[2], ownerBalance - 5000*10**18);
        try{
            await crowdSale.transferICO(accounts[1], 5000 * 10**18);
            assert.fail("Allowed transfer higher than available money");
        } catch(e){}
    });

    it("transfer ICO finalizes ICO after last coin is bought", async() => {
        const {crowdSale, tempToken} = await buildCrowdSaleForICOTests(1);
        const ownerBalance = await tempToken.balanceOf(await tempToken.wallet());
        await crowdSale.transferICO(accounts[2], ownerBalance - 5000*10**18);
        await crowdSale.transferICO(accounts[1], 5000 * 10**18);
        const phase = await crowdSale.phase.call();
        assert.equal(phase, -2);
    });

    it("transfers coins correctly with no active bonus", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(33, 45187739);
        const response = await crowdSale.sendTransaction({from: accounts[2], value: 1.15644*10**18});
        const logsWithPayment = response.logs.filter(log => log.event === "Payment");
        assert.equal(logsWithPayment.length, 1);
        const relevantLog = logsWithPayment[0].args;
        assert.equal(relevantLog.wallet, accounts[2]);
        assert.equal(relevantLog.amountCoin, 52257*10**18);
        assert.equal(relevantLog.amountEth, 1.15644 * 10**18);
        assert.equal(relevantLog.bonusPercent, 0);
    });

    it("transfers coins correctly with 10 percent bonus", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(26, 45187739);
        const response = await crowdSale.sendTransaction({from: accounts[2], value: 1.15644*10**18});
        const logsWithPayment = response.logs.filter(log => log.event === "Payment");
        assert.equal(logsWithPayment.length, 1);
        const relevantLog = logsWithPayment[0].args;
        assert.equal(relevantLog.wallet, accounts[2]);
        assert.equal(relevantLog.amountCoin.toNumber(), 57483*10**18);
        assert.equal(relevantLog.amountEth, 1.15644*10**18);
        assert.equal(relevantLog.bonusPercent, 10);
    });

    it("transfers coins correctly with 20 percent bonus", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(19, 45187739);
        const response = await crowdSale.sendTransaction({from: accounts[2], value: 1.15644*10**18});
        const logsWithPayment = response.logs.filter(log => log.event === "Payment");
        assert.equal(logsWithPayment.length, 1);
        const relevantLog = logsWithPayment[0].args;
        assert.equal(relevantLog.wallet, accounts[2]);
        assert.equal(relevantLog.amountCoin.toNumber(), 62708*10**18);
        assert.equal(relevantLog.amountEth, 1.15644*10**18);
        assert.equal(relevantLog.bonusPercent, 20);
    });

    it("transfers coins correctly with 30 percent bonus", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(12, 45187739);
        const response = await crowdSale.sendTransaction({from: accounts[2], value: 1.15644*10**18});
        const logsWithPayment = response.logs.filter(log => log.event === "Payment");
        assert.equal(logsWithPayment.length, 1);
        const relevantLog = logsWithPayment[0].args;
        assert.equal(relevantLog.wallet, accounts[2]);
        assert.equal(relevantLog.amountCoin.toNumber(), 67934*10**18);
        assert.equal(relevantLog.amountEth, 1.15644*10**18);
        assert.equal(relevantLog.bonusPercent, 30);
    });

    it("transfers coins correctly with 40 percent bonus", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(5, 45187739);
        const response = await crowdSale.sendTransaction({from: accounts[2], value: 1.15644*10**18});
        const logsWithPayment = response.logs.filter(log => log.event === "Payment");
        assert.equal(logsWithPayment.length, 1);
        const relevantLog = logsWithPayment[0].args;
        assert.equal(relevantLog.wallet, accounts[2]);
        assert.equal(relevantLog.amountCoin.toNumber(), 73160*10**18);
        assert.equal(relevantLog.amountEth, 1.15644*10**18);
        assert.equal(relevantLog.bonusPercent, 40);
    });

    it("cannot transfer when not in presale or ICO", async() => {
        const {crowdSale} = await buildCrowdSaleForICOTests(-1, 45187739);
        try{
            await crowdSale.sendTransaction({from: accounts[2], value: 10**18});
            assert.fail("allowed transfer not in ICO or presale");
        } catch(e){}
    });

    it("cannot transfer when all coins are sold", async() => {
        // const exchangeRate = 45187739
        // const {crowdSale, tempToken} = await buildCrowdSaleForICOTests(33, exchangeRate);
        // const coins = await tempToken.balanceOf.call(await tempToken.wallet());
        // console.log(coins.toNumber());
        // await tempToken.transferICO(accounts[1], coins, {from: await tempToken.owner()});
        // try{
        //     await crowdSale.sendTransaction({value: 10**18, from: accounts[2]});
        //     assert.fail("Allowed transfer when all coins were sold");
        // } catch(e){}
    });
});
