/**
 * /api/rooms/[id]/settle
 * POST: Settle a room and calculate payouts
 *
 * This endpoint:
 * 1. Fetches the ending price from FMP API
 * 2. Determines winners (UP or DOWN based on price movement)
 * 3. Calculates payouts for winners
 * 4. Updates all predictions with outcomes
 * 5. Marks room as "completed"
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/auth-middleware";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Fetch the room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_id_web", params.id)
      .single();

    if (roomError || !room) {
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    // Verify the user is the room creator
    if (room.creator_wallet_address !== auth.wallet_address) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify room is in "started" status
    if (room.status !== "started") {
      return Response.json(
        { error: "Room is not in started status" },
        { status: 400 }
      );
    }

    // Fetch current ending price
    const endingPrice = await fetchCurrentPrice(room.symbol);
    if (endingPrice === null) {
      return Response.json(
        { error: "Failed to fetch ending price" },
        { status: 500 }
      );
    }

    const startingPrice = room.starting_price || 0;
    const priceWentUp = endingPrice > startingPrice;

    // Fetch all predictions for this room
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("*")
      .eq("room_id", room.id);

    if (predictionsError) {
      throw predictionsError;
    }

    if (!predictions || predictions.length === 0) {
      // No predictions, just mark room as completed
      const { data: updatedRoom, error: updateError } = await supabase
        .from("rooms")
        .update({
          status: "completed",
          ending_price: endingPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("room_id_web", params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log(`✅ Room ${params.id} settled (no predictions)`);
      return Response.json(updatedRoom);
    }

    // Calculate totals
    const totalPool = predictions.reduce((sum, p) => sum + p.stake_amount, 0);
    const winners = predictions.filter((p) => {
      const isUp = p.direction === "UP";
      return priceWentUp ? isUp : !isUp;
    });
    const totalWinnerStake = winners.reduce(
      (sum, p) => sum + p.stake_amount,
      0
    );

    // Update predictions with outcomes and payouts
    const settlementPromises = predictions.map(async (prediction) => {
      const isUp = prediction.direction === "UP";
      const isWinner = priceWentUp ? isUp : !isUp;
      const payout = isWinner
        ? (prediction.stake_amount / totalWinnerStake) * totalPool
        : 0;

      const { error: updateError } = await supabase
        .from("predictions")
        .update({
          outcome: isWinner ? "WIN" : "LOSS",
          payout_amount: payout,
          settled_at: new Date().toISOString(),
        })
        .eq("id", prediction.id);

      if (updateError) throw updateError;

      return {
        prediction_id: prediction.id,
        outcome: isWinner ? "WIN" : "LOSS",
        payout,
      };
    });

    const settlementResults = await Promise.all(settlementPromises);

    // Update room to "completed"
    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({
        status: "completed",
        ending_price: endingPrice,
        updated_at: new Date().toISOString(),
      })
      .eq("room_id_web", params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(
      `✅ Room ${params.id} settled: startingPrice=${startingPrice}, endingPrice=${endingPrice}, priceWentUp=${priceWentUp}, winnerCount=${winners.length}`
    );

    return Response.json({
      room: updatedRoom,
      settlement: {
        startingPrice,
        endingPrice,
        priceWentUp,
        totalPool,
        totalWinnerStake,
        winners: settlementResults.filter((r) => r.outcome === "WIN").length,
        results: settlementResults,
      },
    });
  } catch (error) {
    console.error("Error in settle room endpoint:", error);
    return Response.json({ error: "Failed to settle room" }, { status: 500 });
  }
}
