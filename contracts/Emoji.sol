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

    /// @dev DC TokenId -> Owner -> EmojiType -> Emoji reaction counter
    mapping(bytes32 => mapping(address => mapping(EmojiType => uint256))) public emojiReactionCounters;

    /// @dev Emoji Type -> Price
    mapping(EmojiType => uint256) public emojiReactionPrices;

    /// @dev Revenue account
    address public revenueAccount;

    event EmojiReactionAdded(address indexed by, string indexed name, address indexed owner, EmojiType emojiType);
    event RevenueAccountChanged(address indexed from, address indexed to);

    modifier onlyDCOwner(string memory _name) {
        address dcOwner = IDC(dc).ownerOf(_name);
        require(msg.sender == dcOwner, "Emoji: only DC owner");
        _;
    }

    modifier whenDomainNotExpired(string memory _name) {
        uint256 domainExpireAt = IDC(dc).nameExpires(_name);
        require(block.timestamp < domainExpireAt, "Emoji: expired domain");
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

    /// @notice Set the DC contract address
    /// @param _dc DC contract address
    function setDCAddress(address _dc) external onlyOwner {
        dc = _dc;
    }

    /// @notice Set the price of each emoji reaction
    /// @param _emojiType emoji type
    /// @param _price price for the emoji reaction addition
    function setEmojiReactionPrice(EmojiType _emojiType, uint256 _price) external onlyOwner {
        emojiReactionPrices[_emojiType] = _price;
    }

    /// @notice Set the revenue account
    /// @param _revenueAccount revenue account address
    function setRevenueAccount(address _revenueAccount) public onlyOwner {
        emit RevenueAccountChanged(revenueAccount, _revenueAccount);

        revenueAccount = _revenueAccount;
    }

    /// @notice Add the emoji reaction
    /// @param _name domain name to add the emoji reaction
    /// @param _emojiType emoji type to add
    function addEmojiReaction(
        string memory _name,
        EmojiType _emojiType
    ) external payable whenNotPaused whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        address dcOwner = IDC(dc).ownerOf(_name);

        require(msg.value == emojiReactionPrices[_emojiType], "Emoji: incorrect payment");

        EmojiInfo memory emojiInfo = EmojiInfo({emojiType: _emojiType, owner: dcOwner});
        emojiReactions[tokenId].push(emojiInfo);
        ++emojiReactionCounters[tokenId][dcOwner][_emojiType];
    }

    /// @notice Transfer the emoji reactions to another address
    /// @param _name domain name to trasnfer the emoji reactions
    /// @param _receiver address to receive the emoji reactions
    function transferEmojiReactions(
        string memory _name,
        address _receiver
    ) external whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        address sender = msg.sender;

        // transfer the emoji reactions
        uint256 emojiTypeCount = uint256(type(EmojiType).max);
        uint256[] memory countersToTrasnfer = new uint256[](emojiTypeCount);
        for (uint256 i = 0; i < emojiReactions[tokenId].length; ) {
            EmojiInfo storage emojiInfo = emojiReactions[tokenId][i];

            if (emojiInfo.owner == sender) {
                emojiInfo.owner = _receiver;
                ++countersToTrasnfer[uint256(emojiInfo.emojiType)];
            }

            unchecked {
                ++i;
            }
        }

        // update the emoji reaction counters
        for (uint256 i = 0; i < emojiTypeCount; ) {
            uint256 currentEmojiType = i;
            emojiReactionCounters[tokenId][sender][EmojiType(currentEmojiType)] -= countersToTrasnfer[currentEmojiType];
            emojiReactionCounters[tokenId][_receiver][EmojiType(currentEmojiType)] += countersToTrasnfer[
                currentEmojiType
            ];

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Returns all the emoji reactions added to the specific domain
    /// @param _name domain name to check
    function getEmojiReactions(string memory _name) external view returns (EmojiInfo[] memory) {
        bytes32 tokenId = keccak256(bytes(_name));

        return emojiReactions[tokenId];
    }

    /// @notice Withdraw funds
    /// @dev Only owner of the revenue account can withdraw funds
    function withdraw() external {
        require(msg.sender == owner() || msg.sender == revenueAccount, "Emoji: must be owner or revenue account");
        (bool success, ) = revenueAccount.call{value: address(this).balance}("");
        require(success, "Emoji: failed to withdraw");
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
