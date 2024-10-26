// deploy/Main.ts
import 'dotenv/config'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployMain: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  // Only deploy on local Hardhat network (chainId 31337)
  if (network.config.chainId !== 31337) return

  console.log(`Deploying Main contract with owner: ${deployer}`)
  
  const mainDeployment = await deploy('Main', {
    from: deployer,
    args: [deployer], // Pass the owner address to the constructor
    log: true,
  })

  console.log(`Main contract deployed at: ${mainDeployment.address}`)
  console.log(`Deploying Marketplace contract with owner: ${deployer}`)
  const marketplaceDeployment = await deploy('Marketplace', {
    from: deployer,
    args: [deployer],
    log: true,
  })
  console.log(`Marketplace contract deployed at: ${marketplaceDeployment.address}`)
  const marketplace = await deployments.get('Marketplace')
}

export default deployMain
deployMain.tags = ['Main']
deployMain.dependencies = ['Marketplace'] 