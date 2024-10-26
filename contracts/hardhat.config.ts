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
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
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
      gas: 12000000,
      allowUnlimitedContractSize: true,
      chainId: 31337,
      // Configure custom accounts using private keys from environment variables
      accounts: [
        {
          privateKey: process.env.DEPLOYER_PRIVATE_KEY || '0x2051d560394E95981013E21160D0ee52EbbEF199',
          balance: '1000000000000000000000',
        },
        {
          privateKey: 'eb8f0acc1642feca8e60f64506e7ac7dd69e0a13031a8c185580265c750ae549',
          balance: '1000000000000000000000',
        },
      ],
    },
  },
}

export default config
