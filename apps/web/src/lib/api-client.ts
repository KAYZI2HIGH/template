/**
 * Authenticated API client
 * Automatically includes auth token in request headers
 */

export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("auth_token");

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(endpoint, {
    ...options,
    headers,
  });
}

/**
 * Verify if auth token is still valid
 */
export function isTokenValid(): boolean {
  const token = localStorage.getItem("auth_token");
  const user = localStorage.getItem("auth_user");
  return !!(token && user);
}

/**
 * Clear auth tokens
 */
export function clearAuthTokens(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

/**
 * Get stored user data
 */
export function getStoredUser() {
  const userStr = localStorage.getItem("auth_user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Get auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}
