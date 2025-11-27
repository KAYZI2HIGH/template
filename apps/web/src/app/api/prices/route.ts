/**
 * /api/prices
 * GET: Fetch current prices for stocks from FMP API
 *
 * This endpoint fetches real prices from Financial Modeling Prep (FMP) API
 * instead of using mock prices.
 */

const FMP_API_KEY = process.env.FMP_API_KEY;

// Price cache to avoid rate limiting
const priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch price from FMP API with caching and retry logic
 */
async function fetchPriceFromFMP(
  symbol: string,
  retries = 3
): Promise<number | null> {
  try {
    // Check cache first
    if (priceCache[symbol]) {
      const cached = priceCache[symbol];
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📦 Cache hit for ${symbol}: ${cached.price}`);
        return cached.price;
      }
    }

    // Validate API key
    if (!FMP_API_KEY) {
      console.error(`❌ FMP_API_KEY not set. Cannot fetch ${symbol}`);
      return null;
    }

    const url = `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`;

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            console.error(`❌ FMP API Key invalid for ${symbol}`);
            return null;
          }
          if (response.status === 429) {
            console.warn(`⚠️  Rate limited by FMP API. Retrying...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * (attempt + 1))
            );
            continue;
          }
          console.error(`FMP API error for ${symbol}: ${response.status}`);
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        const price = data[0]?.price;

        if (typeof price === "number" && price > 0) {
          // Cache the price
          priceCache[symbol] = { price, timestamp: Date.now() };
          console.log(`✅ Fetched ${symbol} price from FMP: $${price}`);
          return price;
        }

        console.error(`Invalid price data for ${symbol}:`, data);
        return null;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries - 1) {
          console.log(`Retry ${attempt + 1}/${retries} for ${symbol}...`);
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1))
          );
        }
      }
    }

    console.error(
      `Failed to fetch ${symbol} after ${retries} retries:`,
      lastError
    );
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  // If no symbol provided, return error
  if (!symbol) {
    return Response.json(
      { error: "Symbol parameter required" },
      { status: 400 }
    );
  }

  // Check if FMP_API_KEY is configured
  if (!FMP_API_KEY) {
    console.error("❌ FMP_API_KEY not configured in environment");
    return Response.json(
      { error: "FMP API key not configured. Cannot fetch prices." },
      { status: 500 }
    );
  }

  // Fetch price from FMP API
  const price = await fetchPriceFromFMP(symbol.toUpperCase());

  if (price === null) {
    console.error(`❌ Failed to fetch price for symbol: ${symbol}`);
    return Response.json(
      {
        error: `Failed to fetch price for ${symbol}. Please check the symbol or try again.`,
      },
      { status: 500 }
    );
  }

  return Response.json({
    symbol: symbol.toUpperCase(),
    price: price,
    timestamp: Date.now(),
    source: "FMP API",
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

    // Use the same FMP API fetch for POST requests too
    const symbolUpper = symbol.toUpperCase();
    const price = await fetchPriceFromFMP(symbolUpper);

    if (price === null) {
      return Response.json(
        { error: `Failed to fetch price for ${symbol}` },
        { status: 500 }
      );
    }

    return Response.json({
      symbol: symbolUpper,
      price: price,
      gameId,
      resolvedAt: new Date().toISOString(),
      source: "FMP API",
    });
  } catch (error) {
    console.error("Price endpoint error:", error);
    return Response.json({ error: "Failed to get price" }, { status: 500 });
  }
}
