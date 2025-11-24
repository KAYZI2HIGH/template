# Developer Quick Reference Card

## 🎯 Project Status

**Status**: ✅ FULLY FUNCTIONAL  
**Version**: Pre-Smart Contract  
**Launch URL**: http://localhost:3001

---

## 📂 Key Files Location

### State Management

```
src/app/page.tsx              ← Main state & handlers
├─ allRooms                   ← Public demo rooms
├─ myRooms                    ← User created rooms
├─ userPredictions            ← All predictions
└─ hasUserPredictedInRoom     ← Duplicate prevention
```

### UI Components

```
src/components/
├─ MainContent.tsx            ← Room list & creation
├─ PredictionSlip.tsx         ← Prediction logic
├─ PredictionsList.tsx        ← Predictions display
├─ RoomCard.tsx               ← Room card component
├─ RightSidebar.tsx           ← Right panel layout
└─ ui/select.tsx              ← Stock dropdown
```

### Data & Types

```
src/lib/
├─ types.ts                   ← Data interfaces
├─ stocks.ts                  ← Stock data (8 options)
└─ utils.ts                   ← Utility functions
```

---

## 🔑 Key Data Structures

### Room Object

```typescript
{
  id: string;                 // "room-${timestamp}"
  name: string;               // "MTN Prediction"
  symbol: string;             // "MTN.NG"
  status: "LIVE";             // Status badge text
  roomStatus: "waiting" | "started" | "completed"; // State
  time: string;               // "2h remaining"
  timeDuration: string;       // "2h"
  price: string;              // "₦250.50"
  minStake: number;           // 100 (minimum bet)
  up: number;                 // Players predicted UP
  down: number;               // Players predicted DOWN
  ownerId?: string;           // Room creator ID
}
```

### UserPrediction Object

```typescript
{
  id: number; // Sequential ID
  name: string; // Room name
  status: "active" | "completed" | "waiting";
  prediction: "UP" | "DOWN"; // User's bet
  stake: string; // "50 cUSD"
  timeRemaining: string; // "2h remaining"
  players: number; // Total in room
}
```

### Create Room Data

```typescript
{
  name: string; // Room name (required)
  symbol: string; // Stock symbol from dropdown (required)
  timeDuration: string; // "2h", "30m", etc (required)
  minStake: string; // Amount as string (required)
}
```

---

## 🔄 Main Handler Functions

### Create Room

```typescript
handleCreateRoom(roomData: CreateRoomData) {
  → Creates Room object
  → Assigns unique ID
  → Sets roomStatus = "waiting"
  → Adds to myRooms array
  → Console logs creation
}
```

### Join Room

```typescript
handleJoinRoom(roomIndex: number) {
  → Sets selectedRoom
  → Opens Prediction Slip
  → Clears prediction flag
}
```

### Place Prediction

```typescript
handlePredictDirection(direction: "UP" | "DOWN") {
  → Creates UserPrediction
  → Adds to userPredictions array
  → Navigates to "My Predictions"
  → Clears stake input
}
```

### View Prediction Details

```typescript
handleViewDetails(predictionId: number) {
  → Finds prediction
  → Finds matching room
  → Sets hasUserPredictedInRoom = true
  → Opens Prediction Slip (read-only)
}
```

### Start Room

```typescript
handleStartRoom() {
  → Finds room by ID
  → Changes roomStatus to "started"
  → Updates appropriate array
  → Console logs action
}
```

---

## 🎨 Status Badge Colors

```typescript
"waiting"   → 🟨 Yellow    (bg-yellow-500/20, text-yellow-300)
"started"   → 🔵 Blue      (bg-blue-500/20, text-blue-300)
"completed" → 🟢 Green     (bg-green-500/20, text-green-300)
"active"    → 🔵 Blue      (prediction status)
```

---

## 📊 Stock Options (8 Total)

```typescript
const AVAILABLE_STOCKS = [
  { symbol: "MTN.NG", name: "MTN Nigeria", currentPrice: "₦250.50" },
  { symbol: "DANGOTE.NG", name: "Dangote Group", currentPrice: "₦1,250.00" },
  { symbol: "BUACEMENT.NG", name: "BUA Cement", currentPrice: "₦580.25" },
  { symbol: "AIRTELAFRI.NG", name: "Airtel Africa", currentPrice: "₦1,450.75" },
  { symbol: "ZENITHBANK.NG", name: "Zenith Bank", currentPrice: "₦32.40" },
  { symbol: "GTCO.NG", name: "Guaranty Trust Co.", currentPrice: "₦42.85" },
  { symbol: "SEPLAT.NG", name: "SEPLAT Energy", currentPrice: "₦785.30" },
  { symbol: "NESTLE.NG", name: "Nestle Nigeria", currentPrice: "₦890.00" },
];
```

---

## 🔌 API Integration Points (TODO)

### Create Room

```javascript
// Current: setMyRooms([...myRooms, newRoom])
// Future:
const response = await POST("/api/rooms", newRoom);
const txHash = response.transactionHash;
// Store txHash in database
```

### Place Prediction

```javascript
// Current: setUserPredictions([...userPredictions, newPrediction])
// Future:
const response = await POST("/api/predictions", newPrediction);
const txHash = response.transactionHash;
// Store in database with room reference
```

### Start Room

```javascript
// Current: setMyRooms(updated array)
// Future:
const response = await PUT(`/api/rooms/${roomId}/start`);
const blockNumber = response.blockNumber;
// Record start time on blockchain
```

---

## 🚀 Quick Deploy Checklist

- [ ] Test all user flows (use QUICK_TEST_GUIDE.md)
- [ ] Check console for errors (F12)
- [ ] Verify no TypeScript errors
- [ ] Test on mobile viewport
- [ ] Check all form validations
- [ ] Verify search works
- [ ] Test tab navigation
- [ ] Confirm empty states display

---

## 🐛 Common Debugging

### Room not appearing?

```javascript
// Check: MainContent.tsx line ~65
const myRooms = rooms.filter((room) => room.ownerId === "current-user-id");
// Verify ownerId is set correctly in handleCreateRoom
```

### Prediction not saving?

```javascript
// Check: page.tsx line ~70
setUserPredictions([...userPredictions, newPrediction]);
// Verify structure matches UserPrediction interface
```

### Duplicate buttons showing?

```javascript
// Check: PredictionSlip.tsx line ~140
if (hasUserPredictedInRoom) {
  // Should show message instead of buttons
}
```

### Stock dropdown not working?

```javascript
// Check: MainContent.tsx imports
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Verify @radix-ui/react-select is installed
```

---

## 📝 Code Patterns Used

### Immutable State Updates

```typescript
// ✅ Correct
setMyRooms([...myRooms, newRoom]);
setMyRooms(myRooms.map((r) => (r.id === id ? updated : r)));

// ❌ Avoid
myRooms.push(newRoom);
myRooms[0] = updated;
```

### Conditional Rendering

```typescript
{
  isOwner ? (
    <OwnerView />
  ) : hasUserPredicted ? (
    <PredictedMessage />
  ) : (
    <PredictionButtons />
  );
}
```

### Array Finding

```typescript
const room = allRooms.find((r) => r.id === roomId);
const roomIndex = allRooms.findIndex((r) => r.id === roomId);
const filtered = allRooms.filter((r) => r.symbol === symbol);
```

---

## 🔗 Component Dependencies

```
page.tsx (root)
    ├─→ LeftSidebar (independent)
    ├─→ MainContent
    │   └─→ RoomCard
    │       └─→ onJoin / onViewDetails callbacks
    └─→ RightSidebar
        ├─→ PredictionSlip
        │   ├─ Receives: selectedRoom, stake, handlers
        │   ├─ Shows: UP/DOWN buttons or message
        │   └─ Calls: onPredictDirection, onStartRoom
        └─→ PredictionsList
            ├─ Shows: All user predictions
            └─ Calls: onViewDetails callback
```

---

## 📱 Responsive Breakpoints

```css
/* Three-column layout used */
Main: flex-1         /* Takes available space */
Right: w-80          /* Fixed 320px width */
Left: (fixed width)  /* LeftSidebar */
```

---

## 🔐 Current Limitations

| Feature       | Status       | Note                              |
| ------------- | ------------ | --------------------------------- |
| Persistence   | ❌ In-memory | Will persist after smart contract |
| Auth          | ❌ Hardcoded | Current: "current-user-id"        |
| Real Prices   | ❌ Mock data | Use API when available            |
| Live Updates  | ❌ Static    | Need WebSockets                   |
| Player Counts | ❌ Fixed     | Will update with contracts        |

---

## ✅ Testing Commands

```bash
# Start dev server
pnpm run dev

# Type check
pnpm run type-check

# Build
pnpm run build

# View in browser
# Already running at http://localhost:3001
```

---

## 📚 Related Files

- 📖 **IMPLEMENTATION_SUMMARY.md** - Full technical details
- 📖 **USER_FLOW_TESTING_GUIDE.md** - 10 detailed test scenarios
- 📖 **QUICK_TEST_GUIDE.md** - 2-minute quick test
- 📖 **CHANGELOG.md** - Complete change log
- 📖 **This file** - Quick reference

---

## 🎯 Next Milestone

**Smart Contract Integration**

1. Define contract ABIs
2. Add contract call handlers
3. Implement transaction flows
4. Add pending/error states
5. Listen for contract events

**Estimated**: After testing verification ✅

---

**Version**: 1.0 (Pre-Smart Contract)  
**Last Updated**: November 23, 2025  
**Status**: 🟢 Ready for Testing
