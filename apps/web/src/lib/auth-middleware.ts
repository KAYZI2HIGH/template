/**
 * Auth Middleware for API Routes
 * Verifies JWT tokens and extracts wallet address
 */

import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key"
);

export interface AuthPayload {
  wallet_address: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token and return decoded payload
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

    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as AuthPayload;
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
