/**
 * /api/rooms/settle/[roomId]
 * POST: Settle a room and calculate payouts
 *
 * This endpoint:
 * 1. Gets the room details
 * 2. Fetches current price from oracle
 * 3. Determines winners (UP or DOWN)
 * 4. Calculates payouts based on pool
 * 5. Updates predictions with outcomes
 * 6. Marks room as completed
 *
 * Triggered by:
 * - Manual call after game delay (admin)
 * - Chainlink Automation callback (automated)
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/auth-middleware";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomId = params.roomId;

    console.log(`🎯 Starting settlement for room ${roomId}`);

    // Step 1: Get room details
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      console.error("Room not found:", roomError);
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    console.log(`📊 Room found: ${room.name}, status: ${room.status}`);

    // Verify user is room creator or has settlement authority
    if (room.creator_wallet_address !== auth.wallet_address) {
      return Response.json(
        { error: "Only room creator can settle" },
        { status: 403 }
      );
    }

    // Check if room is already settled
    if (room.status === "completed") {
      return Response.json({ error: "Room already settled" }, { status: 400 });
    }

    // Check if room has been started
    if (room.status !== "started") {
      return Response.json(
        { error: "Room must be started before settlement" },
        { status: 400 }
      );
    }

    // Step 2: Fetch current price from oracle
    console.log(`💱 Fetching price for ${room.symbol}...`);

    const priceResponse = await fetch(`/api/prices?symbol=${room.symbol}`, {
      method: "GET",
    });

    if (!priceResponse.ok) {
      console.error("Failed to fetch price");
      return Response.json(
        { error: "Failed to fetch price from oracle" },
        { status: 500 }
      );
    }

    const priceData = await priceResponse.json();
    const endingPrice = priceData.price;

    console.log(
      `📈 Price fetched: Starting ${room.starting_price} → Ending ${endingPrice}`
    );

    // Step 3: Determine winners
    const priceWentUp = endingPrice > room.starting_price;
    const winningDirection = priceWentUp ? "up" : "down";

    console.log(
      `🎲 Price went ${winningDirection} - Winners are ${winningDirection.toUpperCase()} predictors`
    );

    // Step 4: Get all predictions for this room
    const { data: allPredictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("*")
      .eq("room_id", roomId);

    if (predictionsError) {
      console.error("Failed to fetch predictions:", predictionsError);
      return Response.json(
        { error: "Failed to fetch predictions" },
        { status: 500 }
      );
    }

    if (!allPredictions || allPredictions.length === 0) {
      console.log("⚠️ No predictions in room, marking as completed");

      // Update room status only
      const { error: updateError } = await supabase
        .from("rooms")
        .update({
          status: "completed",
          ending_price: endingPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId);

      if (updateError) throw updateError;

      return Response.json({
        success: true,
        message: "Room settled with no predictions",
        roomId,
        endingPrice,
      });
    }

    console.log(`📊 Total predictions: ${allPredictions.length}`);

    // Step 5: Calculate total pool and winner stakes
    let totalPool = 0;
    let totalWinnerStake = 0;
    const winnerPredictions: typeof allPredictions = [];

    for (const prediction of allPredictions) {
      totalPool += parseFloat(prediction.stake_amount);

      const isWinner =
        (priceWentUp && prediction.direction === "up") ||
        (!priceWentUp && prediction.direction === "down");

      if (isWinner) {
        totalWinnerStake += parseFloat(prediction.stake_amount);
        winnerPredictions.push(prediction);
      }
    }

    console.log(
      `💰 Total Pool: ${totalPool}, Winner Stake: ${totalWinnerStake}, Winners: ${winnerPredictions.length}`
    );

    // Step 6: Update predictions with outcomes and calculate payouts
    const updates = allPredictions.map((prediction) => {
      const isWinner =
        (priceWentUp && prediction.direction === "up") ||
        (!priceWentUp && prediction.direction === "down");

      let payout = 0;
      let outcome = isWinner ? "WIN" : "LOSS";

      if (isWinner && totalWinnerStake > 0) {
        // Payout = (their stake / total winner stake) * total pool
        payout =
          (parseFloat(prediction.stake_amount) / totalWinnerStake) * totalPool;
      }

      return {
        id: prediction.id,
        outcome,
        payout_amount: payout,
        settled_at: new Date().toISOString(),
      };
    });

    console.log(`📝 Updating ${updates.length} predictions with outcomes...`);

    // Batch update predictions
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("predictions")
        .update({
          outcome: update.outcome,
          payout_amount: update.payout_amount,
          settled_at: update.settled_at,
        })
        .eq("id", update.id);

      if (updateError) {
        console.error(`Failed to update prediction ${update.id}:`, updateError);
        throw updateError;
      }
    }

    // Step 7: Update room status to completed
    console.log(`✅ Marking room as completed...`);

    const { error: roomUpdateError } = await supabase
      .from("rooms")
      .update({
        status: "completed",
        ending_price: endingPrice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (roomUpdateError) {
      console.error("Failed to update room:", roomUpdateError);
      throw roomUpdateError;
    }

    // Calculate settlement stats
    const settledStats = {
      totalPredictions: allPredictions.length,
      winners: winnerPredictions.length,
      losers: allPredictions.length - winnerPredictions.length,
      totalPool,
      totalPayedOut: updates
        .filter((u) => u.outcome === "WIN")
        .reduce((sum, u) => sum + u.payout_amount, 0),
    };

    console.log(`🎉 Settlement complete:`, settledStats);

    return Response.json({
      success: true,
      roomId,
      startingPrice: room.starting_price,
      endingPrice,
      priceWentUp,
      winningDirection,
      predictions: settledStats,
    });
  } catch (error) {
    console.error("Settlement error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Settlement failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check settlement status
 */
export async function GET(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const { data: room, error } = await supabase
      .from("rooms")
      .select(
        `
        id,
        name,
        status,
        starting_price,
        ending_price,
        created_at,
        updated_at,
        predictions(count)
      `
      )
      .eq("id", params.roomId)
      .single();

    if (error || !room) {
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    return Response.json({
      roomId: room.id,
      name: room.name,
      status: room.status,
      startingPrice: room.starting_price,
      endingPrice: room.ending_price,
      isSettled: room.status === "completed",
      createdAt: room.created_at,
      updatedAt: room.updated_at,
    });
  } catch (error) {
    console.error("Settlement status check error:", error);
    return Response.json(
      { error: "Failed to check settlement status" },
      { status: 500 }
    );
  }
}
