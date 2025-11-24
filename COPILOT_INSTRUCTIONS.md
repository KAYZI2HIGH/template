# Copilot Instructions - Stock Prediction dApp

## Project Overview

**Name:** Stock Prediction dApp (templat)  
**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Wagmi, RainbowKit, Supabase, Celo  
**Chain:** Celo Sepolia Testnet  
**Database:** Supabase (PostgreSQL)  
**Auth:** Wallet-based (wallet address as user ID)  
**Status:** Day 1-2 (Auth setup phase)

---

## Architecture Decision: Wallet-Based Auth

### Key Decision

User authentication is **NOT traditional email/password** but **wallet connection** with Supabase persistence.

### How It Works

1. User connects wallet (MetaMask, Ledger, etc.) via RainbowKit
2. `wagmi` hook `useAccount()` provides wallet address
3. On first connection, auto-create user record in Supabase `users` table
4. Generate JWT token from wallet address
5. All subsequent API calls include JWT in Authorization header
6. Wallet address is the unique user identifier throughout the app

### Critical Implementation Rules

- ✅ Replace ALL occurrences of `"current-user-id"` with `user?.wallet_address`
- ✅ Use `useAuth()` hook to access current user
- ✅ Wrap components that need auth in `<AuthProvider>` (already done in layout)
- ✅ Check `isConnected` before allowing any user actions
- ✅ All API endpoints must verify auth token in header
- ✅ Database queries must filter by `wallet_address` (not user ID)

---

## File Structure & Responsibilities

```
src/
├── app/
│   ├── layout.tsx           # Wraps with WalletProvider + AuthProvider
│   ├── page.tsx             # Main app - Rooms, Predictions, Auth state
│   └── api/
│       ├── auth/
│       │   └── login/       # POST /api/auth/login - User auth endpoint
│       ├── rooms/           # GET/POST rooms, GET/PUT specific room
│       ├── predictions/     # POST predictions, GET user predictions
│       └── prices/          # GET stock prices
├── components/
│   ├── wallet-provider.tsx  # Wagmi + RainbowKit setup (KEEP AS IS)
│   ├── connect-button.tsx   # Wallet button from RainbowKit (KEEP AS IS)
│   ├── MainContent.tsx      # Room list, search, create dialog
│   ├── RightSidebar.tsx     # Tabs: Prediction Slip + My Predictions
│   ├── PredictionSlip.tsx   # Stake input, bet buttons, room details
│   ├── PredictionsList.tsx  # Show all user predictions
│   ├── RoomCard.tsx         # Individual room display
│   └── navbar.tsx           # Top nav with wallet button
├── contexts/
│   └── AuthContext.tsx      # useAuth() hook, login/logout logic (TO CREATE)
├── lib/
│   ├── types.ts             # TypeScript interfaces
│   ├── api-client.ts        # authenticatedFetch() wrapper (TO CREATE)
│   ├── contract-client.ts   # Smart contract interaction (TO CREATE DAY 5)
│   └── auth-middleware.ts   # Verify JWT tokens in API (TO CREATE)
└── public/
    └── images/
```

---

## Development Workflow

### Phase 1: Authentication (Days 1-3)

**Current Focus**: Get wallet-based auth working with Supabase

**Checklist:**

- [ ] Supabase project created + tables
- [ ] `AuthContext.tsx` created
- [ ] `/api/auth/login` endpoint working
- [ ] `useAuth()` provides correct user data
- [ ] Wallet address displayed in navbar
- [ ] All hard-coded IDs replaced with `user?.wallet_address`
- [ ] API calls include auth token

**What You'll Build:**

```tsx
// You'll use this pattern everywhere:
const { user, isConnected } = useAuth();

if (!isConnected) return <div>Connect wallet first</div>;

// Then use:
const userId = user.wallet_address; // Instead of "current-user-id"
```

### Phase 2: Smart Contracts (Days 4-5)

**Goal**: Rooms and predictions stored on Celo

**Smart Contract Functions Needed:**

- `createRoom(name, symbol, duration, minStake)` - Creates new room
- `placePrediction(roomId, isUp, amount)` - Places a bet
- `startRoom(roomId, startingPrice)` - Locks in starting price
- `settleRoom(roomId, endingPrice)` - Calculates winners
- `claimPayout(roomId)` - Winner claims their payout

### Phase 3: Settlement & Real-time (Days 6-7)

**Goal**: Predictions automatically settle with prices and payouts calculated

**Key Logic:**

```tsx
// After room ends, calculate winners:
const priceWentUp = endingPrice > startingPrice;
const winners = predictions.filter(
  (p) =>
    (priceWentUp && p.direction === "UP") ||
    (!priceWentUp && p.direction === "DOWN")
);
const payout = (stake / totalWinnerStake) * totalPool;
```

---

## Critical Rules & Constraints

### DO ✅

- ✅ Use `user?.wallet_address` for identifying users
- ✅ Check `isConnected` before actions
- ✅ Include auth token in ALL API calls
- ✅ Use `authenticatedFetch()` wrapper for API calls
- ✅ Catch and display errors to user
- ✅ Add loading states for async operations
- ✅ Validate wallet address format: `^0x[a-fA-F0-9]{40}$`
- ✅ Store auth token in `localStorage`
- ✅ Use UUID for database IDs
- ✅ Filter Supabase queries by wallet address for security

### DON'T ❌

- ❌ Use email/password authentication
- ❌ Hard-code user IDs (always use wallet address)
- ❌ Skip auth verification in API routes
- ❌ Store sensitive data in localStorage
- ❌ Make API calls without auth token
- ❌ Trust client-side data validation alone
- ❌ Skip error handling
- ❌ Make database queries without checking auth

---

## Database Schema Reference

### Users Table

```sql
wallet_address VARCHAR(42) PRIMARY KEY  -- 0x1234...5678
username VARCHAR(255)                    -- Optional display name
total_predictions INT
total_wins INT
total_losses INT
win_rate NUMERIC
created_at TIMESTAMP
```

### Rooms Table

```sql
id UUID PRIMARY KEY
room_id_web VARCHAR(255) UNIQUE          -- Frontend room ID
creator_wallet_address VARCHAR(42)       -- User who created
name VARCHAR(255)
symbol VARCHAR(50)
status VARCHAR(50)                       -- waiting/started/completed
starting_price NUMERIC
ending_price NUMERIC
min_stake NUMERIC
duration_minutes INT
starts_at TIMESTAMP
ends_at TIMESTAMP
created_at TIMESTAMP
```

### Predictions Table

```sql
id UUID PRIMARY KEY
room_id UUID REFERENCES rooms(id)
user_wallet_address VARCHAR(42)          -- Who made prediction
direction VARCHAR(10)                    -- UP or DOWN
stake_amount NUMERIC
outcome VARCHAR(20)                      -- WIN/LOSS/PENDING
payout_amount NUMERIC
created_at TIMESTAMP
settled_at TIMESTAMP
```

---

## API Endpoint Reference

### Auth

```
POST /api/auth/login
Request: { wallet_address: "0x..." }
Response: { user: User, access_token: "jwt..." }
```

### Rooms

```
GET /api/rooms
Response: [{ id, name, symbol, status, ... }]

POST /api/rooms
Auth: Required
Request: { name, symbol, duration_minutes, min_stake }
Response: { id, room_id_web, creator_wallet_address, ... }

GET /api/rooms/[id]
Response: { id, name, ... details ... }

PUT /api/rooms/[id]
Auth: Required
Request: { status, starting_price, ending_price }
Response: Updated room
```

### Predictions

```
POST /api/predictions
Auth: Required
Request: { room_id, direction: "UP"|"DOWN", stake_amount }
Response: { id, user_wallet_address, ... }

GET /api/predictions?room_id=uuid
Response: [{ id, user_wallet_address, direction, stake_amount, ... }]

GET /api/predictions?user=true
Auth: Required
Response: User's predictions
```

### Prices

```
GET /api/prices?symbol=MTN.NG
Response: { symbol: "MTN.NG", price: 250.50, timestamp: 1234567890 }
```

---

## Common Patterns

### Using Auth in Components

```tsx
"use client";
import { useAuth } from "@/contexts/AuthContext";

export function MyComponent() {
  const { user, isConnected, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isConnected) return <ConnectWalletMessage />;

  return (
    <div>
      <p>Welcome, {user?.wallet_address}</p>
    </div>
  );
}
```

### Making Authenticated API Calls

```tsx
import { authenticatedFetch } from "@/lib/api-client";

const response = await authenticatedFetch("/api/rooms", {
  method: "POST",
  body: JSON.stringify({
    name: "My Room",
    symbol: "MTN.NG",
  }),
});

const data = await response.json();
```

### Verifying Auth in API Routes

```tsx
import { verifyAuth } from "@/lib/auth-middleware";

export async function POST(request: Request) {
  const auth = await verifyAuth(request);

  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Now you have auth.wallet_address
  const walletAddress = auth.wallet_address;

  // Use in database query
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress);
}
```

### Creating Tables & Queries

```tsx
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create
const { data, error } = await supabase
  .from("rooms")
  .insert([{ creator_wallet_address: userWallet, name: "Room 1" }])
  .select();

// Read
const { data: rooms } = await supabase
  .from("rooms")
  .select("*")
  .eq("creator_wallet_address", userWallet);

// Update
const { data: updated } = await supabase
  .from("rooms")
  .update({ status: "started" })
  .eq("id", roomId);

// Delete
await supabase.from("rooms").delete().eq("id", roomId);
```

---

## Testing Checklist

### Unit Tests

- [ ] Auth context works correctly
- [ ] useAuth hook returns correct data
- [ ] API endpoints verify auth
- [ ] JWT tokens valid and expire

### Integration Tests

- [ ] User can create room (saves to Supabase)
- [ ] User can place prediction (saves to Supabase)
- [ ] Room appears in "My Rooms" tab
- [ ] Prediction appears in "My Predictions" tab
- [ ] Disconnect wallet clears auth state

### User Flow Tests

- [ ] User connects wallet → auto-login
- [ ] Create room → shows in "My Rooms"
- [ ] Join room → can place bet
- [ ] Place bet → appears in predictions list
- [ ] Page refresh → user still logged in
- [ ] Disconnect wallet → auth cleared

---

## Debugging Tips

### Check Auth State

```tsx
// In browser console:
localStorage.getItem("auth_token");
// Should return a JWT token, not null

// Check decoded token:
const token = localStorage.getItem("auth_token");
const payload = JSON.parse(atob(token.split(".")[1]));
console.log(payload.wallet_address);
```

### Test Supabase Connection

```tsx
// Create a test fetch in browser console:
fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ wallet_address: "0x1234..." }),
});
```

### Check API Errors

- Look at network tab in DevTools
- Check server logs: `npm run dev`
- Check Supabase dashboard for data
- Verify environment variables in `.env.local`

---

## Environment Variables Needed

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# WalletConnect (for RainbowKit)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# JWT Secret
JWT_SECRET=your-super-secret-key-change-in-production

# Smart Contract (after deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
```

---

## Priority Order for Building

### 🔴 CRITICAL (Do First)

1. Supabase setup + tables
2. AuthContext + useAuth hook
3. `/api/auth/login` endpoint
4. Replace "current-user-id" with `user?.wallet_address`

### 🟡 HIGH (Do Next)

5. API routes for rooms/predictions
6. `authenticatedFetch()` wrapper
7. Smart contract on Celo Sepolia

### 🟢 MEDIUM (Can Parallelize)

8. Settlement logic
9. Price updates
10. UI polish

---

## Things To Watch Out For

### Common Mistakes

1. **Forgetting auth check** - Always verify user is connected
2. **Hard-coded IDs** - Search for "current-user-id" and replace
3. **Missing auth token** - All API calls need it
4. **Wrong wallet address format** - Should be `0x...` (42 chars)
5. **Not handling disconnects** - Clear auth when user disconnects
6. **Case sensitivity** - Wallet addresses should be lowercase in DB

### Edge Cases

- User connects wallet A, then switches to wallet B (should auto-login as B)
- Page refresh while connected (should restore auth from token)
- Token expired (should show login screen)
- Network error during transaction (show retry UI)
- User has no cUSD balance (prevent betting, show warning)

---

## Resources

- **Wagmi Docs:** https://wagmi.sh
- **RainbowKit:** https://www.rainbowkit.com
- **Supabase:** https://supabase.com/docs
- **Celo Docs:** https://docs.celo.org
- **Viem:** https://viem.sh
- **Next.js App Router:** https://nextjs.org/docs/app

---

## Next Immediate Tasks

### Today (After reading this):

1. ✅ Create Supabase project
2. ✅ Create database tables from SQL above
3. ✅ Create `AuthContext.tsx`
4. ✅ Create `/api/auth/login` endpoint
5. ✅ Test login flow

### Tomorrow:

6. Create `/api/rooms` and `/api/predictions`
7. Replace "current-user-id" throughout app
8. Add wallet address display in navbar

### Day 3:

9. Create smart contract
10. Deploy to Celo Sepolia
11. Wire up contract calls

---

**Questions?** Refer to the `7_DAY_BUILD_PLAN.md` for detailed day-by-day instructions, or `WALLET_AUTH_ARCHITECTURE.md` for the complete auth system design.
