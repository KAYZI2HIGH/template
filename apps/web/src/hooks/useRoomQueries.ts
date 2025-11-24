import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Room, UserPrediction } from "@/lib/types";
import { authenticatedFetch } from "@/lib/api-client";

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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });
};

/**
 * Hook: Fetch user's created rooms
 */
export const useMyRooms = (walletAddress: string | null) => {
  return useQuery({
    queryKey: [...roomQueryKeys.list(), { creator: walletAddress }],
    queryFn: () => fetchMyRooms(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
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
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
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
