// SPDX-License-Identifier: CC-BY-NC-4.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./interfaces/IAddressRegistry.sol";
import "./interfaces/IDC.sol";

contract Post is Ownable, ReentrancyGuard, Pausable {
    IAddressRegistry public addressRegistry;
    mapping(bytes32 => string[]) public postURLs;
    uint256 public price;

    event URLAdded(address indexed user, string indexed name, string indexed url);
    event URLUpdated(address indexed user, string indexed name, uint256 index, string oldURL, string indexed newURL);
    event URLRemoved(address indexed user, string indexed name, uint256 index, string indexed url);
    event AllURLsRemoved(address indexed user, string indexed name);

    modifier onlyValidDomainAndOwner(string memory _name) {
        address dc = addressRegistry.dc();
        (address domainOwner, uint256 expireAt) = IDC(dc).getDomainOwner(_name);
        require(msg.sender == domainOwner, "Only domain owner");
        require(block.timestamp < expireAt, "Domain expired");
        _;
    }

    constructor(address _addressRegistry) {
        addressRegistry = IAddressRegistry(_addressRegistry);
    }

    function setPrice(uint256 _price) external onlyOwner {
        price = _price;
    }

    function addURL(string calldata _name, string calldata _url) external payable onlyValidDomainAndOwner(_name) nonReentrant whenNotPaused {
        bytes32 key = keccak256(bytes(_name));

        require(postURLs[key].length < 32, "Too long");
        require(msg.value == getPrice(), "Incorrect payment");

        postURLs[key].push(_url);

        emit URLAdded(msg.sender, _name, _url);
    }

    function updateURL(string calldata _name, uint256 _index, string calldata _url) external payable onlyValidDomainAndOwner(_name) nonReentrant whenNotPaused {
        bytes32 key = keccak256(bytes(_name));
        uint256 urlCount = postURLs[key].length;

        require(postURLs[key].length < 32, "Too long");
        require(_index < urlCount, "Invalid index");
        require(msg.value == getPrice(), "Incorrect payment");

        emit URLUpdated(msg.sender, _name, _index, postURLs[key][_index], _url);

        postURLs[key][_index] = _url;
    }

    function removeURL(string calldata _name, uint256 _index) external payable onlyValidDomainAndOwner(_name) nonReentrant whenNotPaused {
        bytes32 key = keccak256(bytes(_name));
        uint256 urlCount = postURLs[key].length;

        require(_index < urlCount, "Invalid index");
        require(msg.value == getPrice(), "Incorrect payment");

        // remove the url and keep the order
        string memory urlToRemove = postURLs[key][_index];
        for (uint256 i = _index; i < urlCount - 1; ) {
            postURLs[key][i] = postURLs[key][i + 1];

            unchecked {
                ++i;
            }
        }
        postURLs[key].pop();

        emit URLRemoved(msg.sender, _name, _index, urlToRemove);
    }

    function removeAllURLs(string calldata _name) external payable onlyValidDomainAndOwner(_name) whenNotPaused {
        require(msg.value == getPrice(), "Incorrect payment");

        bytes32 key = keccak256(bytes(_name));
        delete postURLs[key];

        emit AllURLsRemoved(msg.sender, _name);
    }

    function getURL(string calldata _name, uint256 _index) external view returns (string memory) {
        bytes32 key = keccak256(bytes(_name));
        uint256 urlCount = postURLs[key].length;
        require(_index < urlCount, "Invalid index");

        string memory url = postURLs[key][_index];

        return url;
    }

    function getAllURLs(string calldata _name) external view returns (string[] memory) {
        bytes32 key = keccak256(bytes(_name));
        string[] memory urls = postURLs[key];

        return urls;
    }

    function getURLCount(string calldata _name) external view returns (uint256) {
        bytes32 key = keccak256(bytes(_name));

        return postURLs[key].length;
    }

    function getPrice() public view returns (uint256) {
        return price;
    }
}
