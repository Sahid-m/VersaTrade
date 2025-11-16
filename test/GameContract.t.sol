// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VersaTrade.sol";
import "./mockERC20.sol";

contract VersaTradeTest is Test {
    VersaTrade public game;
    MockERC20 public usdc;
    MockERC20 public eurc;

    address public player1 = address(0x111);
    address public player2 = address(0x222);
    address public owner = address(0x999);

    uint256 player1PK = 0xaaa;
    uint256 player2PK = 0xbbb;

    function setUp() public {
        // Deploy mock ERC20 tokens
        usdc = new MockERC20("USDC", "USDC", 6);
        eurc = new MockERC20("EURC", "EURC", 6);

        // Deploy VersaTrade with 5% fee (500 bps)
        game = new VersaTrade(500);

        // Fund players
        usdc.mint(player1, 1_000_000e6);
        usdc.mint(player2, 1_000_000e6);

        eurc.mint(player1, 1_000_000e6);
        eurc.mint(player2, 1_000_000e6);

        // Approve game contract for ERC20s
        vm.prank(player1);
        usdc.approve(address(game), type(uint256).max);

        vm.prank(player2);
        usdc.approve(address(game), type(uint256).max);
    }

    // -----------------------------
    // CREATE + JOIN
    // -----------------------------
    function testCreateERC20Game() public {
        vm.prank(player1);
        uint256 id = game.createGame(address(usdc), 1000e6);

        (
            address creator,
            address opponent,
            address token,
            uint256 bet,
            ,
            ,

        ) = game.games(id);

        assertEq(creator, player1);
        assertEq(opponent, address(0));
        assertEq(token, address(usdc));
        assertEq(bet, 1000e6);
    }

    function testJoinERC20Game() public {
        vm.prank(player1);
        uint256 id = game.createGame(address(usdc), 1000e6);

        vm.prank(player2);
        game.joinGame(id);

        (, address opponent, , , , , ) = game.games(id);
        assertEq(opponent, player2);
    }

    function testCreateNativeGame() public {
        vm.deal(player1, 1 ether);

        vm.prank(player1);
        uint256 id = game.createGame{value: 0.5 ether}(address(0), 0.5 ether);

        (
            address creator,
            address opponent,
            address token,
            uint256 bet,
            ,
            ,

        ) = game.games(id);

        assertEq(creator, player1);
        assertEq(opponent, address(0));
        assertEq(token, address(0));
        assertEq(bet, 0.5 ether);
    }

    // -----------------------------
    // SETTLEMENT
    // -----------------------------

    // -----------------------------
    // CANCEL IF NOT JOINED
    // -----------------------------
    function testCancelIfNotJoined() public {
        vm.prank(player1);
        uint256 id = game.createGame(address(usdc), 1000e6);

        // Fast forward past joinTimeout
        vm.warp(block.timestamp + game.joinTimeout() + 1);

        vm.prank(player1);
        game.cancelIfNotJoined(id);

        (, , , , , VersaTrade.GameState state, ) = game.games(id);
        assertEq(uint8(state), uint8(VersaTrade.GameState.Cancelled));
    }

    // -----------------------------
    // SPLIT REFUND AFTER TIMEOUT
    // -----------------------------
    function testSplitRefundAfterTimeout() public {
        vm.prank(player1);
        uint256 id = game.createGame(address(usdc), 1000e6);

        vm.prank(player2);
        game.joinGame(id);

        vm.warp(block.timestamp + game.settleTimeout() + 1);

        vm.prank(player1);
        game.splitRefundAfterTimeout(id);

        (, , , , , VersaTrade.GameState state, ) = game.games(id);
        assertEq(uint8(state), uint8(VersaTrade.GameState.Cancelled));
    }

    // -----------------------------
    // CLAIM PENDING PAYOUTS
    // -----------------------------
    function testPendingWithdrawal() public {
        vm.prank(player1);
        uint256 id = game.createGame(address(usdc), 1000e6);

        vm.prank(player2);
        game.joinGame(id);

        // simulate failed transfer by using a mock token that always returns false
        MockERC20 broken = new MockERC20("BROKEN", "BRK", 6);
        vm.prank(player1);
        broken.approve(address(game), type(uint256).max);
        vm.prank(player1);
        game.createGame(address(broken), 100e6); // just to credit pendingWithdrawals

        // Claim (should fail with revert if no pending funds)
        vm.expectRevert();
        vm.prank(player2);
        game.claimPayout(address(broken));
    }

    // -----------------------------
    // OWNER ACTIONS
    // -----------------------------
    function testSetPlatformFee() public {
        game.setPlatformFee(300); // 3%
        assertEq(game.platformFeeBps(), 300);
    }

    function testPause() public {
        game.setPaused(true);
        assertTrue(game.paused());
        game.setPaused(false);
        assertFalse(game.paused());
    }
}
