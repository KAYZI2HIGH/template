"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, XCircle } from "lucide-react";
import { UserPrediction } from "@/lib/types";
import { useRooms } from "@/hooks/useRoomQueries";
import { useSettleRoom } from "@/hooks/useRoomSettlement";
import { useAuth } from "@/contexts/AuthContext";
import { PredictionItem } from "./PredictionItem";
import { LoadingPredictionList } from "./LoadingPredictionItem";

interface PredictionsListProps {
  predictions: UserPrediction[];
  isLoading?: boolean;
  onViewDetails: (prediction: UserPrediction) => void;
}

export function PredictionsList({
  predictions,
  isLoading = false,
  onViewDetails,
}: PredictionsListProps) {
  const { data: allRooms } = useRooms();
  const { user, isAuthenticated } = useAuth();
  const settleRoom = useSettleRoom();

  // CRITICAL: Don't show predictions if user is not authenticated
  if (!isAuthenticated) {
    return (
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
          <XCircle
            size={48}
            className="text-red-300/60"
          />
          <div className="text-center">
            <h3 className="text-sm font-semibold text-white mb-2">
              Not Authenticated
            </h3>
            <p className="text-xs text-gray-400">
              Please connect your wallet to view predictions
            </p>
          </div>
        </div>
      </ScrollArea>
    );
  }

  // Helper to get room status for a prediction
  const getRoomStatus = (
    roomId: string
  ): "waiting" | "started" | "completed" | "unknown" => {
    if (!allRooms) return "unknown";
    const room = allRooms.find((r) => r.id === roomId);
    return (
      (room?.roomStatus as "waiting" | "started" | "completed") || "unknown"
    );
  };

  // Helper to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500/20 text-yellow-300 left-yellow-500";
      case "started":
        return "bg-blue-500/20 text-blue-300 left-blue-500";
      case "completed":
        return "bg-green-500/20 text-green-300 left-green-500";
      default:
        return "bg-gray-500/20 text-gray-300 left-gray-500";
    }
  };

  // Helper to get status bar color
  const getStatusBarColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500";
      case "started":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-3 pr-4">
        {isLoading ? (
          <LoadingPredictionList count={3} />
        ) : predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <Zap
              size={48}
              className="text-green-300/60"
            />
            <div className="text-center">
              <h3 className="text-sm font-semibold text-white mb-2">
                No Predictions Yet
              </h3>
              <p className="text-xs text-gray-400">
                Start by placing a bet in the Prediction Slip tab
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pr-4">
            {predictions.map((pred, index) => {
              const roomStatus = getRoomStatus(pred.roomId);
              const room = allRooms?.find((r) => r.id === pred.roomId);

              return (
                <PredictionItem
                  key={`${pred.id}-${pred.roomId}-${index}`}
                  pred={pred}
                  index={index}
                  roomStatus={roomStatus}
                  room={room}
                  walletAddress={user?.wallet_address}
                  onViewDetails={onViewDetails}
                  onSettleRoom={(roomId) => settleRoom.mutate(roomId)}
                />
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
