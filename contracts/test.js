const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Main = await hre.ethers.getContractFactory("Main");
  const main = await Main.deploy();
  await main.deployed();
  console.log("Main contract deployed to:", main.address);

  // Créer une collection
  try {
    const tx = await main.createCollection("First Collection", 100);
    const receipt = await tx.wait();
    console.log("Collection créée avec succès");
    console.log(receipt);
  } catch (error) {
    console.error("Erreur lors de la création de la collection :", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });