/**
 * Auth Middleware for API Routes
 * Verifies tokens and extracts wallet address
 */

export interface AuthPayload {
  wallet_address: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify token and return decoded payload
 * Supports simple base64 tokens in format: token_<wallet>_<timestamp>_<random>
 */
export async function verifyAuth(
  request: Request
): Promise<AuthPayload | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Decode base64 token
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");

      // Parse format: token_<wallet>_<timestamp>_<random>
      const parts = decoded.split("_");
      if (parts.length !== 4 || parts[0] !== "token") {
        console.error("Invalid token format");
        return null;
      }

      const wallet_address = parts[1];

      // Validate wallet address format (0x followed by 40 hex chars)
      if (!wallet_address.match(/^0x[a-f0-9]{40}$/i)) {
        console.error("Invalid wallet address in token");
        return null;
      }

      return { wallet_address };
    } catch (decodeError) {
      console.error("Failed to decode token:", decodeError);
      return null;
    }
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
