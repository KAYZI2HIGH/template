"use client";
import { Room } from "@/lib/types";

interface RoomCardProps {
  room: Room;
  roomId: string;
  isOwned?: boolean;
  onJoin?: (roomId: string) => void;
  onViewDetails?: (roomId: string) => void;
}

export function RoomCard({
  room,
  roomId,
  isOwned = false,
  onJoin,
  onViewDetails,
}: RoomCardProps) {
  const getStatusColor = (status?: "waiting" | "started" | "completed") => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500/20 text-yellow-300";
      case "started":
        return "bg-blue-500/20 text-blue-300";
      case "completed":
        return "bg-green-500/20 text-green-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

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
            {room.time} • {room.price}
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end ml-2">
          <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded whitespace-nowrap">
            {room.status}
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
            className="bg-green-500 hover:bg-green-600 transition-colors text-white text-xs px-3 py-1 rounded font-medium"
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}
