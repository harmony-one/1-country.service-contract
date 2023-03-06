// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IDC {
    struct InitConfiguration {
        uint256 baseRentalPrice;
        uint256 duration;
        uint256 gracePeriod;
        // 32-bytes block
        address revenueAccount;
        uint64 wrapperExpiry;
        uint32 fuses;
        // 81-bytes
        address registrarController;
        address baseRegistrar;
        address tldNameWrapper;
        address resolver;
        bool reverseRecord;
    }

    struct NameRecord {
        address renter;
        uint256 rentTime;
        uint256 expirationTime;
        uint256 lastPrice;
        string prev;
        string next;
    }

    function nameRecords(
        bytes32 key
    )
        external
        view
        returns (
            address renter,
            uint256 rentTime,
            uint256 expirationTime,
            uint256 lastPrice,
            string memory prev,
            string memory next
        );
}
