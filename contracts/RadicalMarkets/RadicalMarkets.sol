// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

import "../interfaces/IDC.sol";

interface USDOracleInterface {
    function latestAnswer() external view returns (int256);
}

contract RadicalMarkets is ERC721Upgradeable, OwnableUpgradeable, PausableUpgradeable {
    struct RentalInfo {
        address originRenter;
        uint256 rentalStartAt;
        uint256 duration; // months
    }

    USDOracleInterface public usdOracle;

    /// @dev RadicalMarkets TokenId -> RentalInfo
    mapping(bytes32 => RentalInfo) public rentals;

    /// @dev Revenue account
    address public revenueAccount;

    // modifier onlyDCOwner(string memory _name) {
    //     address dcOwner = IDC(dc).ownerOf(_name);
    //     require(msg.sender == dcOwner, "RadicalMarkets: only DC owner");
    //     _;
    // }

    event RevenueAccountChanged(address indexed from, address indexed to);

    modifier whenDomainNotExpired(string memory _name) {
        uint256 domainExpireAt = IDC(dc).nameExpires(_name);
        require(block.timestamp < domainExpireAt, "RadicalMarkets: expired domain");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _dc, USDOracleInterface _usdOracle, address _revenueAccount) external initializer {
        __ERC721_init(".country Domains Radical Markets", "RadicalMarkets");
        __Pausable_init();
        __Ownable_init();

        require(_dc != address(0), "RadicalMarkets: zero address");
        require(_revenueAccount != address(0), "RadicalMarkets: zero address");

        dc = _dc;
        usdOracle = _usdOracle;
        revenueAccount = _revenueAccount;
    }

    /// @notice Set the DC contract address
    /// @param _dc DC contract address
    function setDCAddress(address _dc) external onlyOwner {
        require(_dc != address(0), "RadicalMarkets: zero address");

        dc = _dc;
    }

    /// @notice Set the revenue account
    /// @param _revenueAccount revenue account address
    function setRevenueAccount(address _revenueAccount) public onlyOwner {
        require(_revenueAccount != address(0), "RadicalMarkets: zero address");

        emit RevenueAccountChanged(revenueAccount, _revenueAccount);

        revenueAccount = _revenueAccount;
    }

    /// @notice Returns the rental start price of the domain
    /// @param _name domain name
    function getRentalStartPrice(string memory /** _name **/) public view returns (uint256) {
        // start with $1 regardlessof the domain name for now
        uint256 amount = 1;
        uint256 nativeTokenPrice = uint256(usdOracle.latestAnswer());

        return (amount * 1e18) / nativeTokenPrice;
    }

    function rentDomain(string memory _name, uint256 _months) external payable {
        // TODO: rent the domain

        // mint the `RadicalMarkets` NFT
        uint256 tokenId = uint256(keccak256(_name));
        RentalInfo memory rental = rentals[tokenId];
        require(!_exists(tokenId) || (rentalStartAt + duration < block.timestamp), "RadicalMarkets: already in use");
        if (_exist(tokenId) && (block.timestamp <= rentalStartAt + duration)) {}
        _burn(tokenId);
        delete _mint(msg.sender, tokenId);

        // store the rental info
        RentalInfo storage rental = rentals[tokenId];
    }

    /// @notice Withdraw funds
    /// @dev Only owner of the revenue account can withdraw funds
    function withdraw() external {
        require(
            msg.sender == owner() || msg.sender == revenueAccount,
            "RadicalMarkets: must be owner or revenue account"
        );
        (bool success, ) = revenueAccount.call{value: address(this).balance}("");
        require(success, "RadicalMarkets: failed to withdraw");
    }

    /// @notice Pause the contract
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }
}
