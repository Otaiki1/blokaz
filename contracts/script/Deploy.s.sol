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
        
        // Celo Alfajores USDC
        address usdc = 0x01C5C0122039549AD1493B8220cABEdD739BC44E;
        
        // Trusted Signer (Set this in your .env, or defaults to deployer for testing)
        address trustedSigner = vm.envOr("TRUSTED_SIGNER", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy BlokzGame (Legacy/Registry)
        BlokzGame game = new BlokzGame(deployerAddress);
        console.log("BlokzGame deployed at:", address(game));

        // 2. Deploy BlokzTournament Implementation
        BlokzTournament implementation = new BlokzTournament();
        console.log("Tournament Implementation deployed at:", address(implementation));

        // 3. Deploy ERC1967 Proxy
        bytes memory initData = abi.encodeWithSelector(
            BlokzTournament.initialize.selector,
            address(game),
            usdc,
            deployerAddress, // Admin
            trustedSigner   // Signer
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        address tournamentProxy = address(proxy);
        
        console.log("BlokzTournament PROXY deployed at:", tournamentProxy);
        console.log("-----------------------------------------");
        console.log("USDC Address:", usdc);
        console.log("Admin Address:", deployerAddress);
        console.log("Trusted Signer:", trustedSigner);

        vm.stopBroadcast();
    }
}
