# 🚀 SMART CONTRACT DEPLOYMENT GUIDE

## Prerequisites

1. **Get a Testnet Account**:

   - Visit [Alfajores Faucet](https://alfajores-faucet.celo.org/)
   - Or [Sepolia Faucet](https://faucets.chain.link/celo-sepolia) for Celo Sepolia
   - Get the private key from your wallet

2. **Set Environment Variable**:
   ```bash
   # Create .env file in apps/contracts/
   PRIVATE_KEY=0x... # Your private key (without funds)
   CELOSCAN_API_KEY= # Optional, for contract verification
   ```

## Deployment Steps

### Option 1: Deploy to Celo Alfajores (Recommended for Testing)

```bash
cd apps/contracts
npx hardhat run scripts/deploy.ts --network alfajores
```

**Output:**

- Contract address saved to `../web/.env.local`
- ABI saved to `../web/src/abi/PredictionRoom.json`

### Option 2: Deploy to Celo Sepolia

```bash
cd apps/contracts
npx hardhat run scripts/deploy.ts --network sepolia
```

### Option 3: Deploy to Celo Mainnet (⚠️ USE REAL KEY WITH FUNDS)

```bash
cd apps/contracts
npx hardhat run scripts/deploy.ts --network celo
```

## Verification

After deployment, verify the contract on Celoscan:

```bash
npx hardhat verify --network alfajores <CONTRACT_ADDRESS>
```

## Contract Interaction

Once deployed, the contract address is available in:

- **Environment variable**: `NEXT_PUBLIC_CONTRACT_ADDRESS`
- **Frontend code**: `src/lib/contract-client.ts`
- **ABI file**: `src/abi/PredictionRoom.json`

## Useful Links

- **Celo Explorer (Alfajores)**: https://alfajores.celoscan.io/
- **Celo Explorer (Sepolia)**: https://celo-sepolia.blockscout.com/
- **Celo Mainnet Explorer**: https://celoscan.io/
- **Hardhat Docs**: https://hardhat.org/docs

## Troubleshooting

### Error: Cannot connect to network

- Make sure you have internet connection
- Check that the network RPC URL is correct in `hardhat.config.ts`

### Error: Insufficient funds

- Use the faucets above to get test CELO tokens
- Each transaction requires a small amount of gas

### Error: Module not found

- Run `npm install` in `apps/contracts/`
- Ensure artifacts are compiled: `npm run build`
