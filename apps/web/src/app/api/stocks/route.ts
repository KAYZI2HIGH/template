/**
 * /api/stocks
 * GET: Fetch available stocks from FMP API
 *
 * FMP API Documentation:
 * - Free tier supports major US and international stocks
 * - Endpoint: https://financialmodelingprep.com/stable/quote
 * - Response includes: symbol, price, timestamp
 */

const FMP_API_KEY = process.env.FMP_API_KEY;

// Validate API key on startup
if (!FMP_API_KEY) {
  console.warn(
    "⚠️  WARNING: FMP_API_KEY is not set in environment variables. Stock prices will not be fetched."
  );
  console.warn(
    "   Add FMP_API_KEY to your .env.local file to enable price fetching."
  );
}

// List of stocks supported by FMP (free tier)
// Using US stocks since FMP free tier doesn't support Nigerian stocks (.NG)
const SUPPORTED_STOCKS = [
  "AAPL", // Apple
  "MSFT", // Microsoft
  "GOOGL", // Google
  "AMZN", // Amazon
  "TSLA", // Tesla
  "META", // Meta (Facebook)
  "NVDA", // NVIDIA
  "JPM", // JPMorgan Chase
] as const;

// Stock metadata
const STOCK_NAMES: Record<(typeof SUPPORTED_STOCKS)[number], string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  TSLA: "Tesla Inc.",
  META: "Meta Platforms Inc.",
  NVDA: "NVIDIA Corporation",
  JPM: "JPMorgan Chase & Co.",
};

// Cache to avoid rate limiting
const priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    // Build URL with proper query parameter handling
    const url = `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`;

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            console.error(
              `❌ FMP API 401 Unauthorized for ${symbol} - Check your API key`
            );
            return null; // Don't retry auth errors
          }
          if (response.status === 429) {
            console.warn(
              `⚠️ FMP API rate limited (429) for ${symbol} - Will retry`
            );
            if (attempt < retries - 1) {
              await sleep(Math.pow(2, attempt) * 1000);
              continue;
            }
            return null;
          }
          console.warn(
            `⚠️ FMP API error for ${symbol}: ${response.status} (attempt ${
              attempt + 1
            }/${retries})`
          );
          if (attempt < retries - 1) {
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          return null;
        }

        const data = await response.json();

        // FMP returns array of results
        if (Array.isArray(data) && data.length > 0) {
          const price = data[0].price;

          if (typeof price === "number" && price > 0) {
            // Cache the price
            priceCache[symbol] = {
              price,
              timestamp: Date.now(),
            };

            console.log(`✅ Fetched ${symbol} from FMP: ${price}`);
            return price;
          }
        }

        console.warn(`⚠️ No valid price data for ${symbol}`);
        return null;
      } catch (error) {
        lastError = error as Error;
        if (error instanceof Error && error.name === "AbortError") {
          console.warn(
            `⚠️ FMP API timeout for ${symbol} (attempt ${
              attempt + 1
            }/${retries})`
          );
        } else {
          console.error(
            `⚠️ Error fetching ${symbol} (attempt ${attempt + 1}/${retries}):`,
            error
          );
        }

        if (attempt < retries - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    console.error(
      `❌ Failed to fetch ${symbol} after ${retries} attempts:`,
      lastError
    );
    return null;
  } catch (error) {
    console.error(`❌ Unexpected error fetching ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    console.log(`📡 Stock API request - Symbol: ${symbol}`);

    // If specific symbol requested, fetch its price
    if (symbol) {
      const upperSymbol = symbol.toUpperCase();
      console.log(`🔍 Looking up symbol: ${upperSymbol}`);
      console.log(`   Supported: ${SUPPORTED_STOCKS.join(", ")}`);

      if (
        !SUPPORTED_STOCKS.includes(
          upperSymbol as (typeof SUPPORTED_STOCKS)[number]
        )
      ) {
        console.warn(`❌ Symbol ${upperSymbol} not supported`);
        return Response.json(
          {
            error: `Symbol ${symbol} not supported. Supported symbols: ${SUPPORTED_STOCKS.join(
              ", "
            )}`,
            supported: SUPPORTED_STOCKS,
          },
          { status: 400 }
        );
      }

      const price = await fetchPriceFromFMP(upperSymbol);
      console.log(`💰 Fetched price for ${upperSymbol}: ${price}`);

      if (price === null) {
        console.error(`❌ Failed to fetch price for ${symbol}`);
        return Response.json(
          {
            error: `Failed to fetch price for ${symbol}. Please try again later.`,
            symbol: upperSymbol,
          },
          { status: 503 }
        );
      }

      const response = {
        symbol: upperSymbol,
        price,
        timestamp: Date.now(),
      };

      console.log(`✅ Returning price response:`, response);
      return Response.json(response);
    }

    // Otherwise return all available stocks with their current prices
    const stocks = await Promise.all(
      SUPPORTED_STOCKS.map(async (sym) => {
        const price = await fetchPriceFromFMP(sym);
        return {
          symbol: sym,
          name: STOCK_NAMES[sym],
          price: price || 0,
          currentPrice: price ? `$${price.toFixed(2)}` : "N/A",
          available: price !== null,
        };
      })
    );

    return Response.json({
      stocks,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return Response.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}
