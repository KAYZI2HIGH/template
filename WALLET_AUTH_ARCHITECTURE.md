# Wallet-Based Authentication Architecture

## YES, IT'S FEASIBLE! ✅

Using wallet connection as your primary auth is not only feasible but **becoming industry standard** for Web3 apps. Here's why it works perfectly for your prediction app:

---

## 1. WALLET AS AUTH - HOW IT WORKS

### Authentication Flow:

```
1. User clicks "Connect Wallet" (RainbowKit button in navbar)
2. User selects wallet (MetaMask, Ledger, etc.)
3. Wagmi gets wallet address (e.g., 0x1234...5678)
4. Backend creates/retrieves user profile in Supabase
5. Session is tied to wallet address
6. All transactions signed by this wallet
7. No password needed - wallet signs as proof of identity
```

### Why This Works:

- ✅ **No passwords to manage** - Users already have wallets
- ✅ **Secure** - Transactions are cryptographically signed
- ✅ **Decentralized** - No central server can lock you out
- ✅ **Perfect for blockchain apps** - Natural fit for Celo
- ✅ **One-click login** - Better UX than email/password
- ✅ **Verifiable identity** - Wallet address is the unique identifier

---

## 2. IMPLEMENTATION ARCHITECTURE

### Database Schema (Supabase):

```sql
-- Users table (wallet as primary identifier)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,  -- 0x... format
  username VARCHAR(255),                        -- Optional display name
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Stats
  total_predictions INT DEFAULT 0,
  total_winnings NUMERIC DEFAULT 0,
  total_losses NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0
);

-- Rooms table (rooms created by wallets)
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id_web VARCHAR(255) UNIQUE,              -- Same as frontend room ID
  creator_wallet_address VARCHAR(42) NOT NULL,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  status VARCHAR(50),                           -- waiting, started, completed
  starting_price NUMERIC,
  ending_price NUMERIC,
  min_stake NUMERIC,
  duration_minutes INT,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (creator_wallet_address) REFERENCES users(wallet_address)
);

-- Predictions table (bets placed by users)
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  user_wallet_address VARCHAR(42) NOT NULL,
  direction VARCHAR(10),                        -- UP or DOWN
  stake_amount NUMERIC NOT NULL,
  outcome VARCHAR(20),                          -- WIN, LOSS, PENDING
  payout_amount NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  settled_at TIMESTAMP,

  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_wallet_address) REFERENCES users(wallet_address)
);

-- Sessions/Auth tokens (optional, for session management)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  access_token VARCHAR(500),
  refresh_token VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);
```

---

## 3. FRONTEND IMPLEMENTATION

### Step 1: Create Auth Context (NEW FILE)

```tsx
// src/contexts/AuthContext.tsx
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useAccount } from "wagmi";

interface User {
  wallet_address: string;
  username?: string;
  total_predictions: number;
  total_winnings: number;
  total_losses: number;
  win_rate: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isConnected: boolean;
  login: (address: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-login when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      login(address);
    } else {
      setUser(null);
    }
  }, [isConnected, address]);

  const login = async (address: string) => {
    setIsLoading(true);
    try {
      // Call backend API to get/create user
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });

      const userData = await response.json();
      setUser(userData);

      // Save auth token to localStorage
      localStorage.setItem("auth_token", userData.access_token);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("auth_token");
    // Call logout endpoint if needed
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isConnected, login, logout }}
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

### Step 2: Wrap App with Provider

```tsx
// src/app/layout.tsx
import { WalletProvider } from "@/components/wallet-provider";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

### Step 3: Use in Components

```tsx
// src/app/page.tsx
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, isConnected } = useAuth();

  // Check if user is connected
  if (!isConnected) {
    return <div>Please connect wallet to continue</div>;
  }

  // Now use user.wallet_address instead of "current-user-id"
  const handleCreateRoom = async (roomData) => {
    const newRoom = {
      room_id_web: `room-${Date.now()}`,
      creator_wallet_address: user.wallet_address,
      name: roomData.name,
      symbol: roomData.symbol,
      // ...
    };

    // Save to Supabase
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
      body: JSON.stringify(newRoom),
    });
  };
}
```

---

## 4. BACKEND API ENDPOINTS (Next.js App Router)

### Auth Endpoints:

```tsx
// app/api/auth/login/route.ts
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { wallet_address } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check if user exists
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", wallet_address)
      .single();

    // Create user if doesn't exist
    if (!user) {
      const { data: newUser } = await supabase
        .from("users")
        .insert([{ wallet_address }])
        .select()
        .single();
      user = newUser;
    }

    // Create JWT token
    const token = createJWT(wallet_address);

    // Save session
    await supabase.from("sessions").insert([
      {
        wallet_address,
        access_token: token,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    ]);

    return Response.json({
      ...user,
      access_token: token,
    });
  } catch (error) {
    return Response.json({ error: "Login failed" }, { status: 400 });
  }
}
```

### Room Endpoints:

```tsx
// app/api/rooms/route.ts
export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify auth token
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { wallet_address } = verifyJWT(token); // Your JWT verification

  const roomData = await request.json();

  // Create room
  const { data: room, error } = await supabase
    .from("rooms")
    .insert([
      {
        ...roomData,
        creator_wallet_address: wallet_address,
      },
    ])
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json(room);
}

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all rooms
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("status", "waiting");

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json(rooms);
}
```

---

## 5. SECURITY CONSIDERATIONS

### ✅ What's Secure:

- **Wallet signature verification** - Transaction must be signed by user's private key
- **No passwords** - Can't be phished or brute-forced
- **Blockchain as audit trail** - All transactions on Celo are immutable
- **Token expiration** - Sessions expire after 30 days
- **CORS + HTTPS** - API calls are encrypted

### ⚠️ What You Need to Add:

- **Message signing** (optional but recommended):

  ```tsx
  // User signs a message to prove wallet ownership
  const message = `Sign this message to login: ${nonce}`;
  const signature = await signer.signMessage(message);
  // Backend verifies signature matches wallet address
  ```

- **Rate limiting** - Prevent spam/bot accounts
- **Email/username (optional)** - For recovery/display
- **2FA on critical actions** - Higher stake transactions
- **Audit logging** - Track all user actions

---

## 6. BENEFITS VS TRADITIONAL AUTH

| Aspect              | Traditional Auth      | Wallet Auth                     |
| ------------------- | --------------------- | ------------------------------- |
| Password Management | ❌ Risky              | ✅ None needed                  |
| Account Recovery    | ❌ Complex            | ✅ Use backup wallet            |
| Proof of Identity   | ❌ Email verification | ✅ Cryptographic signature      |
| Transaction Signing | ❌ Separate process   | ✅ Built-in                     |
| User Control        | ❌ Server dependent   | ✅ User owns keys               |
| Cross-app Login     | ❌ Need OAuth         | ✅ Same wallet works everywhere |

---

## 7. SETUP CHECKLIST

### Backend (Supabase):

- [ ] Create Supabase project
- [ ] Create tables (users, rooms, predictions, sessions)
- [ ] Create RLS (Row Level Security) policies
- [ ] Set up JWT secret
- [ ] Create API endpoints (/auth/login, /rooms, /predictions, etc.)

### Frontend:

- [ ] Create `AuthContext.tsx`
- [ ] Create API wrapper with auth token
- [ ] Add `AuthProvider` to layout
- [ ] Replace all "current-user-id" with `user?.wallet_address`
- [ ] Add wallet address display in navbar
- [ ] Add "Connect Wallet" requirement guards
- [ ] Add loading states for auth

### Smart Contract:

- [ ] Add wallet address verification
- [ ] Emit events with user address
- [ ] Set access control based on wallet

---

## 8. ENVIRONMENT VARIABLES

Add to `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# JWT Secret
JWT_SECRET=your-secret-key

# Smart Contract
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
```

---

## KEY ADVANTAGES FOR YOUR APP

1. **Perfect fit**: Prediction markets = users already have funds in wallets
2. **Transparent**: All predictions/payouts visible on blockchain
3. **Trustless**: No need to trust you with funds - contract handles it
4. **Global**: Users from anywhere with a wallet can play
5. **Scalable**: Supabase handles thousands of users
6. **Real-time**: Can listen to blockchain events for instant updates

---

## NEXT: What We Need To Build

1. **Supabase Setup** (Day 1)
2. **Auth Context & API Routes** (Day 2)
3. **Wallet Integration** (Day 3)
4. **Smart Contract Interaction** (Days 4-5)
5. **Settlement Logic** (Days 6-7)
