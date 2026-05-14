// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BlokzTournament} from "../src/BlokzTournament.sol";

/**
 * @title UpgradeTournament
 * @notice Upgrades the BlokzTournament proxy to a new implementation and
 *         atomically switches the payment token to USDT.
 *
 * Usage:
 *   forge script contracts/script/UpgradeTournament.s.sol \
 *     --rpc-url $RPC_URL --broadcast --verify
 *
 * Required env vars:
 *   PRIVATE_KEY          — deployer/admin private key
 *   TOURNAMENT_PROXY     — proxy address (default: mainnet proxy)
 *   USDT_ADDRESS         — USDT token address (default: Celo mainnet USDT)
 */
contract UpgradeTournament is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address proxy = vm.envOr(
            "TOURNAMENT_PROXY",
            address(0xaf3Cb90f8002b4f08Ba7F7C4fb5D9BDe698236A7)
        );
        address usdt = vm.envOr(
            "USDT_ADDRESS",
            address(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e)
        );

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new implementation
        BlokzTournament newImpl = new BlokzTournament();
        console.log("New implementation deployed at:", address(newImpl));

        // 2. Upgrade proxy and atomically set USDT as payment token
        bytes memory callData = abi.encodeCall(BlokzTournament.setPaymentToken, (usdt));
        BlokzTournament(proxy).upgradeToAndCall(address(newImpl), callData);

        console.log("Proxy upgraded:", proxy);
        console.log("Payment token switched to USDT:", usdt);

        vm.stopBroadcast();
    }
}
