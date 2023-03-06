// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./IDC.sol";

interface IDCManagement {
    function onRegister(string calldata name, address to, IDC.NameRecord memory nameRecord) external;
}
