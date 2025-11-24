# Page.tsx Refactoring - Component Breakdown

## Overview

The original 679-line `page.tsx` file has been successfully split into 9 focused, reusable components. This improves maintainability, testability, and code organization.

## New Component Structure

### 1. **LeftSidebar.tsx** (102 lines)

- Displays wallet information
- Shows how-to-play instructions (4 steps)
- Displays blockchain info (network, oracle, data source)
- Action buttons (Get testnet cUSD, Go to Repository)
- Demo powered by badges

### 2. **RoomCard.tsx** (32 lines)

- Individual room display card
- Props: `room`, `index`, `onJoin`
- Shows room name, price, time, player counts
- Join button handler

### 3. **MainContent.tsx** (102 lines)

- Main content area with header
- Search functionality with clear button
- Banner and logo display
- Uses `RoomCard` component for list rendering
- Props: `rooms`, `onJoinRoom`

### 4. **PredictionSlip.tsx** (107 lines)

- Right sidebar prediction interface
- Displays selected room details
- Lists players in room
- Stake amount input field
- UP/DOWN prediction buttons
- Props: `selectedRoom`, `rooms`, `stake`, `onStakeChange`, `onPredictDirection`

### 5. **PredictionsList.tsx** (80 lines)

- My Predictions tab content
- Displays list of user's predictions
- Shows prediction status, outcome, payout
- View Details button for each prediction
- Props: `predictions`, `onViewDetails`

### 6. **RightSidebar.tsx** (70 lines)

- Tab container for Slip and Predictions
- Tab switching logic
- Conditional rendering of PredictionSlip or PredictionsList
- Props: All necessary state and handlers

### 7. **PredictionConfirmDialog.tsx** (69 lines)

- AlertDialog for prediction confirmation
- Displays room, prediction direction, stake details
- Props: `open`, `onOpenChange`, `pendingPrediction`, `rooms`, `onConfirm`

### 8. **types.ts** (22 lines)

- Centralized type definitions
- `Room` interface
- `UserPrediction` interface with optional fields

### 9. **page.tsx** (Refactored - 99 lines)

- Main orchestrator component
- Manages all state with React hooks
- Defines rooms data
- Implements all handler functions
- Composes child components

## State Management

All state remains in the main `page.tsx` component:

- `activeTab` - Tracks current right sidebar tab
- `selectedRoom` - Selected room index
- `stake` - User's stake input value
- `showConfirmation` - Dialog visibility
- `pendingPrediction` - Temporary prediction data before confirmation
- `userPredictions` - User's prediction list

## Handler Functions

All handlers remain in main component:

- `handlePredictDirection()` - UP/DOWN button logic
- `handleConfirmPrediction()` - Confirmation dialog logic
- `handleViewDetails()` - Load prediction details
- `handleJoinRoom()` - Join room logic

## Benefits of This Refactoring

✅ **Improved Readability** - Each component has a single responsibility
✅ **Better Testability** - Components can be tested independently
✅ **Code Reusability** - Components can be used in other pages
✅ **Easier Maintenance** - Changes isolated to specific components
✅ **Scalability** - Easy to add new features without bloating one file
✅ **Team Collaboration** - Multiple developers can work on different components

## File Size Reduction

| File                 | Lines                      |
| -------------------- | -------------------------- |
| Original page.tsx    | 679                        |
| New page.tsx         | 99                         |
| Total new components | ~650                       |
| **Reduction**        | **~87% cleaner main file** |

## Usage Pattern

The components follow a consistent prop-based pattern:

```tsx
<ComponentName
  data={dataProps}
  state={stateProps}
  handlers={handlerFunctions}
/>
```

## Next Steps

1. ✅ Build verification (already running successfully)
2. Test each component independently
3. Add unit tests for components
4. Add integration tests for page flow
5. Consider moving mock data (rooms) to a separate `constants.ts` file
6. Consider adding a custom hook for prediction logic
