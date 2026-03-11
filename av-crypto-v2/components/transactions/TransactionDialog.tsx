"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { transactionSchema, type TransactionFormData } from "@/lib/validations";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
}

interface TransactionDialogProps {
  transaction?: Transaction;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const CUSTODIANS = [
  "Coinbase Prime",
  "Fireblocks",
  "BitGo",
  "MetaMask (Enterprise)",
  "Phantom",
  "Talisman",
  "Morgan Stanley",
];

export function TransactionDialog({ transaction, trigger, onSuccess }: TransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const isEditing = !!transaction;

  // Fetch assets for dropdown
  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("assets").select("*").order("symbol");
      return data as Asset[];
    },
  });

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          asset_id: transaction.asset_id,
          custodian: transaction.custodian,
          type: transaction.type as any,
          quantity: transaction.quantity,
          usd_cost_basis: transaction.usd_cost_basis || 0,
          jira_ticket_id: transaction.jira_ticket_id || "",
          executed_at: new Date(transaction.executed_at),
        }
      : {
          asset_id: "",
          custodian: "",
          type: "trade" as any,
          quantity: 0,
          usd_cost_basis: 0,
          jira_ticket_id: "",
          executed_at: new Date(),
        },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const payload = {
        asset_id: data.asset_id,
        custodian: data.custodian,
        type: data.type,
        quantity: data.quantity,
        usd_cost_basis: data.usd_cost_basis || null,
        jira_ticket_id: data.jira_ticket_id || null,
        executed_at: data.executed_at.toISOString(),
      };

      if (isEditing) {
        const { error } = await (supabase as any)
          .from("transactions")
          .update(payload)
          .eq("id", transaction.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("transactions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions_all"] });
      toast({
        title: isEditing ? "Transaction updated" : "Transaction recorded",
        description: `Successfully ${isEditing ? "updated" : "recorded"} the transaction.`,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Record Transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the transaction details below."
              : "Enter the details for the new transaction."}
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trade">Trade (Buy/Sell)</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="reward">Reward (Staking/Airdrop)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="any" 
                      placeholder="Use negative for sells/outflows" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Positive for buys/inflows, negative for sells/outflows
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usd_cost_basis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USD Cost Basis (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    Total USD value of the transaction
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="executed_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Execution Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jira_ticket_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jira Ticket ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="AV-1234" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}