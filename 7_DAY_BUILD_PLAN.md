# 7-DAY BUILD PLAN - Complete App Implementation

## Overview

Build a fully functional stock prediction dApp with wallet-based auth, Supabase persistence, and smart contract integration on Celo.

**Key Decisions:**

- ✅ Auth: Wallet connection (wallet address as user ID)
- ✅ Database: Supabase (PostgreSQL)
- ✅ Blockchain: Celo Sepolia testnet
- ✅ Price Source: Manual oracle (can upgrade to Chainlink later)

---

## DAY 1: Supabase & Database Setup

### Morning: Supabase Project Creation

- [ ] Create Supabase project at supabase.com
- [ ] Create PostgreSQL tables (SQL script below)
- [ ] Enable RLS (Row Level Security)
- [ ] Create API keys (anon + service role)

**SQL Tables to Create:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  username VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  total_predictions INT DEFAULT 0,
  total_wins INT DEFAULT 0,
  total_losses INT DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id_web VARCHAR(255) UNIQUE NOT NULL,
  creator_wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'waiting',
  starting_price NUMERIC,
  ending_price NUMERIC,
  min_stake NUMERIC,
  duration_minutes INT,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  total_up_stake NUMERIC DEFAULT 0,
  total_down_stake NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  direction VARCHAR(10) NOT NULL,
  stake_amount NUMERIC NOT NULL,
  outcome VARCHAR(20) DEFAULT 'PENDING',
  payout_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  settled_at TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL REFERENCES users(wallet_address),
  access_token VARCHAR(500),
  refresh_token VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_rooms_creator ON rooms(creator_wallet_address);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_predictions_room ON predictions(room_id);
CREATE INDEX idx_predictions_user ON predictions(user_wallet_address);
```

**RLS Policies:**

- Users can only read their own profile and public stats
- Predictions linked to authenticated wallet
- Rooms are public (readable) but creation restricted

### Afternoon: Environment Setup

- [ ] Add Supabase credentials to `.env.local`
- [ ] Install Supabase client: `npm install @supabase/supabase-js`
- [ ] Test connection with simple query
- [ ] Document API keys location

**Expected Output:**

- ✅ Supabase project created
- ✅ All tables created and indexed
- ✅ Environment variables set
- ✅ Connection test passing

---

## DAY 2: Auth System Implementation

### Morning: Authentication Context

- [ ] Create `src/contexts/AuthContext.tsx`
- [ ] Implement `useAuth()` hook
- [ ] Auto-connect wallet on page load (but i think it's better to have a connect wallet button instead of auto connect user wallet)
- [ ] Sync wallet connection with Supabase user

**File: `src/contexts/AuthContext.tsx`**

```tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { createClient } from "@supabase/supabase-js";

interface User {
  wallet_address: string;
  username?: string;
  created_at: string;
  total_predictions: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isConnected: boolean;
  login: (address: string) => Promise<void>;
  logout: () => void;
  authToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Auto-login when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      login(address);
    } else {
      setUser(null);
      setAuthToken(null);
    }
  }, [isConnected, address]);

  const login = async (walletAddress: string) => {
    setIsLoading(true);
    try {
      // Call backend to get/create user
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });

      if (!res.ok) throw new Error("Login failed");

      const data = await res.json();
      setUser(data.user);
      setAuthToken(data.access_token);
      localStorage.setItem("auth_token", data.access_token);
    } catch (error) {
      console.error("Login error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isConnected, login, logout, authToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

### Afternoon: API Routes

- [ ] Create `/api/auth/login` endpoint
- [ ] Create user if doesn't exist
- [ ] Generate JWT token
- [ ] Create auth middleware for protected routes( i don't think there's need for this, since our whole app is a single page, wallet authentication button would also be on the same page(where the wallet info currently sits in the frontend mockup))

**File: `app/api/auth/login/route.ts`**

```tsx
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { wallet_address } = await request.json();

  if (!wallet_address || !wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    // Check if user exists
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", wallet_address.toLowerCase())
      .single();

    // Create user if doesn't exist
    if (!user) {
      const { data: newUser, error } = await supabase
        .from("users")
        .insert([
          {
            wallet_address: wallet_address.toLowerCase(),
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      user = newUser;
    }

    // Create JWT token
    const token = jwt.sign(
      { wallet_address: user.wallet_address },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    );

    // Save session to database
    await supabase.from("sessions").upsert([
      {
        wallet_address: user.wallet_address,
        access_token: token,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    ]);

    return Response.json({
      user,
      access_token: token,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }
}
```

### Update: Root Layout with AuthProvider

**File: `src/app/layout.tsx`**

```tsx
import { WalletProvider } from "@/components/wallet-provider";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <AuthProvider>{children}</AuthProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
```

**Expected Output:**

- ✅ AuthContext created and integrated
- ✅ Auto-login on wallet connect working
- ✅ Users table populating with connected wallets
- ✅ Auth tokens being generated and stored

---

## DAY 3: Wallet Integration & API Layer

### Morning: Replace Hard-Coded IDs

- [ ] Update `page.tsx` to use `user.wallet_address` instead of "current-user-id"
- [ ] Create auth-protected API fetch wrapper
- [ ] Update all handlers to include auth token
- [ ] Display connected wallet in leftsidebar

**File: `src/lib/api-client.ts`**

```tsx
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("auth_token");

  return fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
}
```

### Afternoon: API Routes for Rooms & Predictions

- [ ] Create `/api/rooms` (GET all, POST create)
- [ ] Create `/api/rooms/[id]` (GET one, PUT update)
- [ ] Create `/api/predictions` (POST create, GET user's predictions)
- [ ] Add auth middleware to protect endpoints

**File: `app/api/rooms/route.ts`**

```tsx
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '@/lib/auth-middleware'

const supabase = createClient(...)

export async function GET() {
  // Get all waiting rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })

  return Response.json(rooms)
}

export async function POST(request: Request) {
  const auth = await verifyAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const roomData = await request.json()

  const { data: room, error } = await supabase
    .from('rooms')
    .insert([{
      ...roomData,
      creator_wallet_address: auth.wallet_address,
      room_id_web: `room-${Date.now()}`
    }])
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json(room)
}
```

### Update Page.tsx

```tsx
"use client";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/api-client";

export default function Home() {
  const { user, isConnected } = useAuth();

  const handleCreateRoom = async (roomData) => {
    const res = await authenticatedFetch("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: roomData.name,
        symbol: roomData.symbol,
        duration_minutes: parseInt(roomData.timeDuration),
        min_stake: parseFloat(roomData.minStake),
      }),
    });

    const newRoom = await res.json();
    setMyRooms([...myRooms, newRoom]);
  };

  if (!isConnected) {
    return <div className="p-4">Please connect your wallet to continue</div>;
  }

  // ... rest of component
}
```

**Expected Output:**

- ✅ Wallet address displayed in navbar
- ✅ Room creation saves to Supabase
- ✅ All API calls include auth token
- ✅ Users can't create rooms without wallet

---

## DAY 4: Smart Contract Development

### Morning: Write PredictionRoom Contract

**File: `apps/contracts/contracts/PredictionRoom.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PredictionRoom {
  enum RoomStatus { WAITING, ACTIVE, SETTLED, CANCELLED }

  struct Room {
    uint id;
    address creator;
    string name;
    string symbol;
    uint startTime;
    uint endTime;
    uint minStake;
    uint startingPrice;
    uint endingPrice;
    RoomStatus status;
  }

  struct Prediction {
    address predictor;
    bool isUp;
    uint amount;
    bool settled;
    uint payout;
  }

  mapping(uint => Room) public rooms;
  mapping(uint => mapping(address => Prediction)) public predictions;
  mapping(uint => address[]) public roomPredictors;

  uint public nextRoomId = 1;

  event RoomCreated(uint indexed roomId, address creator, string name);
  event PredictionPlaced(uint indexed roomId, address predictor, bool isUp, uint amount);
  event RoomStarted(uint indexed roomId, uint startingPrice);
  event RoomSettled(uint indexed roomId, uint endingPrice);

  function createRoom(
    string memory name,
    string memory symbol,
    uint durationSeconds,
    uint minStakeAmount
  ) external returns (uint) {
    uint roomId = nextRoomId++;
    rooms[roomId] = Room({
      id: roomId,
      creator: msg.sender,
      name: name,
      symbol: symbol,
      startTime: 0,
      endTime: 0,
      minStake: minStakeAmount,
      startingPrice: 0,
      endingPrice: 0,
      status: RoomStatus.WAITING
    });

    emit RoomCreated(roomId, msg.sender, name);
    return roomId;
  }

  function placePrediction(
    uint roomId,
    bool isUp,
    uint amount
  ) external {
    require(rooms[roomId].status == RoomStatus.WAITING, "Room not waiting");
    require(amount >= rooms[roomId].minStake, "Stake too low");
    require(predictions[roomId][msg.sender].amount == 0, "Already predicted");

    // TODO: Transfer cUSD from user to contract

    predictions[roomId][msg.sender] = Prediction({
      predictor: msg.sender,
      isUp: isUp,
      amount: amount,
      settled: false,
      payout: 0
    });

    roomPredictors[roomId].push(msg.sender);

    emit PredictionPlaced(roomId, msg.sender, isUp, amount);
  }

  function startRoom(uint roomId, uint startingPrice) external {
    require(msg.sender == rooms[roomId].creator, "Not creator");
    require(rooms[roomId].status == RoomStatus.WAITING, "Not waiting");

    rooms[roomId].status = RoomStatus.ACTIVE;
    rooms[roomId].startingPrice = startingPrice;
    rooms[roomId].startTime = block.timestamp;

    emit RoomStarted(roomId, startingPrice);
  }

  function settleRoom(uint roomId, uint endingPrice) external {
    require(msg.sender == rooms[roomId].creator, "Not creator");
    require(rooms[roomId].status == RoomStatus.ACTIVE, "Not active");

    rooms[roomId].status = RoomStatus.SETTLED;
    rooms[roomId].endingPrice = endingPrice;

    // Calculate winners and payouts
    bool priceWentUp = endingPrice > rooms[roomId].startingPrice;

    uint totalWinnerStake = 0;
    uint totalPool = 0;

    // First pass: calculate totals
    for (uint i = 0; i < roomPredictors[roomId].length; i++) {
      address predictor = roomPredictors[roomId][i];
      Prediction storage pred = predictions[roomId][predictor];

      totalPool += pred.amount;

      bool isWinner = priceWentUp ? pred.isUp : !pred.isUp;
      if (isWinner) {
        totalWinnerStake += pred.amount;
      }
    }

    // Second pass: assign payouts
    for (uint i = 0; i < roomPredictors[roomId].length; i++) {
      address predictor = roomPredictors[roomId][i];
      Prediction storage pred = predictions[roomId][predictor];

      bool isWinner = priceWentUp ? pred.isUp : !pred.isUp;
      if (isWinner) {
        pred.payout = (pred.amount * totalPool) / totalWinnerStake;
      }
      pred.settled = true;
    }

    emit RoomSettled(roomId, endingPrice);
  }

  function claimPayout(uint roomId) external {
    Prediction storage pred = predictions[roomId][msg.sender];
    require(pred.settled, "Not settled");
    require(pred.payout > 0, "No payout");

    uint payout = pred.payout;
    pred.payout = 0;

    // TODO: Transfer cUSD to user
  }
}
```

### Afternoon: Deploy & Setup

- [ ] Compile contract: `npx hardhat compile`
- [ ] Write deployment script
- [ ] Deploy to Celo Sepolia: `npx hardhat run scripts/deploy.ts --network celoSepolia`
- [ ] Save contract address to `.env.local`
- [ ] Generate ABI and types

**File: `apps/contracts/scripts/deploy.ts`**

```typescript
async function main() {
  const PredictionRoom = await ethers.getContractFactory("PredictionRoom");
  const contract = await PredictionRoom.deploy();
  await contract.deployed();

  console.log("PredictionRoom deployed to:", contract.address);

  // Save to environment
  const envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${contract.address}\n`;
  require("fs").appendFileSync(".env.local", envContent);
}

main().catch(console.error);
```

**Expected Output:**

- ✅ Smart contract compiled successfully
- ✅ Contract deployed to Celo Sepolia
- ✅ Contract address in environment variables
- ✅ ABI generated and usable in frontend

---

## DAY 5: Smart Contract Integration

### Morning: Create Contract Interaction Layer

**File: `src/lib/contract-client.ts`**

```tsx
import { createPublicClient, createWalletClient, http } from "viem";
import { celo } from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import PredictionRoomABI from "@/abi/PredictionRoom.json";

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export function useContractClient() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return {
    publicClient,
    walletClient,
    contractAddress: CONTRACT_ADDRESS,
    abi: PredictionRoomABI,
  };
}

export async function createRoomOnChain(
  client: any,
  roomData: { name: string; symbol: string; duration: number; minStake: bigint }
) {
  const tx = await client.walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: PredictionRoomABI,
    functionName: "createRoom",
    args: [
      roomData.name,
      roomData.symbol,
      roomData.duration,
      roomData.minStake,
    ],
  });

  return tx;
}

export async function placePredictionOnChain(
  client: any,
  roomId: number,
  isUp: boolean,
  amount: bigint
) {
  const tx = await client.walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: PredictionRoomABI,
    functionName: "placePrediction",
    args: [roomId, isUp, amount],
  });

  return tx;
}

export async function startRoomOnChain(
  client: any,
  roomId: number,
  startingPrice: number
) {
  const tx = await client.walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: PredictionRoomABI,
    functionName: "startRoom",
    args: [roomId, startingPrice],
  });

  return tx;
}
```

### Afternoon: Update Handlers

- [ ] Add transaction signing to `handleCreateRoom`
- [ ] Add transaction signing to `handlePredictDirection`
- [ ] Add transaction signing to `handleStartRoom`
- [ ] Add loading states and error handling
- [ ] Show transaction hash to user

**Updated: `src/app/page.tsx`**

```tsx
import {
  useContractClient,
  createRoomOnChain,
  placePredictionOnChain,
} from "@/lib/contract-client";

export default function Home() {
  const { user, isConnected } = useAuth();
  const contractClient = useContractClient();
  const [txLoading, setTxLoading] = useState(false);

  const handleCreateRoom = async (roomData) => {
    if (!contractClient.walletClient) {
      alert("Connect wallet first");
      return;
    }

    try {
      setTxLoading(true);

      // Step 1: Create on blockchain
      const txHash = await createRoomOnChain(contractClient, {
        name: roomData.name,
        symbol: roomData.symbol,
        duration: parseInt(roomData.timeDuration) * 60,
        minStake: parseFloat(roomData.minStake),
      });

      console.log("Room creation tx:", txHash);

      // Step 2: Save to database with tx hash
      const res = await authenticatedFetch("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          ...roomData,
          tx_hash: txHash,
        }),
      });

      const newRoom = await res.json();
      setMyRooms([...myRooms, newRoom]);

      setShowCreateDialog(false);
      setCreateFormData({
        name: "",
        symbol: "",
        timeDuration: "",
        minStake: "",
      });
    } catch (error) {
      console.error("Create room error:", error);
      alert("Failed to create room: " + error.message);
    } finally {
      setTxLoading(false);
    }
  };

  const handlePredictDirection = async (direction: "UP" | "DOWN") => {
    if (!stake) {
      alert("Enter stake amount");
      return;
    }

    try {
      setTxLoading(true);

      // Step 1: Place on blockchain
      const stakeInWei = parseFloat(stake) * 1e18;
      const txHash = await placePredictionOnChain(
        contractClient,
        parseInt(selectedRoomId!),
        direction === "UP",
        BigInt(stakeInWei.toString())
      );

      console.log("Prediction tx:", txHash);

      // Step 2: Save to database
      const res = await authenticatedFetch("/api/predictions", {
        method: "POST",
        body: JSON.stringify({
          room_id: selectedRoomId,
          direction,
          stake_amount: parseFloat(stake),
          tx_hash: txHash,
        }),
      });

      const newPrediction = await res.json();
      setUserPredictions([...userPredictions, newPrediction]);
      setStake("");
      setActiveTab("predictions");
    } catch (error) {
      console.error("Prediction error:", error);
      alert("Failed to place prediction: " + error.message);
    } finally {
      setTxLoading(false);
    }
  };
}
```

**Expected Output:**

- ✅ Room creation triggers smart contract call
- ✅ Predictions are signed and sent to blockchain
- ✅ Transaction hashes saved to database
- ✅ Loading states show during transactions
- ✅ Errors are caught and displayed

---

## DAY 6: Price Oracle & Settlement

### Morning: Price Integration

**File: `app/api/prices/route.ts`**

```tsx
// Simple manual price endpoint
// TODO: Integrate with Chainlink or real API

const MOCK_PRICES: Record<string, number> = {
  "MTN.NG": 250.5,
  "DANGOTE.NG": 1250.0,
  "BUACEMENT.NG": 580.25,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json(MOCK_PRICES);
  }

  const price = MOCK_PRICES[symbol];
  if (!price) {
    return Response.json({ error: "Symbol not found" }, { status: 404 });
  }

  return Response.json({ symbol, price, timestamp: Date.now() });
}
```

### Afternoon: Settlement Logic

**File: `app/api/rooms/[id]/settle/route.ts`**

```tsx
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '@/lib/auth-middleware'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request)
  const supabase = createClient(...)

  // Get room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', params.id)
    .single()

  if (roomError) return Response.json({ error: 'Room not found' }, { status: 404 })
  if (auth.wallet_address !== room.creator_wallet_address) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current price
  const priceRes = await fetch(`/api/prices?symbol=${room.symbol}`)
  const { price: endingPrice } = await priceRes.json()

  const priceWentUp = endingPrice > room.starting_price

  // Get all predictions
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('room_id', room.id)

  // Calculate payouts
  const totalPool = predictions.reduce((sum, p) => sum + p.stake_amount, 0)
  const winners = predictions.filter(p =>
    (priceWentUp && p.direction === 'UP') ||
    (!priceWentUp && p.direction === 'DOWN')
  )
  const totalWinnerStake = winners.reduce((sum, p) => sum + p.stake_amount, 0)

  // Update predictions with outcomes
  for (const prediction of predictions) {
    const isWinner =
      (priceWentUp && prediction.direction === 'UP') ||
      (!priceWentUp && prediction.direction === 'DOWN')

    const payout = isWinner
      ? (prediction.stake_amount / totalWinnerStake) * totalPool
      : 0

    await supabase
      .from('predictions')
      .update({
        outcome: isWinner ? 'WIN' : 'LOSS',
        payout_amount: payout,
        settled_at: new Date().toISOString()
      })
      .eq('id', prediction.id)
  }

  // Update room
  await supabase
    .from('rooms')
    .update({
      status: 'completed',
      ending_price: endingPrice
    })
    .eq('id', room.id)

  return Response.json({ success: true, endingPrice })
}
```

**Expected Output:**

- ✅ Can fetch current prices for symbols
- ✅ Settlement calculates winners correctly
- ✅ Payouts distributed to winning predictions
- ✅ Predictions show WIN/LOSS outcome

---

## DAY 7: Real-time Updates & Polish

### Morning: Real-time Price Updates

**File: `src/components/RoomCard.tsx`**

```tsx
import { useEffect, useState } from "react";

export function RoomCard({ room }: RoomCardProps) {
  const [currentPrice, setCurrentPrice] = useState(room.price);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/prices?symbol=${room.symbol}`);
      const { price } = await res.json();
      setCurrentPrice(price);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [room.symbol]);

  const priceChange = currentPrice - parseFloat(room.price);
  const priceChangePercent = (
    (priceChange / parseFloat(room.price)) *
    100
  ).toFixed(2);

  return (
    <div className="...">
      {/* ... */}
      <div className="flex items-center gap-2">
        <span className="text-green-300">₦{currentPrice.toFixed(2)}</span>
        <span className={priceChange > 0 ? "text-green-300" : "text-red-300"}>
          {priceChange > 0 ? "▲" : "▼"} {Math.abs(priceChangePercent)}%
        </span>
      </div>
    </div>
  );
}
```

### Afternoon: Polish & Bug Fixes

- [ ] Add toast notifications for all actions
- [ ] Add countdown timers for active rooms
- [ ] Show transaction status/confirmations
- [ ] Error boundary for crash handling
- [ ] Loading skeletons while fetching
- [ ] Empty states for all lists
- [ ] Mobile responsiveness check

**File: `src/components/Toast.tsx`**

```tsx
import { useState, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const show = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  return { toast, show };
}
```

### Final Checklist

- [ ] All wallet connections working
- [ ] Room creation saves to Supabase
- [ ] Predictions save to Supabase
- [ ] Smart contract calls signed
- [ ] Settlement logic working
- [ ] Prices updating in real-time
- [ ] Error handling complete
- [ ] UI responsive on mobile
- [ ] No console errors
- [ ] Environment variables set

**Expected Output:**

- ✅ Fully functional prediction dApp
- ✅ Rooms created and stored
- ✅ Predictions placed and settled
- ✅ Payouts calculated correctly
- ✅ Real-time price updates
- ✅ Professional UI/UX
- ✅ Ready for testnet launch

---

## Summary of Deliverables

| Day | Component            | Status                                 |
| --- | -------------------- | -------------------------------------- |
| 1   | Database & Supabase  | ✅ Tables created, RLS configured      |
| 2   | Auth System          | ✅ Wallet-based auth, context, API     |
| 3   | Wallet Integration   | ✅ Auto-login, user profile, API layer |
| 4   | Smart Contracts      | ✅ Deploy to Celo Sepolia              |
| 5   | Contract Integration | ✅ Write calls from frontend           |
| 6   | Settlement & Payouts | ✅ Winner calculation, payout logic    |
| 7   | Polish & Real-time   | ✅ Live updates, UI/UX complete        |

---

## Post-Launch Improvements (Future)

1. **Chainlink Integration** - Real stock prices from oracle
2. **Gas Optimization** - Batch settlements for multiple rooms
3. **NFT Badges** - Achievements for winners
4. **Leaderboard** - Global rankings by win rate
5. **Mobile App** - React Native version
6. **Governance** - DAO for fee settings
7. **Marketing** - Dashboard, analytics, referrals
