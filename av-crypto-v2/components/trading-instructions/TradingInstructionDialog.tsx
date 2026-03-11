"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { tradingInstructionSchema, type TradingInstructionFormData } from "@/lib/validations";
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

interface TradingInstruction {
  id: string;
  asset_id: string;
  action: string;
  amount: string;
  timing: string | null;
  execution_notes: string | null;
  jira_ticket_id: string | null;
  status: string;
}

interface TradingInstructionDialogProps {
  instruction?: TradingInstruction;
  defaultAssetId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function TradingInstructionDialog({ 
  instruction, 
  defaultAssetId,
  trigger, 
  onSuccess 
}: TradingInstructionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const isEditing = !!instruction;

  // Fetch assets for dropdown
  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("assets").select("*").order("symbol");
      return data as Asset[];
    },
  });

  const form = useForm<TradingInstructionFormData>({
    resolver: zodResolver(tradingInstructionSchema),
    defaultValues: instruction
      ? {
          asset_id: instruction.asset_id,
          action: instruction.action as any,
          amount: instruction.amount,
          timing: instruction.timing || "",
          execution_notes: instruction.execution_notes || "",
          jira_ticket_id: instruction.jira_ticket_id || "",
          status: instruction.status as any,
        }
      : {
          asset_id: defaultAssetId || "",
          action: "Buy" as any,
          amount: "",
          timing: "",
          execution_notes: "",
          jira_ticket_id: "",
          status: "Draft" as any,
        },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TradingInstructionFormData) => {
      const payload = {
        asset_id: data.asset_id,
        action: data.action,
        amount: data.amount,
        timing: data.timing || null,
        execution_notes: data.execution_notes || null,
        jira_ticket_id: data.jira_ticket_id || null,
        status: data.status,
      };

      if (isEditing) {
        const { error } = await (supabase as any)
          .from("trading_instructions")
          .update(payload)
          .eq("id", instruction.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("trading_instructions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading_instructions"] });
      queryClient.invalidateQueries({ queryKey: ["trading_instructions_all"] });
      toast({
        title: isEditing ? "Instruction updated" : "Instruction created",
        description: `Successfully ${isEditing ? "updated" : "created"} the trading instruction.`,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save trading instruction",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!instruction) return;
      const { error } = await (supabase as any)
        .from("trading_instructions")
        .delete()
        .eq("id", instruction.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading_instructions"] });
      queryClient.invalidateQueries({ queryKey: ["trading_instructions_all"] });
      toast({
        title: "Instruction deleted",
        description: "Successfully deleted the trading instruction.",
      });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete trading instruction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TradingInstructionFormData) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    if (
      confirm("Are you sure you want to delete this trading instruction? This action cannot be undone.")
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
                Create Instruction
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Trading Instruction" : "Create Trading Instruction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the trading instruction details below."
              : "Enter the details for the new trading instruction."}
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
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Buy">Buy</SelectItem>
                      <SelectItem value="Sell">Sell</SelectItem>
                      <SelectItem value="Hold">Hold</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1000 units, $50,000, 50%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timing (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Q1 2025, After unlock, ASAP"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="execution_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Execution Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add execution details, considerations, or special instructions..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Executed">Executed</SelectItem>
                    </SelectContent>
                  </Select>
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