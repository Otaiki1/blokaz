// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BlokzGame} from "../src/BlokzGame.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract BlokzGameTest is Test {
    BlokzGame public game;
    MockERC20 public cusd;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public david = makeAddr("david");

    function setUp() public {
        // Prepare Mock cUSD at the expected address
        address cusdAddr = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
        vm.etch(cusdAddr, address(new MockERC20()).code);
        cusd = MockERC20(cusdAddr);

        // Deploy implementation and proxy
        BlokzGame impl = new BlokzGame();
        bytes memory initData = abi.encodeCall(BlokzGame.initialize, (owner));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        game = BlokzGame(address(proxy));

        // Fund players
        cusd.mint(alice, 1000 ether);
        cusd.mint(bob, 1000 ether);
        cusd.mint(carol, 1000 ether);
        cusd.mint(david, 1000 ether);
    }

        // ────────────────────────────────────────────────────────── CORE REVERTS ──

    function test_startGame_reverts_if_already_active() public {
        vm.prank(alice);
        game.startGame(keccak256("seed1"));
        
        vm.expectRevert(BlokzGame.AlreadyHasActiveGame.selector);
        vm.prank(alice);
        game.startGame(keccak256("seed2"));
    }

    function test_submitScore_reverts_if_wrong_owner() public {
        vm.prank(alice);
        uint256 gid = game.startGame(keccak256(abi.encodePacked(bytes32("seed"), alice)));
        
        vm.expectRevert(BlokzGame.NotGameOwner.selector);
        vm.prank(bob);
        game.submitScore(gid, bytes32("seed"), new uint256[](1), 100, 0);
    }

    function test_submitScore_reverts_if_wrong_seed() public {
        vm.prank(alice);
        uint256 gid = game.startGame(keccak256(abi.encodePacked(bytes32("real_seed"), alice)));
        
        vm.expectRevert(BlokzGame.InvalidSeed.selector);
        vm.prank(alice);
        game.submitScore(gid, bytes32("fake_seed"), new uint256[](1), 100, 0);
    }

    // ──────────────────────────────────────────────────────────  LEADERBOARD ──

    function test_game_creation_and_submission() public {
        bytes32 seed = bytes32("secret");
        bytes32 seedHash = keccak256(abi.encodePacked(seed, alice));

        vm.prank(alice);
        uint256 gid = game.startGame(seedHash);
        assertEq(gid, 1);

        uint256[] memory packed = new uint256[](1);
        vm.prank(alice);
        game.submitScore(gid, seed, packed, 123, 0);

        (,, uint32 score,,, BlokzGame.GameStatus status) = game.games(gid);
        assertEq(score, 123);
        assertEq(uint8(status), uint8(BlokzGame.GameStatus.SUBMITTED));
    }

    // ──────────────────────────────────────────────────────── LEADERBOARD ──

    function test_leaderboard_logic() public {
        _submit(alice, 100);
        _submit(bob, 200);
        _submit(alice, 300); // Should update Alice's 100 to 300

        BlokzGame.LeaderboardEntry[] memory lb = game.getLeaderboard(game.getCurrentEpoch());
        assertEq(lb.length, 2);
        assertEq(lb[0].player, alice);
        assertEq(lb[0].score, 300);
        assertEq(lb[1].player, bob);
        assertEq(lb[1].score, 200);
    }

    function test_leaderboard_fill_and_displacement() public {
        // 1. Fill leaderboard to 50 players (scores: 10, 20, ..., 500)
        for (uint160 i = 1; i <= 50; i++) {
            _submit(address(i + 1000), uint32(i * 10)); 
        }

        BlokzGame.LeaderboardEntry[] memory lb = game.getLeaderboard(game.getCurrentEpoch());
        assertEq(lb.length, 50);
        assertEq(lb[49].score, 10, "last score should be 10");

        // 2. New player submits 5 (too low) -> ignored
        _submit(david, 5);
        lb = game.getLeaderboard(game.getCurrentEpoch());
        assertEq(lb.length, 50);
        assertEq(lb[49].score, 10, "last score should still be 10");

        // 3. New player submits 15 (displaces 10) -> enters at the end
        _submit(david, 15);
        lb = game.getLeaderboard(game.getCurrentEpoch());
        assertEq(lb.length, 50);
        assertEq(lb[49].player, david);
        assertEq(lb[49].score, 15);
    }

    // ──────────────────────────────────────────────────────── TOURNAMENTS ──

    function test_tournament_math() public {
        uint256 fee = 100 ether;
        uint64 start = uint64(block.timestamp + 10);
        uint64 end = uint64(block.timestamp + 20);

        vm.prank(owner);
        uint256 tid = game.createTournament(fee, start, end, 4);

        // Join
        _join(alice, tid, fee);
        _join(bob, tid, fee);
        _join(carol, tid, fee);
        _join(david, tid, fee);

        // Submit
        vm.warp(start + 1);
        _submitTournament(alice, tid, 1000); // 1st
        _submitTournament(bob, tid, 800);   // 2nd
        _submitTournament(carol, tid, 600); // 3rd
        _submitTournament(david, tid, 400); // 4th

        // Finalize
        vm.warp(end + 1);
        game.finalizeTournament(tid);

        // Expected Math:
        // Pool = 400. Protocol(5%) = 20. Weekly(5%) = 20. 
        // 1st: 50% of 400 = 200 (Alice). 
        // 2nd: 25% of 400 = 100 (Bob).
        // 3rd: 15% of 400 = 60 (Carol). 
        // Alice Final: 1000 - 100 + 200 = 1100.
        assertEq(cusd.balanceOf(alice), 1100 ether);
        assertEq(cusd.balanceOf(bob), 1000 ether);
        assertEq(cusd.balanceOf(carol), 960 ether);
        assertEq(game.protocolRevenue(), 20 ether);
        assertEq(game.weeklyRewardPool(), 20 ether);
    }

    function test_tournament_payout_1_player() public {
        uint256 fee = 100 ether;
        uint64 start = uint64(block.timestamp + 10);
        uint64 end = uint64(block.timestamp + 20);

        vm.prank(owner);
        uint256 tid = game.createTournament(fee, start, end, 10);

        _join(alice, tid, fee);
        vm.warp(start + 1);
        _submitTournament(alice, tid, 500);

        vm.warp(end + 1);
        game.finalizeTournament(tid);

        // Expect 90% back (total pool 100, protocol 5, weekly 5, player gets 90)
        assertEq(cusd.balanceOf(alice), 1000 ether - 100 ether + 90 ether);
        assertEq(game.protocolRevenue(), 5 ether);
    }

    function test_tournament_payout_2_players() public {
        uint256 fee = 100 ether;
        uint64 start = uint64(block.timestamp + 10);
        uint64 end = uint64(block.timestamp + 20);

        vm.prank(owner);
        uint256 tid = game.createTournament(fee, start, end, 10);

        _join(alice, tid, fee);
        _join(bob, tid, fee);
        
        vm.warp(start + 1);
        _submitTournament(alice, tid, 1000); // 1st (60%)
        _submitTournament(bob, tid, 500);    // 2nd (30%)

        vm.warp(end + 1);
        game.finalizeTournament(tid);

        // Pool 200. Alice wins 120, Bob wins 60. Fees 10+10.
        assertEq(cusd.balanceOf(alice), 1000 ether - 100 ether + 120 ether);
        assertEq(cusd.balanceOf(bob), 1000 ether - 100 ether + 60 ether);
    }

    function test_join_reverts_after_end() public {
        uint64 end = uint64(block.timestamp + 20);
        vm.prank(owner);
        uint256 tid = game.createTournament(0, uint64(block.timestamp + 10), end, 10);
        
        vm.warp(end + 1);
        vm.prank(alice);
        vm.expectRevert(BlokzGame.TournamentAlreadyEnded.selector);
        game.joinTournament(tid);
    }

    function test_submitTournament_reverts_timing() public {
        uint64 start = uint64(block.timestamp + 10);
        uint64 end = uint64(block.timestamp + 20);
        vm.prank(owner);
        uint256 tid = game.createTournament(0, start, end, 10);
        _join(alice, tid, 0);

        // Need a valid game ID
        vm.prank(alice);
        uint256 gid = game.startGame(keccak256(abi.encodePacked(bytes32("seed"), alice)));

        // 1. Too early
        vm.prank(alice);
        vm.expectRevert(BlokzGame.TournamentNotStarted.selector);
        game.submitTournamentScore(tid, gid, bytes32("seed"), new uint256[](1), 100, 0);

        // 2. Too late
        vm.warp(end + 1);
        vm.prank(alice);
        vm.expectRevert(BlokzGame.TournamentAlreadyEnded.selector);
        game.submitTournamentScore(tid, gid, bytes32("seed"), new uint256[](1), 100, 0);
    }

    function test_finalize_reverts_too_early() public {
        uint64 end = uint64(block.timestamp + 20);
        vm.prank(owner);
        uint256 tid = game.createTournament(0, uint64(block.timestamp + 10), end, 10);
        
        vm.expectRevert(BlokzGame.TournamentNotOver.selector);
        game.finalizeTournament(tid);
    }

    function test_finalize_reverts_double_call() public {
        uint64 end = uint64(block.timestamp + 20);
        vm.prank(owner);
        uint256 tid = game.createTournament(0, uint64(block.timestamp + 10), end, 2);
        _join(alice, tid, 0);
        
        vm.warp(end + 1);
        game.finalizeTournament(tid);
        
        vm.expectRevert(BlokzGame.TournamentAlreadyFinalized.selector);
        game.finalizeTournament(tid);
    }

    // ────────────────────────────────────────────────────────── ADMIN ──

    function test_withdraw_revenue_reset() public {
        // Generate some revenue (100 prize pool -> 5 protocol)
        vm.prank(owner);
        uint256 tid = game.createTournament(100 ether, uint64(block.timestamp + 10), uint64(block.timestamp + 20), 2);
        _join(alice, tid, 100 ether);
        vm.warp(block.timestamp + 30);
        game.finalizeTournament(tid);
        
        assertEq(game.protocolRevenue(), 5 ether);
        
        uint256 ownerBefore = cusd.balanceOf(owner);
        vm.prank(owner);
        game.withdrawProtocolRevenue();
        assertEq(cusd.balanceOf(owner), ownerBefore + 5 ether);
        assertEq(game.protocolRevenue(), 0);
    }

    function test_withdraw_reverts_non_owner() public {
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("OwnableUnauthorizedAccount(address)")), alice));
        vm.prank(alice);
        game.withdrawProtocolRevenue();
    }

    // ────────────────────────────────────────────────────────── HELPERS ──

    function _submit(address p, uint32 s) internal {
        bytes32 seed = keccak256(abi.encodePacked(p, s));
        vm.prank(p);
        uint256 gid = game.startGame(keccak256(abi.encodePacked(seed, p)));
        uint256[] memory pk = new uint256[](1);
        vm.prank(p);
        game.submitScore(gid, seed, pk, s, 0);
    }

    function _join(address p, uint256 tid, uint256 fee) internal {
        vm.prank(p);
        cusd.approve(address(game), fee);
        vm.prank(p);
        game.joinTournament(tid);
    }

    function _submitTournament(address p, uint256 tid, uint32 s) internal {
        bytes32 seed = keccak256(abi.encodePacked(p, tid, s));
        vm.prank(p);
        uint256 gid = game.startGame(keccak256(abi.encodePacked(seed, p)));
        uint256[] memory pk = new uint256[](1);
        vm.prank(p);
        game.submitTournamentScore(tid, gid, seed, pk, s, 0);
    }
}
