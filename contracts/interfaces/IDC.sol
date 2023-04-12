// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IDC {
    function available(string memory) external view returns (bool);

    function duration() external view returns (uint256);

    function nameExpires(string calldata) external view returns (uint256);

    function ownerOf(string calldata name) external view returns (address);
}
