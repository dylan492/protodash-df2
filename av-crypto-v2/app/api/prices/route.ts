import { NextRequest, NextResponse } from "next/server";
import { COINGECKO_ID_MAP } from "@/lib/coingecko-ids";

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ids = searchParams.get("ids");

  if (!ids) {
    return NextResponse.json({ error: "Missing ids parameter" }, { status: 400 });
  }

  try {
    const baseUrl = "https://api.coingecko.com/api/v3";
    const url = new URL(`${baseUrl}/simple/price`);
    url.searchParams.set("ids", ids);
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");

    const headers: HeadersInit = { Accept: "application/json" };
    if (COINGECKO_API_KEY) {
      headers["x-cg-demo-api-key"] = COINGECKO_API_KEY;
    }

    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { prices: {}, lastUpdated: new Date().toISOString(), error: `API returned ${response.status}` },
        { status: 200 }
      );
    }

    const data = await response.json();
    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};

    Object.entries(COINGECKO_ID_MAP).forEach(([symbol, coingeckoId]) => {
      if (data[coingeckoId]) {
        prices[symbol] = {
          usd: data[coingeckoId].usd || 0,
          usd_24h_change: data[coingeckoId].usd_24h_change || 0,
        };
      }
    });

    return NextResponse.json(
      { prices, lastUpdated: new Date().toISOString(), apiType: COINGECKO_API_KEY ? "demo" : "free" },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { prices: {}, lastUpdated: new Date().toISOString(), error: error.message },
      { status: 200 }
    );
  }
}
