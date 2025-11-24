# State Management & Data Structure Reference

## State Variables

### Rooms State

```typescript
const [rooms, setRooms] = useState<Room[]>([
  // 5 mock rooms - users can join any of them
  // Room 5 (SEPLAT) has ownerId set - user owns this one
]);
```

### User Predictions State

```typescript
const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([
  // 2 initial predictions
  // 1. MTN (ACTIVE) - status shows in My Predictions
  // 2. DANGCEM (COMPLETED) - shows outcome and payout
]);
```

### UI State

```typescript
const [selectedRoomId, setSelectedRoomId] = useState<string | null>("1")
const [activeTab, setActiveTab] = useState<"slip" | "predictions">("slip")
const [stake, setStake] = useState("100")
const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set(["1", "2"]))
const [myRooms, setMyRooms] = useState<Room[]>([...])  // Owned rooms
```

---

## Computed Values (Auto-Update)

```typescript
// Current room being viewed
const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
// Returns: Room object or undefined

// Has user joined this room?
const hasJoinedRoom = selectedRoomId ? joinedRooms.has(selectedRoomId) : false;
// Returns: boolean

// Does user own this room?
const isViewingOwnedRoom =
  selectedRoom && myRooms.find((r) => r.id === selectedRoom.id);
// Returns: Room object (truthy) or undefined (falsy)

// Has user bet in this room?
const hasUserPredictedInRoom =
  selectedRoom && userPredictions.some((p) => p.roomId === selectedRoom.id);
// Returns: boolean
```

---

## Event Handlers

### handleJoinRoom(roomId: string)

```typescript
// What it does:
// 1. Add roomId to joinedRooms Set
// 2. Set selectedRoomId to that room
// 3. Log to console

// When called:
// - User clicks "Join" button on a room card

// Result:
// - Room appears in sidebar
// - Prediction Slip shows room details
// - Bet buttons appear (if room is waiting)
```

### handleViewOwnedRoomDetails(roomId: string)

```typescript
// What it does:
// 1. Set selectedRoomId to that room
// 2. Log to console

// When called:
// - User clicks "View Details" on owned room

// Result:
// - Same as join (sidebar + prediction slip)
// - But "Start Game" button shows (owner feature)
```

### handleCreateRoom(roomData)

```typescript
// What it does:
// 1. Create new Room object from form data
// 2. Add to rooms array
// 3. Add to myRooms array (user owns it)
// 4. Set as selectedRoomId

// When called:
// - User submits create room dialog

// Result:
// - New room appears in "All Rooms" and "My Rooms"
// - Can immediately place bets or start
```

### handleStakeChange(value: string)

```typescript
// What it does:
// 1. Update stake state with new value

// When called:
// - User types in stake input field

// Result:
// - stake value updates
// - UP/DOWN buttons enable/disable based on validity
```

### handlePredictDirection(direction: "UP" | "DOWN")

```typescript
// What it does:
// 1. Create UserPrediction object
// 2. Add to userPredictions array
// 3. Update room UP/DOWN stats
// 4. Update rooms array
// 5. hasUserPredictedInRoom becomes true
// 6. Log to console

// When called:
// - User clicks UP or DOWN button

// Result:
// - New prediction added
// - Buttons hide (can't bet twice in same room)
// - Message shows "already placed prediction"
// - Room stats update (visible in room card)
```

### handleStartRoom()

```typescript
// What it does:
// 1. Find selected room in rooms array
// 2. Change status: "waiting" → "active"
// 3. Change roomStatus: "waiting" → "started"
// 4. Update rooms array
// 5. Log to console

// When called:
// - Owner clicks "Start Game" button

// Result:
// - Room status changes
// - All action buttons disappear
// - Status message shows "Game in progress"
// - Room card badge changes color
```

### handleViewPredictionDetails(predictionId: number)

```typescript
// What it does:
// 1. Find prediction by ID
// 2. Extract roomId from prediction
// 3. Set selectedRoomId to that room
// 4. Set activeTab to "slip"
// 5. Log to console

// When called:
// - User clicks "View Details" in My Predictions list

// Result:
// - Room details load in Prediction Slip
// - Shows appropriate buttons based on room state
// - User can see which room they bet in
```

---

## Room Object Structure

```typescript
interface Room {
  id: string;
  name: string;
  symbol: string;
  status: "active" | "waiting"; // For display (yellow/blue badge)
  roomStatus: "waiting" | "started"; // For logic (betting/playing)
  time: string; // e.g., "2h remaining"
  timeDuration: string; // e.g., "2h"
  price: string; // e.g., "₦290.50"
  minStake: number; // Minimum bet amount
  up: number; // Number of UP bets
  down: number; // Number of DOWN bets
  ownerId?: string; // Optional: who created this room
}
```

### Room Examples in Test Data:

**Room 1 (MTN) - Joined, Game Started**

```
id: "1"
name: "MTN Stock Price Movement"
status: "active", roomStatus: "started"
Can't place bets (game already running)
Shows message: "Game in progress"
```

**Room 2 (Dangote) - Joined, Waiting**

```
id: "2"
name: "Dangote Cement Rally"
status: "waiting", roomStatus: "waiting"
Can place bets (game hasn't started)
Shows UP/DOWN buttons
NO "Start Game" button (not owner)
```

**Room 5 (SEPLAT) - Owned, Waiting**

```
id: "5"
name: "SEPLAT Energy Surge"
status: "waiting", roomStatus: "waiting"
ownerId: "current-user-id"  ← User owns this!
Can place bets
Shows UP/DOWN buttons
Shows "Start Game" button (owner feature)
```

---

## UserPrediction Object Structure

```typescript
interface UserPrediction {
  id: number;
  name: string; // e.g., "MTN Stock Prediction"
  status: "active" | "completed";
  prediction: "UP" | "DOWN";
  stake: string; // e.g., "500 cUSD"
  roomId: string; // Which room is this bet for

  // For active predictions:
  timeRemaining?: string; // e.g., "45 minutes"
  players?: number;
  playersJoined?: number;

  // For completed predictions:
  outcome?: "WIN" | "LOSS";
  payout?: string; // e.g., "487.50 cUSD"
}
```

### Prediction Examples:

**Active Prediction**

```
id: 1
name: "MTN Stock Prediction"
status: "active"
prediction: "UP"
stake: "500 cUSD"
roomId: "1"
timeRemaining: "45 minutes"
players: 20
playersJoined: 12
```

**Completed Prediction**

```
id: 2
name: "Previous DANGCEM Bet"
status: "completed"
prediction: "DOWN"
stake: "250 cUSD"
roomId: "2"
outcome: "WIN"
payout: "487.50 cUSD"
```

---

## State Flow Diagram

```
User Action → Handler → Update State → Compute Values → Re-render → UI Updates

Examples:

1. Click "Join" Room 2
   → handleJoinRoom("2")
   → setJoinedRooms adds "2"
   → selectedRoomId = "2"
   → selectedRoom = Room 2 object
   → hasJoinedRoom = true
   → PredictionSlip shows Room 2
   → UP/DOWN buttons visible

2. Click "UP" button
   → handlePredictDirection("UP")
   → Create UserPrediction
   → Add to userPredictions
   → Update Room UP count
   → hasUserPredictedInRoom = true
   → PredictionSlip hides buttons
   → Message shows "already placed"

3. Click "Start Game"
   → handleStartRoom()
   → Room status: "waiting" → "active"
   → Room roomStatus: "waiting" → "started"
   → Update rooms array
   → PredictionSlip re-renders
   → All buttons hide
   → Status message shows
```

---

## Conditional Rendering Logic

### PredictionSlip Component Uses These Values:

```typescript
// Check if user has bet in THIS room
const userHasBetInThisRoom = userPredictions.some(
  (pred) => pred.roomId === selectedRoomId
);

// SCENARIO 1: Owner + Waiting
if (isViewingOwnedRoom && room?.roomStatus === "waiting") {
  showStartButton = true; // ALWAYS
  showBetButtons = !userHasBetInThisRoom;
  showAlreadyBetMessage = userHasBetInThisRoom;
}

// SCENARIO 2: Player + Waiting
else if (room?.roomStatus === "waiting" && !isViewingOwnedRoom) {
  showStartButton = false; // NEVER
  showBetButtons = !userHasBetInThisRoom;
  showAlreadyBetMessage = userHasBetInThisRoom;
}

// SCENARIO 3: Started or Completed
else {
  showStartButton = false;
  showBetButtons = false;
  showStatusMessage = true;
}
```

---

## Data Flow Summary

### Input Flows (User Actions)

```
User clicks button → Handler called → Handler updates state
```

### Output Flows (UI Updates)

```
State changes → Computed values update → Component re-renders → UI changes
```

### Example: Complete Bet Flow

```
1. User types stake
   → handleStakeChange("200")
   → stake state = "200"

2. User clicks UP button
   → handlePredictDirection("UP")
   → userPredictions += new prediction
   → rooms[id].up += 1
   → selectedRoom changes (computed)
   → hasUserPredictedInRoom = true (computed)

3. Component re-renders
   → PredictionSlip checks hasUserPredictedInRoom
   → Returns conditional JSX
   → Buttons hidden
   → Message shown
   → Room stats updated

4. User sees:
   ✅ Buttons disappear
   ✅ Message "already placed"
   ✅ Room UP count increases
```

---

## Testing State Values

### Check in Browser DevTools

1. Open Console (F12)
2. Look for logs like:

   ```
   ✅ Successfully joined room 1
   🎯 Predicted UP on MTN with 100 cUSD
   🚀 Room started: SEPLAT Energy Surge
   ```

3. State changes show up as:
   - Buttons appearing/disappearing
   - Messages changing
   - Room stats updating
   - Sidebar room selection changing

---

## State Persistence Note

⚠️ **Important:** State resets on page refresh!

- This is normal for mock data
- Not connected to database
- Only persists during current session

To test flows:

1. Join room
2. Place bet
3. View predictions
4. etc.

All changes will be visible in UI and console until page refresh.
