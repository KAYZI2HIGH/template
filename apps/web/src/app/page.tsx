"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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

export default function Home() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, user } = useAuth();
  const contractClients = useContractClients();

  // ============================================================================
  // REACT QUERY HOOKS FOR DATA FETCHING
  // ============================================================================

  // Fetch all rooms
  const { data: rooms = [] } = useRooms();

  // Fetch user's created rooms
  const { data: myRooms = [] } = useMyRooms(user?.wallet_address ?? null);

  // Fetch user's predictions
  const { data: userPredictions = [] } = usePredictions();

  console.log(
    `📊 DEBUG: userPredictions loaded:`,
    userPredictions.map((p) => ({
      id: p.id,
      name: p.name,
      roomId: p.roomId,
      status: p.status,
    }))
  );

  // Mutations
  const createRoomMutation = useCreateRoomMutation();
  const startRoomMutation = useStartRoomMutation();
  const createPredictionMutation = useCreatePredictionMutation();

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

    console.log(`✅ Successfully joined room ${roomId}`);
  };

  const handleViewOwnedRoomDetails = (roomId: string) => {
    setSelectedRoomId(roomId);
    console.log(`👀 Viewing owned room details: ${roomId}`);
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
      console.log(`🔄 Creating room on smart contract: ${roomData.name}`);
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

      console.log(
        `📊 DEBUG: durationMinutes=${durationMinutes}, minStakeAmount=${minStakeAmount}`
      );

      const txHash = await createRoom(contractClients.walletClient, {
        name: roomData.name,
        symbol: roomData.symbol,
        durationMinutes,
        minStake: minStakeAmount,
      });

      setTxHash(txHash);
      console.log(`✅ Room creation tx hash: ${txHash}`);
      toast.success("Transaction submitted!", {
        description: `Hash: ${txHash.slice(0, 10)}...`,
        id: loadingToastId,
      });

      // Step 2: Save to database with tx hash using mutation
      console.log(`🔄 Saving room to database...`);
      const dbLoadingToastId = toast.loading("Confirming on database...");

      await createRoomMutation.mutateAsync({
        name: roomData.name,
        symbol: roomData.symbol,
        timeDuration: roomData.timeDuration,
        minStake: roomData.minStake,
      });

      setSelectedRoomId(null);

      console.log(`✨ Room created successfully`);
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
      console.log("⚠️ No room selected");
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

      // Double-check stake is valid
      if (!stakeAmount || isNaN(stakeAmount) || stakeAmount <= 0) {
        throw new Error(
          `Invalid stake amount: "${stake}" is not a valid number`
        );
      }

      console.log(
        `📊 DEBUG: stake="${stake}", stakeAmount=${stakeAmount}, type=${typeof stakeAmount}`
      );

      // Step 1: Place prediction on smart contract
      console.log(
        `🔄 Placing ${direction} prediction on blockchain for ${selectedRoom.name}...`
      );
      const loadingToastId = toast.loading(
        `Submitting ${direction} prediction to blockchain...`
      );

      // Use numeric ID for blockchain, fallback to regular ID
      const roomIdNumber = selectedRoom.numericId || parseInt(selectedRoom.id);

      console.log(
        `📊 DEBUG: selectedRoom=${JSON.stringify(
          selectedRoom
        )}, roomIdNumber=${roomIdNumber}`
      );

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
      console.log(`✅ Prediction tx hash: ${txHash}`);
      toast.success("Prediction submitted!", {
        description: `Hash: ${txHash.slice(
          0,
          10
        )}... - ${direction} for ${stakeAmount} cUSD`,
        id: loadingToastId,
      });

      // Step 2: Save to database using mutation
      console.log(`🔄 Saving prediction to database...`);
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

      console.log(
        `🎯 Predicted ${direction} on ${selectedRoom.name} with ${stakeAmount} cUSD`
      );
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
      console.log("⚠️ No room selected");
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

      // For demo purposes, use a mock starting price
      // In production, this would fetch from a price oracle
      const mockStartingPrice = 250.5;

      // Validate price
      if (
        !mockStartingPrice ||
        isNaN(mockStartingPrice) ||
        mockStartingPrice <= 0
      ) {
        throw new Error(
          `Invalid starting price: "${mockStartingPrice}" is not a valid number`
        );
      }

      console.log(
        `📊 DEBUG: mockStartingPrice=${mockStartingPrice}, type=${typeof mockStartingPrice}`
      );

      // Step 1: Start room on smart contract
      console.log(
        `🔄 Starting room on blockchain: ${selectedRoom.name} at price ₦${mockStartingPrice}...`
      );
      const loadingToastId = toast.loading(
        `Starting room at price ₦${mockStartingPrice} on blockchain...`
      );

      const roomIdNumber = selectedRoom.numericId || parseInt(selectedRoom.id);

      console.log(
        `📊 DEBUG: selectedRoom=${JSON.stringify(
          selectedRoom
        )}, roomIdNumber=${roomIdNumber}`
      );

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
        mockStartingPrice
      );

      setTxHash(txHash);
      console.log(`✅ Room start tx hash: ${txHash}`);
      toast.success("Room started on blockchain!", {
        description: `Hash: ${txHash.slice(0, 10)}... at ₦${mockStartingPrice}`,
        id: loadingToastId,
      });

      // Step 2: Update database using mutation
      console.log(`🔄 Updating room status in database...`);
      const dbLoadingToastId = toast.loading(
        "Confirming room start on database..."
      );

      await startRoomMutation.mutateAsync(selectedRoom.id);

      console.log(`🚀 Room started on-chain: ${selectedRoom.name}`);
      toast.success("Room started!", {
        description: `Game is now in progress at ₦${mockStartingPrice}`,
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
    console.log(`📊 DEBUG handleViewPredictionDetails:`, {
      id: prediction.id,
      name: prediction.name,
      roomId: prediction.roomId,
    });
    console.log(
      `  Available rooms:`,
      rooms.map((r) => ({ id: r.id, name: r.name }))
    );

    // Find the room by matching the prediction's roomId
    const room = rooms.find((r) => r.id === prediction.roomId);

    if (room) {
      console.log(`  ✅ Found room: ${room.name}`);
      // Mark room as joined so user can view it
      const newJoined = new Set(joinedRooms);
      newJoined.add(room.id);
      setJoinedRooms(newJoined);
      setSelectedRoomId(room.id);
      // Switch to "slip" tab to show room details
      setActiveTab("slip");
    } else {
      console.warn(
        `⚠️ Room not found for prediction roomId: ${prediction.roomId}`
      );
      console.log(
        `  Available room IDs:`,
        rooms.map((r) => r.id)
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
          myRooms={myRooms}
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
