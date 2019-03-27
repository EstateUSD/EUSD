pragma solidity ^0.4.24;

import "./Owned.sol";
import "./openzeppelin-solidity/math/SafeMath.sol";
import "./upgradeability/AdminUpgradeabilityProxy.sol";
import "./openzeppelin-solidity/token/ERC20/ERC20Pausable.sol";

/**
 * @title EUSD Token contract.
 * @dev This contract is only deployed and used as implementation for
 * AdminUpgradeabilityProxy contract. This contract will not hold any funds.
 */
contract EUSD_v1 is Owned, ERC20Pausable {

    using SafeMath for uint;

    //ERC20 token variables
    string public name;
    string public symbol;
    uint8 public decimals;

    struct MintHold {
        address user;
        uint tokenAmount;
        uint releaseTimeStamp;
    }

    MintHold[] public mintHoldArray;
    bool internal initialized = false;
    mapping (address => bool) public frozenAccount;

    //Events
    event AccountFrozen(address indexed account);
    event AccountUnfrozen(address indexed account);

    constructor() public {
        initialize();
        pause();
    }

    /**
     * @dev Transfer allowed only when not Paused and `to`
     * and accounts are not frozen.
     * @param _to Account to transfer token from msg.sender.
     * @param _value Number of tokens to transfer.
     * @return bool Returns the transaction status.
     */
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(
            ! frozenAccount[msg.sender] &&
            ! frozenAccount[_to],
            "address frozen"
        );

        super.transfer(_to, _value);
    }

    /**
     * @dev Transfer from allowed only when not Paused and `from`
     * `to` and `msg.sender` are not frozen.
     * @param _from Account from tokens to be taken.
     * @param _to Account to send the tokens.
     * @param _value Number of tokens.
     * @return bool Returns the transaction status.
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    )
        public returns (bool)
    {
        require(
            ! frozenAccount[msg.sender] &&
            ! frozenAccount[_from] &&
            ! frozenAccount[_to],
            "address frozen"
        );

        super.transferFrom(_from, _to, _value);
    }

    /**
     * @dev Freeze an account from sending & receiving tokens.
     * @param _account Account to freeze.
     */
    function freezeAccount(address _account) public onlyAuthorized {
        require(! frozenAccount[_account], "address already frozen");
        frozenAccount[_account] = true;
        emit AccountFrozen(_account);
    }

    /**
     * @dev UnFreeze an account for sending & receiving tokens
     * @param _account Account to Unfreeze.
     */
    function unFreezeAccount(address _account) public onlyAuthorized {
        require(frozenAccount[_account], "address already unfrozen");
        frozenAccount[_account] = false;
        emit AccountUnfrozen(_account);
    }

    /**
     * @dev Mint the number of tokens to the given account.
     * The Owner can mint instantly, however, Admin's mint request will
     * be on hold for 12 hours.
     * Only Owner and Admin allowed to call this function.
     * @param _to Mint and send the tokens to this address.
     * @param _amount Number of tokens to mint.
     * @return bool Return the transaction status.
     */
    function mint(address _to, uint256 _amount)
        public
        onlyAuthorized
        whenNotPaused
        returns (bool)
    {
        require(! frozenAccount[_to], "address frozen");
        require(_amount > 0);

        if(isOwner()) {
            _mint(_to, _amount);
        } else if(isAdmin()) {
            mintHoldArray.push(MintHold(_to, _amount, now.add(12 hours)));
        }

        return true;
    }

    /**
     * @dev Release the hold mint request present at index.
     * @param _index Index of the request to process
     * @return bool Returns transaction status.
     */
    function releaseMintAtIndex(uint _index)
        public
        onlyAuthorized
        whenNotPaused
        returns (bool)
    {
        _mintAndRemoveFromMintHold(_index);
        return true;
    }

    /**
     * @dev Release the hold mint tokens.
     * Only Owner and Admins allowed to call this function.
     * @param _operations Number of hold mint requests to process
     * @return bool Returns transaction status
     */
    function releaseMint(uint _operations)
        public
        onlyAuthorized
        whenNotPaused
        returns (bool)
    {
        require(_operations <= mintHoldArray.length);
        for(uint i = 0; i < _operations; i++) {
            _mintAndRemoveFromMintHold(i);
        }

        return true;
    }

    /**
     * @dev Mint and remove from the mintHoldArray.
     * @param _index Index of the hold request to process.
     */
    function _mintAndRemoveFromMintHold(uint _index) private {
        require(_index < mintHoldArray.length);
        if(
            mintHoldArray[_index].releaseTimeStamp < now &&
            ! frozenAccount[mintHoldArray[_index].user]
        ) {
            _mint(mintHoldArray[_index].user, mintHoldArray[_index].tokenAmount);
            _removeFromMintHold(_index);
        }
    }

    /**
     * @dev Remove the given index item from mintHoldArray
     * @param _index Index of the item to be removed
     */
    function _removeFromMintHold(uint _index) private {
        require(_index < mintHoldArray.length);
        mintHoldArray[_index] = mintHoldArray[mintHoldArray.length.sub(1)];
        mintHoldArray.length--;
    }

    /**
     * @dev To cancel existing hold mint request.
     * @param _index Index of the request to be cancelled.
     * @return bool Returns the transaction status.
     */
    function cancelHoldMint(uint _index) public onlyOwner returns(bool) {
        _removeFromMintHold(_index);
        return true;
    }

    /**
     * @dev Reclaiming tokens from any users.
     * This is for government regulation purpose.
     * @param _user User from which tokens to be reclaimed.
     * @param _tokens Number of tokens to reclaim.
     * @return bool Returns transaction status
     */
    function reclaimTokens(
        address _user,
        uint _tokens
    ) public onlyAuthorized whenNotPaused returns(bool) {
        require(_user != address(0), "Invalid address");
        _transfer(_user, owner(), _tokens);
        return true;
    }

    /**
     * @dev Burn tokens from any user's wallet.
     * Only owner allowed to burn.
     * @param _from Users's address whose tokens to be burned.
     * @param _value Number of tokens to be burned.
     */
    function burnFrom(address _from, uint _value) public onlyOwner {
        _burn(_from, _value);
    }

    /**
     * @dev Returns the number of mint hold transactions present.
     * @return uint Number of transaction.
     */
    function totalMintHoldTransactions() public view returns(uint) {
        return mintHoldArray.length;
    }

    /**
     * @dev only called from EUSD implementation.
     */
    function initialize() private {
        initialize("EstateUSD", "EUSD", 18, owner(), owner(), owner());
    }

    /**
     * @dev Initialize the contract once with the given parameters.
     * This is to initialize in the Proxy.
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _owner,
        address _admin1,
        address _admin2
    ) public {
        require(!initialized);
        require(_owner != address(0));

        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        _transferOwnership(_owner);
        admin1 = _admin1;
        admin2 = _admin2;
        initialized = true;
    }
}

