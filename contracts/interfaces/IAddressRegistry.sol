// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IAddressRegistry {
    function dc() external view returns (address);

    function dcManagement() external view returns (address);

    function post() external view returns (address);
}
