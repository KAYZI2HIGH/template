/**
 * /api/rooms/[id]/start
 * PUT: Start a room (only owner can start)
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/auth-middleware";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body to get starting price
    const body = await request.json();
    const { startingPrice } = body;

    if (!startingPrice || isNaN(startingPrice) || startingPrice <= 0) {
      return Response.json(
        { error: "Invalid starting price provided" },
        { status: 400 }
      );
    }

    // Get room by room_id_web
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_id_web", params.id)
      .single();

    if (roomError || !room) {
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if user is the room creator
    if (room.creator_wallet_address !== auth.wallet_address) {
      return Response.json(
        { error: "Only the room creator can start the game" },
        { status: 403 }
      );
    }

    // Check if room is in waiting status
    if (room.status !== "waiting") {
      return Response.json(
        { error: "Room is not in waiting status" },
        { status: 400 }
      );
    }

    // Calculate end time: now + duration_minutes
    // Store in UTC format (without timezone suffix since DB is "timestamp without time zone")
    const startTime = new Date();
    const endTime = new Date(
      startTime.getTime() + room.duration_minutes * 60 * 1000
    );

    // Convert to UTC strings (the DB will store them as-is)
    const startUtcString = startTime.toISOString().replace("Z", "");
    const endUtcString = endTime.toISOString().replace("Z", "");

    console.log(`🚀 Starting room ${params.id}:`);
    console.log(`   Duration: ${room.duration_minutes} minutes`);
    console.log(`   Starting Price: $${startingPrice.toFixed(2)}`);
    console.log(
      `   Start time: ${startUtcString} UTC (${Math.floor(
        startTime.getTime() / 1000
      )} epoch)`
    );
    console.log(
      `   End time: ${endUtcString} UTC (${Math.floor(
        endTime.getTime() / 1000
      )} epoch)`
    );
    console.log(
      `   Seconds from now: ${Math.floor(
        (endTime.getTime() - Date.now()) / 1000
      )}`
    );

    // Update room status to "started" with calculated end time and starting price
    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({
        status: "started",
        starting_price: startingPrice,
        starts_at: startUtcString,
        ends_at: endUtcString,
      })
      .eq("id", room.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return Response.json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Error starting room:", error);
    return Response.json({ error: "Failed to start room" }, { status: 500 });
  }
}
