import { NextRequest, NextResponse } from "next/server";
import { getVaultAccounts, getTransactions } from "@/lib/fireblocks";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "balances";

  if (!process.env.FIREBLOCKS_API_KEY || !process.env.FIREBLOCKS_SECRET_KEY) {
    return NextResponse.json(
      { error: "Fireblocks credentials not configured" },
      { status: 503 }
    );
  }

  try {
    if (type === "balances") {
      const accounts = await getVaultAccounts();

      // Flatten into per-asset rows
      const holdings: {
        vaultId: string;
        vaultName: string;
        assetId: string;
        total: number;
        available: number;
      }[] = [];

      for (const account of accounts) {
        for (const asset of account.assets) {
          const total = parseFloat(asset.total);
          if (total > 0) {
            holdings.push({
              vaultId: account.id,
              vaultName: account.name,
              assetId: asset.id,
              total,
              available: parseFloat(asset.available),
            });
          }
        }
      }

      return NextResponse.json({ holdings, fetchedAt: new Date().toISOString() });
    }

    if (type === "transactions") {
      const after = request.nextUrl.searchParams.get("after");
      const before = request.nextUrl.searchParams.get("before");

      const txs = await getTransactions({
        after: after ? Number(after) : undefined,
        before: before ? Number(before) : undefined,
      });

      return NextResponse.json({ transactions: txs, fetchedAt: new Date().toISOString() });
    }

    return NextResponse.json({ error: "Unknown type param" }, { status: 400 });
  } catch (err: any) {
    console.error("Fireblocks API error:", err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}