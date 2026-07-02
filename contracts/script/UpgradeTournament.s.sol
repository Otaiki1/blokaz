// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BlokzTournament} from "../src/BlokzTournament.sol";

/**
 * @title UpgradeTournament
 * @notice Upgrades the BlokzTournament proxy to a new implementation.
 *         This version adds getTournamentRewardsBps() view function —
 *         no storage layout changes, no initializer needed.
 *
 * Usage:
 *   forge script contracts/script/UpgradeTournament.s.sol \
 *     --rpc-url $RPC_URL --broadcast --verify
 *
 * Required env vars:
 *   PRIVATE_KEY      — deployer/admin private key
 *   TOURNAMENT_PROXY — proxy address (default: mainnet proxy)
 */
contract UpgradeTournament is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address proxy = vm.envOr(
            "TOURNAMENT_PROXY",
            address(0xaf3Cb90f8002b4f08Ba7F7C4fb5D9BDe698236A7)
        );

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new implementation
        BlokzTournament newImpl = new BlokzTournament();
        console.log("New implementation deployed at:", address(newImpl));

        // 2. Upgrade proxy (no calldata — no re-initialisation needed)
        BlokzTournament(proxy).upgradeToAndCall(address(newImpl), "");

        console.log("Proxy upgraded:", proxy);

        vm.stopBroadcast();
    }
}
