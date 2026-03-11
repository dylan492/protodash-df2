import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

const EQUITY_SYMBOL_MAP: Record<string, string> = {
  CMPX: "CMPS",
  BRZE: "BRZE",
  IONQ: "IONQ",
  SERV: "SERV",
  FLGC: "FLGC",
  AIRE: "AIRE",
  BETR: "BETR",
  SI: "SI",
  CRCL: "CRCL",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols")?.split(",").filter(Boolean) || [];

    console.log("📊 [Equity API] Fetching prices for:", symbols);

    if (symbols.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    const symbolPairs = symbols
      .map((symbol) => ({
        internal: symbol,
        trading: EQUITY_SYMBOL_MAP[symbol],
      }))
      .filter((pair) => pair.trading);

    if (symbolPairs.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    // Free tier allows 3 symbols per request - split into batches
    const BATCH_SIZE = 3;
    const batches: typeof symbolPairs[] = [];
    
    for (let i = 0; i < symbolPairs.length; i += BATCH_SIZE) {
      batches.push(symbolPairs.slice(i, i + BATCH_SIZE));
    }

    console.log(`📈 [Equity API] Split into ${batches.length} batches`);

    const prices: Record<string, { usd: number; usd_24h_change?: number }> = {};

    // Fetch each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const tradingSymbols = batch.map(p => p.trading).join(",");
      const endpoint = `https://api.stockdata.org/v1/data/quote?symbols=${tradingSymbols}&api_token=${process.env.STOCKDATA_API_KEY}`;
      
      console.log(`🔍 [Equity API] Batch ${i + 1}/${batches.length}: ${tradingSymbols}`);
      
      try {
        const response = await fetch(endpoint);

        if (!response.ok) {
          console.error(`❌ [Equity API] Batch ${i + 1} failed: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
          batch.forEach((pair) => {
            const quote = data.data.find((q: any) => q.ticker === pair.trading);
            
            if (quote && quote.price) {
              const price = parseFloat(quote.price);
              const previousClose = parseFloat(quote.previous_close_price || 0);
              
              let changePercent = 0;
              if (previousClose > 0) {
                changePercent = ((price - previousClose) / previousClose) * 100;
              }

              console.log(`📊 ${pair.trading}: $${price} (${changePercent.toFixed(2)}%)`);

              prices[pair.internal] = {
                usd: price,
                usd_24h_change: changePercent,
              };
            }
          });
        }

        // Small delay between batches
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`💥 [Equity API] Error in batch ${i + 1}:`, error);
      }
    }

    console.log("✅ [Equity API] Final prices:", prices);
    return NextResponse.json({ prices });
  } catch (error: any) {
    console.error("💥 [Equity API] Error:", error);
    return NextResponse.json({ prices: {} }, { status: 500 });
  }
}