// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface ITLDNameWrapper {
    function getData(uint256 tokenId) external view returns (address owner, uint32 fuses, uint64 expiry);
}
