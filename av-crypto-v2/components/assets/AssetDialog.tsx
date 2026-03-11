"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil } from "lucide-react";

const assetSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be 10 characters or less"),
  name: z.string().min(1, "Name is required"),
  network: z.string().optional().nullable(),
  coingecko_id: z.string().optional().nullable(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface Asset {
  id: string;
  symbol: string;
  name: string;
  network: string | null;
  coingecko_id: string | null;
}

interface AssetDialogProps {
  asset?: Asset;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AssetDialog({ asset, trigger, onSuccess }: AssetDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const isEditing = !!asset;

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: asset
      ? {
          symbol: asset.symbol,
          name: asset.name,
          network: asset.network || "",
          coingecko_id: asset.coingecko_id || "",
        }
      : {
          symbol: "",
          name: "",
          network: "",
          coingecko_id: "",
        },
  });

  // Reset form when dialog opens with new asset data
  useEffect(() => {
    if (open && asset) {
      form.reset({
        symbol: asset.symbol,
        name: asset.name,
        network: asset.network || "",
        coingecko_id: asset.coingecko_id || "",
      });
    }
  }, [open, asset, form]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      console.log("🔄 Starting save mutation...");
      console.log("📝 Form data:", data);
      console.log("✏️ Is editing:", isEditing);
      console.log("🆔 Asset ID:", asset?.id);
      
      const payload = {
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        network: data.network || null,
        coingecko_id: data.coingecko_id || null,
      };

      console.log("📦 Payload:", payload);

      if (isEditing) {
        console.log("⬆️ Executing UPDATE via API...");
        
        const response = await fetch(`/api/assets/${asset.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update asset");
        }

        const result = await response.json();
        console.log("✅ Update result:", result);
      } else {
        console.log("➕ Executing INSERT...");
        const { data: result, error } = await (supabase as any)
          .from("assets")
          .insert(payload)
          .select();

        console.log("✅ Insert result:", result);
        console.log("❌ Insert error:", error);

        if (error) throw error;
      }
    },
    onSuccess: async () => {
      console.log("🎉 Mutation successful!");
      console.log("🔄 Invalidating queries...");
      
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      await queryClient.refetchQueries({ queryKey: ["assets"] });
      
      console.log("✅ Queries invalidated and refetched");
      
      toast({
        title: isEditing ? "Asset updated" : "Asset created",
        description: `Successfully ${isEditing ? "updated" : "created"} the asset.`,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("💥 Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save asset",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!asset) return;
      
      // Check if asset has holdings
      const { data: holdings } = await supabase
        .from("holdings")
        .select("id")
        .eq("asset_id", asset.id);
      
      if (holdings && holdings.length > 0) {
        throw new Error("Cannot delete asset with existing holdings. Delete holdings first.");
      }

      const { error } = await supabase.from("assets").delete().eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        title: "Asset deleted",
        description: "Successfully deleted the asset.",
      });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssetFormData) => {
    console.log("📨 Form submitted!");
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this asset? This will only work if the asset has no holdings."
      )
    ) {
      deleteMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size={isEditing ? "sm" : "default"} variant={isEditing ? "ghost" : "default"}>
            {isEditing ? (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the asset details below."
              : "Enter the details for the new cryptocurrency asset."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="BTC" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    Ticker symbol (e.g., BTC, ETH, SOL)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Bitcoin" {...field} />
                  </FormControl>
                  <FormDescription>
                    Full name of the cryptocurrency
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Ethereum, Solana, Sui"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Blockchain network if applicable
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coingecko_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CoinGecko ID (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., bitcoin, ethereum"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    For live price integration (find on coingecko.com)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}