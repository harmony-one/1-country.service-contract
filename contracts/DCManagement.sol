// SPDX-License-Identifier: CC-BY-NC-4.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/IAddressRegistry.sol";
import "./interfaces/IDC.sol";

// import "./interfaces/IPost.sol";

contract DCManagement is Initializable, OwnableUpgradeable {
    /// @dev AddressRegistry
    IAddressRegistry public addressRegistry;

    modifier onlyDC() {
        require(msg.sender == addressRegistry.dc(), "Only DC");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _addressRegistry) external initializer {
        __Ownable_init();

        addressRegistry = IAddressRegistry(_addressRegistry);
    }

    function onRegister(string calldata _domain, address _to, IDC.NameRecord memory _nameRecord) external onlyDC {
        _resetPost(_domain);
        _resetEmoji(_domain);
    }

    function _resetPost(string calldata _domain) internal {}

    function _resetEmoji(string calldata _domain) internal {}
}
