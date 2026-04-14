// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {BlokzGame} from "../src/BlokzGame.sol";
import {console} from "forge-std/console.sol";

contract DeployBlokz is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy BlokzGame directly (non-upgradeable)
        BlokzGame game = new BlokzGame(deployerAddress);
        console.log("BlokzGame deployed at:", address(game));

        vm.stopBroadcast();
    }
}
