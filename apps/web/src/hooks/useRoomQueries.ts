import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Room, UserPrediction } from "@/lib/types";
import { authenticatedFetch } from "@/lib/api-client";
import { useQueryClientInstance } from "@/components/Providers";

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
const fetchRooms = async (): Promise<Room[]> => {
  const response = await authenticatedFetch("/api/rooms", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch rooms: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch user's rooms (created rooms)
 */
const fetchMyRooms = async (walletAddress: string): Promise<Room[]> => {
  const rooms = await fetchRooms();
  return rooms.filter(
    (room) => room.ownerId?.toLowerCase() === walletAddress.toLowerCase()
  );
};

/**
 * Create a new room
 */
const createRoom = async (data: {
  name: string;
  symbol: string;
  timeDuration: string;
  minStake: string;
}) => {
  const response = await authenticatedFetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create room: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Start a room (on-chain)
 */
const startRoom = async (roomId: string) => {
  const response = await authenticatedFetch(`/api/rooms/${roomId}/start`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to start room: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch user's predictions
 */
const fetchPredictions = async (): Promise<UserPrediction[]> => {
  const response = await authenticatedFetch("/api/predictions", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch predictions: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Create a new prediction
 */
const createPrediction = async (data: {
  roomId: string;
  direction: "up" | "down";
  amount: number;
  creator: string;
}) => {
  const response = await authenticatedFetch("/api/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create prediction: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Hook: Fetch all rooms
 */
export const useRooms = () => {
  return useQuery({
    queryKey: roomQueryKeys.list(),
    queryFn: fetchRooms,
    staleTime: 500, // Very short stale time - refetch frequently
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchInterval: 1000, // Poll every 1 second to update countdown timer
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

  return useMutation({
    mutationFn: createRoom,
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

  return useMutation({
    mutationFn: startRoom,
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
  return useQuery({
    queryKey: predictionQueryKeys.list(),
    queryFn: fetchPredictions,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10,
    refetchInterval: 1000, // Poll every 1 second to keep predictions in sync with rooms
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
 * Settle a room (calculate winners and payouts)
 */
const settleRoom = async (roomId: string) => {
  const response = await authenticatedFetch(`/api/rooms/${roomId}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to settle room: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Hook: Create a new prediction
 */
export const useCreatePrediction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPrediction,
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

  return useMutation({
    mutationFn: settleRoom,
    onSuccess: (data) => {
      // Invalidate all queries to refresh
      queryClient.invalidateQueries({ queryKey: roomQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: predictionQueryKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Failed to settle room:", error.message);
    },
  });
};
