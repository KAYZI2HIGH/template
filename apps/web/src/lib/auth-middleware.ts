/**
 * Auth Middleware for API Routes
 * Verifies wallet address from request headers
 * Frontend sends wallet address in X-Wallet-Address header
 */

export interface AuthPayload {
  wallet_address: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify auth and return wallet address
 * Reads wallet address from X-Wallet-Address header
 */
export async function verifyAuth(
  request: Request
): Promise<AuthPayload | null> {
  try {
    // Read wallet address from custom header
    const walletAddress = request.headers.get("X-Wallet-Address");
    if (!walletAddress) {
      console.error("Missing X-Wallet-Address header");
      return null;
    }

    // Validate wallet address format (0x followed by 40 hex chars)
    if (!walletAddress.match(/^0x[a-f0-9]{40}$/i)) {
      console.error("Invalid wallet address format:", walletAddress);
      return null;
    }

    return { wallet_address: walletAddress.toLowerCase() };
  } catch (error) {
    console.error("Auth verification failed:", error);
    return null;
  }
}

/**
 * Middleware wrapper for protected routes
 */
export function withAuth(
  handler: (request: Request, auth: AuthPayload) => Promise<Response> | Response
) {
  return async (request: Request) => {
    const auth = await verifyAuth(request);

    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return handler(request, auth);
  };
}
