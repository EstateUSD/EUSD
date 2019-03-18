pragma solidity ^0.4.24;

import "./openzeppelin-solidity/ownership/Ownable.sol";

/**
 * @title Owned is extension to Ownable contact, where it allows to maintain
 * two admin addresses.
 */
contract Owned is Ownable {
    address public admin1;
    address public admin2;
    
    /**
     * Modifier to allow only Authorized (owner and admins) access.
     */
    modifier onlyAuthorized {
        require(isOwner() || isAdmin(), "Unauthorised caller");
        _;
    }

    /**
     * @dev renounceOwnership() not supported.
     */
    function renounceOwnership() public {
        revert("Not supported");
    }

    /**
     * @dev Returns true if sender is admin
     * @return bool True when admin otherwise false.
     */
    function isAdmin() internal view returns (bool) {
        return (msg.sender == admin1 || msg.sender == admin2);
    }

    /**
     * @dev To change admin1 address.
     * @param _newAdmin New admin address.
     */
    function changeAdmin1(address _newAdmin) public onlyOwner {
        //addresses are not checked agains 0x0 because owner can
        //add 0x0 as to remove admin
        if(_newAdmin != address(0)) {
            require(_newAdmin != owner() && _newAdmin != admin2);
        }
        admin1 = _newAdmin;
    }

    /**
     * @dev To change admin2 address.
     * @param _newAdmin New admin address.
     */
    function changeAdmin2(address _newAdmin) public onlyOwner {
        //addresses are not checked agains 0x0 because owner can
        //add 0x0 as to remove admin
        if(_newAdmin != address(0)) {
            require(_newAdmin != owner() && _newAdmin != admin1);
        }
        admin2 = _newAdmin;
    }
}