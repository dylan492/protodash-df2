"use client";

import { Suspense } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataDisclaimer } from "@/components/shared/DataDisclaimer";
import { CustodianBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { usePrice } from "@/hooks/use-prices";
import { TrendingUp, TrendingDown, Calendar, FileText, Package } from "lucide-react";
import { TradingInstructionDialog } from "@/components/trading-instructions/TradingInstructionDialog";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  network: string | null;
  coingecko_id: string | null;
}

interface Holding {
  id: string;
  asset_id: string;
  custodian: string;
  total_units: number;
  vested_units: number | null;
  unvested_units: number | null;
}

interface TradingInstruction {
  id: string;
  asset_id: string;
  action: string;
  amount: string;
  timing: string | null;
  execution_notes: string | null;
  jira_ticket_id: string | null;
  status: string;
  created_at: string;
  assets?: {
    symbol: string;
    name: string;
  };
}

interface Transaction {
  id: string;
  asset_id: string;
  custodian: string;
  type: string;
  quantity: number;
  usd_cost_basis: number | null;
  jira_ticket_id: string | null;
  executed_at: string;
}

interface Event {
  id: string;
  asset_id: string | null;
  title: string;
  event_type: string;
  event_date: string;
  status: string;
  description: string | null;
  jira_ticket_id: string | null;
}

function AssetDetailPageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const symbol = searchParams.get("symbol");

  const { data: asset, isLoading: assetLoading } = useQuery({
    queryKey: ["asset", symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const { data } = await supabase
        .from("assets")
        .select("*")
        .eq("symbol", symbol)
        .single();
      return data as Asset | null;
    },
    enabled: !!symbol,
  });

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").order("symbol");
      return data as Asset[];
    },
  });

  if (!symbol && assets && assets.length > 0 && !assetsLoading) {
    router.push(`/assets?symbol=${assets[0].symbol}`);
  }

  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ["holdings", asset?.id],
    queryFn: async () => {
      if (!asset?.id) return [];
      const { data } = await supabase
        .from("holdings")
        .select("*")
        .eq("asset_id", asset.id)
        .order("total_units", { ascending: false });
      return data as Holding[];
    },
    enabled: !!asset?.id,
  });

  const { data: instructions, isLoading: instructionsLoading } = useQuery({
    queryKey: ["trading_instructions", asset?.id],
    queryFn: async () => {
      if (!asset?.id) return [];
      const { data } = await supabase
        .from("trading_instructions")
        .select("*")
        .eq("asset_id", asset.id)
        .order("created_at", { ascending: false });
      return data as TradingInstruction[];
    },
    enabled: !!asset?.id,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions", asset?.id],
    queryFn: async () => {
      if (!asset?.id) return [];
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("asset_id", asset.id)
        .order("executed_at", { ascending: false });
      return data as Transaction[];
    },
    enabled: !!asset?.id,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", asset?.id],
    queryFn: async () => {
      if (!asset?.id) return [];
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("asset_id", asset.id)
        .order("event_date", { ascending: true });
      return data as Event[];
    },
    enabled: !!asset?.id,
  });

  const { data: priceData, isLoading: priceLoading } = usePrice(symbol || "");

  const totalUnits = useMemo(() => {
    if (!holdings) return 0;
    return holdings.reduce((sum, h) => sum + h.total_units, 0);
  }, [holdings]);

  const totalValue = useMemo(() => {
    if (!priceData || !totalUnits) return 0;
    return totalUnits * (priceData.usd || 0);
  }, [priceData, totalUnits]);

  const isLoading =
    assetLoading ||
    holdingsLoading ||
    instructionsLoading ||
    transactionsLoading ||
    eventsLoading ||
    priceLoading;

  if (!symbol) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Please select an asset</p>
        </div>
      </PageLayout>
    );
  }

  if (assetLoading) {
    return (
      <PageLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (!asset) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Asset not found</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Asset Detail</h1>
            <p className="text-muted-foreground">
              View detailed information and manage positions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TradingInstructionDialog defaultAssetId={asset?.id} />
            <Select value={symbol || undefined} onValueChange={(value) => router.push(`/assets?symbol=${value}`)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {assets?.map((a) => (
                  <SelectItem key={a.id} value={a.symbol}>
                    {a.symbol} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Large Asset Card */}
        <Card className="border-2">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-8 w-64" />
              </div>
            ) : asset ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-4xl font-bold">{asset.symbol}</h2>
                      {asset.network && (
                        <Badge variant="outline" className="text-base">
                          {asset.network}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xl text-muted-foreground">{asset.name}</p>
                  </div>
                  <div className="text-right">
                    {priceData ? (
                      <>
                        <div className="text-3xl font-bold">
                          {formatCurrency(priceData.usd || 0)}
                        </div>
                        {priceData.usd_24h_change !== undefined && (
                          <p
                            className={`text-sm font-medium mt-1 flex items-center justify-end gap-1 ${
                              priceData.usd_24h_change >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {priceData.usd_24h_change >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {priceData.usd_24h_change.toFixed(2)}% (24h)
                          </p>
                        )}
                      </>
                    ) : (
                      <Skeleton className="h-10 w-32" />
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Price</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {priceLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(priceData?.usd || 0)}
                  </div>
                  {priceData?.usd_24h_change !== undefined && (
                    <p
                      className={`text-xs font-medium mt-1 flex items-center gap-1 ${
                        priceData.usd_24h_change >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {priceData.usd_24h_change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {priceData.usd_24h_change.toFixed(2)}% (24h)
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Holdings</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold mono">
                    {formatNumber(totalUnits, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {holdings?.length || 0} custodian{holdings?.length !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Live pricing</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trading Status</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {instructionsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : instructions && instructions.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {instructions[0].action}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {instructions[0].status}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground mt-1">No instructions</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="instructions">Trading Instructions</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Holdings by Custodian</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Custodian</TableHead>
                      <TableHead className="text-right">Total Units</TableHead>
                      <TableHead className="text-right">Vested</TableHead>
                      <TableHead className="text-right">Unvested</TableHead>
                      <TableHead className="text-right">USD Value</TableHead>
                      <TableHead className="text-right">% of Asset</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : holdings && holdings.length > 0 ? (
                      holdings.map((holding) => {
                        const holdingValue = (priceData?.usd || 0) * holding.total_units;
                        const vestedValue = (priceData?.usd || 0) * (holding.vested_units || 0);
                        const unvestedValue = (priceData?.usd || 0) * (holding.unvested_units || 0);
                        const percentage =
                          totalUnits > 0 ? (holding.total_units / totalUnits) * 100 : 0;
                        return (
                          <TableRow key={holding.id}>
                            <TableCell>
                              <CustodianBadge custodian={holding.custodian} />
                            </TableCell>
                            <TableCell className="text-right mono">
                              {formatNumber(holding.total_units, 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">
                                <div className="mono">{formatNumber(holding.vested_units || 0, 0)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(vestedValue)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">
                                <div className="mono">{formatNumber(holding.unvested_units || 0, 0)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(unvestedValue)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(holdingValue)}
                            </TableCell>
                            <TableCell className="text-right mono">
                              {percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No holdings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Trading Instructions */}
          <TabsContent value="instructions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trading Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                {instructionsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : instructions && instructions.length > 0 ? (
                  <div className="space-y-4">
                    {instructions.map((instruction) => (
                      <div key={instruction.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  instruction.action === "Buy"
                                    ? "default"
                                    : instruction.action === "Sell"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {instruction.action}
                              </Badge>
                              <span className="font-medium">{instruction.amount}</span>
                            </div>
                            {instruction.timing && (
                              <p className="text-sm text-muted-foreground">
                                Timing: {instruction.timing}
                              </p>
                            )}
                            {instruction.execution_notes && (
                              <p className="text-sm">{instruction.execution_notes}</p>
                            )}
                          </div>
                          <Badge
                            variant={
                              instruction.status === "Executed"
                                ? "default"
                                : instruction.status === "Approved"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {instruction.status}
                          </Badge>
                        </div>
                        {instruction.jira_ticket_id && (
                          <p className="text-xs text-muted-foreground">
                            Ticket: {instruction.jira_ticket_id}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No trading instructions found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Transaction History */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Custodian</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Cost Basis</TableHead>
                      <TableHead>Ticket</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : transactions && transactions.length > 0 ? (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {new Date(tx.executed_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{tx.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <CustodianBadge custodian={tx.custodian} />
                          </TableCell>
                          <TableCell className="text-right mono">
                            {tx.quantity > 0 ? "+" : ""}
                            {formatNumber(tx.quantity, 2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.usd_cost_basis ? formatCurrency(tx.usd_cost_basis) : "—"}
                          </TableCell>
                          <TableCell>
                            {tx.jira_ticket_id ? (
                              <span className="text-xs text-muted-foreground">
                                {tx.jira_ticket_id}
                              </span>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Events */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : events && events.length > 0 ? (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{event.title}</span>
                              <Badge variant="outline">{event.event_type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.event_date).toLocaleDateString()}
                            </p>
                            {event.description && (
                              <p className="text-sm">{event.description}</p>
                            )}
                          </div>
                          <Badge variant={event.status === "complete" ? "default" : "secondary"}>
                            {event.status}
                          </Badge>
                        </div>
                        {event.jira_ticket_id && (
                          <p className="text-xs text-muted-foreground">
                            Ticket: {event.jira_ticket_id}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No events found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DataDisclaimer message="Data is updated in real-time. Transaction history and events are for reference only." />
      </div>
    </PageLayout>
  );
}

export default function AssetDetailPage() {
  return (
    <Suspense fallback={null}>
      <AssetDetailPageInner />
    </Suspense>
  );
}