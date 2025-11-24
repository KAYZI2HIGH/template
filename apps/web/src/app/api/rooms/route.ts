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
 * Format duration in minutes to readable string (e.g., "2h 30m remaining")
 */
function formatTimeRemaining(durationMinutes: number): string {
  if (!durationMinutes) return "Unknown";

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

  return {
    id: dbRoom.room_id_web, // Use room_id_web as frontend ID
    name: dbRoom.name,
    symbol: dbRoom.symbol,
    status: dbRoom.status || "waiting",
    roomStatus: (dbRoom.status || "waiting") as
      | "waiting"
      | "started"
      | "completed",
    time: formatTimeRemaining(dbRoom.duration_minutes),
    timeDuration: `${Math.floor(dbRoom.duration_minutes / 60)}h ${
      dbRoom.duration_minutes % 60
    }m`.replace(/^0h /, ""),
    price: "₦0.00", // TODO: Fetch from oracle
    minStake: dbRoom.min_stake ? parseInt(dbRoom.min_stake) : 0,
    up: upCount,
    down: downCount,
    ownerId: dbRoom.creator_wallet_address,
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

    // Parse duration (e.g., "2h" -> 120 minutes, "30m" -> 30 minutes)
    let durationMinutes = 0;
    const hoursMatch = timeDuration.match(/(\d+)h/);
    const minsMatch = timeDuration.match(/(\d+)m/);
    if (hoursMatch) durationMinutes += parseInt(hoursMatch[1]) * 60;
    if (minsMatch) durationMinutes += parseInt(minsMatch[1]);

    // Create room in database
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
