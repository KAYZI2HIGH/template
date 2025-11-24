# Quick Start Testing Guide

## 🚀 Application is LIVE at: http://localhost:3001

---

## ⚡ Quick Test Flow (2 minutes)

### 1️⃣ Create a Room

- [ ] Click **"Create Room"** button (top-right)
- [ ] Room Name: `"My First Prediction"`
- [ ] Stock: Select **MTN.NG** from dropdown
- [ ] Duration: `2h`
- [ ] Min Stake: `100`
- [ ] Click **"Create Room"**
- [ ] **Expected**: Room appears in "My Rooms" tab with yellow "waiting" badge

### 2️⃣ Join a Public Room

- [ ] Click **"All Active Rooms"** tab
- [ ] Click **"Join"** on any room
- [ ] **Expected**: Prediction Slip opens on the right

### 3️⃣ Place a Prediction

- [ ] Enter Stake: `50`
- [ ] Click **"UP"** button
- [ ] **Expected**: Auto-navigate to "My Predictions" tab, prediction appears

### 4️⃣ Try Duplicate Prevention

- [ ] Click the prediction you just created from "My Predictions"
- [ ] Click **"View Details"**
- [ ] **Expected**: See message "You have already placed a prediction in this room"
- [ ] **Expected**: NO UP/DOWN buttons visible

### 5️⃣ Start Your Room

- [ ] Go to **"My Rooms"** tab
- [ ] Click **"View Details"** on the room you created
- [ ] Click **"Start Room"** button
- [ ] **Expected**: Status badge changes from yellow (waiting) to blue (started)

---

## 📋 Detailed Testing Areas

### Stock Selection Dropdown ✅

The stock selection dropdown is fully functional:

```
Options include:
• MTN.NG - MTN Nigeria
• DANGOTE.NG - Dangote Group
• BUACEMENT.NG - BUA Cement
• AIRTELAFRI.NG - Airtel Africa
• ZENITHBANK.NG - Zenith Bank
• GTCO.NG - Guaranty Trust Co.
• SEPLAT.NG - SEPLAT Energy
• NESTLE.NG - Nestle Nigeria
```

### Form Validation ✅

Try to create a room without filling all fields:

- [ ] Room Name empty → Create button disabled ✅
- [ ] Stock not selected → Create button disabled ✅
- [ ] Duration empty → Create button disabled ✅
- [ ] Stake empty → Create button disabled ✅

### Room Status Colors ✅

- 🟨 **Yellow** = waiting (can join, can place predictions)
- 🔵 **Blue** = started (can view, can't join)
- 🟢 **Green** = completed (view only)

### Navigation Flow ✅

```
All Active Rooms
    ↓ (Join)
Prediction Slip
    ↓ (UP/DOWN)
My Predictions
    ↓ (View Details)
Prediction Slip (read-only)
```

### Search Functionality ✅

- [ ] Type in search box (any room name or symbol)
- [ ] Results filter in real-time
- [ ] Works for both "All Active Rooms" and "My Rooms"
- [ ] Click × to clear search

---

## 🐛 What to Check

### Critical Features

1. **Stock dropdown works** - Can select from list
2. **Create room functional** - Room appears in list with correct data
3. **Join room works** - Switches to Prediction Slip tab
4. **Prediction placement** - Creates entry in "My Predictions"
5. **Duplicate prevention** - Can't place 2nd prediction in same room
6. **Start room** - Changes status to "started"

### UI Elements

1. **All buttons are clickable** - No disabled elements when they shouldn't be
2. **Colors are correct** - Status badges use right colors
3. **Text is visible** - No overflow or truncation issues
4. **Icons display** - Lucide icons appear correctly
5. **Responsive layout** - Three-column layout intact

### State Management

1. **Stake persists** - Stake value shows after selection
2. **Room details load** - Correct room info displays
3. **Predictions persist** - List shows all predictions made
4. **Navigation doesn't reset** - Going back keeps data intact
5. **Tabs switch smoothly** - No lag when switching tabs

---

## 🔍 Browser Console

Open DevTools (F12) and check console for:

**When creating a room:**

```
Creating room: {name: '...', symbol: '...', timeDuration: '...', minStake: '...'}
```

**When starting a room:**

```
Starting room: My First Prediction
```

These logs confirm the handlers are working correctly.

---

## ✨ Advanced Testing

### Multi-room Prediction

1. Create 2 different rooms
2. Join both from "All Active Rooms"
3. Place predictions in both
4. Check "My Predictions" shows both
5. View details of each - verify duplicate prevention works

### Search & Filter

1. Search for "MTN" - should show matching rooms
2. Search for "DANGOTE" - should show different rooms
3. Clear search - all rooms return
4. Switch to "My Rooms" - search still works

### Status Changes

1. Create room (waiting status - yellow)
2. Start room (status changes to started - blue)
3. Verify status persists when switching tabs
4. Try joining started room (should still be joinable in current implementation)

---

## 🎯 Expected Results Summary

| Action            | Expected Result                                     |
| ----------------- | --------------------------------------------------- |
| Create Room       | Room appears in "My Rooms" with all details         |
| Join Room         | Prediction Slip opens, room details load            |
| Place Prediction  | Auto-navigates to "My Predictions", entry created   |
| View Prediction   | Shows room details with "already predicted" message |
| View Own Room     | Shows prediction placement & start options          |
| Start Room        | Status changes to "started" (blue badge)            |
| Search            | Filters results in real-time                        |
| Duplicate Predict | Prevents with message, hides UP/DOWN buttons        |

---

## 📱 Mobile Testing

The interface is designed for desktop but responsive:

- Try resizing the browser window
- Check if columns reflow appropriately
- Ensure buttons are still clickable on smaller screens

---

## 🚨 Common Issues & Solutions

### Issue: "Dropdown not opening"

**Solution**: Click on the Select field trigger area (white area with text)

### Issue: "Room not appearing in list"

**Solution**: Refresh page or check "My Rooms" tab - might be on "All Active Rooms"

### Issue: "Can't place prediction"

**Solution**: Enter stake amount first - UP/DOWN buttons disabled with 0 stake

### Issue: "Buttons look disabled"

**Solution**: Check if form fields are filled - validation prevents incomplete actions

### Issue: "Status not changing"

**Solution**: Click "Start Room" from the room's "View Details" view

---

## 🎓 Learning the Codebase While Testing

While you test, check these files to understand the flow:

1. **State Management**: `src/app/page.tsx` - How rooms and predictions are stored
2. **Room Display**: `src/components/MainContent.tsx` - How rooms are listed
3. **Prediction Logic**: `src/components/PredictionSlip.tsx` - How predictions work
4. **Stocks Data**: `src/lib/stocks.ts` - Available stocks configuration
5. **Types**: `src/lib/types.ts` - Data structures

---

## ✅ Checklist for Complete Testing

- [ ] Create room with all fields
- [ ] Stock dropdown shows all 8 stocks
- [ ] Room appears in "My Rooms"
- [ ] Join room from "All Active Rooms"
- [ ] Place prediction (UP and DOWN)
- [ ] Verify in "My Predictions"
- [ ] Can't place 2nd prediction in same room
- [ ] Start room changes status
- [ ] Search works for both tabs
- [ ] Navigate between all tabs smoothly
- [ ] Empty states display correctly
- [ ] All colors are correct
- [ ] No console errors
- [ ] No TypeScript errors in IDE

---

## 📞 Next Steps After Testing

Once verified:

1. Note any UX improvements needed
2. Plan smart contract integration
3. Define API endpoints needed
4. Design database schema for persistence
5. Begin contract development

**Ready to roll! Happy testing! 🚀**
