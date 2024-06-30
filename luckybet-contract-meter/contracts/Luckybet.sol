// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "./_base64.sol";
import "./_counters.sol";
import "./_ownable.sol";
import "./_error.sol";

/// @title Luckybet
/// @author Aratta Labs
/// @notice Luckybet contract
/// @dev Run test before deploying, you can find deployed contract addresses in the README.md file
/// @custom:security-contact atenyun@gmail.com
contract Luckybet is Ownable(msg.sender) {
    using Counters for Counters.Counter;
    Counters.Counter public _tokenIdCounter;

    uint256 public count = 0;
    uint256 public royalties;

    // Events
    event poolCreated(address indexed sender, bytes32 id, string metadata, uint256 startTime, uint256 endTime, uint256 price, bool compeleted);
    event Log(string func, uint256 gas);
    event TransferredTo(bytes content, address to, uint256 amount);

    struct Pool {
        bytes32 id;
        string metadata;
        uint256 startTime;
        uint256 endTime;
        uint256 minPrice;
        address[3] winners;
        bool compeleted;
    }

    Pool[] public pool;

    struct Player {
        bytes32 poolId;
        address sender;
    }

    Player[] public player;

    /// @dev Storage
    mapping(bytes32 => mapping(bytes32 => string)) public blockStorage;

    constructor() {
        /// @dev Assert that count will start from 0
        assert(count == 0);

        /// @dev Set initial values
        royalties = 10;

        /// Create the first pool
        addPool("Gold Rush", block.timestamp + 1, block.timestamp + 900 days, 1);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    function addPool(
        string memory metadata,
        uint256 startTime,
        uint256 endTime,
        uint256 minPrice
    ) public onlyOwner {
        /// @notice Continue if start time is gretter that current time
        require(startTime > block.timestamp, "Start time must be greater than current time");

        /// @notice Continue if end time is gretter than start time
        require(endTime > startTime, "End time must be greater than start time");

        /// @notice Increase the counter
        ++count;

        pool.push(Pool(bytes32(count), metadata, startTime, endTime, minPrice * 1 ether, [address(0), address(0), address(0)], false));

        /// @notice Emit that the pool created
        emit poolCreated(msg.sender, bytes32(count), metadata, startTime, endTime, minPrice, false);
    }

    /// @notice Update only pool's metadata
    function updatePool(bytes32 poolId, string memory metadata) public onlyOwner returns (bool) {
        //uint256 poolIndex = _getPoolIndex(poolId);

        for (uint256 i = 0; i < poolId.length; i++) {
            if (pool[i].id == poolId) {
                pool[i].metadata = metadata;
                return true;
            }
        }
        return false;
    }

    /// @dev Retrieve the index of the pool
    /// @param poolId The bytes32 ID
    /// @return uint256
    function _getPoolIndex(bytes32 poolId) internal view returns (uint256) {
        for (uint256 i = 0; i < pool.length; i++) if (pool[i].id == poolId) return i;
        revert("Pool Id Not Found");
    }

    function play(bytes32 poolId, uint256 ticket_count) public payable {
        uint256 poolIndex = _getPoolIndex(poolId);

        // Check if the pool is completed already
        if (pool[poolIndex].compeleted) revert PoolNotActive("This pool is no longer active", poolId, pool[poolIndex].endTime, block.timestamp);
        if (pool[poolIndex].startTime > block.timestamp) revert TooEarly(block.timestamp);
        if (pool[poolIndex].endTime < block.timestamp) revert TooLate(block.timestamp);

        if (msg.value < (pool[poolIndex].minPrice * ticket_count)) revert PriceNotMet((pool[poolIndex].minPrice * ticket_count), msg.value);

        for (uint256 i; i < ticket_count; i++) {
            player.push(Player(poolId, msg.sender));
        }
    }

    /// @notice Generates random winner
    function winner(bytes32 poolId, uint256 nonce) public payable returns (address[3] memory) {
        // Get pool index by pool id
        uint256 poolIndex = _getPoolIndex(poolId);

        require(nonce > 0, "Nonce must be greater than zero!");

        // Check if the pool is completed already
        if (pool[poolIndex].compeleted) revert PoolNotActive("This pool is no longer active", poolId, pool[poolIndex].endTime, block.timestamp);
        if (pool[poolIndex].startTime > block.timestamp) revert TooEarly(block.timestamp);
        if (pool[poolIndex].endTime > block.timestamp) revert TooEarly(block.timestamp);

        // Retrive players
        Player[] memory players = new Player[](player.length);

        // Retrieve the players and push in a local array players[]
        uint256 playerCounter = 0;
        for (uint256 i = 0; i < player.length; i++) {
            if (player[i].poolId == poolId) {
                players[playerCounter] = player[i];
                playerCounter++;
            }
        }

        uint256 winnerCounter = 0;
        while (winnerCounter <= 2) {
            uint256 randomNumber = rng(playerCounter, nonce * winnerCounter + 10);
            address rndAddress = address(players[randomNumber].sender);

            pool[poolIndex].winners[winnerCounter] = rndAddress;
            winnerCounter++;
        }

        distributePrize(poolId);

        // Set pool is completed, in the next call it will be reverted
        pool[poolIndex].compeleted = true;

        return pool[poolIndex].winners;
    }

    function distributePrize(bytes32 poolId) internal {
        // Get pool index by pool id
        uint256 poolIndex = _getPoolIndex(poolId);

        // Send the royalties to the owner
        uint256 royaltyCalc = (((address(this).balance) * royalties) / 100);
        (bool ownerSent, bytes memory ownerData) = owner().call{value: royaltyCalc}("");
        require(ownerSent, "Failed to send Ether");

        emit TransferredTo(ownerData, owner(), royaltyCalc);

        uint256 winnerPrizeCalc = address(this).balance / 3;

        for (uint256 i = 0; i < pool[poolIndex].winners.length; i++) {
            (bool sent, bytes memory data) = pool[poolIndex].winners[i].call{value: winnerPrizeCalc}("");
            require(sent, "Failed to send Ether");
            emit TransferredTo(data, pool[poolIndex].winners[i], winnerPrizeCalc);
        }
    }

    function rng(uint256 len, uint256 nonce) public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % len;
    }

    function getTotalPool() public view returns (uint256) {
        return pool.length;
    }

    function getTotalPlayer() public view returns (uint256) {
        return player.length;
    }

    function getPoolWinners(bytes32 poolId) public view returns (address[3] memory) {
        uint256 poolIndex = _getPoolIndex(poolId);
        return pool[poolIndex].winners;
    }

    function transferFund(address payable _to) internal {
        bool sent = _to.send(address(this).balance);
        require(sent, "Failed to send Ether");
    }

    function getPlayerList() public view returns (Player[] memory, uint256 total) {
        return (player, player.length);
    }

    // Function to withdraw all Ether from this contract.
    function withdraw() public onlyOwner {
        // get the amount of Ether stored in this contract
        uint256 amount = address(this).balance;

        // send all Ether to owner
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Failed");
    }

    // // Function to transfer Ether from this contract to address from input
    function transferBalance(address payable _to, uint256 _amount) public onlyOwner {
        // Note that "to" is declared as payable
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Failed");
    }

    /// @notice Get contract's balance
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getNow() public view returns (uint256) {
        return block.timestamp;
    }
}
