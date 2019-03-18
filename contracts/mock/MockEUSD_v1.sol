pragma solidity ^0.4.24;

import "../EUSD_v1.sol";

contract MockEUSD_v1 is EUSD_v1 {
    function version() public pure returns (string memory) {
        return "v1";
    }
}
