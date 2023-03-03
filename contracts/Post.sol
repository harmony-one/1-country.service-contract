// SPDX-License-Identifier: CC-BY-NC-4.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./interfaces/IAddressRegistry.sol";
import "./interfaces/IDC.sol";

contract Post is Ownable, ReentrancyGuard, Pausable {
    /// @dev AddressRegistry
    IAddressRegistry public addressRegistry;

    /// @dev Domain Key -> URL -> Emoji count
    mapping(bytes32 => string[]) public postURLs;

    /// @dev Domain Key -> URL -> Emoji count
    mapping(bytes32 => mapping(string => uint256)) public emojis;

    /// @dev Prices for url and emoji management
    uint256 public urlPrice;
    uint256 public emojiPrice;

    event URLAdded(address indexed user, string indexed domain, string indexed url);
    event URLUpdated(
        address indexed user,
        string indexed domain,
        uint256 urlIndex,
        string oldURL,
        string indexed newURL
    );
    event URLRemoved(address indexed user, string indexed domain, uint256 urlIndex, string indexed url);
    event AllURLsRemoved(address indexed user, string indexed domain);
    event EmojiAdded(address indexed user, string indexed domain, string indexed url, uint256 emojiIndex);

    modifier onlyValidDomainAndOwner(string memory _domain) {
        address dc = addressRegistry.dc();
        bytes32 key = keccak256(bytes(_domain));
        (address domainOwner, , uint256 expireAt, , , ) = IDC(dc).nameRecords(key);

        require(msg.sender == domainOwner, "Only domain owner");
        require(block.timestamp < expireAt, "Domain expired");
        _;
    }

    modifier onlyValidDomain(string memory _domain) {
        address dc = addressRegistry.dc();
        bytes32 key = keccak256(bytes(_domain));
        (, , uint256 expireAt, , , ) = IDC(dc).nameRecords(key);

        require(block.timestamp < expireAt, "Domain expired");
        _;
    }

    constructor(address _addressRegistry) {
        addressRegistry = IAddressRegistry(_addressRegistry);
    }

    function setURLPrice(uint256 _urlPrice) external onlyOwner {
        urlPrice = _urlPrice;
    }

    function setEmojiPrice(uint256 _emojiPrice) external onlyOwner {
        emojiPrice = _emojiPrice;
    }

    function addURL(
        string calldata _domain,
        string calldata _url
    ) external payable onlyValidDomainAndOwner(_domain) nonReentrant whenNotPaused {
        bytes32 key = keccak256(bytes(_domain));

        require(postURLs[key].length < 32, "Too long");
        require(msg.value == getURLPrice(), "Incorrect payment");

        postURLs[key].push(_url);

        emit URLAdded(msg.sender, _domain, _url);
    }

    function updateURL(
        string calldata _domain,
        uint256 _index,
        string calldata _url
    ) external payable onlyValidDomainAndOwner(_domain) nonReentrant whenNotPaused {
        bytes32 key = keccak256(bytes(_domain));
        uint256 urlCount = postURLs[key].length;

        require(postURLs[key].length < 32, "Too long");
        require(_index < urlCount, "Invalid index");
        require(msg.value == getURLPrice(), "Incorrect payment");

        emit URLUpdated(msg.sender, _domain, _index, postURLs[key][_index], _url);

        postURLs[key][_index] = _url;
    }

    function removeURL(
        string calldata _domain,
        uint256 _index
    ) external payable onlyValidDomainAndOwner(_domain) nonReentrant whenNotPaused {
        bytes32 key = keccak256(bytes(_domain));
        uint256 urlCount = postURLs[key].length;

        require(_index < urlCount, "Invalid index");
        require(msg.value == getURLPrice(), "Incorrect payment");

        // remove the url and keep the order
        string memory urlToRemove = postURLs[key][_index];
        for (uint256 i = _index; i < urlCount - 1; ) {
            postURLs[key][i] = postURLs[key][i + 1];

            unchecked {
                ++i;
            }
        }
        postURLs[key].pop();

        emit URLRemoved(msg.sender, _domain, _index, urlToRemove);
    }

    function removeAllURLs(
        string calldata _domain
    ) external payable onlyValidDomainAndOwner(_domain) nonReentrant whenNotPaused {
        require(msg.value == getURLPrice(), "Incorrect payment");

        bytes32 key = keccak256(bytes(_domain));
        delete postURLs[key];

        emit AllURLsRemoved(msg.sender, _domain);
    }

    function getURL(string calldata _domain, uint256 _index) external view returns (string memory) {
        bytes32 key = keccak256(bytes(_domain));
        uint256 urlCount = postURLs[key].length;
        require(_index < urlCount, "Invalid index");

        string memory url = postURLs[key][_index];

        return url;
    }

    function getAllURLs(string calldata _domain) external view returns (string[] memory) {
        bytes32 key = keccak256(bytes(_domain));
        string[] memory urls = postURLs[key];

        return urls;
    }

    function getURLCount(string calldata _domain) external view returns (uint256) {
        bytes32 key = keccak256(bytes(_domain));

        return postURLs[key].length;
    }

    function getURLPrice() public view returns (uint256) {
        return urlPrice;
    }

    function withdraw(address _to) external onlyOwner {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Failed to withdraw");
    }
}
