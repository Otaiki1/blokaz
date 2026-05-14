// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BlokzGame} from "../src/BlokzGame.sol";
import {BlokzTournament} from "../src/BlokzTournament.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployBlokz
 * @notice Deploys BlokzGame and BlokzTournament (as UUPS Proxy) to Celo Alfajores.
 */
contract DeployBlokz is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        // Addresses
        address usdt = vm.envOr("USDT_ADDRESS", address(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e));
        address game = vm.envOr("GAME_ADDRESS", address(0x16C3A18FDcb6905f58311C5b8a6e91e447Fefe43));
        
        // Trusted Signer 
        address trustedSigner = vm.envOr("TRUSTED_SIGNER", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy BlokzTournament Implementation
        BlokzTournament implementation = new BlokzTournament();
        console.log("Tournament Implementation deployed at:", address(implementation));

        // 2. Deploy ERC1967 Proxy
        bytes memory initData = abi.encodeWithSelector(
            BlokzTournament.initialize.selector,
            game,
            usdt,
            deployerAddress, // Admin
            trustedSigner   // Signer
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        address tournamentProxy = address(proxy);
        
        console.log("BlokzTournament PROXY deployed at:", tournamentProxy);
        console.log("-----------------------------------------");
        console.log("Payment Token (USDT):", usdt);
        console.log("Admin Address:", deployerAddress);
        console.log("Trusted Signer:", trustedSigner);

        vm.stopBroadcast();
    }
}
