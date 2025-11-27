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
  // If room not found, use prediction data to create a fallback
  const roomName = room?.name || "Unknown Room";
  const roomId = room?.room_id_web || `room-${dbPrediction.room_id}`;

  // Determine prediction status based on room status
  let predictionStatus: "active" | "completed" | "waiting" = "waiting";
  if (dbPrediction.outcome === "PENDING") {
    // Check room status to determine if prediction is active or waiting
    predictionStatus = room?.status === "started" ? "active" : "waiting";
  } else {
    predictionStatus = "completed";
  }

  return {
    id: dbPrediction.id as string,
    name: `${roomName} - ${dbPrediction.direction}`,
    status: predictionStatus,
    prediction: dbPrediction.direction as "UP" | "DOWN",
    stake: `${dbPrediction.stake_amount} cUSD`,
    timeRemaining: room?.duration_minutes
      ? `${room.duration_minutes} minutes`
      : "Unknown",
    outcome:
      dbPrediction.outcome === "PENDING"
        ? undefined
        : (dbPrediction.outcome as "WIN" | "LOSS"),
    payout: dbPrediction.payout_amount
      ? `${dbPrediction.payout_amount} cUSD`
      : undefined,
    players: 0,
    playersJoined: 0,
    roomId: roomId,
  };
}

export async function GET(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);

    const authHeader = request.headers.get("authorization");
    console.log("📥 /api/predictions GET request:");
    console.log(`   Authorization header present: ${!!authHeader}`);
    if (auth) {
      console.log(`   walletFromAuth: '${auth.wallet_address}'`);
    } else {
      console.log(`   walletFromAuth: null (verification failed)`);
    }

    if (!auth) {
      console.log(
        "   ❌ NOT AUTHENTICATED - returning 401. Auth header was:",
        authHeader ? authHeader.substring(0, 50) + "..." : "NOT PRESENT"
      );
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const roomIdParam = url.searchParams.get("roomId");
    const walletAddressParam = url.searchParams.get("walletAddress");

    console.log("📥 /api/predictions GET request:", {
      walletFromAuth: auth.wallet_address,
      roomIdParam,
      walletAddressParam,
    });

    // Fetch user's predictions
    let query = supabase
      .from("predictions")
      .select("*")
      .eq("user_wallet_address", auth.wallet_address);

    // If roomId is provided, filter by room_id (the web room ID, not DB UUID)
    if (roomIdParam) {
      // First, find the room by room_id_web to get the database UUID
      const { data: roomData, error: roomLookupError } = await supabase
        .from("rooms")
        .select("id")
        .eq("room_id_web", roomIdParam)
        .single();

      if (roomLookupError) {
        console.log("❌ Room lookup error:", roomLookupError);
        return Response.json({ error: "Room not found" }, { status: 404 });
      }

      if (roomData) {
        query = query.eq("room_id", roomData.id);
        console.log(
          "🔍 Filtered by room_id_web:",
          roomIdParam,
          "->",
          roomData.id
        );
      }
    }

    const { data: predictions, error: predictionsError } = await query;

    if (predictionsError) throw predictionsError;

    console.log("📦 Fetched predictions count:", predictions?.length || 0);
    console.log(
      "📦 Raw predictions from DB:",
      predictions?.map((p: any) => ({
        id: p.id,
        outcome: p.outcome,
        direction: p.direction,
      }))
    );

    // Fetch associated rooms for context
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*");

    if (roomsError) throw roomsError;

    // Transform predictions with room context
    const transformedPredictions = await Promise.all(
      (predictions || []).map((pred) => {
        // Match by database UUID (pred.room_id matches room.id from database)
        const room = rooms?.find((r) => r.id === pred.room_id);
        console.log("🔄 Transforming prediction:", {
          id: pred.id,
          dbOutcome: pred.outcome,
          roomStatus: room?.status,
          roomEndsAt: room?.ends_at,
        });
        return transformPrediction(pred, room);
      })
    );

    console.log(
      "✅ Transformed predictions:",
      transformedPredictions?.map((p: any) => ({
        id: p.id,
        outcome: p.outcome,
        name: p.name,
      }))
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
