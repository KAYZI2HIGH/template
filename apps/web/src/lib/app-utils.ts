/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Truncate an address for display
 */
export function truncateAddress(
  address: string,
  startLength = 6,
  endLength = 4
): string {
  if (address.length <= startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Type guard to validate room status
 */
function isValidRoomStatus(
  status: unknown
): status is "waiting" | "started" | "completed" {
  return status === "waiting" || status === "started" || status === "completed";
}

/**
 * Calculate room status based on ending_time (Unix seconds)
 * Status: waiting | started | completed
 */
export function calculateRoomStatus(
  roomStatus: string | undefined,
  endingTime: number | undefined
): "waiting" | "started" | "completed" {
  // If room status is "completed", return it
  if (roomStatus === "completed") return "completed";

  // If room has ending_time and it's in the past, mark as completed
  if (endingTime !== undefined && typeof endingTime === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (now >= endingTime) return "completed";
  }

  // Return valid status or default to "waiting"
  return isValidRoomStatus(roomStatus) ? roomStatus : "waiting";
}

/**
 * Calculate seconds remaining until room expires
 * Returns 0 if room is expired or no ending_time
 */
export function getSecondsRemaining(endingTime: number | undefined): number {
  if (!endingTime) return 0;

  const now = Math.floor(Date.now() / 1000);
  const remaining = endingTime - now;

  return remaining > 0 ? remaining : 0;
}

/**
 * Format seconds to readable time format
 * e.g., 3661 -> "1h 1m 1s"
 */
export function formatSecondsToTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "Expired";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

/**
 * Fetch current stock price from FMP API
 */
export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/stocks?symbol=${symbol}`);
    if (!response.ok) return null;

    const data = await response.json();

    // Handle both single symbol and all stocks responses
    if (typeof data.price === "number") {
      return data.price;
    }

    if (data[symbol]?.price) {
      return data[symbol].price;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
    return null;
  }
}
