"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataDisclaimer } from "@/components/shared/DataDisclaimer";
import { formatCurrency, formatNumber, formatCompactCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePrices } from "@/hooks/use-prices";
import { useEquityPrices } from "@/hooks/use-equity-prices";
import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, Package, Building2, Crown, Pencil } from "lucide-react";
import { HoldingDialog } from "@/components/holdings/HoldingDialog";
import { AssetDialog } from "@/components/assets/AssetDialog";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  network: string | null;
}

interface Holding {
  id: string;
  asset_id: string;
  custodian: string;
  total_units: number;
  vested_units: number | null;
  unvested_units: number | null;
  unvested_status: string | null;
  notes: string | null;
  asset?: Asset;
}

interface ConsolidatedAsset {
  asset: Asset;
  totalUnits: number;
  vestedUnits: number;
  unvestedUnits: number;
  custodianCount: number;
  usdValue: number;
  vestedValue: number;
  unvestedValue: number;
  percentage: number;
}

export default function InventoryPage() {
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch assets and holdings
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").order("symbol");
      console.log("Assets fetched:", data);  
      return data as Asset[];
    },
  });

  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ["holdings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("holdings")
        .select("*, assets!inner(*)")
        .order("total_units", { ascending: false });
      return data as any[];
    },
  });

  // Separate crypto and equity symbols
  const cryptoSymbols = useMemo(() => {
    if (!assets || assets.length === 0) return [];
    const equityList = ["AIRE", "BETR", "BRZE", "CMPX", "CRCL", "FLGC", "IONQ", "SERV", "SI"];
    return assets.filter((a) => !equityList.includes(a.symbol)).map((a) => a.symbol);
  }, [assets ? JSON.stringify(assets.map(a => a.id)) : '']);

  const equitySymbols = useMemo(() => {
    if (!assets || assets.length === 0) return [];
    const equityList = ["AIRE", "BETR", "BRZE", "CMPX", "CRCL", "FLGC", "IONQ", "SERV", "SI"];
    return assets.filter((a) => equityList.includes(a.symbol)).map((a) => a.symbol);
  }, [assets ? JSON.stringify(assets.map(a => a.id)) : '']);

  // Fetch both crypto and equity prices
  const { data: cryptoPriceData, isLoading: cryptoPricesLoading } = usePrices(cryptoSymbols);
  const { data: equityPriceData, isLoading: equityPricesLoading } = useEquityPrices(equitySymbols);

  // Combine price data
  const priceData = useMemo(() => {
    return {
      prices: {
        ...(cryptoPriceData?.prices || {}),
        ...(equityPriceData?.prices || {}),
      },
    };
  }, [cryptoPriceData, equityPriceData]);

  const pricesLoading = cryptoPricesLoading || equityPricesLoading;

  // Consolidate holdings by asset
  const consolidatedAssets = useMemo<ConsolidatedAsset[]>(() => {
    if (!holdings || !assets || !priceData) return [];

    const assetMap = new Map<string, ConsolidatedAsset>();

    holdings.forEach((holding) => {
      const asset = assets.find((a) => a.id === holding.asset_id);
      if (!asset) return;

      const price = priceData.prices[asset.symbol]?.usd || 0;
      const totalValue = holding.total_units * price;
      const vestedValue = (holding.vested_units || 0) * price;
      const unvestedValue = (holding.unvested_units || 0) * price;

      if (assetMap.has(asset.id)) {
        const existing = assetMap.get(asset.id)!;
        existing.totalUnits += holding.total_units;
        existing.vestedUnits += holding.vested_units || 0;
        existing.unvestedUnits += holding.unvested_units || 0;
        existing.usdValue += totalValue;
        existing.vestedValue += vestedValue;
        existing.unvestedValue += unvestedValue;
        // Fix: track custodian names in a Set to get accurate count
        if (!(existing as any)._custodianSet) (existing as any)._custodianSet = new Set([holding.custodian]);
        else ((existing as any)._custodianSet as Set<string>).add(holding.custodian);
        existing.custodianCount = ((existing as any)._custodianSet as Set<string>).size;
      } else {
        assetMap.set(asset.id, {
          asset,
          totalUnits: holding.total_units,
          vestedUnits: holding.vested_units || 0,
          unvestedUnits: holding.unvested_units || 0,
          custodianCount: 1,
          usdValue: totalValue,
          vestedValue: vestedValue,
          unvestedValue: unvestedValue,
          percentage: 0,
        });
      }
    });

    const total = Array.from(assetMap.values()).reduce(
      (sum, item) => sum + item.usdValue,
      0
    );

    return Array.from(assetMap.values())
      .map((item) => ({
        ...item,
        percentage: total > 0 ? (item.usdValue / total) * 100 : 0,
      }))
      .sort((a, b) => b.usdValue - a.usdValue);
  }, [holdings, assets, priceData]);

  // Filter assets based on search
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return consolidatedAssets;
    const query = searchQuery.toLowerCase();
    return consolidatedAssets.filter(
      (item) =>
        item.asset.symbol.toLowerCase().includes(query) ||
        item.asset.name.toLowerCase().includes(query)
    );
  }, [consolidatedAssets, searchQuery]);

  // Calculate KPIs
  const totalValue = consolidatedAssets.reduce((sum, item) => sum + item.usdValue, 0);
  const totalAssets = consolidatedAssets.length;
  const totalCustodians = useMemo(() => {
    if (!holdings) return 0;
    return new Set(holdings.map((h) => h.custodian)).size;
  }, [holdings]);
  const topHolding = consolidatedAssets[0];

  const isLoading = assetsLoading || holdingsLoading || pricesLoading;

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">All Assets</h1>
            <p className="text-muted-foreground">
              All token and equity positions across all custodians
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AssetDialog />
            <HoldingDialog />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Live prices</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalAssets}</div>
                  <p className="text-xs text-muted-foreground mt-1">Unique symbols</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custodians</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalCustodians}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active platforms</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Holding</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : topHolding ? (
                <>
                  <div className="text-2xl font-bold">{topHolding.asset.symbol}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCompactCurrency(topHolding.usdValue)}
                  </p>
                </>
              ) : (
                <div className="text-2xl font-bold">—</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        {/* All Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead className="text-right">Total Units</TableHead>
                  <TableHead className="text-right">Vested</TableHead>
                  <TableHead className="text-right">Unvested</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>% of Portfolio</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((item) => (
                    <TableRow key={item.asset.id} className="group">
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.asset.symbol}</div>
                          <div className="text-sm text-muted-foreground">{item.asset.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.asset.network ? (
                          <Badge variant="outline">{item.asset.network}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right mono">
                        {formatNumber(item.totalUnits, 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          <div className="mono">{formatNumber(item.vestedUnits, 0)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(item.vestedValue)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          <div className="mono">{formatNumber(item.unvestedUnits, 0)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(item.unvestedValue)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.usdValue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-full max-w-[200px] rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground mono min-w-[3rem]">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <AssetDialog 
                            asset={item.asset}
                            trigger={
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            }
                          />
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/assets?symbol=${item.asset.symbol}`}>Details</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <DataDisclaimer message="Crypto prices from CoinGecko, equity prices from Massive API. Updated every 5 minutes. Values for informational purposes only." />
      </div>
    </PageLayout>
  );
}