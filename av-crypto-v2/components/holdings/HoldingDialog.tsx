"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { holdingSchema, type HoldingFormData } from "@/lib/validations";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil } from "lucide-react";

interface Asset {
  id: string;
  symbol: string;
  name: string;
}

interface Holding {
  id: string;
  asset_id: string;
  custodian: string;
  total_units: number;
  vested_units: number | null;
  unvested_units: number | null;
  unvested_status: string | null;
  wallet_address: string | null;
  notes: string | null;
}

interface HoldingDialogProps {
  holding?: Holding;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const CUSTODIANS = [
  "BitGo",
  "Coinbase",
  "Equity (Transfer Agent: Morgan Stanley)",
  "Fireblocks",
  "GNMC",
  "Infstones",
  "Locked",
  "Metamask",
  "Talisman",
];
export function HoldingDialog({ holding, trigger, onSuccess }: HoldingDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const isEditing = !!holding;

  // Fetch assets for dropdown
  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").order("symbol");
      return data as Asset[];
    },
  });

  const form = useForm<HoldingFormData>({
    resolver: zodResolver(holdingSchema),
    defaultValues: holding
      ? {
          asset_id: holding.asset_id,
          custodian: holding.custodian,
          total_units: holding.total_units,
          vested_units: holding.vested_units,
          unvested_units: holding.unvested_units,
          unvested_status: holding.unvested_status || "",
          wallet_address: holding.wallet_address || "",
          notes: holding.notes || "",
        }
      : {
          asset_id: "",
          custodian: "",
          total_units: 0,
          vested_units: null,
          unvested_units: null,
          unvested_status: "",
          wallet_address: "",
          notes: "",
        },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: HoldingFormData) => {
      console.log("Attempting to save holding:", data);
      console.log("Is editing:", isEditing);
      
      if (isEditing) {
        console.log("Updating holding with ID:", holding.id);
        const { data: result, error } = await (supabase as any)
          .from("holdings")
          .update({
            asset_id: data.asset_id,
            custodian: data.custodian,
            total_units: data.total_units,
            vested_units: data.vested_units,
            unvested_units: data.unvested_units,
            unvested_status: data.unvested_status || null,
            wallet_address: data.wallet_address || null,
            notes: data.notes || null,
          } as unknown as never)
          .eq("id", holding.id)
          .select();

        console.log("Update result:", result);
        console.log("Update error:", error);
        
        if (error) {
          console.error("Supabase error details:", error);
          throw error;
        }
      } else {
        console.log("Inserting new holding");
        const { data: result, error } = await supabase.from("holdings").insert({
          asset_id: data.asset_id,
          custodian: data.custodian,
          total_units: data.total_units,
          vested_units: data.vested_units,
          unvested_units: data.unvested_units,
          unvested_status: data.unvested_status || null,
          wallet_address: data.wallet_address || null,
          notes: data.notes || null,
        } as unknown as never).select();

        console.log("Insert result:", result);
        console.log("Insert error:", error);
        
        if (error) {
          console.error("Supabase error details:", error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      console.log("Mutation successful!");
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        title: isEditing ? "Holding updated" : "Holding created",
        description: `Successfully ${isEditing ? "updated" : "added"} the holding.`,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save holding",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!holding) return;
      const { error } = await supabase.from("holdings").delete().eq("id", holding.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        title: "Holding deleted",
        description: "Successfully deleted the holding.",
      });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete holding",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HoldingFormData) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this holding? This action cannot be undone.")) {
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
                Add Holding
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Holding" : "Add New Holding"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the holding details below."
              : "Enter the details for the new holding."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="asset_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an asset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assets?.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.symbol} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="custodian"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custodian</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a custodian" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTODIANS.map((custodian) => (
                        <SelectItem key={custodian} value={custodian}>
                          {custodian}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="total_units"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Units</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vested_units"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vested Units (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unvested_units"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unvested Units (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wallet_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Address (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}