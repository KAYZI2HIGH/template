export interface Room {
  id: string; // Frontend display ID (UUID format)
  numericId?: number; // Numeric ID for blockchain calls
  name: string;
  symbol: string; // Stock symbol (e.g., "MTN.NG", "DANGCEM.NG")
  status: string;
  roomStatus?: "waiting" | "started" | "completed";
  time: string;
  timeDuration?: string; // e.g., "2h", "30m"
  price: string;
  minStake?: number; // Minimum stake required
  up: number;
  down: number;
  ownerId?: string; // User ID of room owner
  ending_time?: number; // Unix timestamp (seconds) when room expires
}

export interface UserPrediction {
  id: string; // UUID from database
  name: string;
  status: "active" | "completed" | "waiting";
  prediction: "UP" | "DOWN";
  stake: string;
  timeRemaining?: string;
  players?: number;
  outcome?: "WIN" | "LOSS";
  payout?: string;
  playersJoined?: number;
  roomId: string; // Track which room this prediction belongs to
}
