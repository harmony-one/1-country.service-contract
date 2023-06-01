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

    /// @dev DC contract address
    IDC public dc;

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
        uint256 domainExpireAt = dc.nameExpires(_name);
        require(block.timestamp < domainExpireAt, "RadicalMarkets: expired domain");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _dc, address _revenueAccount) external initializer {
        __ERC721_init(".country Domains Radical Markets", "DCRadicalMarkets");
        __Pausable_init();
        __Ownable_init();

        require(_dc != address(0), "RadicalMarkets: zero address");
        require(_revenueAccount != address(0), "RadicalMarkets: zero address");

        dc = IDC(_dc);
        revenueAccount = _revenueAccount;
    }

    /// @notice Set the DC contract address
    /// @param _dc DC contract address
    function setDCAddress(address _dc) external onlyOwner {
        require(_dc != address(0), "RadicalMarkets: zero address");

        dc = IDC(_dc);
    }

    /// @notice Set the revenue account
    /// @param _revenueAccount revenue account address
    function setRevenueAccount(address _revenueAccount) public onlyOwner {
        require(_revenueAccount != address(0), "RadicalMarkets: zero address");

        emit RevenueAccountChanged(revenueAccount, _revenueAccount);

        revenueAccount = _revenueAccount;
    }

    function rentDomain(string memory _name, uint256 _months, bytes32 _secret) external payable {

        // mint the `RadicalMarkets` NFT
        uint256 tokenId = uint256(keccak256(_name));
        RentalInfo memory rental = rentals[tokenId];
        require(
            !_exists(tokenId) || (rental.rentalStartAt + duration < block.timestamp),
            "RadicalMarkets: already in use"
        );
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
