# Day 6: Price Oracle & Settlement System

## Overview

Day 6 implementation provides a complete price oracle and settlement system for prediction rooms. This includes mock price data, settlement calculation, and payout distribution.

## Components

### 1. Price Oracle (`/api/prices/route.ts`)

Provides real-time price data for Nigerian stocks with simulated volatility.

**Supported Symbols:**

- `MTN.NG` - $250.50
- `DANGOTE.NG` - $1,250.00
- `BUACEMENT.NG` - $580.25
- `ZENITHBANK.NG` - $35.50
- `SEPLAT.NG` - $785.75
- `GTCO.NG` - $42.30

**Endpoints:**

```bash
# Get all prices
GET /api/prices

# Get specific symbol price
GET /api/prices?symbol=MTN.NG

# Chainlink callback (production)
POST /api/prices
```

**Response Format:**

```json
{
  "symbol": "MTN.NG",
  "price": 250.75,
  "timestamp": "2024-01-15T10:30:00Z",
  "volatility": 0.5
}
```

### 2. Settlement Engine (`/api/rooms/settle/[roomId]`)

Handles room settlement by calculating winners and distributing payouts.

**Settlement Process:**

1. Fetches room details from Supabase
2. Gets current price from oracle (`/api/prices`)
3. Determines winners (UP/DOWN direction)
4. Calculates payouts using pool formula
5. Updates all predictions with outcomes
6. Marks room as completed

**Payout Formula:**

```
Winner Payout = (Your Stake / Total Winner Stake) × Total Pool
```

Example:

- Total Pool: $1000
- Winners have $400 combined stake
- Your stake: $100
- Your payout: (100 / 400) × 1000 = $250

**Endpoints:**

```bash
# Settle a room (POST)
POST /api/rooms/settle/[roomId]

# Check settlement status (GET)
GET /api/rooms/settle/[roomId]
```

**Request Body (POST):**

```json
{}
```

**Response (POST):**

```json
{
  "success": true,
  "roomId": "uuid",
  "startingPrice": 250.5,
  "endingPrice": 251.75,
  "priceWentUp": true,
  "winningDirection": "up",
  "predictions": {
    "totalPredictions": 10,
    "winners": 6,
    "losers": 4,
    "totalPool": 1000,
    "totalPayedOut": 1000
  }
}
```

### 3. Settlement Utils (`/lib/settlement.ts`)

Core settlement logic for calculating outcomes and payouts.

**Key Functions:**

```typescript
// Determine winning direction
getWinningDirection(startingPrice, endingPrice);
// Returns: "up" | "down"

// Calculate all prediction outcomes
calculatePayouts(predictions, winningDirection);
// Returns: PredictionOutcome[]

// Get settlement statistics
calculateSettlementStats(outcomes, startingPrice, endingPrice);
// Returns: Settlement object

// Validate settlement data
validateSettlement(predictions, startingPrice, endingPrice);
// Returns: { valid: boolean; error?: string }
```

### 4. Settlement Hook (`/hooks/useRoomSettlement.ts`)

React hook for frontend integration.

```typescript
const { isSettled, isLoading, settle, refetch, settlementStatus } =
  useRoomSettlement(roomId);

// Trigger settlement
<button onClick={() => settle()}>
  {isLoading ? "Settling..." : "Settle Room"}
</button>;
```

## Database Changes

Migration `002_add_settlement_fields.sql` adds:

- `predictions.outcome` (WIN/LOSS)
- `predictions.payout_amount` (decimal)
- `predictions.settled_at` (timestamp)
- `rooms.ending_price` (decimal)

Indexes for efficient settlement queries:

- `idx_predictions_room_settled` - Find settled predictions by room
- `idx_rooms_status_updated` - Track completion timing

## Settlement Flow

```
┌─────────────────────┐
│  Room Created       │
│  (status: pending)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Game Starts        │
│  (status: started)  │
│  starting_price set │
└──────────┬──────────┘
           │ [After game delay]
           ↓
┌─────────────────────────────────┐
│  Settlement Triggered           │
│  (Manual or Chainlink callback) │
└──────────┬──────────────────────┘
           │
           ↓
┌─────────────────────────────────┐
│  1. Fetch current price         │
│  2. Determine winners (UP/DOWN) │
│  3. Calculate payouts           │
└──────────┬──────────────────────┘
           │
           ↓
┌─────────────────────────────────┐
│  4. Update predictions:         │
│     - outcome (WIN/LOSS)        │
│     - payout_amount             │
│     - settled_at                │
└──────────┬──────────────────────┘
           │
           ↓
┌─────────────────────┐
│  Room Completed     │
│  (status: completed)│
│  ending_price set   │
└─────────────────────┘
```

## Future Chainlink Integration

### Phase 2: Chainlink Functions

Replace mock oracle with real Chainlink Functions:

```typescript
// In /api/prices/route.ts (production):
// 1. Call Chainlink Functions for real stock price
// 2. Return verified price data
// 3. Return result to client

const { data, result } = await chainlinkFunctions.executeRequest({
  codeLocation: 0, // Inline code
  code: getStockPriceFunctionCode(),
  secretsLocation: 0,
  secrets: chainlinkSecrets,
  args: [symbol],
  subscriptionId: 123,
  gasLimit: 300000,
  languageHttps: 0, // Inline
});
```

### Phase 3: Chainlink Automation

Automate settlement trigger:

```typescript
// In smart contract:
function checkUpkeep(bytes calldata checkData)
  external view returns (bool upkeepNeeded, bytes memory performData)
{
  // Check if room.delay_ms has passed
  // Return true if ready for settlement
}

function performUpkeep(bytes calldata performData)
  external
{
  // Call settlement endpoint via Chainlink Automation
  // Fetch final price
  // Distribute payouts on-chain
}
```

### Phase 4: On-Chain Settlement

Move settlement fully on-chain:

```solidity
// Settlement calculation in PredictionRoom contract
function settleRoom(
  uint256 roomId,
  uint256 endingPrice
) external {
  // Calculate winners
  // Distribute payouts directly to wallets
  // Emit settlement events
  // Update room status
}
```

## Testing

### Local Testing

```bash
# Test price oracle
curl http://localhost:3000/api/prices
curl "http://localhost:3000/api/prices?symbol=MTN.NG"

# Test settlement (requires valid room)
curl -X POST http://localhost:3000/api/rooms/settle/[roomId]

# Check settlement status
curl http://localhost:3000/api/rooms/settle/[roomId]
```

### Settlement Logic Verification

The settlement utility includes validation:

```typescript
const validation = validateSettlement(predictions, startingPrice, endingPrice);
if (!validation.valid) {
  console.error(validation.error);
}
```

## Configuration

### Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

For Chainlink Functions (Phase 2):

```
CHAINLINK_FUNCTIONS_ROUTER=...
CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=...
CHAINLINK_FUNCTIONS_SECRET=...
```

## Error Handling

Settlement endpoint includes comprehensive error handling:

- Room not found (404)
- Already settled (400)
- Not started (400)
- No predictions (200 - marked complete)
- Unauthorized user (403)
- Price fetch failure (500)
- Database update failure (500)

## Performance Considerations

- **Batch Updates:** Predictions updated one-by-one to ensure consistency
- **Indices:** Optimized queries with database indices
- **Caching:** React Query caches settlement status (5-second refetch)
- **Price Volatility:** Deterministic simulation (±5%) for testing

## Next Steps

1. **Testing:** Verify settlement with actual rooms and predictions
2. **Chainlink Integration:** Implement real price feeds
3. **Automation:** Set up Chainlink Automation for triggered settlements
4. **UI Integration:** Add settlement UI to room completion flow
5. **Monitoring:** Add logging and alerts for failed settlements

## Code Quality

- ✅ No debug logging (production-ready)
- ✅ Full TypeScript coverage
- ✅ Error handling for all cases
- ✅ Database consistency ensured
- ✅ Payout calculation accuracy (rounded to 2 decimals)
