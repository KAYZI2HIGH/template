/**
 * /api/predictions
 * GET: Fetch user's predictions
 * POST: Create a new prediction
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/auth-middleware";
import { UserPrediction } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Transform Supabase prediction record to frontend UserPrediction interface
 */
async function transformPrediction(
  dbPrediction: any,
  room: any
): Promise<UserPrediction> {
  return {
    id: parseInt(dbPrediction.id),
    name: `${room.name} - ${dbPrediction.direction}`,
    status: dbPrediction.outcome === "PENDING" ? "active" : "completed",
    prediction: dbPrediction.direction as "UP" | "DOWN",
    stake: `${dbPrediction.stake_amount} cUSD`,
    timeRemaining: room.duration_minutes
      ? `${room.duration_minutes} minutes`
      : "Unknown",
    outcome:
      dbPrediction.outcome === "PENDING"
        ? undefined
        : (dbPrediction.outcome as "WIN" | "LOSS"),
    payout: dbPrediction.payout_amount
      ? `${dbPrediction.payout_amount} cUSD`
      : undefined,
    players: 0, // Will update when needed
    playersJoined: 0, // Will update when needed
    roomId: room.room_id_web,
  };
}

export async function GET(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's predictions
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_wallet_address", auth.wallet_address);

    if (predictionsError) throw predictionsError;

    // Fetch associated rooms for context
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*");

    if (roomsError) throw roomsError;

    // Transform predictions with room context
    const transformedPredictions = await Promise.all(
      (predictions || []).map((pred) => {
        const room = rooms?.find((r) => r.id === pred.room_id);
        return transformPrediction(pred, room);
      })
    );

    return Response.json(transformedPredictions);
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return Response.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    );
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
    const { roomId, direction, stake } = body;

    // Validate required fields
    if (!roomId || !direction || !stake) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate direction
    if (!["UP", "DOWN"].includes(direction)) {
      return Response.json({ error: "Invalid direction" }, { status: 400 });
    }

    // Get room by room_id_web to find the UUID
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, status")
      .eq("room_id_web", roomId)
      .single();

    if (roomError || !room) {
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if room is still in waiting status
    if (room.status !== "waiting") {
      return Response.json(
        { error: "Room is not accepting predictions" },
        { status: 400 }
      );
    }

    // Check if user already has a prediction in this room
    const { data: existingPredictions, error: existingError } = await supabase
      .from("predictions")
      .select("id")
      .eq("room_id", room.id)
      .eq("user_wallet_address", auth.wallet_address);

    if (existingError) throw existingError;

    if (existingPredictions && existingPredictions.length > 0) {
      return Response.json(
        { error: "You already have a prediction in this room" },
        { status: 400 }
      );
    }

    // Create prediction
    const { data: newPrediction, error } = await supabase
      .from("predictions")
      .insert([
        {
          room_id: room.id,
          user_wallet_address: auth.wallet_address,
          direction,
          stake_amount: stake,
          outcome: "PENDING",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Transform and return the new prediction
    const transformedPrediction = await transformPrediction(newPrediction, {
      name: body.roomName || "Prediction",
      room_id_web: roomId,
      duration_minutes: 0,
    });

    return Response.json(transformedPrediction, { status: 201 });
  } catch (error) {
    console.error("Error creating prediction:", error);
    return Response.json(
      { error: "Failed to create prediction" },
      { status: 500 }
    );
  }
}
