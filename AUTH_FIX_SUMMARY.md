# Authentication Race Condition Fix

## Problem
After logout/disconnect, API requests were still being sent with the old wallet's auth token. This was caused by a race condition between localStorage clearing and React Query requests.

### Root Causes Identified
1. **localStorage reads are async-dependent**: `authenticatedFetch()` read from localStorage synchronously, but logout cleared it asynchronously
2. **React Query polling**: Continuous polling (every 1s) meant requests were always in-flight
3. **useEffect timing issues**: logout state changes triggered useEffect→invalidateQueries, but some requests may have already captured the old token

## Solution Implemented

### 1. Global Auth State (`/lib/api-client.ts`)
- **Before**: Used `localStorage.getItem("auth_token")` - timing-dependent, prone to race conditions
- **After**: Use global module-level state (`globalAuthToken`, `globalUser`)
- **Why**: Global state is immediately updated without async delays, blocking requests instantly on logout

```typescript
let globalAuthToken: string | null = null;
let globalUser: any = null;

export function setGlobalAuthState(token: string | null, user: any) {
  globalAuthToken = token;
  globalUser = user;
}

export async function authenticatedFetch(endpoint, options) {
  const token = globalAuthToken;  // NOT localStorage!
  const user = globalUser;
  
  if (token && user) {
    // Send request with current auth state
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Else: no auth header added
}
```

### 2. AuthContext Updates (`/contexts/AuthContext.tsx`)
- **On mount**: Load from localStorage AND set global auth state immediately
- **On login**: Set global auth state BEFORE storing in localStorage
- **On logout (CRITICAL)**: 
  - **STEP 0** (new): Call `setGlobalAuthState(null, null)` IMMEDIATELY
  - This blocks all future requests from sending auth headers
  - Then proceed with other cleanup (React Query cache, localStorage, etc.)

```typescript
const logout = useCallback(() => {
  // STEP 0: Clear global auth state IMMEDIATELY
  setGlobalAuthState(null, null);  // <- Blocks requests FIRST
  
  // STEPS 1-7: Clear other storage/caches
  queryClient.clear();
  localStorage.clear();
  sessionStorage.clear();
  // ... etc
}, [...]);
```

### 3. React Query Hooks (`/hooks/useRoomQueries.ts`)
- Added `enabled: isAuthenticated` flag to query hooks
- This ensures queries won't fire when not authenticated
- Provides defense-in-depth: Even if requests somehow slip through, they won't have auth tokens

```typescript
export const useRooms = () => {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: roomQueryKeys.list(),
    queryFn: fetchRooms,
    refetchInterval: 1000,
    enabled: isAuthenticated,  // <- Don't query if not authenticated
  });
};
```

## How the Fix Works

### Before (Race Condition):
1. User clicks "Disconnect"
2. logout() starts → localStorage.clear() called
3. But request already in-flight → reads token from localStorage BEFORE clear completes
4. Old token sent to API ❌

### After (Immediate Block):
1. User clicks "Disconnect"
2. logout() starts → `setGlobalAuthState(null, null)` called FIRST
3. **All in-flight AND future requests check globalAuthToken**
4. Since globalAuthToken is null, NO auth header added ✅
5. Then rest of cleanup happens (React Query, localStorage, etc.)

## Testing Verification

### What to Test:
1. **Login with Wallet A**
   - Should fetch rooms/predictions for Wallet A
   - API logs should show: `Authorization header present: true`

2. **Disconnect/Logout**
   - localStorage should be empty
   - Should see in console: `[api-client] Global auth state CLEARED`
   - API requests should NOT have Authorization header
   - API logs should show: `Authorization header present: false`

3. **Connect Wallet B**
   - Should fetch rooms/predictions for Wallet B (not A!)
   - API logs should show: `Authorization header present: true` (new wallet)

### Console Logs to Watch:
```
✅ [api-client] Global auth state SET for 0x...wallet_a
🔐 [api-client] Request to /api/rooms WITH auth for 0x...wallet_a

🚪🚪🚪 LOGOUT INITIATED for 0x...wallet_a 🚪🚪🚪
🗑️  [STEP 0/7] Clearing GLOBAL auth state...
❌ [api-client] Global auth state CLEARED
✅✅✅ LOGOUT COMPLETE for 0x...wallet_a ✅✅✅

🔐 [api-client] Request to /api/rooms WITHOUT auth (globalAuthToken=false, globalUser=false)
```

## Files Modified
1. `/src/lib/api-client.ts` - Global auth state + `setGlobalAuthState()` function
2. `/src/contexts/AuthContext.tsx` - Import `setGlobalAuthState`, call on login/logout
3. `/src/hooks/useRoomQueries.ts` - Add `enabled: isAuthenticated` flags

## Why This is Better Than Before
- ✅ No race conditions with localStorage async timing
- ✅ Immediate request blocking on logout (not async)
- ✅ Global state is single source of truth for auth
- ✅ Query hooks respect auth state
- ✅ Clear, auditable logging
- ✅ Prevents old wallet data from being accessible
