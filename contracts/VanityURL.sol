// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/IDC.sol";

contract VanityURL is OwnableUpgradeable, PausableUpgradeable {
    struct VanityURLInfo {
        string vanityURL;
        uint256 price;
        address owner;
    }

    /// @dev DC contract
    address public dc;

    /// @dev DC TokenId -> Alias name list
    mapping(bytes32 => string[]) public aliasNames;

    /// @dev DC TokenId -> Alias Name -> VanityURLInfo
    mapping(bytes32 => mapping(string => VanityURLInfo)) public vanityURLs;

    /// @dev Price for the url update
    uint256 public urlUpdatePrice;

    /// @dev Fee withdrawal address
    address public revenueAccount;

    event NewURLAdded(
        address by,
        string indexed name,
        string indexed aliasName,
        string indexed url,
        uint256 price,
        address owner
    );
    event URLDeleted(
        address by,
        string indexed name,
        string indexed aliasName,
        string indexed url,
        uint256 price,
        address owner
    );
    event URLUpdated(
        address by,
        string indexed name,
        string indexed aliasName,
        string oldURL,
        string indexed newURL,
        uint256 oldPrice,
        uint256 newPrice,
        address owner
    );
    event RevenueAccountChanged(address indexed from, address indexed to);

    modifier onlyDCOwner(string memory _name) {
        address dcOwner = IDC(dc).ownerOf(_name);
        require(msg.sender == dcOwner, "VanityURL: only DC owner");
        _;
    }

    modifier whenDomainNotExpired(string memory _name) {
        uint256 domainExpireAt = IDC(dc).nameExpires(_name);
        require(block.timestamp < domainExpireAt, "VanityURL: expired domain");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _dc, uint256 _urlUpdatePrice, address _revenueAccount) external initializer {
        __Pausable_init();
        __Ownable_init();

        require(_dc != address(0), "VanityURL: zero address");
        require(_revenueAccount != address(0), "VanityURL: zero address");

        dc = _dc;
        urlUpdatePrice = _urlUpdatePrice;
        revenueAccount = _revenueAccount;
    }

    /// @notice Set the DC contract address
    /// @param _dc DC contract address
    function setDCAddress(address _dc) external onlyOwner {
        dc = _dc;
    }

    /// @notice Set the price for the URL update
    /// @param _urlUpdatePrice price for the URL update
    function setURLUpdatePrice(uint256 _urlUpdatePrice) external onlyOwner {
        urlUpdatePrice = _urlUpdatePrice;
    }

    /// @notice Set the revenue account
    /// @param _revenueAccount revenue account address
    function setRevenueAccount(address _revenueAccount) public onlyOwner {
        emit RevenueAccountChanged(revenueAccount, _revenueAccount);

        revenueAccount = _revenueAccount;
    }

    /// @notice Add a new URL
    /// @param _name domain name
    /// @param _aliasName alias name for the URL
    /// @param _url URL address to be redirected
    /// @param _price Price to paid for the URL access
    function addNewURL(
        string calldata _name,
        string calldata _aliasName,
        string calldata _url,
        uint256 _price
    ) external payable whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        VanityURLInfo memory vanityURLInfo = vanityURLs[tokenId][_aliasName];

        require(bytes(_aliasName).length <= 1024, "VanityURL: alias too long");
        require(bytes(_url).length <= 1024, "VanityURL: url too long");
        require(bytes(_aliasName).length != 0, "VanityURL: empty alias");
        require(bytes(_url).length != 0, "VanityURL: empty url");

        require(bytes(vanityURLInfo.vanityURL).length == 0, "VanityURL: url already exists");
        require(msg.value == vanityURLInfo.price, "VanityURL: invalid payment");

        // set a new URL
        address domainOwner = IDC(dc).ownerOf(_name);
        aliasNames[tokenId].push(_aliasName);
        vanityURLs[tokenId][_aliasName] = VanityURLInfo({vanityURL: _url, price: _price, owner: domainOwner});

        emit NewURLAdded(msg.sender, _name, _aliasName, _url, _price, domainOwner);
    }

    /// @notice Delete the existing URL
    /// @dev Deleting the URL is available regardless the domain expiration
    /// @param _name domain name
    /// @param _aliasName alias name for the URL to delete
    function deleteURL(string calldata _name, string calldata _aliasName) external whenNotPaused onlyDCOwner(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        VanityURLInfo memory vanityURLInfo = vanityURLs[tokenId][_aliasName];

        require(bytes(vanityURLInfo.vanityURL).length != 0, "VanityURL: url does not exist");

        emit URLDeleted(
            msg.sender,
            _name,
            _aliasName,
            vanityURLInfo.vanityURL,
            vanityURLInfo.price,
            vanityURLInfo.owner
        );

        // delete the URL
        uint256 aliasNameLen = aliasNames[tokenId].length;
        for (uint256 i; i < aliasNameLen; ) {
            if (keccak256(abi.encodePacked(aliasNames[tokenId][i])) == keccak256(abi.encodePacked(_aliasName))) {
                aliasNames[tokenId][i] = aliasNames[tokenId][aliasNameLen - 1];
                aliasNames[tokenId].pop();
            }

            unchecked {
                ++i;
            }
        }
        delete vanityURLs[tokenId][_aliasName];
    }

    /// @notice Update the existing URL
    /// @dev Updating the URL is not available after the domain is expired
    /// @param _name domain name
    /// @param _aliasName alias name for the URL
    /// @param _url URL address to be redirected
    /// @param _price Price to paid for the URL access
    function updateURL(
        string calldata _name,
        string calldata _aliasName,
        string calldata _url,
        uint256 _price
    ) external whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        VanityURLInfo storage vanityURLInfo = vanityURLs[tokenId][_aliasName];
        address domainOwner = IDC(dc).ownerOf(_name);

        require(bytes(_aliasName).length <= 1024, "VanityURL: alias too long");
        require(bytes(_url).length <= 1024, "VanityURL: url too long");
        require(bytes(vanityURLInfo.vanityURL).length != 0, "VanityURL: url does not exists");

        emit URLUpdated(
            msg.sender,
            _name,
            _aliasName,
            vanityURLInfo.vanityURL,
            _url,
            vanityURLInfo.price,
            _price,
            domainOwner
        );

        // update the URL
        vanityURLs[tokenId][_aliasName] = VanityURLInfo({vanityURL: _url, price: _price, owner: domainOwner});
    }

    /// @notice Returns the validity of the vanity URL
    /// @param _name domain name
    /// @param _aliasName alias name for the URL
    function existURL(string memory _name, string memory _aliasName) public view returns (bool) {
        bytes32 tokenId = keccak256(bytes(_name));
        VanityURLInfo memory vanityURLInfo = vanityURLs[tokenId][_aliasName];

        return bytes(vanityURLInfo.vanityURL).length != 0;
    }

    /**
     * @notice Transfer the vanity url ownership to another domain
     * @param _senderName domain name to send the vanity urls
     * @param _receiverName domain name to receive the vanity urls
     */
    function trasnferURLOwnership(
        string memory _senderName,
        string memory _receiverName
    ) external whenNotPaused onlyDCOwner(_senderName) whenDomainNotExpired(_senderName) {
        bytes32 senderTokenId = keccak256(bytes(_senderName));
        bytes32 receiverTokenId = keccak256(bytes(_receiverName));
        address receiver = IDC(dc).ownerOf(_receiverName);

        for (uint256 i; i < aliasNames[senderTokenId].length; ) {
            // add vanity urls and alias names to the receiver
            string memory aliasName = aliasNames[senderTokenId][i];
            VanityURLInfo memory senderVanityURLInfo = vanityURLs[senderTokenId][aliasName];
            VanityURLInfo memory receiverVanityURLInfo = vanityURLs[receiverTokenId][aliasName];

            require(bytes(receiverVanityURLInfo.vanityURL).length == 0, "VanityURL: duplication");
            aliasNames[receiverTokenId].push(aliasName);
            vanityURLs[receiverTokenId][aliasName] = VanityURLInfo({
                vanityURL: senderVanityURLInfo.vanityURL,
                price: senderVanityURLInfo.price,
                owner: receiver
            });

            // remove vanity urls from the sender
            delete vanityURLs[receiverTokenId][aliasName];

            unchecked {
                ++i;
            }
        }

        // remove alias names from the user
        delete aliasNames[receiverTokenId];
    }

    /// @notice Withdraw funds
    /// @dev Only owner of the revenue account can withdraw funds
    function withdraw() external {
        require(msg.sender == owner() || msg.sender == revenueAccount, "VanityURL: must be owner or revenue account");
        (bool success, ) = revenueAccount.call{value: address(this).balance}("");
        require(success, "VanityURL: failed to withdraw");
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