const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

const ethers = require("ethers");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = "https://forno.celo-sepolia.celo-testnet.org";
const CHAIN_ID = 11142220;

if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY not set in .env file");
  process.exit(1);
}

async function deploy() {
  try {
    console.log("🚀 Deploying PredictionRoom to Celo Sepolia...");
    console.log(`📡 RPC: ${RPC_URL}`);
    console.log(`⛓️  Chain ID: ${CHAIN_ID}`);

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL, {
      chainId: CHAIN_ID,
      name: "sepolia",
    });

    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`👤 Deployer: ${wallet.address}`);

    // Load contract artifact
    const artifactPath = path.join(
      __dirname,
      "artifacts/contracts/PredictionRoom.sol/PredictionRoom.json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

    // Create contract factory
    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      wallet
    );

    console.log("⏳ Deploying contract...");
    const contract = await factory.deploy();
    console.log(`📝 Deployment tx: ${contract.deploymentTransaction().hash}`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`✅ Contract deployed to: ${address}`);

    // Save to .env.local
    const envPath = path.join(__dirname, "../web/.env.local");
    let envContent = "";

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    if (envContent.includes("NEXT_PUBLIC_CONTRACT_ADDRESS")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${address}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Contract address saved to .env.local");

    // Save ABI
    const abiPath = path.join(__dirname, "../web/src/abi/PredictionRoom.json");
    const abiDir = path.dirname(abiPath);

    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }

    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log("✅ ABI saved to frontend");

    console.log("\n🎉 Deployment complete!");
    console.log(`Contract Address: ${address}`);
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

deploy();
