require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
    },
    meter_testnet: {
      url: "https://rpctest.meter.io",
      accounts: [`f8ede5f13b521b2b97939b657c1b1afc4ee3c1185d644b4451b995e5eb3763d0`]
    }
  },
};