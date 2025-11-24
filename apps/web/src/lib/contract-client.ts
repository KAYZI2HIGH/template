/**
 * Smart Contract Interaction Layer
 * Handles all calls to the PredictionRoom contract on Celo
 */

import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { celo, celoAlfajores } from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import PredictionRoomABI from "@/abi/PredictionRoom.json";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x") as `0x${string}`;

const CHAIN = celoAlfajores; // Using Alfajores testnet

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
 */
export async function createRoom(
  walletClient: any,
  roomData: {
    name: string;
    symbol: string;
    durationMinutes: number;
    minStake: number;
  }
) {
  try {
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "createRoom",
      args: [
        roomData.name,
        roomData.symbol,
        roomData.durationMinutes,
        parseEther(roomData.minStake.toString()),
      ],
    });

    return hash;
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
  direction: "UP" | "DOWN", // 1 = UP, 2 = DOWN
  stakeAmount: number
) {
  try {
    const directionEnum = direction === "UP" ? 1 : 2;

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "predict",
      args: [roomId, directionEnum],
      value: parseEther(stakeAmount.toString()),
    });

    return hash;
  } catch (error) {
    console.error("Error placing prediction:", error);
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
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "startRoom",
      args: [roomId, parseEther(startingPrice.toString())],
    });

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
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "resolveRoom",
      args: [roomId, parseEther(endingPrice.toString())],
    });

    return hash;
  } catch (error) {
    console.error("Error resolving room:", error);
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
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PredictionRoomABI,
      functionName: "claim",
      args: [roomId],
    });

    return hash;
  } catch (error) {
    console.error("Error claiming payout:", error);
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
