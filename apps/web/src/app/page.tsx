"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClientInstance } from "@/components/Providers";
import { roomQueryKeys, predictionQueryKeys } from "@/hooks/useRoomQueries";
import { LeftSidebar } from "@/components/LeftSidebar";
import { MainContent } from "@/components/MainContent";
import { RightSidebar } from "@/components/RightSidebar";
import { Room, UserPrediction } from "@/lib/types";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import {
  useContractClients,
  createRoom,
  placePrediction,
  startRoom,
} from "@/lib/contract-client";
import {
  useRooms,
  useMyRooms,
  usePredictions,
  useCreateRoom as useCreateRoomMutation,
  useStartRoom as useStartRoomMutation,
  useCreatePrediction as useCreatePredictionMutation,
} from "@/hooks/useRoomQueries";
import { fetchStockPrice } from "@/lib/app-utils";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, user } = useAuth();
  const contractClients = useContractClients();
  const queryClient = useQueryClientInstance();

  // ============================================================================
  // REACT QUERY HOOKS FOR DATA FETCHING
  // ============================================================================

  // Fetch all rooms
  const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();

  // Fetch user's created rooms
  const { data: myRooms = [], isLoading: isLoadingMyRooms } = useMyRooms(
    user?.wallet_address ?? null
  );

  // Fetch user's predictions
  const { data: userPredictions = [], isLoading: isLoadingPredictions } =
    usePredictions();

  // Mutations
  const createRoomMutation = useCreateRoomMutation();
  const startRoomMutation = useStartRoomMutation();
  const createPredictionMutation = useCreatePredictionMutation();

  // ============================================================================
  // FORCE REFETCH ON AUTH CHANGE
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && user?.wallet_address) {
      console.log(
        `\n🔄 [page.tsx] Auth changed - forcing rooms refetch for ${user.wallet_address}`
      );
      // Force refetch of all rooms and predictions when user logs in
      queryClient.invalidateQueries({ queryKey: roomQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: predictionQueryKeys.lists() });
    }
  }, [isAuthenticated, user?.wallet_address, queryClient]);

  // ============================================================================
  // UI STATE
  // ============================================================================

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"slip" | "predictions">("slip");
  const [stake, setStake] = useState("100");
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());

  // Transaction State
  const [txLoading, setTxLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

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
    setActiveTab("slip");
  };

  const handleViewOwnedRoomDetails = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const handleCreateRoom = async (roomData: {
    name: string;
    symbol: string;
    timeDuration: string;
    minStake: string;
  }) => {
    if (!isAuthenticated || !user?.wallet_address || !isConnected) {
      toast.error("Authentication Required", {
        description:
          "Please connect and authenticate your wallet to create a room",
      });
      return;
    }

    if (!contractClients.walletClient) {
      toast.error("Wallet Client Error", {
        description: "Unable to initialize wallet client",
      });
      return;
    }

    try {
      setTxLoading(true);
      setTxHash(null);

      // Step 1: Create room on smart contract
      const loadingToastId = toast.loading("Creating room on blockchain...");

      const durationMinutes = parseInt(roomData.timeDuration);
      const minStakeAmount = parseFloat(roomData.minStake);

      // Validate inputs
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        throw new Error(
          `Invalid duration: "${roomData.timeDuration}" is not a valid number`
        );
      }
      if (isNaN(minStakeAmount) || minStakeAmount <= 0) {
        throw new Error(
          `Invalid minimum stake: "${roomData.minStake}" is not a valid number`
        );
      }

      const txHash = await createRoom(contractClients.walletClient, {
        name: roomData.name,
        symbol: roomData.symbol,
        durationMinutes,
        minStake: minStakeAmount,
      });

      setTxHash(txHash);
      toast.success("Transaction submitted!", {
        description: `Hash: ${txHash.slice(0, 10)}...`,
        id: loadingToastId,
      });

      // Step 2: Save to database with tx hash using mutation
      const dbLoadingToastId = toast.loading("Confirming on database...");

      await createRoomMutation.mutateAsync({
        name: roomData.name,
        symbol: roomData.symbol,
        timeDuration: roomData.timeDuration,
        minStake: roomData.minStake,
      });

      setSelectedRoomId(null);

      toast.success("Room created!", {
        description: `${roomData.name} is now live on blockchain`,
        id: dbLoadingToastId,
      });
    } catch (error) {
      console.error("Error creating room:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to create room", {
        description: errorMsg,
      });
    } finally {
      setTxLoading(false);
    }
  };

  const handleStakeChange = (value: string) => {
    // Validate the input to ensure it's a valid number
    if (value === "") {
      setStake("");
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setStake(value);
    }
    // Silently ignore invalid input (user still typing)
  };

  const handlePredictDirection = async (direction: "UP" | "DOWN") => {
    if (!isAuthenticated || !user?.wallet_address || !isConnected) {
      toast.error("Authentication Required", {
        description:
          "Please connect and authenticate your wallet to make a prediction",
      });
      return;
    }

    if (!selectedRoom) {
      return;
    }

    if (!stake || parseFloat(stake) <= 0) {
      toast.error("Invalid Stake", {
        description: "Please enter a valid stake amount",
      });
      return;
    }

    if (!contractClients.walletClient) {
      toast.error("Wallet Client Error", {
        description: "Unable to initialize wallet client",
      });
      return;
    }

    try {
      setTxLoading(true);
      setTxHash(null);

      const stakeAmount = parseFloat(stake);

      // 🎯 FRONTEND LOGGING: Show prediction details
      console.log(
        `%c🎯 PLACING PREDICTION`,
        "color: #ff00ff; font-weight: bold; font-size: 14px"
      );
      console.log(`%c   Room: ${selectedRoom.name}`, "color: #00ffff");
      console.log(
        `%c   Direction: ${direction} (${
          direction === "UP" ? "bullish ⬆️" : "bearish ⬇️"
        })`,
        "color: #ffff00"
      );
      console.log(`%c   Stake: ${stake} cUSD`, "color: #00ff00");
      console.log(
        `%c   Room Status: ${selectedRoom.roomStatus}`,
        "color: #ff6600"
      );
      console.log(
        `%c   Players before: UP=${selectedRoom.up}, DOWN=${selectedRoom.down}`,
        "color: #cccccc"
      );

      // Double-check stake is valid
      if (!stakeAmount || isNaN(stakeAmount) || stakeAmount <= 0) {
        throw new Error(
          `Invalid stake amount: "${stake}" is not a valid number`
        );
      }

      // Step 1: Place prediction on smart contract
      const loadingToastId = toast.loading(
        `Submitting ${direction} prediction to blockchain...`
      );

      // Use numeric ID for blockchain, fallback to regular ID
      const roomIdNumber = selectedRoom.numericId || parseInt(selectedRoom.id);

      // Validate room ID
      if (!roomIdNumber || isNaN(roomIdNumber) || roomIdNumber <= 0) {
        throw new Error(
          `Invalid room ID: got ${roomIdNumber}, room data: ${JSON.stringify(
            selectedRoom
          )}`
        );
      }

      const txHash = await placePrediction(
        contractClients.walletClient,
        roomIdNumber,
        direction,
        stakeAmount
      );

      setTxHash(txHash);
      toast.success("Prediction submitted!", {
        description: `Hash: ${txHash.slice(
          0,
          10
        )}... - ${direction} for ${stakeAmount} cUSD`,
        id: loadingToastId,
      });

      // Step 2: Save to database using mutation
      const dbLoadingToastId = toast.loading(
        "Confirming prediction on database..."
      );

      const directionLower = direction === "UP" ? "up" : "down";
      await createPredictionMutation.mutateAsync({
        roomId: selectedRoom.id,
        direction: directionLower as "up" | "down",
        amount: stakeAmount,
        creator: user.wallet_address,
      });

      // Invalidate rooms list to refresh counts (can also do this via mutation callback)
      setStake("100");

      toast.success("Prediction placed!", {
        description: `${direction} bet of ${stakeAmount} cUSD confirmed on-chain`,
        id: dbLoadingToastId,
      });
    } catch (error) {
      console.error("Error placing prediction:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to place prediction", {
        description: errorMsg,
      });
    } finally {
      setTxLoading(false);
    }
  };

  const handleStartRoom = async () => {
    if (!isAuthenticated || !user?.wallet_address || !isConnected) {
      toast.error("Authentication Required", {
        description:
          "Please connect and authenticate your wallet to start a room",
      });
      return;
    }

    if (!selectedRoom) {
      return;
    }

    if (!contractClients.walletClient) {
      toast.error("Wallet Client Error", {
        description: "Unable to initialize wallet client",
      });
      return;
    }

    try {
      setTxLoading(true);
      setTxHash(null);

      // Fetch actual starting price from FMP API
      const startingPrice = await fetchStockPrice(selectedRoom.symbol);

      if (!startingPrice || isNaN(startingPrice) || startingPrice <= 0) {
        throw new Error(
          `Failed to fetch stock price for ${selectedRoom.symbol}`
        );
      }

      // 🎯 FRONTEND LOGGING: Show time calculation
      const now = Math.floor(Date.now() / 1000);
      const durationSeconds = selectedRoom.timeDuration
        ? parseInt(selectedRoom.timeDuration) * 60
        : 3600;
      const endTime = now + durationSeconds;

      console.log(
        `%c🚀 STARTING ROOM: ${selectedRoom.name}`,
        "color: #00ff00; font-weight: bold; font-size: 14px"
      );
      console.log(
        `%c   Duration: ${
          selectedRoom.timeDuration || "1h"
        } (${durationSeconds}s)`,
        "color: #ffff00"
      );
      console.log(`%c   Start Time: ${now} (epoch)`, "color: #00ffff");
      console.log(`%c   End Time: ${endTime} (epoch)`, "color: #ff00ff");
      console.log(
        `%c   Countdown: ${durationSeconds}s remaining`,
        "color: #00ff00"
      );

      // Step 1: Start room on smart contract
      const loadingToastId = toast.loading(
        `Starting room at price $${startingPrice.toFixed(2)} on blockchain...`
      );

      const roomIdNumber = selectedRoom.numericId || parseInt(selectedRoom.id);

      // Validate room ID
      if (!roomIdNumber || isNaN(roomIdNumber) || roomIdNumber <= 0) {
        throw new Error(
          `Invalid room ID: got ${roomIdNumber}, room data: ${JSON.stringify(
            selectedRoom
          )}`
        );
      }

      const txHash = await startRoom(
        contractClients.walletClient,
        roomIdNumber,
        startingPrice
      );

      setTxHash(txHash);
      toast.success("Room started on blockchain!", {
        description: `Hash: ${txHash.slice(
          0,
          10
        )}... at $${startingPrice.toFixed(2)}`,
        id: loadingToastId,
      });

      // Step 2: Update database using mutation
      const dbLoadingToastId = toast.loading(
        "Confirming room start on database..."
      );

      await startRoomMutation.mutateAsync(selectedRoom.id);

      toast.success("Room started!", {
        description: `Game is now in progress at $${startingPrice.toFixed(2)}`,
        id: dbLoadingToastId,
      });
    } catch (error) {
      console.error("Error starting room:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to start room", {
        description: errorMsg,
      });
    } finally {
      setTxLoading(false);
    }
  };

  const handleViewPredictionDetails = (prediction: UserPrediction) => {
    // Find the room by matching the prediction's roomId
    const room = rooms.find((r) => r.id === prediction.roomId);

    if (room) {
      // Mark room as joined so user can view it
      const newJoined = new Set(joinedRooms);
      newJoined.add(room.id);
      setJoinedRooms(newJoined);
      setSelectedRoomId(room.id);
      // Switch to "slip" tab to show room details
      setActiveTab("slip");
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
          myRooms={myRooms}
          isLoading={isLoadingRooms}
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
          isLoadingRooms={isLoadingRooms}
          isLoadingPredictions={isLoadingPredictions}
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
