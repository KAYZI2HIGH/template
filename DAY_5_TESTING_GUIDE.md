# Day 5 NaN Error Testing Guide

## What Was Fixed

The application had a "NaN cannot be converted to BigInt" error when users tried to:

- Place predictions (UP/DOWN bets)
- Start rooms
- Create rooms

This was caused by insufficient validation of numeric inputs before converting them for blockchain transactions.

## Fixes Applied

✅ **Stake input handler** now validates that only valid numbers can be stored
✅ **All three handlers** (create room, place prediction, start room) now:

- Validate numeric conversions before using them
- Check for NaN explicitly
- Verify values are positive
- Log actual values for debugging

✅ **Error messages** are now specific and helpful
✅ **Console logging** shows exact values being processed

## How to Test

### Test 1: Create a Room (Basic Validation)

1. Click on "Create Room" tab on left sidebar
2. Fill in:
   - Name: "Test Room"
   - Symbol: "TST"
   - Time Duration: "5" (minutes)
   - Minimum Stake: "50" (cUSD)
3. Click "Create Room"
4. **Expected Result:** Room appears on blockchain and in database

**Debug Check:**

- Open browser DevTools (F12)
- Go to "Console" tab
- Look for logs like: `📊 DEBUG: durationMinutes=5, minStakeAmount=50`
- Should show proper numeric values, not NaN

### Test 2: Place Prediction with Default Stake

1. Join a room by clicking "Join" button on any room
2. Click on the room to select it
3. You should see stake field with value "100"
4. Click "UP" or "DOWN" button
5. **Expected Result:** Prediction placed successfully, balance updates

**Debug Check:**

- Look in console for: `📊 DEBUG: stake="100", stakeAmount=100, type=number`
- Should show "100" as a number type, not NaN

### Test 3: Place Prediction with Custom Stake

1. Select a room you've joined
2. Clear the stake field and enter "75"
3. Click "UP" or "DOWN"
4. **Expected Result:** Prediction placed with 75 cUSD

**Debug Check:**

- Look in console for: `📊 DEBUG: stake="75", stakeAmount=75, type=number`
- Verify roomId is also valid

### Test 4: Invalid Input Prevention

1. Select a room you've joined
2. Try to type invalid values in stake field:
   - "abc" (letters)
   - "-50" (negative)
   - "!!!" (symbols)
3. **Expected Result:** Invalid values are not accepted in the field

**Why:** handleStakeChange now validates input:

```typescript
const numValue = parseFloat(value);
if (!isNaN(numValue) && numValue >= 0) {
  setStake(value); // Only set if valid
}
```

### Test 5: Empty Stake Validation

1. Select a room you've joined
2. Clear the stake field completely (leave it empty)
3. Try to click "UP" or "DOWN"
4. **Expected Result:** Button is disabled (grayed out)

**Why:** The button has `disabled={!stake || parseFloat(stake) <= 0}`

### Test 6: Start Room (As Owner)

1. Create a new room and select it
2. Click "Start Game" button
3. **Expected Result:** Room status changes to "started"

**Debug Check:**

- Look in console for: `📊 DEBUG: mockStartingPrice=250.5, type=number`
- Should show roomIdNumber as valid integer

### Test 7: Error Case - Invalid Room ID

1. This is harder to trigger directly, but if you see an error, it should now say:
   - "Invalid room ID: '...' is not a valid number"
   - Instead of just "NaN error"

## Console Debugging

All handlers now include debug logs with `📊 DEBUG:` prefix:

```
📊 DEBUG: stake="100", stakeAmount=100, type=number
📊 DEBUG: durationMinutes=5, minStakeAmount=50
📊 DEBUG: mockStartingPrice=250.5, type=number
📊 DEBUG: roomIdNumber=1, type=number
```

### How to Read Console:

1. Open DevTools: Press **F12**
2. Click on "Console" tab
3. Perform an action (create room, place bet, etc.)
4. Look for `📊 DEBUG:` messages
5. Verify values look correct (not NaN, not undefined, proper type)

## Expected Console Output

### When Creating Room (Success):

```
🔄 Creating room on smart contract: Test Room
📊 DEBUG: durationMinutes=5, minStakeAmount=50
✅ Room creation tx hash: 0x123abc...
```

### When Placing Prediction (Success):

```
🔄 Placing UP prediction on blockchain for Test Room...
📊 DEBUG: stake="100", stakeAmount=100, type=number
🎯 Predicted UP on Test Room with 100 cUSD
```

### When Starting Room (Success):

```
🔄 Starting room on blockchain: Test Room at price ₦250.5...
📊 DEBUG: mockStartingPrice=250.5, type=number
✅ Room start tx hash: 0x456def...
```

## If Error Still Appears

1. **Take a screenshot** of the error toast notification
2. **Copy console output** - right-click in console → Select All → Copy
3. **Check the debug log** for actual values
4. **Verify:**
   - You're connected to Celo Sepolia testnet (not mainnet)
   - Your wallet has some testnet CELO for gas fees
   - Input values are visible in the UI

## Technical Details for Developers

### Validation Layers

**Layer 1: Input Handler**

```typescript
// handleStakeChange - prevents NaN from reaching state
if (!isNaN(numValue) && numValue >= 0) {
  setStake(value);
}
```

**Layer 2: Handler Validation**

```typescript
// handlePredictDirection - validates before contract call
if (!stakeAmount || isNaN(stakeAmount) || stakeAmount <= 0) {
  throw new Error(`Invalid stake amount: "${stake}" is not a valid number`);
}
```

**Layer 3: Contract Client Validation**

```typescript
// placePrediction in contract-client.ts - final safety check
if (!stakeAmount || isNaN(stakeAmount) || stakeAmount <= 0) {
  throw new Error("Invalid stake amount: " + stakeAmount);
}
```

### Files Modified

- `apps/web/src/app/page.tsx` - handlers updated with validation
- `apps/web/src/lib/contract-client.ts` - already had validation (no changes)

## Success Criteria

After these fixes, you should be able to:

✅ Create rooms without NaN errors
✅ Place predictions with the default stake (100)
✅ Place predictions with custom stake values
✅ Start rooms without NaN errors
✅ See clear debug logs in console showing actual numeric values
✅ Get meaningful error messages if something goes wrong

If all tests pass, Day 5 Smart Contract Integration is complete! 🎉
