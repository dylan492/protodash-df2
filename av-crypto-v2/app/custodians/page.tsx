"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrices } from "@/hooks/use-prices";
import { useState, useMemo } from "react";
import {
  Key,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  notes: string | null;
}

interface CustodianApiKey {
  id: string;
  custodian: string;
  key_masked: string | null;
  status: string;
  last_tested_at: string | null;
  updated_at: string;
}

interface UserRole {
  role: string;
}

const CUSTODIANS_WITH_API = [
  {
    name: "BitGo",
    description: "Multi-sig custody platform",
    docsUrl: "https://developers.bitgo.com",
    color: "hsl(212 80% 55% / 0.15)",
    borderColor: "hsl(212 80% 55% / 0.3)",
  },
  {
    name: "Coinbase",
    description: "Coinbase Prime institutional custody",
    docsUrl: "https://docs.cdp.coinbase.com",
    color: "hsl(212 80% 55% / 0.15)",
    borderColor: "hsl(212 80% 55% / 0.3)",
  },
  {
    name: "Fireblocks",
    description: "Digital asset infrastructure",
    docsUrl: "https://developers.fireblocks.com",
    color: "hsl(212 80% 55% / 0.15)",
    borderColor: "hsl(212 80% 55% / 0.3)",
  },
  {
    name: "MetaMask",
    description: "MetaMask Institutional / Ethereum wallet",
    docsUrl: "https://docs.metamask.io",
    color: "hsl(212 80% 55% / 0.15)",
    borderColor: "hsl(212 80% 55% / 0.3)",
  },
  {
    name: "Petra",
    description: "Aptos / LiquidSwap custody",
    docsUrl: "https://petra.app/docs",
    color: "hsl(212 80% 55% / 0.15)",
    borderColor: "hsl(212 80% 55% / 0.3)",
  },
  {
    name: "Pelagus",
    description: "Quai Network wallet",
    docsUrl: "https://pelaguswallet.io",
    color: "hsl(212 80% 55% / 0.15)",
    borderColor: "hsl(212 80% 55% / 0.3)",
  },
];

function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

export default function CustodiansPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});

  // Check current user role
  const { data: currentUser } = useQuery({
    queryKey: ["current_user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user_role", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .single();
      return data as UserRole | null;
    },
    enabled: !!currentUser,
  });

  const isAdmin = userRole?.role === "admin";

  // Fetch API keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ["custodian_api_keys"],
    queryFn: async () => {
      const { data } = await supabase
        .from("custodian_api_keys")
        .select("*")
        .order("custodian");
      return (data || []) as CustodianApiKey[];
    },
  });

  // Fetch holdings
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

  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").order("symbol");
      return data as Asset[];
    },
  });

  // Get all crypto symbols for pricing
  const cryptoSymbols = useMemo(() => {
    if (!assets) return [];
    const equityList = ["AIRE", "BETR", "BRZE", "CMPX", "CRCL", "FLGC", "IONQ", "SERV", "SI"];
    return assets.filter((a) => !equityList.includes(a.symbol)).map((a) => a.symbol);
  }, [assets]);

  const { data: priceData } = usePrices(cryptoSymbols);

  // Save API key mutation
  const saveKeyMutation = useMutation({
    mutationFn: async ({ custodian, key }: { custodian: string; key: string }) => {
      const masked = maskKey(key);
      const existing = apiKeys?.find((k) => k.custodian === custodian);

      if (existing) {
        const { error } = await (supabase as any)
          .from("custodian_api_keys")
          .update({
            key_masked: masked,
            status: "configured",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("custodian_api_keys")
          .insert({
            custodian,
            key_masked: masked,
            status: "configured",
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { custodian }) => {
      queryClient.invalidateQueries({ queryKey: ["custodian_api_keys"] });
      setEditMode((prev) => ({ ...prev, [custodian]: false }));
      setEditingKeys((prev) => ({ ...prev, [custodian]: "" }));
      toast({ title: "API key saved", description: `${custodian} key updated successfully.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save API key.", variant: "destructive" });
    },
  });

  // Group holdings by custodian
  const holdingsByCustodian = useMemo(() => {
    if (!holdings || !assets) return {};
    return holdings.reduce((acc: Record<string, any[]>, h) => {
      if (!acc[h.custodian]) acc[h.custodian] = [];
      acc[h.custodian].push(h);
      return acc;
    }, {});
  }, [holdings, assets]);

  const getCustodianValue = (custodianHoldings: any[]) => {
    return custodianHoldings.reduce((sum, h) => {
      const asset = assets?.find((a) => a.id === h.asset_id);
      if (!asset) return sum;
      const price = priceData?.prices[asset.symbol]?.usd || 0;
      return sum + h.total_units * price;
    }, 0);
  };

  const getKeyForCustodian = (custodian: string) =>
    apiKeys?.find((k) => k.custodian === custodian);

  const toggleShowKey = (custodian: string) =>
    setShowKeys((prev) => ({ ...prev, [custodian]: !prev[custodian] }));

  const allCustodians = useMemo(() => {
    const apiNames = new Set(CUSTODIANS_WITH_API.map((c) => c.name));
    const holdingCustodians = Object.keys(holdingsByCustodian).filter(
      (c) => !apiNames.has(c)
    );
    return holdingCustodians;
  }, [holdingsByCustodian]);

  return (
    <PageLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custodians</h1>
          <p className="text-muted-foreground">
            Manage custodian API connections and view holdings by custodian
          </p>
        </div>

        {/* API Key Management */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">API Connections</h2>
            {!isAdmin && (
              <Badge variant="outline" className="text-xs ml-2">
                Admin required to edit
              </Badge>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CUSTODIANS_WITH_API.map((custodian) => {
              const keyRecord = getKeyForCustodian(custodian.name);
              const isConfigured = keyRecord?.status === "configured";
              const isEditing = editMode[custodian.name];
              const showKey = showKeys[custodian.name];

              return (
                <Card
                  key={custodian.name}
                  className={isConfigured ? "border-[hsl(142_76%_36%/0.3)]" : ""}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{custodian.name}</CardTitle>
                      {keysLoading ? (
                        <Skeleton className="h-5 w-20" />
                      ) : isConfigured ? (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not set
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">{custodian.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Key display / input */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <Label className="text-xs">API Key</Label>
                        <Input
                          type={showKey ? "text" : "password"}
                          placeholder="Paste API key..."
                          value={editingKeys[custodian.name] || ""}
                          onChange={(e) =>
                            setEditingKeys((prev) => ({
                              ...prev,
                              [custodian.name]: e.target.value,
                            }))
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-xs">API Key</Label>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                            {keyRecord?.key_masked
                              ? showKey
                                ? keyRecord.key_masked
                                : "••••••••••••••••"
                              : "Not configured"}
                          </code>
                          {keyRecord?.key_masked && (
                            <button
                              onClick={() => toggleShowKey(custodian.name)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {showKey ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        {keyRecord?.last_tested_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Last tested: {new Date(keyRecord.last_tested_at).toLocaleDateString()}
                          </p>
                        )}
                        {keyRecord?.updated_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Updated: {new Date(keyRecord.updated_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        isEditing ? (
                          <>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() =>
                                saveKeyMutation.mutate({
                                  custodian: custodian.name,
                                  key: editingKeys[custodian.name] || "",
                                })
                              }
                              disabled={
                                !editingKeys[custodian.name] ||
                                saveKeyMutation.isPending
                              }
                            >
                              {saveKeyMutation.isPending ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditMode((prev) => ({ ...prev, [custodian.name]: false }));
                                setEditingKeys((prev) => ({ ...prev, [custodian.name]: "" }));
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() =>
                              setEditMode((prev) => ({ ...prev, [custodian.name]: true }))
                            }
                          >
                            <Key className="h-3 w-3 mr-1" />
                            {isConfigured ? "Update Key" : "Add Key"}
                          </Button>
                        )
                      ) : (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Contact an admin to configure
                        </p>
                      )}
                      <a
                        href={custodian.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        API Docs
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Holdings by Custodian */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Holdings by Custodian</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {holdingsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))
              : Object.entries(holdingsByCustodian).map(([custodian, custHoldings]) => {
                  const value = getCustodianValue(custHoldings as any[]);
                  const apiCustodian = CUSTODIANS_WITH_API.find((c) => c.name === custodian);
                  const keyRecord = getKeyForCustodian(custodian);
                  const isApiConfigured = keyRecord?.status === "configured";

                  return (
                    <Card key={custodian}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{custodian}</CardTitle>
                          <div className="flex items-center gap-1.5">
                            {apiCustodian ? (
                              isApiConfigured ? (
                                <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                                  API
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  API pending
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Manual
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(value)}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(custHoldings as any[]).map((holding) => {
                            const asset = assets?.find((a) => a.id === holding.asset_id);
                            if (!asset) return null;
                            return (
                              <div key={holding.id} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{asset.symbol}</span>
                                <span className="mono">{formatNumber(holding.total_units, 0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
