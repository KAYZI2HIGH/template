import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "sonner";
import { Room, UserPrediction } from "@/lib/types";
import { authenticatedFetch } from "@/lib/api-client";
import { useQueryClientInstance } from "@/components/Providers";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Query key factory for room-related queries
 */
export const roomQueryKeys = {
  all: ["rooms"] as const,
  lists: () => [...roomQueryKeys.all, "list"] as const,
  list: (filters?: Record<string, any>) =>
    [...roomQueryKeys.lists(), { ...filters }] as const,
  details: () => [...roomQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...roomQueryKeys.details(), id] as const,
};

/**
 * Query key factory for prediction-related queries
 */
export const predictionQueryKeys = {
  all: ["predictions"] as const,
  lists: () => [...predictionQueryKeys.all, "list"] as const,
  list: (filters?: Record<string, any>) =>
    [...predictionQueryKeys.lists(), { ...filters }] as const,
  details: () => [...predictionQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...predictionQueryKeys.details(), id] as const,
};

/**
 * Fetch all rooms
 */
const fetchRooms = async (walletAddress?: string): Promise<Room[]> => {
  const response = await authenticatedFetch(
    "/api/rooms",
    {
      method: "GET",
    },
    walletAddress
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch rooms: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch user's rooms (created rooms)
 */
const fetchMyRooms = async (walletAddress: string): Promise<Room[]> => {
  const rooms = await fetchRooms(walletAddress);
  return rooms.filter(
    (room) => room.ownerId?.toLowerCase() === walletAddress.toLowerCase()
  );
};

/**
 * Create a new room
 */
const createRoom = async (
  data: {
    name: string;
    symbol: string;
    timeDuration: string;
    minStake: string;
    contractRoomId?: number; // The contract's roomId returned from on-chain creation
  },
  walletAddress?: string
) => {
  const response = await authenticatedFetch(
    "/api/rooms",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    walletAddress
  );

  if (!response.ok) {
    throw new Error(`Failed to create room: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Start a room (on-chain)
 */
const startRoom = async (
  data: { roomId: string; startingPrice: number },
  walletAddress?: string
) => {
  const response = await authenticatedFetch(
    `/api/rooms/${data.roomId}/start`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startingPrice: data.startingPrice }),
    },
    walletAddress
  );

  if (!response.ok) {
    throw new Error(`Failed to start room: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch user's predictions
 */
const fetchPredictions = async (
  walletAddress?: string
): Promise<UserPrediction[]> => {
  const response = await authenticatedFetch(
    "/api/predictions",
    {
      method: "GET",
    },
    walletAddress
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch predictions: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Create a new prediction
 */
const createPrediction = async (
  data: {
    roomId: string;
    direction: "UP" | "DOWN";
    stake: number;
    creator: string;
  },
  walletAddress?: string
) => {
  const response = await authenticatedFetch(
    "/api/predictions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: data.roomId,
        direction: data.direction, // Already uppercase
        stake: data.stake, // Renamed from 'amount' to match API
      }),
    },
    walletAddress
  );

  if (!response.ok) {
    throw new Error(`Failed to create prediction: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Hook: Fetch all rooms
 */
export const useRooms = () => {
  const { isAuthenticated } = useAuth();
  const { address } = useAccount();

  return useQuery({
    queryKey: roomQueryKeys.list(),
    queryFn: () => fetchRooms(address),
    staleTime: 500, // Very short stale time - refetch frequently
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchInterval: 1000, // Poll every 1 second to update countdown timer
    enabled: isAuthenticated, // Don't fetch if not authenticated
  });
};

/**
 * Hook: Fetch user's created rooms
 */
export const useMyRooms = (walletAddress: string | null) => {
  const queryClient = useQueryClientInstance();

  // When wallet address changes, invalidate the query
  // This ensures we always get fresh data for the new user or empty data for no user
  useEffect(() => {
    if (!walletAddress) {
      // Clear the query when no wallet address
      queryClient.removeQueries({
        queryKey: [...roomQueryKeys.list(), { creator: undefined }],
      });
    }
  }, [walletAddress, queryClient]);

  return useQuery({
    queryKey: [...roomQueryKeys.list(), { creator: walletAddress }],
    queryFn: () => fetchMyRooms(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10,
    refetchInterval: 1000, // Poll every 1 second to keep in sync with rooms
  });
};

/**
 * Hook: Create a new room
 */
export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (data: Parameters<typeof createRoom>[0]) =>
      createRoom(data, address),
    onSuccess: (newRoom) => {
      // Invalidate rooms list to trigger refetch
      queryClient.invalidateQueries({ queryKey: roomQueryKeys.lists() });
      // Optionally add to cache immediately
      queryClient.setQueryData(roomQueryKeys.detail(newRoom.id), newRoom);
    },
    onError: (error: Error) => {
      console.error("Failed to create room:", error.message);
    },
  });
};

/**
 * Hook: Start a room
 */
export const useStartRoom = () => {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (data: Parameters<typeof startRoom>[0]) =>
      startRoom(data, address),
    onSuccess: (updatedRoom) => {
      // Invalidate all room queries
      queryClient.invalidateQueries({ queryKey: roomQueryKeys.lists() });
      queryClient.setQueryData(
        roomQueryKeys.detail(updatedRoom.room_id_web),
        updatedRoom
      );
    },
    onError: (error: Error) => {
      console.error("Failed to start room:", error.message);
    },
  });
};

/**
 * Hook: Fetch user's predictions
 */
export const usePredictions = () => {
  const { isAuthenticated } = useAuth();
  const { address } = useAccount();

  return useQuery({
    queryKey: predictionQueryKeys.list(),
    queryFn: () => fetchPredictions(address),
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10,
    refetchInterval: 1000, // Poll every 1 second to keep predictions in sync with rooms
    enabled: isAuthenticated, // Don't fetch if not authenticated
  });
};

/**
 * Fetch available stocks
 */
const fetchStocks = async () => {
  const response = await fetch("/api/stocks", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stocks: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch price for a specific stock
 */
const fetchStockPrice = async (symbol: string): Promise<number> => {
  const response = await fetch(`/api/stocks?symbol=${symbol}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch price for ${symbol}: ${response.statusText}`
    );
  }

  const data = await response.json();
  return typeof data.price === "number" ? data.price : 0;
};

/**
 * Hook: Fetch available stocks
 */
export const useAvailableStocks = () => {
  return useQuery({
    queryKey: ["stocks"],
    queryFn: fetchStocks,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    retry: 2,
  });
};

/**
 * Hook: Fetch price for a specific stock
 */
export const useStockPrice = (symbol: string) => {
  return useQuery({
    queryKey: ["stocks", "price", symbol],
    queryFn: () => fetchStockPrice(symbol),
    staleTime: 1000 * 30, // 30 seconds for real-time prices
    gcTime: 1000 * 60 * 5,
    retry: 2,
    enabled: !!symbol, // Only fetch if symbol is provided
  });
};

/**
 * Settle a room (resolve and auto-distribute payouts)
 * With the new contract, resolveRoom() automatically distributes payouts to all winners
 * No separate claim() transaction needed
 */
const settleRoom = async (
  roomId: string,
  walletClient: any,
  endingPrice: number,
  walletAddress?: string
) => {
  console.log(`📝 Settling room with ending price: ${endingPrice}`);

  try {
    const { resolveRoom, claimPayout } = await import("@/lib/contract-client");

    // Get numeric room ID from the API
    const roomsResponse = await authenticatedFetch(
      "/api/rooms",
      { method: "GET" },
      walletAddress
    );
    const allRooms = await roomsResponse.json();
    const room = allRooms.find((r: any) => r.id === roomId);

    if (!room) {
      throw new Error("Room not found");
    }

    // Step 1: Call resolveRoom on the smart contract
    // This marks the room as COMPLETED and determines the winning direction
    console.log(
      `📝 Calling resolveRoom for room ${room.numericId} with price $${endingPrice}`
    );
    const resolveTxHash = await resolveRoom(
      walletClient,
      room.numericId,
      endingPrice
    );
    console.log(`✅ Resolution transaction: ${resolveTxHash}`);

    // Wait for blockchain confirmation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Call claimPayout to transfer winnings to the caller (if they're a winner)
    console.log(`💰 Claiming payout for room ${room.numericId}`);
    try {
      const claimTxHash = await claimPayout(walletClient, room.numericId);
      console.log(`✅ Claim transaction: ${claimTxHash}`);

      // Wait for claim confirmation
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (claimError: any) {
      // Not a winner or already claimed - that's fine, just log it
      console.log(
        `⚠️  Claim skipped (likely not a winner or already claimed):`,
        claimError.message
      );
    }

    // Step 3: Update the backend to record the settlement
    const response = await authenticatedFetch(
      `/api/rooms/${roomId}/settle`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: resolveTxHash,
          endingPrice,
        }),
      },
      walletAddress
    );

    if (!response.ok) {
      throw new Error(`Failed to record settlement: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error settling room:", error);
    throw error;
  }
};

/**
 * Hook: Create a new prediction
 */
export const useCreatePrediction = () => {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (data: Parameters<typeof createPrediction>[0]) =>
      createPrediction(data, address),
    onSuccess: () => {
      // Invalidate predictions and rooms (for count updates)
      queryClient.invalidateQueries({ queryKey: predictionQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roomQueryKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Failed to create prediction:", error.message);
    },
  });
};

/**
 * Hook: Settle a room
 */
export const useSettleRoom = () => {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!walletClient) {
        throw new Error("Wallet not connected");
      }

      console.log("🔧 Settlement started for room:", roomId);

      // Step 1: Fetch the room to get the symbol
      const roomResponse = await authenticatedFetch(
        `/api/rooms`,
        { method: "GET" },
        address
      );

      if (!roomResponse.ok) {
        throw new Error("Failed to fetch room details");
      }

      const rooms = await roomResponse.json();
      const room = rooms.find((r: any) => r.id === roomId);

      if (!room) {
        throw new Error("Room not found");
      }

      console.log("📍 Room found:", { id: room.id, symbol: room.symbol });

      // Step 2: Fetch the current price using the room's symbol
      console.log(`💰 Fetching price for symbol: ${room.symbol}`);
      const priceResponse = await fetch(`/api/prices?symbol=${room.symbol}`, {
        method: "GET",
      });

      console.log(`📊 Price API response status: ${priceResponse.status}`);

      if (!priceResponse.ok) {
        const errorData = await priceResponse.json().catch(() => ({}));
        console.error("Price API error:", errorData);
        throw new Error(
          `Failed to fetch current price for settlement: ${priceResponse.statusText}`
        );
      }

      const priceData = await priceResponse.json();
      console.log("💵 Price data received:", priceData);
      return settleRoom(roomId, walletClient, priceData.price, address);
    },
    onSuccess: (data) => {
      // Invalidate all queries to refresh
      queryClient.invalidateQueries({ queryKey: roomQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: predictionQueryKeys.lists() });
      // Also invalidate all outcome queries to force refetch of outcomes
      queryClient.invalidateQueries({ queryKey: outcomeQueryKeys.all });
      toast.success("Room settled and payout claimed!");
      console.log("✅ Settlement complete - payout claimed");
    },
    onError: (error: Error) => {
      const errorMsg =
        error instanceof Error ? error.message : "Settlement failed";
      toast.error(errorMsg);
      console.error("Failed to settle room:", errorMsg);
    },
  });
};

/**
 * Fetch prediction outcome for a specific room and user
 */
const fetchPredictionOutcome = async (
  roomId: string,
  walletAddress: string
): Promise<"WIN" | "LOSS" | null> => {
  console.log("🔍 fetchPredictionOutcome called:", {
    roomId,
    walletAddress,
    timestamp: new Date().toISOString(),
  });

  const response = await authenticatedFetch(
    `/api/predictions?roomId=${roomId}&walletAddress=${walletAddress}`,
    {
      method: "GET",
    },
    walletAddress
  );

  console.log("📡 API Response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorMsg = `Failed to fetch prediction outcome: ${response.statusText}`;
    console.error("❌ API Error:", errorMsg);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  console.log("📦 Raw API data:", data);

  // API returns array of UserPrediction objects
  // Since we filtered by roomId, should be 0 or 1 items
  const predictions = Array.isArray(data) ? data : data.predictions || [];
  console.log("📋 Parsed predictions array:", predictions);
  console.log("📋 Array length:", predictions.length);
  console.log(
    "📋 First item keys:",
    predictions[0] ? Object.keys(predictions[0]) : "no items"
  );

  // Get the first (and only) prediction from the filtered results
  const userPred = predictions[0];
  console.log("🎯 Found user prediction:", userPred);
  console.log("🎯 Prediction outcome field:", userPred?.outcome);

  if (userPred && userPred.outcome) {
    // The outcome is already "WIN" or "LOSS" from the API
    const result = userPred.outcome as "WIN" | "LOSS";
    console.log("✅ Returning outcome:", result);
    return result;
  }

  console.log("⚠️ No outcome found, returning null");
  console.log("⚠️ Reason:", {
    hasPrediction: !!userPred,
    hasOutcome: userPred?.outcome ? "yes" : "no",
    outcomeValue: userPred?.outcome,
  });
  return null;
};

/**
 * Query key factory for prediction outcomes
 */
export const outcomeQueryKeys = {
  all: ["predictionOutcomes"] as const,
  detail: (roomId: string, walletAddress: string) =>
    [...outcomeQueryKeys.all, roomId, walletAddress] as const,
};

/**
 * Hook: Fetch prediction outcome for a specific room and user
 */
export const usePredictionOutcome = (
  roomId: string | undefined,
  walletAddress: string | undefined
) => {
  const queryKey = outcomeQueryKeys.detail(roomId || "", walletAddress || "");
  console.log("🪝 usePredictionOutcome hook instantiated:", {
    roomId,
    walletAddress,
    isEnabled: !!roomId && !!walletAddress,
    queryKey,
  });

  const query = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchPredictionOutcome(roomId!, walletAddress!),
    enabled: !!roomId && !!walletAddress,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10,
  });

  console.log("🪝 usePredictionOutcome hook state:", {
    roomId,
    walletAddress,
    status: query.status,
    data: query.data,
    isLoading: query.isLoading,
    error: query.error?.message,
  });

  return query;
};

/**
 * Hook: Automatically settle a room when it completes
 * Triggers settlement API call whenever a room transitions to "completed" status
 */
export const useAutoSettleRoom = (room: Room | null) => {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  useEffect(() => {
    if (!room || room.roomStatus !== "completed") {
      return;
    }

    const settleCompletedRoom = async () => {
      console.log(`🤖 Auto-settling completed room ${room.id}`);

      try {
        const response = await authenticatedFetch(
          `/api/rooms/${room.id}/settle`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          },
          address
        );

        if (!response.ok) {
          console.error(`Failed to auto-settle room: ${response.statusText}`);
          return;
        }

        const data = await response.json();
        console.log(`✅ Auto-settled room ${room.id}:`, data.settlement);

        // Invalidate all queries to refresh UI
        queryClient.invalidateQueries({ queryKey: roomQueryKeys.lists() });
        queryClient.invalidateQueries({
          queryKey: predictionQueryKeys.lists(),
        });
        queryClient.invalidateQueries({ queryKey: outcomeQueryKeys.all });
      } catch (error) {
        console.error("Error auto-settling room:", error);
      }
    };

    settleCompletedRoom();
  }, [room?.id, room?.roomStatus, queryClient]);
};
