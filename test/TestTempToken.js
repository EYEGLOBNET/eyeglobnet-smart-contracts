const TempToken = artifacts.require("TempToken");

contract("TempTokenTest", accounts => {
    const [firstAccount, secondAccount] = accounts;
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    it("sets an owner", async () => {
        const tempToken = await TempToken.new();
        const testAddress = zeroAddress;
        let failed;
        try {
            const response = await tempToken.unfreeze.call(testAddress, {from: secondAccount});
            failed = false;
        } catch (e) {
            failed = true;
        }
        assert.isTrue(failed, "Unfreeze was called by non-owner successfully");
    });

    it("forbids transfers to zero addresses", async () => {
        const tempToken = await TempToken.new();
        try{
            await tempToken.transfer(zeroAddress, 15);
            assert.fail("Transfer allowed to a zero address");
        } catch (e) {

        }
    });

    it("forbids transfers from zero address", async () => {
        const tempToken = await TempToken.new();
        try {
            await tempToken.transfer(secondAccount, 15, {from: zeroAddress});
            assert.fail("Transfer allowed from a zero address");
        } catch (e) {

        }
    });

    it("forbids transfers if not enough funds is held", async () => {
        const tempToken = await TempToken.new();
        try{
            await tempToken.transfer(accounts[1], 15, {from: accounts[2]});
            assert.fail("Transfer allowed with insufficient funds");
        } catch (e) {

        }
    });

    it("transfers are correctly made", async() => {
        const tempToken = await TempToken.new();
        await tempToken.transferICO(secondAccount, 50);
        await tempToken.finalizeICO();
        await tempToken.transfer(accounts[2], 15, {from: secondAccount});
        const receiverBalance = await tempToken.balanceOf(accounts[2]);
        assert.equal(receiverBalance, 15);
        const senderBalance = await tempToken.balanceOf(secondAccount);
        assert.equal(senderBalance, 35);
    });

    it("forbids ICO transfers after ICO", async () => {
        const tempToken = await TempToken.new();
        await tempToken.finalizeICO();
        let failed = false;
        try{
            await tempToken.transferICO(accounts[2], 15);
        } catch(e) {
            failed = true;
        }
        assert.isTrue(failed);
    });

    it("forbids ICO transfers for non-owner", async () => {
        const tempToken = await TempToken.new();
        let failed = false;
        try {
            await tempToken.transferICO(accounts[2], 15, {from: accounts[3]});
        } catch(e) {
            failed = true;
        }
        assert.isTrue(failed);
    });

    it("forbids ICO transfers to zero addresses", async() => {
        const tempToken = await TempToken.new();
        let failed = false;
        try {
            await tempToken.transferICO(zeroAddress, 15);
        } catch(e) {
            failed = true;
        }
        assert.isTrue(failed);
    });

    it("forbids ICO transfers when not enough tokens remain", async() => {
        const tempToken = await TempToken.new();
        const balanceOfOwner = await tempToken.balanceOf.call(await tempToken.wallet());
        await tempToken.transferICO(accounts[2], balanceOfOwner - 1000 * 10**18);
        let failed = false;
        try {
            await tempToken.transferICO(accounts[3], 2000 * 10**18);
        } catch(e) {
            failed = true;
        }
        assert.isTrue(failed);
    });

    it("makes ICO transfers correctly", async() => {
        const tempToken = await TempToken.new();
        const currentBalanceofOwner = await tempToken.balanceOf.call(await tempToken.wallet());
        await tempToken.transferICO(accounts[2], 5000 * 10**18);
        const newbalanceOfOwner = await tempToken.balanceOf.call(await tempToken.wallet());
        const balanceOfClient = await tempToken.balanceOf.call(accounts[2]);
        assert.equal(newbalanceOfOwner, currentBalanceofOwner - 5000 * 10**18);
        assert.equal(balanceOfClient, 5000 * 10**18);
    });

    it("checks balance of non-existing account", async() => {
        const tempToken = await TempToken.new();
        const balance = await tempToken.balanceOf.call(accounts[2]);
        assert.equal(balance, 0);
    });

    it("forbids transfer from in ICO", async() => {
        const tempToken = await TempToken.new();
        await tempToken.transferICO(accounts[2], 5000*10**18);
        await tempToken.approve(accounts[3], 2000*10**18, {from: accounts[2]});
        try{
            await tempToken.transferFrom(accounts[2], accounts[4], 1000*10**18, {from: accounts[3]});
            assert.fail("transfer from allowed");
        } catch(e) {
        }
    });

    it("allows approved transfers", async() => {
        const tempToken = await TempToken.new();
        await tempToken.transferICO(accounts[2], 5000*10**18);
        await tempToken.finalizeICO();
        await tempToken.approve(accounts[3], 4000*10**18, {from: accounts[2]});
        await tempToken.transferFrom(accounts[2], accounts[4], 1000*10**18, {from: accounts[3]});
        const account2Balance = await tempToken.balanceOf.call(accounts[2]);
        const account4Balance = await tempToken.balanceOf.call(accounts[4]);
        assert.equal(account2Balance, 4000*10**18);
        assert.equal(account4Balance, 1000*10**18);
    });

    it("forbids approved transfers exceeding allowance", async() => {
        const tempToken = await TempToken.new();
        await tempToken.transferICO(accounts[2], 5000*10**18);
        await tempToken.finalizeICO();
        await tempToken.approve(accounts[3], 4000*10**18, {from: accounts[2]});
        try{
            await tempToken.transferFrom(accounts[2], accounts[4], 5000*10**18, {from: accounts[3]});
            assert.fail("allowed to transfer too much money");
        } catch(e){}
    });

    it("forbids approved transfers for frozen accounts", async() => {
        const tempToken = await TempToken.new();
        await tempToken.transferICO(accounts[2], 5000*10**18);
        await tempToken.finalizeICO();
        await tempToken.approve(accounts[3], 4000*10**18, {from: accounts[2]});
        await tempToken.freeze([accounts[2]], Math.floor(Date.now() / 1000) + 1000);
        try{
            await tempToken.transferFrom(accounts[2], accounts[4], 5000*10**18, {from: accounts[3]});
            assert.fail("allowed to transfer too much money");
        } catch(e){}
    });

    it("forbids second transfer", async() => {
        const tempToken = await TempToken.new();
        await tempToken.transferICO(accounts[2], 5000*10**18);
        await tempToken.finalizeICO();
        await tempToken.approve(accounts[3], 4000*10**18, {from: accounts[2]});
        await tempToken.transferFrom(accounts[2], accounts[4], 3000*10**18, {from: accounts[3]});
        try{
            await tempToken.transferFrom(accounts[2], accounts[4], 3000*10**18, {from: accounts[3]});
            assert.fail("Allowed a second transfer");
        } catch(e){}
    });

    it("checks allowance correctly existing users", async() => {
        const tempToken = await TempToken.new();
        await tempToken.approve(accounts[3], 4000*10**18, {from: accounts[2]});
        const allowance = await tempToken.allowance.call(accounts[2], accounts[3]);
        assert.equal(allowance, 4000*10**18);
    });

    it("checks allowance correctly for non-existing users", async() => {
        const tempToken = await TempToken.new();
        const allowance = await tempToken.allowance.call(accounts[2], accounts[3]);
        assert.equal(allowance, 0);
    });

    it("increases approval correctly", async() => {
        const tempToken = await TempToken.new();
        await tempToken.approve(accounts[3], 4000*10**18, {from: accounts[2]});
        await tempToken.increaseApproval(accounts[3], 500*10**18, {from: accounts[2]});
        const allowance = await tempToken.allowance.call(accounts[2], accounts[3]);
        assert.equal(allowance.toNumber(), 4500*10**18);
    });

    it("decreases approval correctly", async() => {
        const tempToken = await TempToken.new();
        await tempToken.approve(accounts[3], 4000*10**18, {from: accounts[2]});
        await tempToken.decreaseApproval(accounts[3], 500*10**18, {from: accounts[2]});
        const allowance = await tempToken.allowance.call(accounts[2], accounts[3]);
        assert.equal(allowance.toNumber(), 3500*10**18);
    });

    it("decreases too large approval correctly", async() => {
        const tempToken = await TempToken.new();
        await tempToken.approve(accounts[3], 4000*10**18, {from: accounts[2]});
        await tempToken.decreaseApproval(accounts[3], 4500*10**18, {from: accounts[2]});
        const allowance = await tempToken.allowance.call(accounts[2], accounts[3]);
        assert.equal(allowance.toNumber(), 0);
    });

});
