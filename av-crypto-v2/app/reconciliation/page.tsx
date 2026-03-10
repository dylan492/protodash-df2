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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TypeBadge, CustodianBadge } from "@/components/shared/StatusBadge";
import { JiraLink } from "@/components/shared/JiraLink";
import { TaxDisclaimer } from "@/components/shared/DataDisclaimer";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Download,
  TrendingUp,
  ArrowLeftRight,
  Gift,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
} from "lucide-react";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";

interface Asset {
  id: string;
  symbol: string;
  name: string;
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
  assets?: Asset;
}

// Placeholder reconciliation rows — ready for real API data
const RECON_PLACEHOLDER_ROWS = [
  { custodian: "BitGo", token: "SUI", custodianQty: "—", netsuiteQty: "—", delta: "—", status: "pending_api" },
  { custodian: "BitGo", token: "SUI:DEEP", custodianQty: "—", netsuiteQty: "—", delta: "—", status: "pending_api" },
  { custodian: "Coinbase", token: "ETH", custodianQty: "—", netsuiteQty: "—", delta: "—", status: "pending_api" },
  { custodian: "Fireblocks", token: "ANLOG", custodianQty: "—", netsuiteQty: "—", delta: "—", status: "pending_api" },
  { custodian: "MetaMask", token: "ETH", custodianQty: "—", netsuiteQty: "—", delta: "—", status: "pending_api" },
  { custodian: "Petra", token: "LSD", custodianQty: "—", netsuiteQty: "—", delta: "—", status: "pending_api" },
  { custodian: "Pelagus", token: "QUAI", custodianQty: "—", netsuiteQty: "—", delta: "—", status: "pending_api" },
  { custodian: "Talisman", token: "ANLOG", custodianQty: "Manual", netsuiteQty: "—", delta: "—", status: "manual" },
];

export default function ReconciliationPage() {
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [custodianFilter, setCustodianFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").order("symbol");
      return data as Asset[];
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions_all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, assets!inner(id, symbol, name)")
        .order("executed_at", { ascending: false });
      return data as any[];
    },
  });

  const custodians = useMemo(() => {
    if (!transactions) return [];
    return Array.from(new Set(transactions.map((t) => t.custodian))).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !tx.assets.symbol.toLowerCase().includes(q) &&
          !tx.custodian.toLowerCase().includes(q) &&
          !tx.type.toLowerCase().includes(q)
        )
          return false;
      }
      if (assetFilter !== "all" && tx.asset_id !== assetFilter) return false;
      if (custodianFilter !== "all" && tx.custodian !== custodianFilter) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      return true;
    });
  }, [transactions, searchQuery, assetFilter, custodianFilter, typeFilter]);

  // KPIs for transaction log
  const kpis = useMemo(() => {
    if (!filteredTransactions) return { trades: 0, transfers: 0, rewards: 0, totalCostBasis: 0 };
    return {
      trades: filteredTransactions.filter((t) => t.type === "trade").length,
      transfers: filteredTransactions.filter((t) => t.type === "transfer").length,
      rewards: filteredTransactions.filter((t) => t.type === "reward").length,
      totalCostBasis: filteredTransactions.reduce((sum, t) => sum + (t.usd_cost_basis || 0), 0),
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (!filteredTransactions) return;
    const headers = ["Date", "Asset", "Custodian", "Type", "Quantity", "USD Cost Basis", "Jira Ticket"];
    const rows = filteredTransactions.map((tx) => [
      formatDate(tx.executed_at),
      tx.assets.symbol,
      tx.custodian,
      tx.type,
      tx.quantity,
      tx.usd_cost_basis || "",
      tx.jira_ticket_id || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `av-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reconciliation</h1>
            <p className="text-muted-foreground">
              Custodian transaction data vs NetSuite bookings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TransactionDialog />
          </div>
        </div>

        <Tabs defaultValue="custodian-vs-netsuite" className="space-y-4">
          <TabsList>
            <TabsTrigger value="custodian-vs-netsuite">Custodian vs NetSuite</TabsTrigger>
            <TabsTrigger value="transaction-log">Transaction Log</TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Custodian vs NetSuite ── */}
          <TabsContent value="custodian-vs-netsuite" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Custodian APIs</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">6</div>
                  <p className="text-xs text-muted-foreground mt-1">Configured custodians</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Matched Rows</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting API data</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting API data</p>
                </CardContent>
              </Card>
            </div>

            {/* Pending API banner */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-start gap-3 pt-5">
                <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-500">Custodian API keys pending</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Configure API keys in the <strong>Custodians</strong> tab to enable live reconciliation data. Once connected, this table will populate with real-time custodian balances reconciled against NetSuite bookings.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reconciliation table — placeholder structure */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Custodian vs NetSuite</CardTitle>
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Custodian</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead className="text-right">Custodian Qty</TableHead>
                      <TableHead className="text-right">NetSuite Qty</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RECON_PLACEHOLDER_ROWS.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.custodian}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.token}</Badge>
                        </TableCell>
                        <TableCell className="text-right mono text-muted-foreground">
                          {row.custodianQty}
                        </TableCell>
                        <TableCell className="text-right mono text-muted-foreground">
                          {row.netsuiteQty}
                        </TableCell>
                        <TableCell className="text-right mono text-muted-foreground">
                          {row.delta}
                        </TableCell>
                        <TableCell>
                          {row.status === "pending_api" ? (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending API
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-400 border-blue-400/30 text-[10px]">
                              Manual
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: Transaction Log (was Trading History) ── */}
          <TabsContent value="transaction-log" className="space-y-4">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Trades</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{kpis.trades}</div>
                      <p className="text-xs text-muted-foreground mt-1">Buy/sell transactions</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transfers</CardTitle>
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{kpis.transfers}</div>
                      <p className="text-xs text-muted-foreground mt-1">Between custodians</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rewards</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{kpis.rewards}</div>
                      <p className="text-xs text-muted-foreground mt-1">Staking / airdrops</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost Basis</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{formatCurrency(kpis.totalCostBasis)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Filtered selection</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                placeholder="Search asset, custodian, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={assetFilter} onValueChange={setAssetFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Assets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {assets?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={custodianFilter} onValueChange={setCustodianFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Custodians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Custodians</SelectItem>
                  {custodians.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="reward">Reward</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Transaction Table */}
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Custodian</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Cost Basis</TableHead>
                      <TableHead>Jira</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : filteredTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-sm">{formatDate(tx.executed_at)}</TableCell>
                              <TableCell>
                                <div className="font-medium">{tx.assets.symbol}</div>
                                <div className="text-xs text-muted-foreground">{tx.assets.name}</div>
                              </TableCell>
                              <TableCell>
                                <CustodianBadge custodian={tx.custodian} />
                              </TableCell>
                              <TableCell>
                                <TypeBadge type={tx.type} />
                              </TableCell>
                              <TableCell className="text-right mono">
                                <span className={tx.quantity < 0 ? "text-destructive" : "text-success"}>
                                  {tx.quantity > 0 ? "+" : ""}
                                  {formatNumber(tx.quantity, 4)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {tx.usd_cost_basis
                                  ? formatCurrency(tx.usd_cost_basis)
                                  : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {tx.jira_ticket_id ? (
                                  <JiraLink ticketId={tx.jira_ticket_id} />
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <TaxDisclaimer />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
