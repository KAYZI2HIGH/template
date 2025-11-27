/**
 * /api/rooms
 * GET: Fetch all waiting rooms with prediction counts
 * POST: Create a new room
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/auth-middleware";
import { Room } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Predefined durations to avoid parsing errors
 */
const VALID_DURATIONS: Record<string, number> = {
  "30m": 30,
  "1h": 60,
  "1h 30m": 90,
  "2h": 120,
  "3h": 180,
  "4h": 240,
  "6h": 360,
  "12h": 720,
  "24h": 1440,
};

/**
 * Fetch current price from FMP API
 */
async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      console.error("FMP_API_KEY not set");
      return null;
    }

    const url = `https://financialmodelingprep.com/stable/quote?symbol=${symbol.toUpperCase()}&apikey=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch price for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const price = data[0]?.price;

    if (typeof price === "number" && price > 0) {
      console.log(`📈 Fetched ${symbol} price: $${price}`);
      return price;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Parse and validate duration string
 * @param durationStr e.g., "2h", "30m", "1h 30m"
 * @returns minutes, or null if invalid
 */
function parseDuration(durationStr: string): number | null {
  if (!durationStr) return null;

  const trimmed = durationStr.trim();

  // Check if it's a predefined duration
  if (VALID_DURATIONS[trimmed]) {
    return VALID_DURATIONS[trimmed];
  }

  // Try to parse custom format
  let totalMinutes = 0;
  const hoursMatch = trimmed.match(/(\\d+)h/);
  const minsMatch = trimmed.match(/(\\d+)m/);

  if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
  if (minsMatch) totalMinutes += parseInt(minsMatch[1]);

  // Validate: must have at least one match and result in 1-1440 minutes (1 min - 24 hours)
  if ((hoursMatch || minsMatch) && totalMinutes >= 1 && totalMinutes <= 1440) {
    return totalMinutes;
  }

  return null;
}

/**
 * Format duration in minutes to readable string (e.g., "2h 30m remaining")
 */
function formatTimeRemaining(durationMinutes: number): string {
  if (!durationMinutes || durationMinutes <= 0) return "Unknown";

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;

  if (hours === 0) return `${mins}m remaining`;
  if (mins === 0) return `${hours}h remaining`;
  return `${hours}h ${mins}m remaining`;
}

/**
 * Transform Supabase room record to frontend Room interface
 * Includes prediction counts and computed fields
 */
async function transformRoom(dbRoom: any, predictions: any[]): Promise<Room> {
  // Count predictions by direction for this room
  const roomPredictions = predictions.filter((p) => p.room_id === dbRoom.id);
  const upCount = roomPredictions.filter((p) => p.direction === "UP").length;
  const downCount = roomPredictions.filter(
    (p) => p.direction === "DOWN"
  ).length;

  // Generate a numeric ID from the UUID by hashing it to a positive integer
  // This ensures consistency across calls
  let numericId = 1;
  if (dbRoom.id) {
    const hash = dbRoom.id.split("").reduce((acc: number, char: string) => {
      return (acc << 5) - acc + char.charCodeAt(0);
    }, 0);
    numericId = (Math.abs(hash) % 1000000) + 1; // Ensure it's positive and reasonable size
  }

  // NOTE: Use starting_price from database if it exists (set when room is started)
  // Waiting rooms will have null starting_price
  const priceDisplay = dbRoom.starting_price
    ? `$${parseFloat(dbRoom.starting_price).toFixed(2)}`
    : "$0.00";

  // Calculate ending_time from database ends_at field
  // NOTE: ends_at is stored as "timestamp without time zone" in DB, so treat as UTC when parsing
  // NOTE: ends_at is ONLY set when room is started
  let endingTime: number | undefined;
  let secondsRemaining: number = 0;
  let roomStatus = dbRoom.status;

  if (dbRoom.ends_at) {
    // Parse timestamp as UTC (append Z to ensure UTC interpretation)
    const endsAtStr = String(dbRoom.ends_at);
    const endsAtWithZ = endsAtStr.includes("T") ? endsAtStr : endsAtStr + "Z";
    endingTime = Math.floor(new Date(endsAtWithZ).getTime() / 1000);

    // Check if room has ended: (now - ends_at) >= 60 (duration in seconds)
    const now = Math.floor(Date.now() / 1000);
    const secondsPastEnd = now - endingTime; // Positive value, increasing over time

    const durationSeconds = (dbRoom.duration_minutes || 0) * 60;

    // Status flow:
    // "waiting" -> "started" -> "completed" (time expired) -> "settled" (settlement confirmed)
    if (dbRoom.status === "settled") {
      // Already settled - keep it
      secondsRemaining = 0;
      console.log(`✅ Room ${dbRoom.room_id_web}: SETTLED (confirmed)`);
    } else if (secondsPastEnd >= durationSeconds) {
      // Time has expired - mark as completed
      roomStatus = "completed";
      secondsRemaining = 0;
      console.log(
        `⏰ Room ${dbRoom.room_id_web}: COMPLETED (time expired, awaiting settlement)`
      );
    } else {
      // Still running
      secondsRemaining = durationSeconds - secondsPastEnd;
      console.log(
        `⏱️  Room ${dbRoom.room_id_web}: STARTED (${secondsPastEnd}s elapsed, ${secondsRemaining}s remaining)`
      );
    }
  }

  return {
    id: dbRoom.room_id_web, // Use room_id_web as frontend ID
    numericId: numericId, // Numeric ID derived from UUID for blockchain calls
    name: dbRoom.name,
    symbol: dbRoom.symbol,
    status: roomStatus || "waiting",
    roomStatus: (roomStatus || "waiting") as
      | "waiting"
      | "started"
      | "completed"
      | "settled",
    time: formatTimeRemaining(dbRoom.duration_minutes),
    timeDuration: `${Math.floor(dbRoom.duration_minutes / 60)}h ${
      dbRoom.duration_minutes % 60
    }m`.replace(/^0h /, ""),
    durationMinutes: dbRoom.duration_minutes, // Total duration in minutes for timer display
    price: priceDisplay,
    minStake: dbRoom.min_stake ? parseInt(dbRoom.min_stake) : 0,
    up: upCount,
    down: downCount,
    ownerId: dbRoom.creator_wallet_address,
    ending_time: endingTime,
    secondsRemaining, // Backend-calculated time remaining (0 if waiting or completed)
    createdAt: dbRoom.created_at, // ISO timestamp for sorting by latest created
  };
}

export async function GET(request: Request) {
  try {
    // Fetch all rooms
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*");

    if (roomsError) throw roomsError;

    // Fetch all predictions for counting
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("room_id, direction");

    if (predictionsError) throw predictionsError;

    // Transform each room
    const transformedRooms = await Promise.all(
      (rooms || []).map((room) => transformRoom(room, predictions || []))
    );

    return Response.json(transformedRooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return Response.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, symbol, timeDuration, minStake } = body;

    // Validate required fields
    if (!name || !symbol || !timeDuration || minStake === undefined) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate room_id_web (unique identifier)
    const room_id_web = `room-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Validate duration format
    const durationMinutes = parseDuration(timeDuration);
    if (!durationMinutes || durationMinutes <= 0) {
      return Response.json(
        {
          error: `Invalid duration: "${timeDuration}". Must be one of: ${Object.keys(
            VALID_DURATIONS
          ).join(", ")}`,
          validDurations: Object.keys(VALID_DURATIONS),
        },
        { status: 400 }
      );
    }

    // Create room in database
    // Note: starting_price is NOT set at creation
    // It will be set when the room owner clicks "Start Game"
    const { data: newRoom, error } = await supabase
      .from("rooms")
      .insert([
        {
          room_id_web,
          creator_wallet_address: auth.wallet_address,
          name,
          symbol,
          status: "waiting",
          min_stake: minStake,
          duration_minutes: durationMinutes,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Transform and return the new room
    const transformedRoom = await transformRoom(newRoom, []);

    return Response.json(transformedRoom, { status: 201 });
  } catch (error) {
    console.error("Error creating room:", error);
    return Response.json({ error: "Failed to create room" }, { status: 500 });
  }
}
