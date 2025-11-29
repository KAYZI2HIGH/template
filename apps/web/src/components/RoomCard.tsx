"use client";
import { useEffect, useState } from "react";
import { Room } from "@/lib/types";
import { getSecondsRemaining, formatSecondsToTime } from "@/lib/app-utils";
import { useStockPrice } from "@/hooks/useRoomQueries";

interface RoomCardProps {
  room: Room;
  roomId: string;
  isOwned?: boolean;
  onJoin?: (roomId: string) => void;
  onViewDetails?: (roomId: string) => void;
}

type RoomStatus = "waiting" | "started" | "completed" | "settled";

function isValidRoomStatus(status: unknown): status is RoomStatus {
  return (
    status === "waiting" ||
    status === "started" ||
    status === "completed" ||
    status === "settled"
  );
}

export function RoomCard({
  room,
  roomId,
  isOwned = false,
  onJoin,
  onViewDetails,
}: RoomCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [displayStatus, setDisplayStatus] = useState<RoomStatus>(() => {
    return isValidRoomStatus(room.roomStatus) ? room.roomStatus : "waiting";
  });

  // Fetch stock price using React Query
  const { data: priceData, isLoading, error } = useStockPrice(room.symbol);
  const displayPrice =
    priceData && priceData > 0
      ? `$${priceData.toFixed(2)}`
      : isLoading
      ? "Loading..."
      : "$0.00";

  // Trust the server status - no client-side recalculation
  useEffect(() => {
    setDisplayStatus(
      isValidRoomStatus(room.roomStatus) ? room.roomStatus : "waiting"
    );
  }, [room.roomStatus]);

  // Update countdown timer every second using secondsRemaining from server
  useEffect(() => {
    const updateTimer = () => {
      // Use server-calculated secondsRemaining, decrement by 1 each second
      let remaining = room.secondsRemaining || 0;
      const secondsToDisplay = Math.max(0, remaining - 1);
      const formatted = formatSecondsToTime(secondsToDisplay);
      setTimeRemaining(formatted);
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [room.secondsRemaining]);

  const getStatusColor = (
    status: "waiting" | "started" | "completed" | "settled"
  ) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500/20 text-yellow-300";
      case "started":
        return "bg-blue-500/20 text-blue-300";
      case "completed":
        return "bg-green-500/20 text-green-300";
      case "settled":
        return "bg-green-500/20 text-green-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  // Show time remaining for started rooms, duration for waiting rooms
  const displayTime =
    displayStatus === "started" && timeRemaining
      ? `${timeRemaining} remaining`
      : room.time;

  return (
    <div className="bg-[#0F1729] border border-[#1E2943] rounded p-4 hover:border-green-400 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm text-white">{room.name}</h4>
            <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded font-mono">
              {room.symbol}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {displayTime} • {displayPrice}
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end ml-2">
          <span
            className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getStatusColor(
              displayStatus
            )}`}
          >
            {displayStatus}
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-xs">
          <span className="text-green-300">UP: {room.up}</span>
          <span className="text-red-300">DOWN: {room.down}</span>
        </div>
        {isOwned ? (
          <button
            onClick={() => onViewDetails?.(roomId)}
            className="bg-blue-500 hover:bg-blue-600 transition-colors text-white text-xs px-3 py-1 rounded font-medium"
          >
            View Details
          </button>
        ) : (
          <button
            onClick={() => onJoin?.(roomId)}
            disabled={displayStatus !== "waiting"}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors text-white text-xs px-3 py-1 rounded font-medium"
          >
            {displayStatus === "waiting"
              ? "Join"
              : displayStatus === "started"
              ? "In Progress"
              : displayStatus === "completed"
              ? "Completed"
              : "Settled"}
          </button>
        )}
      </div>
    </div>
  );
}
