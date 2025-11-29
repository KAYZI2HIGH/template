/**
 * /api/rooms/[id]/claim
 * POST: Mark a prediction as claimed (after user has called claimPayout() on contract)
 *
 * Called after user successfully executes claimPayout() transaction
 * Updates the prediction to mark it as claimed in the database
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/auth-middleware";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomId = params.id;
    const { payout_amount } = await request.json();

    console.log(
      `💰 Recording payout claim for room ${roomId}, user ${auth.wallet_address}, amount: ${payout_amount}`
    );

    // Get the user's prediction in this room
    const { data: prediction, error: predictionError } = await supabase
      .from("predictions")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_wallet_address", auth.wallet_address)
      .single();

    if (predictionError || !prediction) {
      return Response.json(
        { error: "Prediction not found" },
        { status: 404 }
      );
    }

    // Mark prediction as claimed
    const { error: updateError } = await supabase
      .from("predictions")
      .update({
        claimed: true,
        payout_amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prediction.id);

    if (updateError) {
      console.error("Failed to update prediction:", updateError);
      throw updateError;
    }

    console.log(`✅ Prediction marked as claimed`);

    // Check if all predictions in the room are now claimed or lost
    const { data: allPredictions } = await supabase
      .from("predictions")
      .select("*")
      .eq("room_id", roomId);

    if (allPredictions) {
      const allClaimed = allPredictions.every(
        (p) => p.claimed || p.outcome === "LOSS"
      );

      // If all winners have claimed their payouts, mark room as settled
      if (allClaimed) {
        const { error: settledError } = await supabase
          .from("rooms")
          .update({
            status: "settled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", roomId);

        if (!settledError) {
          console.log(`✅ All payouts claimed - Room marked as settled`);
        }
      }
    }

    return Response.json({
      success: true,
      message: "Payout claimed",
      roomId,
      payout_amount,
    });
  } catch (error) {
    console.error("Claim error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
