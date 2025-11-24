import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying PredictionRoom contract to Celo Alfajores...");

  // Get the contract factory using hardhat-ethers plugin
  const PredictionRoom = await hre.ethers.getContractFactory("PredictionRoom");
  const contract = await PredictionRoom.deploy();

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ PredictionRoom deployed to:", contractAddress);

  // Save contract address to .env.local
  const envPath = path.join(__dirname, "../../web/.env.local");
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
  const abiPath = path.join(__dirname, "../../web/src/abi/PredictionRoom.json");
  const abiDir = path.dirname(abiPath);

  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const artifact = await import(
    "../artifacts/contracts/PredictionRoom.sol/PredictionRoom.json"
  );
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("✅ Contract ABI saved to src/abi/PredictionRoom.json");

  const signer = await hre.ethers.provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log("\n📋 Contract Information:");
  console.log("=======================");
  console.log("Network: Celo Alfajores");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", signerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
