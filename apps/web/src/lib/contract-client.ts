/**
 * Smart Contract Interaction Layer
 * Handles all calls to the PredictionRoom contract on Celo
 */

import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import PredictionRoomABI from "@/abi/PredictionRoom.json";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x") as `0x${string}`;

// ============================================================================
// HOOK: useContractClients
// ============================================================================

export function useContractClients() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return {
    publicClient,
    walletClient,
    contractAddress: CONTRACT_ADDRESS,
    abi: PredictionRoomABI,
  };
}

// ============================================================================
// ROOM CREATION
// ============================================================================

/**
 * Create a new prediction room
 * Returns both the transaction hash and the on-chain roomId
 */
export async function createRoom(
  walletClient: any,
  publicClient: any,
  roomData: {
    name: string;
    symbol: string;
    durationMinutes: number;
    minStake: number;
  }
) {
  try {
    // Validate minimum stake
    if (
      !roomData.minStake ||
      isNaN(roomData.minStake) ||
      roomData.minStake <= 0
    ) {
      throw new Error("Invalid minimum stake amount: " + roomData.minStake);
    }

    const minStakeBigInt = parseEther(roomData.minStake.toString());

    console.log("📝 Creating room on-chain:", {
      name: roomData.name,
      symbol: roomData.symbol,
      durationMinutes: roomData.durationMinutes,
      minStake: roomData.minStake,
    });

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "createRoom",
      args: [
        roomData.name,
        roomData.symbol,
        BigInt(roomData.durationMinutes),
        minStakeBigInt,
      ],
    });

    console.log("✅ Room creation tx submitted:", hash);

    // Wait for transaction to be mined and get the receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    console.log("📦 Transaction confirmed in block:", receipt.blockNumber);

    // Read nextRoomId from contract to get the roomId of the room we just created
    // nextRoomId is incremented AFTER creating a room, so the roomId = nextRoomId - 1
    const nextRoomId = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "nextRoomId",
    });

    const createdRoomId = Number(nextRoomId) - 1;

    console.log("🎯 Room created with ID:", createdRoomId);

    return {
      txHash: hash,
      roomId: createdRoomId,
    };
  } catch (error) {
    console.error("Error creating room:", error);
    throw error;
  }
}

// ============================================================================
// PREDICTIONS
// ============================================================================

/**
 * Place a prediction (send cUSD)
 */
export async function placePrediction(
  walletClient: any,
  roomId: number,
  direction: "UP" | "DOWN",
  stakeAmount: number
) {
  try {
    // Validate stake amount
    if (!stakeAmount || isNaN(stakeAmount) || stakeAmount <= 0) {
      throw new Error("Invalid stake amount: " + stakeAmount);
    }

    const directionEnum = direction === "UP" ? 1 : 2;
    const stakeBigInt = parseEther(stakeAmount.toString());

    console.log("🎯 Placing prediction:", {
      contractAddress: CONTRACT_ADDRESS,
      roomId,
      direction,
      directionEnum,
      stakeAmount,
      stakeBigInt: stakeBigInt.toString(),
    });

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "predict",
      args: [BigInt(roomId), BigInt(directionEnum)],
      value: stakeBigInt,
    });

    console.log("✅ Prediction placed, tx hash:", hash);
    return hash;
  } catch (error) {
    console.error("❌ Error placing prediction:", error);
    // Parse the error to give more specific feedback
    const errorMessage = String(error);
    if (errorMessage.includes("RoomNotWaiting")) {
      throw new Error("Room is not in waiting status. Did you start the game?");
    } else if (errorMessage.includes("RoomAlreadyStarted")) {
      throw new Error(
        "Room time has expired. This shouldn't happen if you just started it."
      );
    } else if (errorMessage.includes("InvalidAmount")) {
      throw new Error(
        "Stake amount is less than minimum. Check the room's minimum stake."
      );
    } else if (errorMessage.includes("InvalidDirection")) {
      throw new Error("Invalid direction. Must be UP or DOWN.");
    } else if (errorMessage.includes("UserAlreadyPredicted")) {
      throw new Error("You have already placed a prediction in this room.");
    }
    throw error;
  }
}

// ============================================================================
// ROOM MANAGEMENT (Creator only)
// ============================================================================

/**
 * Start a room (set starting price)
 */
export async function startRoom(
  walletClient: any,
  roomId: number,
  startingPrice: number
) {
  try {
    // Validate starting price
    if (!startingPrice || isNaN(startingPrice) || startingPrice <= 0) {
      throw new Error("Invalid starting price: " + startingPrice);
    }

    const priceBigInt = parseEther(startingPrice.toString());

    console.log(`📝 startRoom params:`, {
      roomId,
      startingPrice,
      priceBigInt: priceBigInt.toString(),
    });

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "startRoom",
      args: [BigInt(roomId), priceBigInt],
    });

    console.log(`✅ startRoom tx hash:`, hash);
    return hash;
  } catch (error) {
    console.error("Error starting room:", error);
    throw error;
  }
}

/**
 * Resolve a room (set ending price)
 */
export async function resolveRoom(
  walletClient: any,
  roomId: number,
  endingPrice: number
) {
  try {
    // Validate ending price
    if (!endingPrice || isNaN(endingPrice) || endingPrice <= 0) {
      throw new Error("Invalid ending price: " + endingPrice);
    }

    // Convert USD price to wei (price * 10^18)
    // This matches how prices are stored in the contract (as fixed-point numbers)
    const priceWei = BigInt(Math.round(endingPrice * 1e18));

    console.log(`🔧 Calling resolveRoom on contract:`, {
      contractAddress: CONTRACT_ADDRESS,
      roomId,
      endingPriceUSD: endingPrice,
      priceWei: priceWei.toString(),
    });

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "resolveRoom",
      args: [BigInt(roomId), priceWei],
    });

    console.log(`✅ resolveRoom tx hash:`, hash);
    return hash;
  } catch (error) {
    console.error("❌ Error resolving room:", error);
    throw error;
  }
}

// ============================================================================
// PAYOUTS
// ============================================================================

/**
 * Claim winnings from a resolved room
 */
export async function claimPayout(walletClient: any, roomId: number) {
  try {
    console.log(`🔧 Calling claimPayout on contract:`, {
      contractAddress: CONTRACT_ADDRESS,
      roomId,
    });
    
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "claimPayout",
      args: [BigInt(roomId)],
    });

    console.log(`✅ claimPayout tx hash:`, hash);
    return hash;
  } catch (error) {
    console.error("❌ Error claiming payout:", error);
    throw error;
  }
}

/**
 * Calculate payout for a winning prediction
 */
export async function calculatePayout(
  publicClient: any,
  roomId: number,
  wagerAmount: number,
  direction: "UP" | "DOWN"
) {
  try {
    const directionEnum = direction === "UP" ? 1 : 2;

    const payout = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "calculatePayout",
      args: [roomId, parseEther(wagerAmount.toString()), directionEnum],
    });

    return payout;
  } catch (error) {
    console.error("Error calculating payout:", error);
    throw error;
  }
}

// ============================================================================
// READ FUNCTIONS
// ============================================================================

/**
 * Get room details
 */
export async function getRoom(publicClient: any, roomId: number) {
  try {
    const room = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "getRoom",
      args: [roomId],
    });

    return room;
  } catch (error) {
    console.error("Error fetching room:", error);
    throw error;
  }
}

/**
 * Get user's prediction in a room
 */
export async function getUserPrediction(
  publicClient: any,
  roomId: number,
  userAddress: `0x${string}`
) {
  try {
    const prediction = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "getUserPrediction",
      args: [roomId, userAddress],
    });

    return prediction;
  } catch (error) {
    console.error("Error fetching user prediction:", error);
    throw error;
  }
}

/**
 * Check if user has already predicted in a room
 */
export async function hasUserPredicted(
  publicClient: any,
  roomId: number,
  userAddress: `0x${string}`
) {
  try {
    const has = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "hasUserPredicted",
      args: [roomId, userAddress],
    });

    return has;
  } catch (error) {
    console.error("Error checking prediction:", error);
    throw error;
  }
}

/**
 * Get prediction counts (UP/DOWN) for a room
 */
export async function getPredictionCounts(publicClient: any, roomId: number) {
  try {
    const counts = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "getPredictionCounts",
      args: [roomId],
    });

    return counts;
  } catch (error) {
    console.error("Error fetching prediction counts:", error);
    throw error;
  }
}

/**
 * Get all predictions in a room
 */
export async function getRoomPredictions(publicClient: any, roomId: number) {
  try {
    const predictions = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "getRoomPredictions",
      args: [roomId],
    });

    return predictions;
  } catch (error) {
    console.error("Error fetching room predictions:", error);
    throw error;
  }
}
