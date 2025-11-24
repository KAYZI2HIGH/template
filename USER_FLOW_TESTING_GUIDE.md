# Complete User Flow Testing Guide

## Overview

The entire user prediction room flow has been implemented and is ready for testing. The application is running on **http://localhost:3001**

## Available Stocks

The following stocks are available for room creation:

- **MTN.NG** - MTN Nigeria (₦250.50)
- **DANGOTE.NG** - Dangote Group (₦1,250.00)
- **BUACEMENT.NG** - BUA Cement (₦580.25)
- **AIRTELAFRI.NG** - Airtel Africa (₦1,450.75)
- **ZENITHBANK.NG** - Zenith Bank (₦32.40)
- **GTCO.NG** - Guaranty Trust Co. (₦42.85)
- **SEPLAT.NG** - SEPLAT Energy (₦785.30)
- **NESTLE.NG** - Nestle Nigeria (₦890.00)

---

## Test Scenario 1: Creating a Room

### Steps:

1. Click the **"Create Room"** button in the top-right of the main content area
2. Fill in the form:
   - **Room Name**: e.g., "MTN Price Rally"
   - **Stock Symbol**: Select from the dropdown (e.g., MTN.NG)
   - **Time Duration**: e.g., "2h" or "30m"
   - **Minimum Stake**: e.g., "100" (in cUSD)
3. Click **"Create Room"** button
4. The new room should appear in the **"My Rooms"** tab
5. Status badge should show **"waiting"** (yellow)

### Expected Behavior:

- Form validation prevents creation with missing fields
- Created rooms are immediately available for viewing
- Room appears with all entered details
- Initial predictions count: 0 UP, 0 DOWN

---

## Test Scenario 2: Joining a Room from "All Active Rooms"

### Steps:

1. Ensure you're on the **"All Active Rooms"** tab
2. Click the **"Join"** button on any room card
3. The **"Prediction Slip"** tab should automatically open in the right sidebar
4. You should see:
   - Room details (name, price, time, players)
   - Current players list
   - Empty state message: "No Room Selected" initially

### Expected Behavior:

- Right sidebar switches to "Prediction Slip" view
- Room information is displayed
- Stake input field is available
- UP/DOWN prediction buttons are enabled
- "Place a Prediction" section is visible

---

## Test Scenario 3: Placing a Prediction as a Player

### Steps:

1. Join any room from "All Active Rooms" (follow Test Scenario 2)
2. Enter a stake amount in the **"Stake Amount"** field (e.g., 50)
3. Click **"UP"** or **"DOWN"** button to place prediction
4. You should be automatically redirected to **"My Predictions"** tab

### Expected Behavior:

- Prediction is recorded with correct details
- Stake amount is displayed with "cUSD" suffix
- Prediction appears in "My Predictions" list
- Status badge shows "active" (blue)
- Colored left border indicates status
- UP/DOWN prediction is visible

---

## Test Scenario 4: Viewing Your Created Room Details

### Steps:

1. Switch to **"My Rooms"** tab
2. Click the **"View Details"** button on your created room
3. The **"Prediction Slip"** tab should open

### Expected Behavior:

- You see a "waiting" status badge (yellow)
- "Place a Prediction" section is available
- "Start Room" button is available
- Stake input is visible
- UP/DOWN buttons are ready to use

---

## Test Scenario 5: Owner Placing a Prediction in Their Own Room

### Steps:

1. Navigate to "My Rooms" and click "View Details"
2. Enter a stake amount (e.g., 100)
3. Click **"UP"** or **"DOWN"** to place prediction
4. You should be redirected to "My Predictions"

### Expected Behavior:

- Owner is treated as a regular player for prediction purposes
- Prediction appears in "My Predictions" list
- Can still start the room from room details
- Status shows "active"

---

## Test Scenario 6: Starting a Room

### Steps:

1. Go to **"My Rooms"** and click "View Details" on a room
2. Click the **"Start Room"** button
3. Room status should change from "waiting" to "started"

### Expected Behavior:

- Room status badge changes to **"started"** (blue)
- Room is locked for new players
- Existing players can view their predictions
- Console log shows "Starting room: [Room Name]"

---

## Test Scenario 7: Preventing Multiple Predictions in Same Room

### Steps:

1. Create a room and place a prediction in it
2. Click "View Details" on the room from "My Predictions"
3. Observe the prediction slip

### Expected Behavior:

- **NO** UP/DOWN prediction buttons are visible
- Message displays: "You have already placed a prediction in this room."
- Stake field is still visible
- Player can only view their existing prediction

---

## Test Scenario 8: Search Functionality

### Steps:

1. Use the search box to filter rooms
2. Type "MTN" or any stock symbol
3. Only matching rooms should display

### Expected Behavior:

- Results filter in real-time
- Both room names and symbols are searchable
- Case-insensitive search works
- Clear button (×) appears when search is active
- Empty state message shows "No rooms match your search"

---

## Test Scenario 9: Switching Between Tabs

### Steps:

1. **All Active Rooms** → Join a room → Prediction Slip tab opens
2. **My Predictions** → View your active predictions
3. Click a prediction → "View Details" → Prediction Slip opens
4. **My Rooms** → View your created rooms
5. Switch back and forth between tabs

### Expected Behavior:

- Tab switching is smooth
- Room state persists
- Correct content displays for each tab
- Navigation works in both directions

---

## Test Scenario 10: Empty States

### Test 10a: No Rooms Available

- Go to "All Active Rooms" with empty filter
- **Expected**: Shows "No active rooms available" message
- Icon (Zap) displays in the center
- Helpful guidance text provided

### Test 10b: No My Rooms

- Go to "My Rooms" with no created rooms
- **Expected**: Shows "You haven't created any rooms yet" message
- Suggests clicking "Create Room" button

### Test 10c: No Predictions

- Go to "My Predictions" with no placed predictions
- **Expected**: Shows "No Predictions Yet" message
- Guidance: "Start by placing a bet in the Prediction Slip tab"

---

## Key Features to Test

### ✅ Form Validation

- [ ] Stock symbol is required (dropdown selection)
- [ ] Room name is required
- [ ] Time duration is required
- [ ] Minimum stake is required (number input)
- [ ] Create button is disabled until all fields are filled

### ✅ Room Status Management

- [ ] New rooms start with "waiting" status
- [ ] Rooms show correct status badge color
- [ ] Status updates when room is started
- [ ] Waiting rooms only accept new players

### ✅ Prediction Flow

- [ ] Stake must be entered before prediction
- [ ] UP/DOWN buttons are disabled with 0 or empty stake
- [ ] Prediction buttons work correctly
- [ ] User is redirected to "My Predictions" after placing prediction

### ✅ Business Logic

- [ ] Users cannot place multiple predictions in same room
- [ ] Room owners can place predictions in their rooms
- [ ] Room owners can start rooms
- [ ] Only owners see "Start Room" button
- [ ] Status prevents confusion about room state

### ✅ UI/UX

- [ ] All text is visible and properly styled
- [ ] Buttons are clickable and responsive
- [ ] Empty states are informative
- [ ] Status badges use correct colors:
  - Yellow: waiting
  - Blue: started/active
  - Green: completed

---

## Technical Details

### State Management (page.tsx)

- `allRooms`: Public rooms created in demo
- `myRooms`: User's created rooms
- `userPredictions`: User's placed predictions
- `hasUserPredictedInRoom`: Prevents duplicate predictions

### Room Properties

```typescript
{
  id: string;
  name: string;
  symbol: string;
  status: "LIVE" | etc;
  roomStatus: "waiting" | "started" | "completed";
  time: string;
  timeDuration: string;
  price: string;
  minStake: number;
  up: number;
  down: number;
  ownerId?: string;
}
```

### Prediction Properties

```typescript
{
  id: number;
  name: string;
  status: "active" | "completed" | "waiting";
  prediction: "UP" | "DOWN";
  stake: string;
  timeRemaining: string;
  players: number;
}
```

---

## Console Logging

Watch the browser console for:

- `"Creating room:"` → Shows room data when created
- `"Starting room:"` → Shows room name when started
- Helps verify backend integration points

---

## Ready for Next Phase

Once testing is complete and verified:

1. All state management flows work correctly
2. UI reflects accurate data
3. Navigation is smooth
4. **Then proceed to smart contract integration**

---

## Notes

- All data is currently in-memory (lost on page refresh)
- Stock prices are mock data
- Player counts (UP/DOWN) don't update dynamically yet
- Ready for blockchain integration
