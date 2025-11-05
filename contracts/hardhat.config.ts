import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";


const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://localhost:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '0x0f2f8bf416bb202fcd7f288fca0e8b8c0dc73f10309537d9e4c6e60b5cd88183'
      ]
    },
  },
};

export default config;
