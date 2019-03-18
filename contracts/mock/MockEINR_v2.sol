pragma solidity ^0.4.24;

import "../EINR_v1.sol";

contract MockEINR_v2 is EINR_v1 {
    function version() public pure returns (string memory) {
        return "v2";
    }
}
