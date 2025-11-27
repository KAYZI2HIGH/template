const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying PredictionRoom contract to Celo Sepolia...");

  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📝 Deployer account: ${deployer.address}`);

  // Get contract factory
  const PredictionRoom = await hre.ethers.getContractFactory("PredictionRoom");

  // Deploy contract
  console.log("⏳ Deploying contract...");
  const contract = await PredictionRoom.deploy();

  // Wait for deployment
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`✅ PredictionRoom deployed to: ${contractAddress}`);

  // Save contract address to .env.local
  const envPath = path.join(__dirname, "../web/.env.local");
  let envContent = "";

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  // Update or add NEXT_PUBLIC_CONTRACT_ADDRESS
  if (envContent.includes("NEXT_PUBLIC_CONTRACT_ADDRESS")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Contract address saved to .env.local");

  // Load and save ABI to file for frontend
  const abiPath = path.join(__dirname, "../web/src/abi/PredictionRoom.json");
  const abiDir = path.dirname(abiPath);

  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const artifact = require("../artifacts/contracts/PredictionRoom.sol/PredictionRoom.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("✅ Contract ABI saved to src/abi/PredictionRoom.json");

  console.log("\n📋 Contract Information:");
  console.log("=======================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer: ${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
