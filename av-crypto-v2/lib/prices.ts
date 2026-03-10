// CoinGecko ID mapping for price lookups
export const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDC: "usd-coin",
  MATIC: "matic-network",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  SUI: "sui",
  DEEP: "deepbook-protocol",
  NS: "nodestake",
  ALGO: "algorand",
  MYTHOS: "mythos",
  WXM: "weatherxm-network",
  ANLOG: "analog",
  "0G": "0g-labs",
  QUAI: "quai-network",
  BERA: "berachain-bera",
  MOVE: "movement",
  GRASS: "grass",
  EIGEN: "eigenlayer",
};

// Fetch prices from CoinGecko API
export async function fetchPricesFromCoinGecko(
  ids: string[],
  apiKey?: string
): Promise<Record<string, any>> {
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");

  if (apiKey) {
    url.searchParams.set("x_cg_pro_api_key", apiKey);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.statusText}`);
  }

  return response.json();
}

// Get prices for an array of symbols
export async function getPricesForSymbols(
  symbols: string[],
  apiKey?: string
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  // Convert symbols to CoinGecko IDs
  const ids = symbols
    .map((symbol) => COINGECKO_ID_MAP[symbol])
    .filter((id) => id !== undefined);

  if (ids.length === 0) {
    return {};
  }

  const data = await fetchPricesFromCoinGecko(ids, apiKey);

  // Transform back to symbol-based keys
  const prices: Record<string, { usd: number; usd_24h_change: number }> = {};

  symbols.forEach((symbol) => {
    const id = COINGECKO_ID_MAP[symbol];
    if (id && data[id]) {
      prices[symbol] = {
        usd: data[id].usd || 0,
        usd_24h_change: data[id].usd_24h_change || 0,
      };
    }
  });

  return prices;
}

// Format price data for display
export function formatPriceData(
  prices: Record<string, { usd: number; usd_24h_change: number }>
) {
  return {
    prices,
    lastUpdated: new Date().toISOString(),
  };
}