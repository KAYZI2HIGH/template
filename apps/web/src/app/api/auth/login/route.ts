import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Missing Supabase environment variables in auth route"
  );
}

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

/**
 * Simple JWT token generator (for demo purposes)
 * In production, use a proper JWT library
 */
function generateSimpleToken(walletAddress: string): string {
  // Create a simple token (wallet_address + timestamp + random)
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const token = `token_${walletAddress}_${timestamp}_${random}`;
  return Buffer.from(token).toString("base64");
}

export async function POST(request: Request) {
  try {
    const { wallet_address } = await request.json();

    // Validate wallet address format (basic check)
    if (!wallet_address || typeof wallet_address !== "string") {
      return Response.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const normalizedAddress = wallet_address.toLowerCase();

    // Check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", normalizedAddress)
      .single();

    let user = existingUser;

    // Create user if doesn't exist
    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            wallet_address: normalizedAddress,
            total_predictions: 0,
            total_wins: 0,
            total_losses: 0,
            total_volume: 0,
            win_rate: 0,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return Response.json(
          { error: "Failed to create user account" },
          { status: 500 }
        );
      }

      user = newUser;
      console.log(`✨ New user created: ${normalizedAddress}`);
    }

    // Generate simple JWT token
    const token = generateSimpleToken(normalizedAddress);

    // Save session to database
    const { error: sessionError } = await supabase.from("sessions").upsert(
      [
        {
          wallet_address: normalizedAddress,
          access_token: token,
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ],
      { onConflict: "wallet_address" }
    );

    if (sessionError) {
      console.error("Error saving session:", sessionError);
      return Response.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    console.log(`✅ Auth successful for: ${normalizedAddress}`);

    return Response.json(
      {
        user: {
          id: user.id,
          wallet_address: user.wallet_address,
          username: user.username,
          avatar_url: user.avatar_url,
          bio: user.bio,
          created_at: user.created_at,
          total_predictions: user.total_predictions,
          total_wins: user.total_wins,
          total_losses: user.total_losses,
          total_volume: user.total_volume,
          win_rate: user.win_rate,
        },
        access_token: token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auth route error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
