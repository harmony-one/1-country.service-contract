// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IDC {
    function makeCommitment(string memory name, address owner, bytes32 secret) external view returns (bytes32);

    function commit(bytes32 commitment) external;

    function register(string calldata name, address owner, bytes32 secret) external payable;

    function renew(string calldata name) external payable;

    function available(string memory) external view returns (bool);

    function duration() external view returns (uint256);

    function nameExpires(string calldata) external view returns (uint256);

    function ownerOf(string calldata name) external view returns (address);
}
