import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection function
export async function testSupabaseConnection() {
  try {
    // Try to fetch from users table (should return empty array since no users yet)
    const { data, error } = await supabase.from("users").select("*").limit(1);

    if (error) {
      console.error("❌ Supabase connection failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Supabase connection successful!");
    console.log("📊 Users table accessible:", data !== undefined);
    return { success: true, message: "Connected to Supabase" };
  } catch (err) {
    console.error("❌ Supabase test error:", err);
    return { success: false, error: String(err) };
  }
}

// Type definitions for database
export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  total_predictions: number;
  total_wins: number;
  total_losses: number;
  total_volume: number;
  win_rate: number;
}

export interface Room {
  id: string;
  room_id_web: string;
  creator_wallet_address: string;
  name: string;
  symbol: string;
  status: "waiting" | "active" | "completed";
  starting_price?: number;
  ending_price?: number;
  min_stake?: number;
  duration_minutes?: number;
  starts_at?: string;
  ends_at?: string;
  total_up_stake: number;
  total_down_stake: number;
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: string;
  room_id: string;
  user_wallet_address: string;
  direction: "UP" | "DOWN";
  stake_amount: number;
  outcome: "PENDING" | "WIN" | "LOSS";
  payout_amount: number;
  created_at: string;
  settled_at?: string;
}

export interface Session {
  id: string;
  wallet_address: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  created_at: string;
}
