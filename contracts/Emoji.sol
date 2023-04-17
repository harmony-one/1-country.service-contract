// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/IDC.sol";

contract Emoji is OwnableUpgradeable, PausableUpgradeable {
    // Enum for the emoji reactions
    enum EmojiType {
        ONE_ABOVE,
        FIRST_PRIZE,
        ONE_HUNDRED_PERCENT
    }

    struct EmojiInfo {
        EmojiType emojiType;
        address owner;
    }

    /// @dev DC contract
    address public dc;

    /// @dev DC TokenId -> EmojiInfo list
    mapping(bytes32 => EmojiInfo[]) public emojiReactions;

    /// @dev Emoji Type -> Price
    mapping(EmojiType => uint256) public emojiReactionPrices;

    /// @dev Revenue account
    address public revenueAccount;

    event EmojiReactionAdded(address indexed by, string indexed name, address indexed owner, EmojiType emojiType);
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

    function initialize(address _dc, address _revenueAccount) external initializer {
        __Pausable_init();
        __Ownable_init();

        require(_dc != address(0), "Emoji: zero address");

        dc = _dc;
        revenueAccount = _revenueAccount;
    }

    function setRevenueAccount(address _revenueAccount) public onlyOwner {
        emit RevenueAccountChanged(revenueAccount, _revenueAccount);

        revenueAccount = _revenueAccount;
    }

    function setEmojiReactionPrice(EmojiType _emojiType, uint256 _price) external onlyOwner {
        emojiReactionPrices[_emojiType] = _price;
    }

    function addEmojiReaction(string memory _name, EmojiType _emojiType) external payable whenNotPaused whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        address dcOwner = IDC(dc).ownerOf(_name);

        require(msg.value == emojiReactionPrices[_emojiType], "Emoji: invalid payment");

        EmojiInfo memory emojiInfo = EmojiInfo({emojiType: _emojiType, owner: dcOwner});
        emojiReactions[tokenId].push(emojiInfo);
    }

    function transferEmojiReactions(string memory _name, address _receiver) external whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        address sender = msg.sender;

        for (uint256 i = 0; i < emojiReactions[tokenId].length;) {
            EmojiInfo storage emojiInfo = emojiReactions[tokenId][i];

            if (emojiInfo.owner == sender) {
                emojiInfo.owner = _receiver;
            }

            unchecked {
                ++i;
            }
        }
    }

    function withdraw() external {
        require(msg.sender == owner() || msg.sender == revenueAccount, "Emoji: must be owner or revenue account");
        (bool success, ) = revenueAccount.call{value: address(this).balance}("");
        require(success, "Emoji: failed to withdraw");
    }
}
