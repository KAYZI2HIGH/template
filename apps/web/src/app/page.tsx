"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LeftSidebar } from "@/components/LeftSidebar";
import { MainContent } from "@/components/MainContent";
import { RightSidebar } from "@/components/RightSidebar";
import { Room, UserPrediction } from "@/lib/types";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Mock rooms data
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: "1",
      name: "MTN Stock Price Movement",
      symbol: "MTN.NG",
      status: "active",
      roomStatus: "started",
      time: "2h remaining",
      timeDuration: "2h",
      price: "₦290.50",
      minStake: 100,
      up: 12,
      down: 8,
    },
    {
      id: "2",
      name: "Dangote Cement Rally",
      symbol: "DANGCEM.NG",
      status: "waiting",
      roomStatus: "waiting",
      time: "5h remaining",
      timeDuration: "5h",
      price: "₦254.80",
      minStake: 50,
      up: 5,
      down: 3,
    },
    {
      id: "3",
      name: "Nigerian Banks Index",
      symbol: "BANKS.NG",
      status: "active",
      roomStatus: "started",
      time: "30m remaining",
      timeDuration: "30m",
      price: "₦445.20",
      minStake: 200,
      up: 15,
      down: 10,
    },
    {
      id: "4",
      name: "Zenith Bank Strong Move",
      symbol: "ZENITHBANK.NG",
      status: "active",
      roomStatus: "started",
      time: "1h 15m remaining",
      timeDuration: "1h 15m",
      price: "₦35.50",
      minStake: 75,
      up: 20,
      down: 12,
    },
    {
      id: "5",
      name: "SEPLAT Energy Surge",
      symbol: "SEPLAT.NG",
      status: "waiting",
      roomStatus: "waiting",
      time: "3h 30m remaining",
      timeDuration: "3h 30m",
      price: "₦520.00",
      minStake: 150,
      up: 8,
      down: 6,
      ownerId: "current-user-id",
    },
    {
      id: "10",
      name: "Previous DANGCEM Bet",
      symbol: "DANGCEM.NG",
      status: "completed",
      roomStatus: "completed",
      time: "3h 30m remaining",
      timeDuration: "3h 30m",
      price: "₦520.00",
      minStake: 150,
      up: 8,
      down: 6,
    },
  ]);

  // User predictions
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([
    {
      id: 1,
      name: "MTN Stock Prediction",
      status: "active",
      prediction: "UP",
      stake: "500 cUSD",
      timeRemaining: "45 minutes",
      players: 20,
      playersJoined: 12,
      roomId: "1",
    },
    {
      id: 10,
      name: "Previous DANGCEM Bet",
      status: "completed",
      prediction: "DOWN",
      stake: "250 cUSD",
      outcome: "WIN",
      payout: "487.50 cUSD",
      roomId: "10",
    },
  ]);

  // UI State
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>("5");
  const [activeTab, setActiveTab] = useState<"slip" | "predictions">("slip");
  const [stake, setStake] = useState("100");
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(
    new Set(["1", "10"])
  );
  // Initialize with one owned room for testing the "Start Game" button
  const [myRooms, setMyRooms] = useState<Room[]>([
    {
      id: "5",
      name: "SEPLAT Energy Surge",
      symbol: "SEPLAT.NG",
      status: "waiting",
      roomStatus: "waiting",
      time: "3h 30m remaining",
      timeDuration: "3h 30m",
      price: "₦520.00",
      minStake: 150,
      up: 8,
      down: 6,
      ownerId: "current-user-id",
    },
  ]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const hasJoinedRoom = selectedRoomId
    ? joinedRooms.has(selectedRoomId)
    : false;
  const isViewingOwnedRoom =
    selectedRoom && myRooms.find((r) => r.id === selectedRoom.id);
  // Check if user has ANY prediction in this room (active or completed)
  const hasUserPredictedInRoom =
    selectedRoom && userPredictions.some((p) => p.roomId === selectedRoom.id);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleJoinRoom = (roomId: string) => {
    const newJoined = new Set(joinedRooms);
    newJoined.add(roomId);
    setJoinedRooms(newJoined);
    setSelectedRoomId(roomId);

    // Show toast-like feedback
    console.log(`✅ Successfully joined room ${roomId}`);
  };

  const handleViewOwnedRoomDetails = (roomId: string) => {
    setSelectedRoomId(roomId);
    console.log(`👀 Viewing owned room details: ${roomId}`);
  };

  const handleCreateRoom = (roomData: {
    name: string;
    symbol: string;
    timeDuration: string;
    minStake: string;
  }) => {
    if (!isAuthenticated || !user?.wallet_address) {
      console.warn("❌ Must be authenticated to create a room");
      alert("Please connect and authenticate your wallet to create a room");
      return;
    }

    const newRoom: Room = {
      id: (rooms.length + 1).toString(),
      name: roomData.name,
      symbol: roomData.symbol,
      status: "waiting",
      roomStatus: "waiting",
      time: `${roomData.timeDuration} remaining`,
      timeDuration: roomData.timeDuration,
      price: "₦0.00",
      minStake: parseInt(roomData.minStake),
      up: 0,
      down: 0,
      ownerId: "current-user-id",
    };

    setRooms([...rooms, newRoom]);
    setMyRooms([...myRooms, newRoom]);
    setSelectedRoomId(newRoom.id);

    console.log(`✨ Room created successfully:`, newRoom);
  };

  const handleStakeChange = (value: string) => {
    setStake(value);
  };

  const handlePredictDirection = (direction: "UP" | "DOWN") => {
    if (!isAuthenticated || !user?.wallet_address) {
      console.warn("❌ Must be authenticated to make a prediction");
      alert("Please connect and authenticate your wallet to make a prediction");
      return;
    }

    if (!selectedRoom) {
      console.log("⚠️ No room selected");
      return;
    }

    const newPrediction: UserPrediction = {
      id: userPredictions.length + 1,
      name: `${selectedRoom.name} - ${direction}`,
      status: "active",
      prediction: direction,
      stake: `${stake} cUSD`,
      timeRemaining: selectedRoom.time,
      players: selectedRoom.up + selectedRoom.down,
      playersJoined: selectedRoom.up + selectedRoom.down + 1,
      roomId: selectedRoom.id,
    };

    setUserPredictions([...userPredictions, newPrediction]);

    // Update room stats
    const updatedRooms = rooms.map((room) => {
      if (room.id === selectedRoom.id) {
        return {
          ...room,
          [direction === "UP" ? "up" : "down"]:
            room[direction === "UP" ? "up" : "down"] + 1,
        };
      }
      return room;
    });
    setRooms(updatedRooms);

    console.log(
      `🎯 Predicted ${direction} on ${selectedRoom.name} with ${stake} cUSD`
    );
  };

  const handleStartRoom = () => {
    if (!isAuthenticated || !user?.wallet_address) {
      console.warn("❌ Must be authenticated to start a room");
      alert("Please connect and authenticate your wallet to start a room");
      return;
    }

    if (!selectedRoom) {
      console.log("⚠️ No room selected");
      return;
    }

    const updatedRooms = rooms.map((room) => {
      if (room.id === selectedRoom.id && room.status === "waiting") {
        return { ...room, status: "active", roomStatus: "started" as const };
      }
      return room;
    });
    setRooms(updatedRooms);

    console.log(`🚀 Room started: ${selectedRoom.name}`);
  };

  const handleViewPredictionDetails = (predictionId: number) => {
    const prediction = userPredictions.find((p) => p.id === predictionId);
    if (prediction) {
      setSelectedRoomId(prediction.roomId);
      // Switch to "slip" tab to show room details, not predictions list
      setActiveTab("slip");
      console.log(
        `📊 Viewing room from prediction details:`,
        prediction?.roomId
      );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-screen bg-[#10141E]">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Main Content */}
        <MainContent
          rooms={rooms}
          onJoinRoom={handleJoinRoom}
          onViewOwnedRoomDetails={handleViewOwnedRoomDetails}
          onCreateRoom={handleCreateRoom}
        />

        {/* Right Sidebar */}
        <RightSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedRoom={selectedRoom}
          selectedRoomId={selectedRoomId}
          rooms={rooms}
          stake={stake}
          hasJoinedRoom={hasJoinedRoom}
          isViewingOwnedRoom={!!isViewingOwnedRoom}
          hasUserPredictedInRoom={!!hasUserPredictedInRoom}
          onStakeChange={handleStakeChange}
          onPredictDirection={handlePredictDirection}
          onStartRoom={handleStartRoom}
          userPredictions={userPredictions}
          onViewDetails={handleViewPredictionDetails}
          myRooms={myRooms}
        />
      </div>
    </div>
  );
}
