pragma solidity ^0.4.22;

import "truffle/Assert.sol";
import "../contracts/eye.sol";


contract TempTokenOwner{
    function createContract() public returns (TempToken) {
        return new TempToken();
    }
}

contract TestTempToken {
    function testSettingAnOwnerDuringCreation() public {
        TempToken tempToken = new TempToken();
        Assert.equal(tempToken.owner(), this, "Owner was not set correctly");
    }

    function testSettingWalletDuringCreation() public {
        TempToken tempToken = new TempToken();
        Assert.equal(tempToken.wallet(), address(this), "Creator's wallet was not set correctly");
    }

    function testTotalSupplyIsTenBillionTokens() public {
        TempToken tempToken = new TempToken();
        Assert.equal(tempToken.totalSupply(), 10000000000000000000000000000, "Total token supply is not ten billion tokens");
    }

    function testAccountIsAddedToFrozenList() public {
        TempToken tempToken = new TempToken();
        address testAddress = 0x0000000000000000000000000000000000000000;
        tempToken.freeze(testAddress);
        (bool val, uint256 until) = tempToken.frozenAccounts(testAddress);
        Assert.isTrue(val, "Account was not frozen");
        Assert.equal(until, 0, "Account was not frozen indefinitely");
    }

    function testUnfreezeNotFrozenAccount() public {
        TempToken tempToken = new TempToken();
        address testAddress = 0x0000000000000000000000000000000000000000;
        tempToken.unfreeze(testAddress);
        (bool val, uint256 until) = tempToken.frozenAccounts(testAddress);
        Assert.isFalse(val, "Account is still frozen");
    }

    function testUnfreezeFrozenAccount() public {
        TempToken tempToken = new TempToken();
        address testAddress = 0x0000000000000000000000000000000000000000;
        tempToken.freeze(testAddress);
        (bool valAfterFreeze, uint256 untilAfterFreeze) = tempToken.frozenAccounts(testAddress);
        tempToken.unfreeze(testAddress);
        (bool val, uint256 until) = tempToken.frozenAccounts(testAddress);
        Assert.isFalse(val, "Account is still frozen");
        Assert.notEqual(val, valAfterFreeze, "Account freeze status did not change");
    }

//    function testTransferToIsZeroAddress() public {
//        TempToken tempToken = new TempToken();
//        bool result = tempToken.transfer(address(0), 15);
//        Assert.isFalse(result, "Transfer allowed to a zero address");
//    }


}

