// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import ".interfaces/IDC.sol";

contract Emoji is OwnableUpgradeable, PausableUpgradeable {
    // Enum for the emoji reactions
    enum EmojiType {
        ONE_ABOVE,
        FIRST_PRIZE,
        ONE_HUNDRED_PERCENT
    }

    /// @dev DC contract
    address public dc;

    /// @dev Revenue account
    address public revenueAccount;

    /// @dev Emoji Type -> Price
    mapping(EmojiType => uint256) public emojiReactionPrices;

    mapping(string => mapping(EmojiType => uint256)) public emojiReactionCounters;

    mapping(EmojiType => uint256) public totalEmojiReactionCounter;

    mapping(string => uint256) public lastEmojiReactionTimestamp;

    event RevenueAccountChanged(address indexed from, address indexed to);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _dc, address _revenueAccount) external initializer {
        __Pausable_init();
        __Ownable_init();

        require(_dc != address(0), "VanityURL: zero address");

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

    function addEmojiReaction(string memory _name, EmojiType _emojiType) external payable whenNotPaused {
        require(msg.value == emojiReactionPrices[_emojiType], "Invalid payment");

        // Check if the emoji reaction counter should be initialized
        if (lastEmojiReactionTimestamp[_name] < IDC(dc).registerAt(_name)) {
            _resetEmojiReactionCounters(_name);
        }

        ++emojiReactionCounters[_name][_emojiType];
        ++totalEmojiReactionCounter[_emojiType];
    }

    function _resetEmojiReactionCounters(string memory _name) _internal {
        delete emojiReactionCounters[_name][EmojiType.ONE_ABOVE];
        delete emojiReactionCounters[_name][EmojiType.FIRST_PRIZE];
        delete emojiReactionCounters[_name][EmojiType.ONE_HUNDRED_PERCENT];
    }

    function withdraw() external {
        require(msg.sender == owner() || msg.sender == revenueAccount, "D1DC: must be owner or revenue account");
        (bool success, ) = revenueAccount.call{value: address(this).balance}("");
        require(success, "D1DC: failed to withdraw");
    }
}
