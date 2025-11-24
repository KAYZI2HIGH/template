"use client";
import { PredictionSlip } from "./PredictionSlip";
import { PredictionsList } from "./PredictionsList";
import { Room, UserPrediction } from "@/lib/types";

interface RightSidebarProps {
  activeTab: "slip" | "predictions";
  setActiveTab: (tab: "slip" | "predictions") => void;
  selectedRoom?: Room | undefined;
  selectedRoomId?: string | null;
  rooms: Room[];
  stake: string;
  hasJoinedRoom: boolean;
  isViewingOwnedRoom?: boolean;
  hasUserPredictedInRoom?: boolean;
  isLoadingRooms?: boolean;
  isLoadingPredictions?: boolean;
  onStakeChange: (value: string) => void;
  onPredictDirection: (direction: "UP" | "DOWN") => void;
  onStartRoom?: () => void;
  userPredictions: UserPrediction[];
  onViewDetails: (predictionId: number) => void;
  myRooms?: Room[];
}

export function RightSidebar({
  activeTab,
  setActiveTab,
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
  userPredictions,
  onViewDetails,
  myRooms = [],
}: RightSidebarProps) {
  return (
    <aside className="w-80 border-l border-[#1E2943] flex flex-col">
      {/* Tabs */}
      <div className="flex gap-0 mb-4 border-b border-[#1E2943] h-[53px]">
        <button
          onClick={() => setActiveTab("slip")}
          className={`text-sm font-semibold flex-1 h-full transition-colors border-b-2 ${
            activeTab === "slip"
              ? "bg-green-500/10 text-white border-b-green-500"
              : "bg-transparent text-gray-400 hover:text-white border-b-transparent"
          }`}
        >
          Prediction Slip
        </button>
        <button
          onClick={() => setActiveTab("predictions")}
          className={`text-sm font-semibold flex-1 h-full transition-colors border-b-2 ${
            activeTab === "predictions"
              ? "bg-green-500/10 text-white border-b-green-500"
              : "bg-transparent text-gray-400 hover:text-white border-b-transparent"
          }`}
        >
          My Predictions
        </button>
      </div>

      {/* Prediction Slip Tab */}
      {activeTab === "slip" && (
        <PredictionSlip
          selectedRoom={selectedRoom}
          selectedRoomId={selectedRoomId}
          rooms={rooms}
          stake={stake}
          hasJoinedRoom={hasJoinedRoom}
          isViewingOwnedRoom={isViewingOwnedRoom}
          hasUserPredictedInRoom={hasUserPredictedInRoom}
          onStakeChange={onStakeChange}
          onPredictDirection={onPredictDirection}
          onStartRoom={onStartRoom}
          userPredictions={userPredictions}
        />
      )}

      {/* My Predictions Tab */}
      {activeTab === "predictions" && (
        <PredictionsList
          predictions={userPredictions}
          onViewDetails={onViewDetails}
        />
      )}
    </aside>
  );
}
