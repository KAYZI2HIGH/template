/**
 * /api/prices
 * GET: Fetch current prices for stocks
 *
 * This is a mock implementation. In production, integrate with:
 * - Chainlink Functions for real stock prices
 * - Financial Modeling Prep API
 * - Your preferred price oracle
 */

// Mock stock prices - Replace with real oracle in production
const MOCK_PRICES: Record<string, { price: number; lastUpdated: number }> = {
  "MTN.NG": { price: 250.5, lastUpdated: 0 },
  "DANGOTE.NG": { price: 1250.0, lastUpdated: 0 },
  "BUACEMENT.NG": { price: 580.25, lastUpdated: 0 },
  "ZENITHBANK.NG": { price: 35.5, lastUpdated: 0 },
  "SEPLAT.NG": { price: 785.75, lastUpdated: 0 },
  "GTCO.NG": { price: 42.3, lastUpdated: 0 },
};

/**
 * Simulates price volatility for testing
 * In production, this would come from Chainlink or your oracle
 */
function getSimulatedPrice(basePrice: number, symbol: string): number {
  // Use symbol and current time to create deterministic "randomness"
  const seed = symbol.charCodeAt(0) + new Date().getHours();
  const volatility = Math.sin(seed) * 0.05; // ±5% volatility

  return basePrice * (1 + volatility);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  // If no symbol, return all prices
  if (!symbol) {
    const allPrices: Record<
      string,
      { price: number; symbol: string; timestamp: number }
    > = {};

    for (const [sym, data] of Object.entries(MOCK_PRICES)) {
      allPrices[sym] = {
        symbol: sym,
        price: getSimulatedPrice(data.price, sym),
        timestamp: Date.now(),
      };
    }

    return Response.json(allPrices);
  }

  // Validate symbol
  const symbolUpper = symbol.toUpperCase();
  if (!MOCK_PRICES[symbolUpper]) {
    return Response.json(
      { error: `Symbol ${symbol} not found` },
      { status: 404 }
    );
  }

  // Return single price
  const basePrice = MOCK_PRICES[symbolUpper].price;
  const currentPrice = getSimulatedPrice(basePrice, symbolUpper);

  return Response.json({
    symbol: symbolUpper,
    price: currentPrice,
    basePrice: basePrice,
    timestamp: Date.now(),
    source: "Mock Oracle (integrate Chainlink Functions in production)",
  });
}

/**
 * POST endpoint for Chainlink Automation callback
 * When game is ready to resolve, Chainlink calls this to settle
 */
export async function POST(request: Request) {
  try {
    const { symbol, gameId } = await request.json();

    if (!symbol) {
      return Response.json(
        { error: "Symbol parameter required" },
        { status: 400 }
      );
    }

    const symbolUpper = symbol.toUpperCase();
    if (!MOCK_PRICES[symbolUpper]) {
      return Response.json(
        { error: `Symbol ${symbol} not found` },
        { status: 404 }
      );
    }

    const basePrice = MOCK_PRICES[symbolUpper].price;
    const currentPrice = getSimulatedPrice(basePrice, symbolUpper);

    return Response.json({
      symbol: symbolUpper,
      price: currentPrice,
      gameId,
      resolvedAt: new Date().toISOString(),
      source: "Mock Oracle (integrate Chainlink Functions in production)",
    });
  } catch (error) {
    console.error("Price endpoint error:", error);
    return Response.json({ error: "Failed to get price" }, { status: 500 });
  }
}
