// Database Query Examples - Quick Reference

// ============================================================================
// USERS TABLE OPERATIONS
// ============================================================================

import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/supabase";

// Get user by wallet address
export async function getUserByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  return { data, error };
}

// Create new user
export async function createUser(walletAddress: string) {
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        wallet_address: walletAddress.toLowerCase(),
        total_predictions: 0,
        total_wins: 0,
        total_losses: 0,
        total_volume: 0,
        win_rate: 0,
      },
    ])
    .select()
    .single();

  return { data, error };
}

// Update user profile
export async function updateUserProfile(
  walletAddress: string,
  updates: Partial<User>
) {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("wallet_address", walletAddress.toLowerCase())
    .select()
    .single();

  return { data, error };
}

// Get user stats
export async function getUserStats(walletAddress: string) {
  const { data, error } = await supabase
    .from("users")
    .select(
      "total_predictions, total_wins, total_losses, total_volume, win_rate"
    )
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  return { data, error };
}

// ============================================================================
// ROOMS TABLE OPERATIONS
// ============================================================================

import type { Room } from "@/lib/supabase";

// Get all waiting rooms (public view)
export async function getWaitingRooms() {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: false });

  return { data, error };
}

// Get all active rooms
export async function getActiveRooms() {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return { data, error };
}

// Get single room
export async function getRoomById(roomId: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  return { data, error };
}

// Get rooms created by user
export async function getUserRooms(walletAddress: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("creator_wallet_address", walletAddress.toLowerCase())
    .order("created_at", { ascending: false });

  return { data, error };
}

// Create new room
export async function createRoom(
  creatorWallet: string,
  roomData: {
    room_id_web: string;
    name: string;
    symbol: string;
    min_stake: number;
    duration_minutes: number;
  }
) {
  const { data, error } = await supabase
    .from("rooms")
    .insert([
      {
        ...roomData,
        creator_wallet_address: creatorWallet.toLowerCase(),
        status: "waiting",
        total_up_stake: 0,
        total_down_stake: 0,
      },
    ])
    .select()
    .single();

  return { data, error };
}

// Update room status
export async function updateRoomStatus(
  roomId: string,
  status: "waiting" | "active" | "completed",
  additionalData?: Partial<Room>
) {
  const { data, error } = await supabase
    .from("rooms")
    .update({
      status,
      ...additionalData,
    })
    .eq("id", roomId)
    .select()
    .single();

  return { data, error };
}

// Start room with price
export async function startRoom(roomId: string, startingPrice: number) {
  const { data, error } = await supabase
    .from("rooms")
    .update({
      status: "active",
      starting_price: startingPrice,
      starts_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .select()
    .single();

  return { data, error };
}

// Settle room with ending price
export async function settleRoom(roomId: string, endingPrice: number) {
  const { data, error } = await supabase
    .from("rooms")
    .update({
      status: "completed",
      ending_price: endingPrice,
      ends_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .select()
    .single();

  return { data, error };
}

// Update room stakes
export async function updateRoomStakes(
  roomId: string,
  direction: "UP" | "DOWN",
  stakeAmount: number
) {
  const columnName = direction === "UP" ? "total_up_stake" : "total_down_stake";

  const { data: currentRoom } = await getRoomById(roomId);
  if (!currentRoom) throw new Error("Room not found");

  const newStake =
    (currentRoom[columnName as keyof Room] as number) + stakeAmount;

  const { data, error } = await supabase
    .from("rooms")
    .update({
      [columnName]: newStake,
    })
    .eq("id", roomId)
    .select()
    .single();

  return { data, error };
}

// ============================================================================
// PREDICTIONS TABLE OPERATIONS
// ============================================================================

import type { Prediction } from "@/lib/supabase";

// Get user's predictions
export async function getUserPredictions(walletAddress: string) {
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_wallet_address", walletAddress.toLowerCase())
    .order("created_at", { ascending: false });

  return { data, error };
}

// Get predictions in a room
export async function getRoomPredictions(roomId: string) {
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  return { data, error };
}

// Get user's prediction in a room
export async function getUserPredictionInRoom(
  walletAddress: string,
  roomId: string
) {
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_wallet_address", walletAddress.toLowerCase())
    .eq("room_id", roomId)
    .single();

  return { data, error };
}

// Create prediction
export async function createPrediction(
  roomId: string,
  userWallet: string,
  direction: "UP" | "DOWN",
  stakeAmount: number
) {
  const { data, error } = await supabase
    .from("predictions")
    .insert([
      {
        room_id: roomId,
        user_wallet_address: userWallet.toLowerCase(),
        direction,
        stake_amount: stakeAmount,
        outcome: "PENDING",
        payout_amount: 0,
      },
    ])
    .select()
    .single();

  return { data, error };
}

// Settle prediction (winner)
export async function settlePredictionWin(
  predictionId: string,
  payoutAmount: number
) {
  const { data, error } = await supabase
    .from("predictions")
    .update({
      outcome: "WIN",
      payout_amount: payoutAmount,
      settled_at: new Date().toISOString(),
    })
    .eq("id", predictionId)
    .select()
    .single();

  return { data, error };
}

// Settle prediction (loser)
export async function settlePredictionLoss(predictionId: string) {
  const { data, error } = await supabase
    .from("predictions")
    .update({
      outcome: "LOSS",
      payout_amount: 0,
      settled_at: new Date().toISOString(),
    })
    .eq("id", predictionId)
    .select()
    .single();

  return { data, error };
}

// Get completed predictions (public)
export async function getCompletedPredictions() {
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .neq("outcome", "PENDING")
    .order("settled_at", { ascending: false });

  return { data, error };
}

// Count user wins
export async function countUserWins(walletAddress: string) {
  const { data, error } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_wallet_address", walletAddress.toLowerCase())
    .eq("outcome", "WIN");

  return { count: data?.length || 0, error };
}

// ============================================================================
// SESSIONS TABLE OPERATIONS
// ============================================================================

import type { Session } from "@/lib/supabase";

// Create or update session
export async function createSession(
  walletAddress: string,
  accessToken: string,
  expiresAt: Date
) {
  const { data, error } = await supabase
    .from("sessions")
    .upsert([
      {
        wallet_address: walletAddress.toLowerCase(),
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
      },
    ])
    .select()
    .single();

  return { data, error };
}

// Get session
export async function getSession(walletAddress: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  return { data, error };
}

// Check if session is valid
export async function isSessionValid(walletAddress: string): Promise<boolean> {
  const { data, error } = await getSession(walletAddress);

  if (error || !data) return false;

  const expiresAt = new Date(data.expires_at);
  return expiresAt > new Date();
}

// Delete session
export async function deleteSession(walletAddress: string) {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("wallet_address", walletAddress.toLowerCase());

  return { error };
}

// ============================================================================
// AGGREGATE OPERATIONS
// ============================================================================

// Get or create user (called on login)
export async function getOrCreateUser(walletAddress: string) {
  let { data, error } = await getUserByWallet(walletAddress);

  if (error || !data) {
    // User doesn't exist, create new user
    const result = await createUser(walletAddress);
    return result;
  }

  return { data, error: null };
}

// Get room with all predictions
export async function getRoomWithPredictions(roomId: string) {
  const { data: room, error: roomError } = await getRoomById(roomId);
  if (roomError || !room) return { data: null, error: roomError };

  const { data: predictions, error: predictionsError } =
    await getRoomPredictions(roomId);
  if (predictionsError) return { data: null, error: predictionsError };

  return {
    data: {
      ...room,
      predictions: predictions || [],
    },
    error: null,
  };
}

// Calculate room results and payouts
export async function calculateRoomResults(
  roomId: string,
  endingPrice: number
) {
  const { data: room } = await getRoomById(roomId);
  if (!room) throw new Error("Room not found");

  const { data: predictions } = await getRoomPredictions(roomId);
  if (!predictions) return null;

  const startingPrice = room.starting_price || 0;
  const priceWentUp = endingPrice > startingPrice;

  const winners = predictions.filter((p) =>
    priceWentUp ? p.direction === "UP" : p.direction === "DOWN"
  );

  const totalPool = predictions.reduce((sum, p) => sum + p.stake_amount, 0);
  const totalWinnerStake = winners.reduce((sum, p) => sum + p.stake_amount, 0);

  const results = predictions.map((p) => {
    const isWinner = winners.some((w) => w.id === p.id);
    const payout = isWinner
      ? (p.stake_amount / totalWinnerStake) * totalPool
      : 0;

    return {
      predictionId: p.id,
      outcome: isWinner ? "WIN" : "LOSS",
      payout,
    };
  });

  return results;
}

export default {
  // Users
  getUserByWallet,
  createUser,
  updateUserProfile,
  getUserStats,
  getOrCreateUser,

  // Rooms
  getWaitingRooms,
  getActiveRooms,
  getRoomById,
  getUserRooms,
  createRoom,
  updateRoomStatus,
  startRoom,
  settleRoom,
  updateRoomStakes,
  getRoomWithPredictions,

  // Predictions
  getUserPredictions,
  getRoomPredictions,
  getUserPredictionInRoom,
  createPrediction,
  settlePredictionWin,
  settlePredictionLoss,
  getCompletedPredictions,
  countUserWins,

  // Sessions
  createSession,
  getSession,
  isSessionValid,
  deleteSession,

  // Aggregates
  calculateRoomResults,
};
