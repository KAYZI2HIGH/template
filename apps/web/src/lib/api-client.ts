/**
 * Authenticated API client
 * Sends wallet address in X-Wallet-Address header for API to identify the user
 * Wagmi handles wallet connection state, so we just read the current address
 */

import { useAccount } from "wagmi";

export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {},
  walletAddress?: string
) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  // If wallet address is provided, add it to the request
  if (walletAddress) {
    headers.set("X-Wallet-Address", walletAddress.toLowerCase());
  }

  return fetch(endpoint, {
    ...options,
    headers,
  });
}
