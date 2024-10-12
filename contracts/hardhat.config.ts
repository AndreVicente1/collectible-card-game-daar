import 'dotenv/config'
import 'hardhat-deploy'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'hardhat-abi-exporter'

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  solidity: '0.8.20',
  paths: {
    deploy: './deploy',
    sources: './src',
  },
  namedAccounts: {
    deployer: { default: 0 },
    admin: { default: 0 },
    second: { default: 1 },
    random: { default: 8 },
    owner: {default: 1},
  },
  abiExporter: {
    runOnCompile: true,
    path: '../frontend/src/abis',
    clear: true,
    flat: true,
    only: [],
    pretty: true,
  },
  typechain: {
    outDir: '../typechain',
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Configure custom accounts using private keys from environment variables
      accounts: [
        {
          privateKey: process.env.DEPLOYER_PRIVATE_KEY || '0xe06Dc40BFfDe7bF770C77Ee63e9E34848b47718c',
          balance: '1000000000000000000000',
        },
        {
          privateKey: process.env.DEPLOYER_PRIVATE_KEY || '0xe06Dc40BFfDe7bF770C77Ee63e9E34848b47718c',
          balance: '1000000000000000000000',
        },
        // Add more accounts if needed
      ],
    },
    // Add other networks (e.g., Ropsten, Mainnet) as needed
  },
}

export default config
