"use client";
import { ChevronRight, Trophy, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserPrediction, Room } from "@/lib/types";
import { usePredictionOutcome } from "@/hooks/useRoomQueries";

interface PredictionItemProps {
  pred: UserPrediction;
  index: number;
  roomStatus: "waiting" | "started" | "completed" | "settled" | "unknown";
  room: Room | undefined;
  walletAddress: string | undefined;
  onViewDetails: (prediction: UserPrediction) => void;
  onSettleRoom: (roomId: string) => void;
  isSettling?: boolean;
}

const getStatusColor = (
  status: "waiting" | "started" | "completed" | "settled" | "unknown"
) => {
  switch (status) {
    case "waiting":
      return "bg-gray-500/20 text-gray-300";
    case "started":
      return "bg-blue-500/20 text-blue-300";
    case "completed":
      return "bg-yellow-500/20 text-yellow-300";
    case "settled":
      return "bg-green-500/20 text-green-300";
    default:
      return "bg-gray-500/20 text-gray-300";
  }
};

const getStatusBarColor = (
  status: "waiting" | "started" | "completed" | "settled" | "unknown"
) => {
  switch (status) {
    case "waiting":
      return "bg-gray-500";
    case "started":
      return "bg-blue-500";
    case "completed":
      return "bg-yellow-500";
    case "settled":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

export function PredictionItem({
  pred,
  index,
  roomStatus,
  room,
  walletAddress,
  onViewDetails,
  onSettleRoom,
  isSettling = false,
}: PredictionItemProps) {
  const isTimeExpired = roomStatus === "completed";
  const isActuallySettled = roomStatus === "settled";
  const shouldShowOutcome = isTimeExpired || isActuallySettled;

  // Hook is called at component level, not in a map
  const {
    data: userOutcome,
    isLoading,
    error,
  } = usePredictionOutcome(
    shouldShowOutcome ? pred.roomId : undefined,
    walletAddress
  );

  // Debug log for this prediction
  console.log(`🎯 PredictionItem [${index}]`, {
    predictionId: pred.id,
    roomId: pred.roomId,
    roomStatus,
    isTimeExpired,
    isActuallySettled,
    walletAddress,
    shouldFetchOutcome: shouldShowOutcome ? true : false,
    isLoadingOutcome: isLoading,
    userOutcome,
    outcomeError: error?.message || "none",
  });

  const playerCount = room ? room.up + room.down : 0;
  const isAlreadyClaimed = pred.outcome !== undefined && pred.outcome !== null;

  return (
    <div
      key={`${pred.id}-${pred.roomId}-${index}`}
      className="bg-[#0F1729] border border-[#1E2943] rounded p-3 pl-5 hover:border-green-300/50 transition-colors cursor-pointer relative"
    >
      <div
        className={cn(
          "w-2 h-full absolute left-0 top-0 rounded-l",
          getStatusBarColor(roomStatus)
        )}
      />
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-white">{pred.name}</h4>
          <p className="text-xs text-gray-400 mt-1">
            Prediction:{" "}
            <span className="text-green-300">{pred.prediction}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end ml-2">
          {/* Outcome Badge (WIN/LOSS) */}
          {shouldShowOutcome && userOutcome && (
            <span
              className={`text-xs px-2 py-1 rounded whitespace-nowrap font-semibold mb-1 flex items-center gap-1 ${
                userOutcome === "WIN"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-red-500/20 text-red-300"
              }`}
            >
              {userOutcome === "WIN" ? (
                <>
                  <Trophy size={12} /> WIN
                </>
              ) : (
                <>
                  <XCircle size={12} /> LOSS
                </>
              )}
            </span>
          )}

          {/* Status Badge */}
          <span
            className={`text-xs px-2 py-1 rounded whitespace-nowrap font-medium ${getStatusColor(
              roomStatus
            )}`}
          >
            {roomStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-1 text-xs text-gray-400">
        <p>
          Stake: <span className="text-white">{pred.stake}</span>
        </p>
        {shouldShowOutcome && userOutcome && (
          <>
            <p className="text-xs text-gray-400">
              Players: <span className="text-white">{playerCount}</span>
            </p>
            <p className="text-xs text-gray-400">
              Resolution: <span className="text-green-300">{room?.price}</span>
            </p>
            {/* Show payout if prediction was a winner and has been claimed */}
            {isAlreadyClaimed && userOutcome === "WIN" && pred.payout && (
              <p className="text-xs text-gray-400">
                Payout:{" "}
                <span className="text-green-400 font-semibold">
                  {pred.payout}
                </span>
              </p>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => onViewDetails(pred)}
        className="mt-3 w-full bg-green-500/10 border border-green-500/50 hover:bg-green-500/20 transition-all duration-300 text-green-300 py-2 px-3 rounded text-xs font-medium flex items-center justify-center gap-2"
      >
        View Details <ChevronRight size={16} />
      </button>

      {isTimeExpired && !isActuallySettled && (
        <button
          onClick={() => onSettleRoom(pred.roomId)}
          disabled={isSettling}
          className={cn(
            "mt-2 w-full py-2 px-3 rounded text-xs font-medium transition-all duration-300 flex items-center justify-center gap-2",
            isSettling
              ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300/50 cursor-not-allowed"
              : "bg-yellow-500/10 border border-yellow-500/50 hover:bg-yellow-500/20 text-yellow-300 cursor-pointer"
          )}
        >
          {isSettling && (
            <div className="w-3 h-3 border-2 border-yellow-300/30 border-t-yellow-300 rounded-full animate-spin" />
          )}
          {isSettling ? "Settling..." : "Settle & Claim"}
        </button>
      )}

      {/* Show settled badge if actually settled */}
      {isActuallySettled && (
        <div className="mt-2 w-full bg-green-500/10 border border-green-500/50 py-2 px-3 rounded text-xs font-medium text-green-300 flex items-center justify-center gap-2">
          <Trophy size={14} /> Settled & Claimed
        </div>
      )}
    </div>
  );
}
