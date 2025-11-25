/**
 * useRoomSettlement Hook
 * Manages room settlement process and tracking
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface SettlementResponse {
  success: boolean;
  roomId: string;
  startingPrice: number;
  endingPrice: number;
  priceWentUp: boolean;
  winningDirection: "up" | "down";
  predictions: {
    totalPredictions: number;
    winners: number;
    losers: number;
    totalPool: number;
    totalPayedOut: number;
  };
}

interface SettlementStatus {
  roomId: string;
  name: string;
  status: string;
  startingPrice: number;
  endingPrice: number | null;
  isSettled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to settle a room and calculate payouts
 */
export function useSettleRoom() {
  return useMutation({
    mutationFn: async (roomId: string) => {
      const response = await fetch(`/api/rooms/settle/${roomId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to settle room");
      }

      return response.json() as Promise<SettlementResponse>;
    },
    onSuccess: (data) => {
      toast.success(
        `Room settled! ${data.predictions.winners} winners, ${data.predictions.losers} losers`
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Settlement failed");
    },
  });
}

/**
 * Hook to check settlement status of a room
 */
export function useSettlementStatus(roomId: string) {
  return useQuery({
    queryKey: ["settlementStatus", roomId],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/settle/${roomId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch settlement status");
      }

      return response.json() as Promise<SettlementStatus>;
    },
    enabled: !!roomId,
    refetchInterval: 5000, // Check every 5 seconds if not settled
  });
}

/**
 * Hook to manage settlement with automatic checks
 */
export function useRoomSettlement(roomId: string) {
  const settleRoom = useSettleRoom();
  const settlementStatus = useSettlementStatus(roomId);

  return {
    // Data
    isSettled: settlementStatus.data?.isSettled || false,
    settlementStatus: settlementStatus.data?.status,
    endingPrice: settlementStatus.data?.endingPrice,

    // Status
    isLoading: settlementStatus.isLoading || settleRoom.isPending,
    isError: settlementStatus.isError || settleRoom.isError,
    error: settlementStatus.error || settleRoom.error,

    // Actions
    settle: () => settleRoom.mutate(roomId),
    refetch: settlementStatus.refetch,

    // Raw data
    settlementData: settlementStatus.data,
  };
}
