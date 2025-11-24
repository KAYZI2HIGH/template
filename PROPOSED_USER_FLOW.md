# 📊 Proposed User Flow - Nigerian Stock Predictions App

## Overview

This document outlines the complete user journey through the application based on the current frontend codebase architecture and component structure.

---

## 🎯 Core Application States

### Entry Point: Home Page (`page.tsx`)

The application is a **Three-Panel Layout**:

```
┌─────────────────────────────────────────────────────┐
│  Left Sidebar  │  Main Content  │  Right Sidebar    │
│  (LeftSidebar) │ (MainContent)  │ (RightSidebar)    │
│                │                │                    │
│  • Wallet Info │ • Room List    │ • Prediction Slip │
│  • How to Play │ • Search       │ • My Predictions  │
│  • Info        │ • Create Room  │ • Bet Entry       │
│  • Actions     │                │ • Start Game      │
└─────────────────────────────────────────────────────┘
```

---

## 📱 Left Sidebar - User Context Panel

### Components & Information

- **Logo & Title**: "Nigerian Stock Predictions"
- **Wallet Section**:
  - Shows connection status: "Connected"
  - Displays wallet address (truncated): `0x1234...5678`
  - Shows balance: `100 cUSD`
- **How to Play** (4 Steps):
  1. Browse active rooms or create a new one
  2. Predict UP or DOWN for Nigerian stocks
  3. Wait for resolution via Chainlink oracle
  4. Claim payouts automatically
- **Info Section**:
  - Technical details about the app
  - Network: Celo Alfajores
  - Oracle: Chainlink Functions
  - Data Source: Financial Modeling Prep
- **Action Buttons**:
  - "Get testnet cUSD 💰" - To fund account
  - "Go To Repository 📁" - To view source code

### User Interaction

- **Static Display**: User reads wallet info, instructions, and technical details
- **No State Changes**: This panel is informational only
- **Visual Hierarchy**: Helps new users understand the game

---

## 🎮 Main Content - Room Browsing & Discovery

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Header: ROOMS + Search Bar              │
├─────────────────────────────────────────┤
│ • All Active Rooms | My Rooms           │
├─────────────────────────────────────────┤
│ [Room Card 1] [Room Card 2] [Room Card 3]│
│ [Room Card 4] [Room Card 5] ...         │
└─────────────────────────────────────────┘
```

### Features & State Management

#### 1. **Tab Navigation** (activeRoomTab: "all" | "created")

- **All Active Rooms Tab**:
  - Shows all public rooms (not owned by current user)
  - Displays rooms: MTN (started), Dangote (waiting), Banks (started), Zenith (started)
  - Button on cards: "Join" (green button)
- **My Rooms Tab**:
  - Shows only rooms created by current user (ownerId === "current-user-id")
  - Displays rooms: SEPLAT Energy Surge (waiting)
  - Button on cards: "View Details" (blue button)

#### 2. **Search & Filter**

- Real-time search input across room names and symbols
- Filters both tabs independently
- Case-insensitive matching
- Updates displayed rooms as user types

#### 3. **Room Card Display**

Each room card shows:

- **Room Name**: e.g., "MTN Stock Price Movement"
- **Symbol**: e.g., "MTN.NG" (styled with green background)
- **Time Remaining**: e.g., "2h remaining"
- **Current Price**: e.g., "₦290.50"
- **Status Badge**: "waiting", "started", or "completed"
- **Prediction Stats**:
  - UP count (green): Number of UP predictions
  - DOWN count (red): Number of DOWN predictions
- **Action Button**:
  - Non-owned rooms: "Join" (green) → Triggers `handleJoinRoom`
  - Owned rooms: "View Details" (blue) → Triggers `handleViewOwnedRoomDetails`

#### 4. **Create Room Dialog**

- **Trigger**: "+" button in header
- **Form Fields**:
  - Room Name (text input)
  - Symbol (dropdown - AVAILABLE_STOCKS)
  - Time Duration (e.g., "2h", "30m")
  - Minimum Stake (number input)
- **Validation**: All fields required
- **On Submit**:
  - Creates new Room object with:
    - Auto-generated ID
    - ownerId: "current-user-id"
    - roomStatus: "waiting"
    - up/down counts: 0
  - Adds to both `rooms` and `myRooms` arrays
  - Sets as selectedRoomId
  - Closes dialog
  - Logs to console: "✨ Room created successfully"

### State Management

- **rooms**: Array of all available rooms (includes public + owned)
- **myRooms**: Array of only owned rooms
- **activeRoomTab**: Controls which set displays
- **searchQuery**: Stores current search input
- **showCreateDialog**: Boolean for dialog visibility
- **createFormData**: Form field values

### User Journeys in Main Content

#### Journey A: Join an Existing Room

```
1. User sees "All Active Rooms" tab (default)
2. Finds room card (e.g., Dangote Cement)
3. Clicks "Join" button
4. Action: handleJoinRoom("2")
   - Adds room ID "2" to joinedRooms Set
   - Sets selectedRoomId = "2"
   - Right sidebar updates to show room
   - Console: "✅ Successfully joined room 2"
5. User can now place bets in this room
```

#### Journey B: View Owned Room

```
1. User clicks "My Rooms" tab
2. Sees room card (e.g., SEPLAT Energy)
3. Clicks "View Details" button
4. Action: handleViewOwnedRoomDetails("5")
   - Sets selectedRoomId = "5"
   - Right sidebar updates to show room
   - Shows "Start Game" button (owner privilege)
   - Console: "👀 Viewing owned room details: 5"
5. User can bet or start the game
```

#### Journey C: Search for Room

```
1. User types in search bar (e.g., "MTN")
2. Rooms filter in real-time
3. Only matching rooms display
4. User clicks "Join" on filtered room
5. Normal flow continues
```

#### Journey D: Create New Room

```
1. User clicks "+" button
2. Create Room dialog opens
3. User fills form:
   - Name: "Telco Stocks Rising"
   - Symbol: "MTNN"
   - Duration: "1h"
   - Min Stake: "100"
4. Clicks "Create" button
5. Action: handleCreateRoom(formData)
   - New Room object created
   - Added to rooms and myRooms arrays
   - selectedRoomId set to new room
   - Dialog closes
   - Console: "✨ Room created successfully..."
6. Right sidebar shows new room details
7. User can immediately start betting
```

---

## 💰 Right Sidebar - Betting & Predictions Interface

### Layout Structure

```
┌────────────────────────────────────┐
│ [Prediction Slip] [My Predictions] │ ← Tab Buttons
├────────────────────────────────────┤
│                                    │
│  PREDICTION SLIP or PREDICTIONS    │
│  (Content changes based on tab)    │
│                                    │
└────────────────────────────────────┘
```

### Tab 1: Prediction Slip (Active by Default)

#### Purpose

Shows selected room details with conditional action buttons based on:

- Room status (waiting/started/completed)
- User relationship (owner/player)
- User's betting history in this room

#### Display Content

**When No Room Selected** (canViewRoom = false):

```
┌─────────────────────────────────┐
│    📈 (Icon)                    │
│                                 │
│  No Room Selected               │
│                                 │
│  Click "Join" button on a room  │
│  or view your own rooms to      │
│  get started                    │
└─────────────────────────────────┘
```

**When Room Selected** (canViewRoom = true):

1. **Room Header**:

   - Room name: e.g., "SEPLAT Energy Surge"
   - Room ID badge

2. **Room Info Section**:

   - Current Price: (masked dots for demo)
   - Min Stake
   - Status badge: Color-coded (yellow=waiting, blue=active, green=completed)
   - Time remaining from selected room

3. **Player Statistics**:

   - UP predictions count
   - DOWN predictions count
   - Total players

4. **Player List** (Mock Data):
   ```
   Player 1: 0x5f2f...8c3a
   Player 2: 0xA7d3...2e9b
   Player 3: 0x92E1...5f4c
   Player 4: 0xc1B9...3d7a
   ```

#### Conditional Button Rendering

**Scenario 1: Owner + Waiting Room**

```
✅ "Start Game" button (visible)
   - Condition: isViewingOwnedRoom && roomStatus === "waiting"
   - Action: handleStartRoom()
   - Changes room.roomStatus: "waiting" → "started"
   - Updates UI immediately
   - Console: "🚀 Room started: [name]"

IF no bet placed yet:
✅ UP / DOWN buttons (visible)
   - Condition: !userHasBetInThisRoom
   - Action: handlePredictDirection("UP" | "DOWN")
   - Creates UserPrediction object
   - Updates room UP/DOWN counts
   - Console: "🎯 Predicted UP/DOWN on [name]..."

IF already bet:
✅ "Click Start to begin" message
   - Condition: userHasBetInThisRoom
   - Replaces bet buttons
   - Reminds owner to start the game
```

**Scenario 2: Player + Waiting Room**

```
❌ NO "Start Game" button (hidden)
   - Only owners can start games

✅ UP / DOWN buttons (if no bet)
   - Same as Scenario 1
   - Condition: !userHasBetInThisRoom

✅ "Click UP/DOWN to predict" message (if already bet)
   - Condition: userHasBetInThisRoom
   - Message: "Click START to begin"
```

**Scenario 3: Room Started/Completed**

```
❌ NO Action buttons
   - All buttons hidden

✅ Status Message
   - "Game is active! Wait for resolution."
   - OR "Game completed. Check results."

❌ Player can't place bets
   - No UP/DOWN buttons
```

#### Stake Input

- **Input Field**: Displays current stake value
- **State Variable**: `stake` (string, e.g., "100")
- **Trigger**: `onStakeChange` when user types
- **Used For**: Displayed in bet confirmation

### Tab 2: My Predictions

#### Purpose

Shows all predictions user has placed across all rooms

#### Display Content

**When No Predictions**:

```
┌─────────────────────────────────┐
│    ⚡ (Icon)                    │
│                                 │
│  No Predictions Yet             │
│                                 │
│  Start by placing a bet in      │
│  the Prediction Slip tab        │
└─────────────────────────────────┘
```

**When Predictions Exist**:

Each prediction card shows:

- **Left Indicator Bar**: Color-coded by status
  - Blue: Active prediction
  - Green: Completed prediction
  - Yellow: Waiting (pending)
- **Prediction Name**: e.g., "MTN Stock Prediction - UP"

- **Status Badge**:

  - "ACTIVE" (blue/teal background)
  - "COMPLETED" (green background)
  - "WAITING" (yellow background)

- **Details**:

  - Prediction: UP or DOWN (displayed with direction)
  - Stake: Amount bet (e.g., "500 cUSD")
  - Time Remaining: (if active)
  - Players: Count of total players (if active)

- **For Completed Predictions**:
  - Outcome: WIN or LOSS (green or red text)
  - Payout: Amount received (e.g., "487.50 cUSD")

#### Interaction

- **View Details Button**: Appears on hover/bottom of each card
- **On Click**:
  - Calls `handleViewPredictionDetails(predictionId)`
  - Actions:
    1. Finds prediction by ID
    2. Extracts prediction.roomId
    3. Sets selectedRoomId to that room ID
    4. Switches activeTab from "predictions" to "slip"
    5. Right sidebar displays room details for that prediction
    6. Console: "📊 Viewing room from prediction details..."

---

## 🔄 State Flow & Event Handlers

### Global State Variables (page.tsx)

```typescript
// Room & Prediction Data
rooms: Room[]                    // All rooms (public + owned)
userPredictions: UserPrediction[] // All user's bets
myRooms: Room[]                  // Only owned rooms

// UI State
selectedRoomId: string | null    // Currently viewed room
activeTab: "slip" | "predictions" // Right sidebar active tab
stake: string                    // Bet amount input value
joinedRooms: Set<string>         // Rooms user has joined
activeRoomTab: "all" | "created" // Main content tab

// Computed Values
selectedRoom: Room | undefined   // Find room by selectedRoomId
hasJoinedRoom: boolean          // Is room in joinedRooms?
isViewingOwnedRoom: boolean     // Is room in myRooms?
hasUserPredictedInRoom: boolean // Any prediction in this room?
```

### Event Handler Flow

#### 1. **handleJoinRoom(roomId: string)**

```
Input: Room ID to join
─────────────────────────────────
✓ Add roomId to joinedRooms Set
✓ Set selectedRoomId = roomId
✓ Log to console: "✅ Successfully joined room [id]"
✓ Right sidebar updates automatically
─────────────────────────────────
Output: Room appears in right sidebar
State Changes: joinedRooms, selectedRoomId
```

#### 2. **handleViewOwnedRoomDetails(roomId: string)**

```
Input: Owned room ID
─────────────────────────────────
✓ Set selectedRoomId = roomId
✓ Log to console: "👀 Viewing owned room details: [id]"
✓ Right sidebar displays room + "Start Game" button
─────────────────────────────────
Output: Room details shown with owner features
State Changes: selectedRoomId
```

#### 3. **handleCreateRoom(roomData)**

```
Input: {name, symbol, timeDuration, minStake}
─────────────────────────────────
✓ Validate all fields not empty
✓ Create new Room object:
  - id: auto-generated
  - ownerId: "current-user-id"
  - roomStatus: "waiting"
  - up/down: 0
✓ Add to rooms array
✓ Add to myRooms array
✓ Set selectedRoomId = newRoom.id
✓ Close dialog
✓ Log: "✨ Room created successfully..."
─────────────────────────────────
Output: New room created and displayed
State Changes: rooms, myRooms, selectedRoomId
```

#### 4. **handleStakeChange(value: string)**

```
Input: New stake amount from input
─────────────────────────────────
✓ Update stake state
─────────────────────────────────
Output: Input field shows new value
State Changes: stake
Usage: When user types in stake input field
```

#### 5. **handlePredictDirection(direction: "UP" | "DOWN")**

```
Input: Prediction direction selected
─────────────────────────────────
Prerequisites:
- selectedRoom must exist
- userHasBetInThisRoom must be false
- Room status must be "waiting"

Actions:
✓ Create UserPrediction object:
  - id: auto-incremented
  - prediction: direction
  - stake: current stake value
  - roomId: selectedRoom.id
  - status: "active"
  - timeRemaining: from selectedRoom
  - players: sum of room UP + DOWN

✓ Add to userPredictions array
✓ Update room stats:
  - If UP: room.up += 1
  - If DOWN: room.down += 1

✓ Log: "🎯 Predicted [direction] on [name]..."
✓ Update rooms array with modified room
✓ Right sidebar updates:
  - Bet buttons disappear
  - "Click Start to begin" message shows
─────────────────────────────────
Output: Prediction created, room stats updated
State Changes: userPredictions, rooms, room.up/down
```

#### 6. **handleStartRoom()**

```
Input: None (uses selectedRoom)
─────────────────────────────────
Prerequisites:
- selectedRoom must exist
- isViewingOwnedRoom must be true
- currentRoom.roomStatus must be "waiting"

Actions:
✓ Find selected room in rooms array
✓ Change room properties:
  - status: "active"
  - roomStatus: "started"

✓ Update rooms array with modified room
✓ Log: "🚀 Room started: [name]"
✓ Right sidebar updates:
  - "Start Game" button disappears
  - Status message shows "Game in progress"
─────────────────────────────────
Output: Room transitions to active state
State Changes: rooms, room.roomStatus
Players can no longer place bets
```

#### 7. **handleViewPredictionDetails(predictionId: number)**

```
Input: Prediction ID
─────────────────────────────────
Actions:
✓ Find prediction in userPredictions array
✓ Extract prediction.roomId
✓ Set selectedRoomId = prediction.roomId
✓ Switch activeTab: "predictions" → "slip"
✓ Log: "📊 Viewing room from prediction details..."
─────────────────────────────────
Output:
- Right sidebar switches to "Prediction Slip" tab
- Shows room details for that prediction
- User can see bet details and room status
State Changes: selectedRoomId, activeTab
```

---

## 📊 User Journey Scenarios

### Scenario 1: New User - First Time Playing

```
1. User opens app
   └─ Sees Left Sidebar with "How to Play" instructions
   └─ Main Content shows "All Active Rooms"
   └─ Right Sidebar shows "No Room Selected"

2. User reads instructions and gets testnet funds
   └─ Clicks "Get testnet cUSD" button
   └─ Follows external link to fund wallet

3. User browses available rooms
   └─ Sees 4 rooms in "All Active Rooms"
   └─ Reads room details: name, symbol, time, status

4. User picks room to join (e.g., "Dangote Cement Rally")
   └─ Clicks "Join" button
   └─ Main Content: handleJoinRoom("2")
   └─ Right Sidebar: Shows Prediction Slip with room details

5. User enters stake amount
   └─ Types "200" in stake input
   └─ handleStakeChange("200")
   └─ stake state = "200"

6. User makes prediction
   └─ Clicks "UP" button
   └─ handlePredictDirection("UP")
   └─ Creates prediction object
   └─ Updates room.up count
   └─ Shows "Click Start to begin" message
   └─ Console: "🎯 Predicted UP on Dangote..."

7. User checks prediction in "My Predictions" tab
   └─ Clicks "My Predictions" tab
   └─ Sees prediction card: "Dangote - UP", "200 cUSD", "ACTIVE"

8. User waits for game to resolve
   └─ Comes back later after game completes
   └─ Checks prediction status
   └─ Sees outcome: "WIN" with "387.50 cUSD" payout
```

### Scenario 2: Room Creator - Starting a Game

```
1. User wants to create new betting room
   └─ Clicks "+" button in Main Content header
   └─ Create Room dialog opens

2. User fills form
   └─ Name: "Telco Sector Rally"
   └─ Symbol: "MTNN"
   └─ Duration: "2h"
   └─ Min Stake: "150"
   └─ Clicks "Create"

3. Room is created
   └─ handleCreateRoom(formData)
   └─ New room added to rooms and myRooms
   └─ selectedRoomId = new room ID
   └─ Right Sidebar shows room with "Start Game" button

4. User invites others by sharing room (external flow)
   └─ Other users see room in "All Active Rooms"
   └─ They click "Join"
   └─ Their predictions add to room.up or room.down

5. Creator monitors bets coming in
   └─ Checks Main Content → "My Rooms" tab
   └─ Sees updated UP/DOWN counts on room card

6. Creator decides to start game
   └─ Clicks "View Details" on own room
   └─ Right Sidebar shows "Start Game" button
   └─ Clicks "Start Game"
   └─ handleStartRoom()
   └─ room.roomStatus changes: "waiting" → "started"
   └─ All bet buttons disappear
   └─ Message: "Game in progress"

7. Game resolves (external - Chainlink oracle)
   └─ Room status updates to "completed"
   └─ Payouts automatically calculated
   └─ Users see results in "My Predictions" tab

8. Creator can create another room
   └─ Repeat from step 1
```

### Scenario 3: Player Exploring All Features

```
1. User logs in
   └─ Sees already joined rooms: MTN (started), Previous DANGCEM (completed)
   └─ Has 2 predictions in "My Predictions" tab

2. User explores new rooms to join
   └─ Main Content → "All Active Rooms"
   └─ Searches for "Bank" rooms
   └─ Finds "Nigerian Banks Index"
   └─ Clicks "Join"

3. User places multiple bets
   └─ Joins Zenith Bank room
   └─ Enters stake: "300"
   └─ Clicks "DOWN"
   └─ Joins another room
   └─ Enters stake: "100"
   └─ Clicks "UP"

4. User checks all predictions
   └─ Right Sidebar → "My Predictions" tab
   └─ Sees 4 predictions total:
     - 2 previous predictions (1 active, 1 completed)
     - 2 new predictions (just created)

5. User clicks "View Details" on one prediction
   └─ handleViewPredictionDetails(predictionId)
   └─ Right Sidebar switches to "Prediction Slip"
   └─ Shows room details for that prediction
   └─ Can see game status

6. User switches back to predictions
   └─ Right Sidebar → "My Predictions" tab
   └─ Sees all bets again

7. User checks completed prediction
   └─ Clicks "View Details" on "Previous DANGCEM Bet"
   └─ Shows room details marked "COMPLETED"
   └─ No action buttons visible
   └─ Status message: "Game completed. Check results."
```

---

## 🎨 UI State Matrix

### Right Sidebar - Prediction Slip Tab States

| Condition                | User Type | Room Status       | Buttons Shown   | Message                      |
| ------------------------ | --------- | ----------------- | --------------- | ---------------------------- |
| Has joined OR owns       | Owner     | Waiting           | Start + UP/DOWN | -                            |
| Has joined OR owns       | Owner     | Waiting           | Start           | Already predicted            |
| Has joined OR owns       | Player    | Waiting           | UP/DOWN         | -                            |
| Has joined OR owns       | Player    | Waiting           | -               | Already predicted            |
| Has joined OR owns       | Any       | Started/Completed | -               | Game in progress / Completed |
| Not joined AND not owner | Any       | Any               | -               | No Room Selected             |

### Main Content - Room Display

| Condition | Tab        | Button Type | Button Label | Action                     |
| --------- | ---------- | ----------- | ------------ | -------------------------- |
| Not owned | All Active | Primary     | Join         | handleJoinRoom             |
| Owned     | My Rooms   | Secondary   | View Details | handleViewOwnedRoomDetails |

---

## 💡 Key Design Insights

### 1. **Intelligent Conditional Rendering**

The app shows different UI based on context:

- Owner sees "Start Game" button (only for their rooms)
- Player sees only bet buttons
- Prevents duplicate bets per room
- Hides actions when game is not in "waiting" state

### 2. **Clear Room Status Indicators**

Color-coded status badges help users quickly understand:

- Yellow = Waiting (can join/bet)
- Blue = Active/Started (game in progress)
- Green = Completed (results available)

### 3. **Prediction Tracking**

Users can:

- Place bets in "Prediction Slip" tab
- View all bets in "My Predictions" tab
- Click any prediction to view its room details
- See active and completed predictions separately

### 4. **Ownership Separation**

- "All Active Rooms": Shows joinable rooms
- "My Rooms": Shows created rooms (with admin features)
- Room Creator gets exclusive "Start Game" button

### 5. **State Persistence**

- Selected room stays highlighted
- Active tab remembered during session
- Stake amount preserved for next bet
- Room stats update in real-time

---

## 🚀 Technical Architecture

### Component Hierarchy

```
page.tsx (Root - State Management)
├── LeftSidebar (Static Display)
├── MainContent (Room Browsing)
│   ├── Header (Title + Search + Create Button)
│   ├── Tabs (All Rooms / My Rooms)
│   └── RoomCard[] (Join/View Buttons)
└── RightSidebar (Betting Interface)
    ├── Tabs (Prediction Slip / My Predictions)
    ├── PredictionSlip (Room Details + Actions)
    └── PredictionsList (User's Predictions)
```

### Data Flow

```
page.tsx (source of truth)
  ├── state.rooms → MainContent, RightSidebar
  ├── state.userPredictions → RightSidebar
  ├── state.selectedRoomId → RightSidebar
  └── handlers → All child components trigger state updates
```

### Computed Properties

```
selectedRoom = find room by selectedRoomId
hasJoinedRoom = check if selectedRoomId in joinedRooms
isViewingOwnedRoom = check if selectedRoom in myRooms
hasUserPredictedInRoom = any prediction with matching roomId
canViewRoom = room && (hasJoinedRoom OR isViewingOwnedRoom)
```

---

## ✅ Summary: Complete User Flow

1. **Explore**: Browse rooms in Main Content
2. **Join**: Click "Join" on public room or "View Details" on owned room
3. **Prepare**: Enter stake amount in Right Sidebar
4. **Predict**: Click UP or DOWN button
5. **Review**: Check prediction in "My Predictions" tab
6. **Monitor**: View room status and updated player counts
7. **Manage** (Owner only): Click "Start Game" to begin the game
8. **Results**: Wait for game completion and see payout

**All with real-time state updates and immediate UI feedback!**

---

## 🔮 Future Enhancement Points

Based on current architecture, these features could be easily added:

1. **Live Updates**: WebSocket integration for real-time room stats
2. **User Authentication**: Replace "current-user-id" with actual user account
3. **Blockchain Integration**: Connect to Celo contract for actual fund transfers
4. **Oracle Resolution**: Chainlink Functions call to resolve predictions
5. **Chat**: Room-specific chat for players to discuss
6. **Leaderboard**: Track top players by winnings
7. **Notifications**: Alerts when game starts/completes
8. **History**: Detailed stats on past predictions
9. **Filters**: Sort rooms by duration, min stake, activity
10. **Mobile Responsive**: Optimize for smaller screens

---

## 📝 Notes for Development

### Mock Data

- 6 rooms: 4 active (MTN, Banks, Zenith already started), 2 waiting (Dangote, SEPLAT)
- 2 user predictions: 1 active (MTN), 1 completed with results (DANGCEM)
- Joined rooms: ["1", "10"]
- User wallet: 100 cUSD balance

### Console Logging

All major actions logged for debugging:

- Room joins
- Room creation
- Bet placement
- Game starts
- Prediction viewing

### Error Handling

Graceful fallbacks for:

- No room selected
- No predictions placed
- Invalid form submissions
- Attempted duplicate bets
