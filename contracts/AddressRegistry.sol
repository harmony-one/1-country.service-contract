// SPDX-License-Identifier: CC-BY-NC-4.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AddressRegistry is Initializable, OwnableUpgradeable {
    address public dc;
    address public post;

    event DCAddressUpdated(address indexed oldDCAddress, address indexed newDCAddress);
    event PostAddressUpdated(address indexed oldPostAddress, address indexed newPostAddress);

    function initialize() external initializer {
        __Ownable_init();
    }

    function setDC(address _dc) external onlyOwner {
        require(_dc != address(0), "Zero address");

        emit DCAddressUpdated(dc, _dc);
        dc = _dc;
    }

    function setPost(address _post) external onlyOwner {
        require(_post != address(0), "Zero address");

        emit PostAddressUpdated(dc, _post);
        post = _post;
    }
}
