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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TypeBadge, CustodianBadge } from "@/components/shared/StatusBadge";
import { JiraLink } from "@/components/shared/JiraLink";
import { TaxDisclaimer } from "@/components/shared/DataDisclaimer";
import {
  formatCurrency,
  formatNumber,
  formatDate,
} from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Download, TrendingUp, ArrowLeftRight, Gift, FileText } from "lucide-react";
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

export default function TradingHistoryPage() {
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [custodianFilter, setCustodianFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Fetch all assets
  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").order("symbol");
      return data as Asset[];
    },
  });

  // Fetch all transactions with asset info
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

  // Get unique custodians
  const custodians = useMemo(() => {
    if (!transactions) return [];
    return Array.from(new Set(transactions.map((t) => t.custodian))).sort();
  }, [transactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter((tx) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesAsset = tx.assets.symbol.toLowerCase().includes(query) ||
          tx.assets.name.toLowerCase().includes(query);
        const matchesCustodian = tx.custodian.toLowerCase().includes(query);
        const matchesType = tx.type.toLowerCase().includes(query);
        if (!matchesAsset && !matchesCustodian && !matchesType) return false;
      }

      // Asset filter
      if (assetFilter !== "all" && tx.asset_id !== assetFilter) return false;

      // Custodian filter
      if (custodianFilter !== "all" && tx.custodian !== custodianFilter) return false;

      // Type filter
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;

      return true;
    });
  }, [transactions, searchQuery, assetFilter, custodianFilter, typeFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!filteredTransactions) {
      return {
        totalVolume: 0,
        tradesCount: 0,
        transfersCount: 0,
        rewardsCount: 0,
      };
    }

    return {
      totalVolume: filteredTransactions.reduce(
        (sum, tx) => sum + Math.abs(tx.usd_cost_basis || 0),
        0
      ),
      tradesCount: filteredTransactions.filter((tx) => tx.type === "trade").length,
      transfersCount: filteredTransactions.filter((tx) => tx.type === "transfer")
        .length,
      rewardsCount: filteredTransactions.filter((tx) => tx.type === "reward").length,
    };
  }, [filteredTransactions]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;

    const headers = [
      "Date",
      "Asset Symbol",
      "Asset Name",
      "Custodian",
      "Type",
      "Quantity",
      "USD Cost Basis",
      "Jira Ticket",
    ];

    const rows = filteredTransactions.map((tx) => [
      formatDate(tx.executed_at),
      tx.assets.symbol,
      tx.assets.name,
      tx.custodian,
      tx.type,
      tx.quantity.toString(),
      tx.usd_cost_basis?.toString() || "",
      tx.jira_ticket_id || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trading-history-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading History</h1>
            <p className="text-muted-foreground">
              Complete transaction history with filtering and export
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TransactionDialog />
            <Button onClick={handleExportCSV} disabled={!filteredTransactions?.length} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(kpis.totalVolume)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    USD value of all transactions
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trades</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.tradesCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Buy/sell trades</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transfers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.transfersCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Between custodians
                  </p>
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
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.rewardsCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Staking & airdrops
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={assetFilter} onValueChange={setAssetFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Assets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {assets?.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={custodianFilter} onValueChange={setCustodianFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Custodians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Custodians</SelectItem>
                  {custodians.map((custodian) => (
                    <SelectItem key={custodian} value={custodian}>
                      {custodian}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="reward">Reward</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Transactions ({filteredTransactions?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Custodian</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">USD Cost Basis</TableHead>
                  <TableHead>Jira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTransactions && filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="mono">
                        {formatDate(tx.executed_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tx.assets.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {tx.assets.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CustodianBadge custodian={tx.custodian} />
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell
                        className={`text-right mono font-medium ${
                          tx.quantity >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {tx.quantity >= 0 ? "+" : ""}
                        {formatNumber(tx.quantity, 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tx.usd_cost_basis)}
                      </TableCell>
                      <TableCell>
                        <JiraLink ticketId={tx.jira_ticket_id} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tax Disclaimer */}
        <TaxDisclaimer />
      </div>
    </PageLayout>
  );
}
