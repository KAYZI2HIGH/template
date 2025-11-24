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

    // Update room status to "started"
    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({
        status: "started",
        starts_at: new Date().toISOString(),
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
