"use client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { Room, UserPrediction } from "@/lib/types";

interface PredictionSlipProps {
  selectedRoom?: Room;
  selectedRoomId?: string | null;
  rooms: Room[];
  stake: string;
  hasJoinedRoom: boolean;
  isViewingOwnedRoom?: boolean;
  hasUserPredictedInRoom?: boolean;
  onStakeChange: (value: string) => void;
  onPredictDirection: (direction: "UP" | "DOWN") => void;
  onStartRoom?: () => void;
  userPredictions?: UserPrediction[];
}

export function PredictionSlip({
  selectedRoom,
  selectedRoomId,
  rooms,
  stake,
  hasJoinedRoom,
  isViewingOwnedRoom = false,
  hasUserPredictedInRoom = false,
  onStakeChange,
  onPredictDirection,
  onStartRoom,
  userPredictions = [],
}: PredictionSlipProps) {
  const room = selectedRoom;

  /**
   * INTELLIGENT CONDITIONAL RENDERING LOGIC
   *
   * Determines what buttons to show based on:
   * 1. Room status (waiting/started/completed)
   * 2. User relationship (owner/player)
   * 3. User's prediction history in this room
   */

  // Check if user has already placed a bet in this specific room
  const userHasBetInThisRoom = userPredictions.some(
    (pred) => pred.roomId === selectedRoomId
  );

  // Determine which action buttons to show
  // ALWAYS show Start button for owner when room is waiting
  const shouldShowStartButton =
    isViewingOwnedRoom && room?.roomStatus === "waiting";

  // Show bet buttons ONLY if room is waiting AND user hasn't bet yet
  const shouldShowBetButtons =
    room?.roomStatus === "waiting" && !userHasBetInThisRoom;

  // Show "already bet" message if user has bet in this room
  const shouldShowAlreadyBetMessage =
    userHasBetInThisRoom && room?.roomStatus === "waiting";

  // Empty state when no room is selected
  // Allow viewing if: room is selected AND (user joined it OR user owns it)
  const canViewRoom = room && (hasJoinedRoom || isViewingOwnedRoom);

  if (!canViewRoom || !room) {
    return (
      <ScrollArea className="flex-1 flex flex-col p-4 relative max-h-[calc(100vh-85px)]">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <TrendingUp
            size={48}
            className="text-green-300/60"
          />
          <div className="text-center">
            <h3 className="text-sm font-semibold text-white mb-2">
              No Room Selected
            </h3>
            <p className="text-xs text-gray-400">
              Click the "Join" button on a room or view your own rooms to get
              started
            </p>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 flex flex-col p-4 relative max-h-[calc(100vh-85px)]">
      <div className="pr-4">
        {/* Room Selection for Prediction */}
        <div>
          <div className="w-full flex items-center justify-between mb-3">
            <h4 className="font-semibold text-white">{room.name}</h4>
            <span className="text-xs text-gray-400">ID: {room.id}</span>
          </div>
          <div className="space-y-2 mb-3">
            <p className="text-xs text-gray-400 flex justify-between items-center w-full">
              Current Price: <span>•••••••••••••••••••••••••••••••••</span>
              <span className="text-green-300 font-semibold">{room.price}</span>
            </p>
            <p className="text-xs text-gray-400 flex justify-between items-center w-full">
              Time: <span>••••••••••••••••••••••••••••••••••••••</span>
              <span className="text-green-300">{room.time}</span>
            </p>
            <p className="text-xs text-gray-400 flex items-center justify-between">
              Players:{" "}
              <span>••••••••••••••••••••••••••••••••••••••••••••••••••••</span>
              <span className="text-green-300">{room.up + room.down}/10</span>
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-[#1E2943] flex-1 mb-3">
            <h4 className="text-xs font-semibold text-white mb-2">
              Players in Room
            </h4>
            <div className="space-y-2">
              {[
                { addr: "0x1234...5678", prediction: "UP" },
                { addr: "0x8765...4321", prediction: "DOWN" },
                { addr: "0xabcd...efgh", prediction: "UP" },
                { addr: "0xabcd...efgh", prediction: "UP" },
              ].map((player, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-[#0F1729] rounded border border-[#1E2943]"
                >
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-300 flex-shrink-0">
                    {player.addr[2]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 truncate">
                      {player.addr}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-300 flex-shrink-0">
                    {player.prediction}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stake Input */}
          <div className="mt-3 pt-3 border-t border-[#1E2943]">
            <label className="text-xs text-gray-400 block mb-1">
              Stake Amount
            </label>
            <input
              type="number"
              placeholder="0.0 cUSD"
              value={stake}
              onChange={(e) => onStakeChange(e.target.value)}
              className="w-full bg-[#1E2943] border border-[#1E2943] rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:border-green-400 focus:outline-none"
            />
          </div>

          {/* UNIFIED ACTION BUTTONS SECTION - Conditional Rendering Based on Room Status & User Relationship */}
          <div className="space-y-3 mt-4 pt-4 border-t border-[#1E2943]">
            {/* SCENARIO 1: User is Owner & Room is Waiting */}
            {isViewingOwnedRoom && room?.roomStatus === "waiting" ? (
              <>
                <p className="text-xs text-gray-300 text-center">
                  {userHasBetInThisRoom
                    ? "You've placed your bet. Click 'Start Game' to begin the round."
                    : "As the owner, you can place a bet and/or start the game."}
                </p>

                {/* Show bet buttons ONLY if owner hasn't bet yet */}
                {!userHasBetInThisRoom && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-white mb-2">
                      Place Your Prediction
                    </h4>
                    <div className="flex gap-3">
                      <button
                        onClick={() => onPredictDirection("UP")}
                        className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs py-2.5 rounded font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!stake || parseFloat(stake) <= 0}
                      >
                        <ArrowUp size={16} /> UP
                      </button>
                      <button
                        onClick={() => onPredictDirection("DOWN")}
                        className="flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs py-2.5 rounded font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!stake || parseFloat(stake) <= 0}
                      >
                        <ArrowDown size={16} /> DOWN
                      </button>
                    </div>
                  </div>
                )}

                {/* ALWAYS show Start Game button for owner in waiting status */}
                <button
                  onClick={onStartRoom}
                  className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm py-2.5 rounded font-semibold transition-all duration-200"
                >
                  Start Game
                </button>
              </>
            ) : /* SCENARIO 2: User is Player & Room is Waiting */ room?.roomStatus ===
                "waiting" && !isViewingOwnedRoom ? (
              <>
                {/* Show bet buttons ONLY if player hasn't bet yet */}
                {!userHasBetInThisRoom ? (
                  <div>
                    <h4 className="text-xs font-semibold text-white mb-2">
                      Place Your Prediction
                    </h4>
                    <div className="flex gap-3">
                      <button
                        onClick={() => onPredictDirection("UP")}
                        className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs py-2.5 rounded font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!stake || parseFloat(stake) <= 0}
                      >
                        <ArrowUp size={16} /> UP
                      </button>
                      <button
                        onClick={() => onPredictDirection("DOWN")}
                        className="flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs py-2.5 rounded font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!stake || parseFloat(stake) <= 0}
                      >
                        <ArrowDown size={16} /> DOWN
                      </button>
                    </div>
                  </div>
                ) : (
                  // Player already bet - show message only
                  <p className="text-xs text-gray-400 text-center py-2">
                    ✓ You have already placed a prediction in this room. Waiting
                    for the game to start.
                  </p>
                )}
              </>
            ) : (
              /* SCENARIO 3: Room Status is "Started" or "Completed" */ <div className="text-center py-2">
                <p className="text-xs text-gray-400">
                  {room?.roomStatus === "started"
                    ? "Game is in progress. No new predictions allowed."
                    : "Game has completed. Results are being calculated."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
