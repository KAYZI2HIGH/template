# Day 4: Smart Contract Development - PredictionRoom

## 📋 Overview

This Day 4 builds a **simplified, production-ready smart contract** for the Nigerian Stock Predictions app on Celo Alfajores testnet.

### Key Differences from Chainlink Demo Code

The demo code you provided is for **sports betting with oracles**. Our contract is **simplified for stock predictions** because:

✅ **Decentralized**: No oracle needed - creator manually sets prices  
✅ **Gas Efficient**: Optimized for Celo (low fees)  
✅ **User Flow Aligned**: Matches your Supabase API exactly  
✅ **cUSD Native**: Uses Celo's native stablecoin

---

## 🏗️ Contract Architecture

### Room Lifecycle

```
WAITING → ACTIVE → COMPLETED
  ↓         ↓         ↓
Create   Start     Resolve
Room    (set $)    (set $)
        Players
        predict
```

### Core Functions

#### Room Creation

```solidity
createRoom(name, symbol, durationMinutes, minStakeWei)
  → Returns roomId
  → Status: WAITING
```

#### Prediction Placement

```solidity
predict(roomId, direction)
  → payable: Send cUSD as stake
  → direction: UP (1) or DOWN (2)
  → Only 1 prediction per user per room
  → Only in WAITING status
```

#### Room Management (Creator Only)

```solidity
startRoom(roomId, startingPrice)
  → Sets status: ACTIVE
  → Records starting price

resolveRoom(roomId, endingPrice)
  → Sets status: COMPLETED
  → Records ending price
  → Determines winners: UP if endingPrice > startingPrice
```

#### Claiming Payouts

```solidity
claim(roomId)
  → Only callable when COMPLETED
  → Calculates: (userStake × totalPool) / winnerStake
  → Transfers cUSD to winner
  → Prevents double-claiming
```

---

## 📊 Data Structures

### Room

```solidity
struct Room {
  uint256 id;
  address creator;              // Room creator's wallet
  string name;                  // "MTN Stock Price Movement"
  string symbol;                // "MTN.NG"
  uint256 startTime;            // When game started
  uint256 endTime;              // When game expires (wait time)
  uint256 minStake;             // Minimum bet in wei
  uint256 startingPrice;        // Set by creator on startRoom()
  uint256 endingPrice;          // Set by creator on resolveRoom()
  RoomStatus status;            // WAITING | ACTIVE | COMPLETED
  uint256 totalUpStake;         // Sum of all UP bets
  uint256 totalDownStake;       // Sum of all DOWN bets
  bool pricesSet;               // Flag for validation
}
```

### Prediction

```solidity
struct Prediction {
  address predictor;            // User's wallet
  uint256 roomId;               // Which room
  PredictionDirection direction;// UP (1) or DOWN (2)
  uint256 amount;               // Stake in wei (cUSD)
  bool claimed;                 // Already claimed payout?
  uint256 payout;               // Calculated winnings
}
```

---

## 🔗 Integration with Your App

### Backend Flow

```
Frontend API Call
    ↓
/api/rooms (Supabase) - Track state
    ↓
Smart Contract Call - Execute transactions
    ↓
Event Emitted - Frontend listens for confirmation
    ↓
State Updated - UI refreshes
```

### No Contract Changes Needed For:

- Room creation tracking (Supabase handles)
- User predictions storage (Supabase handles)
- Settlement calculations (contract calculates payout)

### Contract Handles:

- Fund transfers (cUSD)
- Payout calculations
- Double-prediction prevention
- Winner determination

---

## 🚀 Deployment Instructions

### Step 1: Setup Environment Variables

```bash
# In apps/contracts/.env or .env.local
PRIVATE_KEY=your_celo_wallet_private_key
CELOSCAN_API_KEY=your_api_key  # Optional: for verification
```

### Step 2: Compile Contract

```bash
cd apps/contracts
npx hardhat compile
```

### Step 3: Deploy to Alfajores

```bash
npx hardhat run scripts/deploy.ts --network alfajores
```

Output will show:

```
✅ PredictionRoom deployed to: 0x...
✅ Contract address saved to .env.local
✅ Contract ABI saved to src/abi/PredictionRoom.json
```

### Step 4: Verify Deployment

```bash
# Check on Celoscan
https://alfajores.celoscan.io/address/0x...
```

---

## 💻 Frontend Integration

### Using the Contract Client

```typescript
import { useContractClients, placePrediction } from "@/lib/contract-client";

export function YourComponent() {
  const { walletClient, publicClient } = useContractClients();

  const handlePlaceBet = async (roomId: number, direction: "UP" | "DOWN") => {
    try {
      // Send transaction to contract
      const hash = await placePrediction(
        walletClient,
        roomId,
        direction,
        100 // stake amount in CELO units
      );

      // Wait for confirmation
      console.log("Transaction hash:", hash);

      // Optionally: Save to Supabase after confirmation
      await authenticatedFetch("/api/predictions", {
        method: "POST",
        body: JSON.stringify({
          roomId,
          direction,
          stake: 100,
          txHash: hash,
        }),
      });
    } catch (error) {
      console.error("Failed to place prediction:", error);
    }
  };

  return <button onClick={() => handlePlaceBet(1, "UP")}>Predict UP</button>;
}
```

---

## 📋 Function Reference

### Read Functions (No Gas Cost)

| Function                                    | Returns              | Example              |
| ------------------------------------------- | -------------------- | -------------------- |
| `getRoom(roomId)`                           | Room struct          | Get room details     |
| `getUserPrediction(roomId, user)`           | Prediction[]         | Get user's bets      |
| `getPredictionCounts(roomId)`               | (upCount, downCount) | Get UP/DOWN counts   |
| `hasUserPredicted(roomId, user)`            | bool                 | Check if already bet |
| `calculatePayout(roomId, stake, direction)` | uint256              | Estimate winnings    |

### Write Functions (Require Gas / cUSD)

| Function        | Parameters                       | Cost        | Who            |
| --------------- | -------------------------------- | ----------- | -------------- |
| `createRoom()`  | name, symbol, duration, minStake | Gas         | Anyone         |
| `predict()`     | roomId, direction                | Stake + Gas | Anyone         |
| `startRoom()`   | roomId, startingPrice            | Gas         | Creator only   |
| `resolveRoom()` | roomId, endingPrice              | Gas         | Creator only   |
| `claim()`       | roomId                           | Gas         | Predictor only |

---

## ⚠️ Important Notes

### 1. No Chainlink Integration (Yet)

- Prices are manually set by room creator
- Chainlink Functions can be added later for real stock prices
- Current design focuses on testing logic

### 2. Gas Optimization

- Contract is optimized for Celo (cheap gas)
- Uses efficient mappings and arrays
- No external calls = no oracle dependency

### 3. Security Considerations

- Only creator can start/resolve rooms
- RLS on Supabase prevents unauthorized DB access
- Smart contract prevents duplicate predictions
- Funds locked in contract until claim

### 4. Testing

- Deploy to Alfajores first
- Use test cUSD from faucet
- Verify transactions on Celoscan

---

## 🔄 Workflow Example

### Creating and Running a Game

1. **Create Room** (via API)

   ```bash
   POST /api/rooms
   { name: "MTN Rally", symbol: "MTN.NG", duration: "2h", minStake: "50" }
   ```

   → Creates room in Supabase + blockchain

2. **Users Place Bets** (via Smart Contract)

   ```
   User A: predict(roomId, UP, 100 cUSD)
   User B: predict(roomId, DOWN, 100 cUSD)
   ```

   → Stakes locked in contract

3. **Creator Starts Game** (via API + Smart Contract)

   ```
   PUT /api/rooms/roomId/start
   → Calls: startRoom(roomId, 290.50)  // Starting price
   → Status changes: WAITING → ACTIVE
   ```

4. **Creator Resolves Game** (via Smart Contract)

   ```
   Creator calls: resolveRoom(roomId, 295.50)  // Ending price
   → Status changes: ACTIVE → COMPLETED
   → Winners determined: UP wins (295.50 > 290.50)
   ```

5. **Users Claim Payouts** (via Smart Contract)
   ```
   User A calls: claim(roomId)
   → Payout: (100 × 200) / 100 = 200 cUSD
   → Receives 200 cUSD to wallet
   ```

---

## 📞 Troubleshooting

### "Contract not deployed"

- Check `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`
- Verify deployment to Alfajores completed

### "Transaction reverted: RoomNotWaiting"

- Room must be in WAITING status to predict
- Check room status with `getRoom(roomId)`

### "Transaction reverted: Unauthorized"

- Only creator can call startRoom/resolveRoom
- Check `msg.sender == room.creator`

### "Prediction reverted: UserAlreadyPredicted"

- User already has a bet in this room
- Check with `hasUserPredicted(roomId, user)`

---

## 🎯 Next Steps (Day 5+)

### Day 5: Contract Integration

- Wire frontend handlers to call smart contract functions
- Add loading states for transactions
- Show transaction hashes to users

### Day 6: Oracle Integration

- Add Chainlink Functions for real stock prices
- Automate room resolution
- Real-time price updates

### Day 7: Polish

- Gas optimization
- Enhanced error messages
- Contract verification on Celoscan

---

## 📚 Resources

- **Celo Docs**: https://docs.celo.org/
- **Hardhat**: https://hardhat.org/
- **Viem**: https://viem.sh/
- **Solidity**: https://docs.soliditylang.org/
- **Chainlink (Future)**: https://docs.chain.link/

---

**Contract Status**: ✅ Ready for Alfajores testnet deployment  
**UI Changes**: ❌ None required at this stage  
**Ready to Deploy**: Yes!
