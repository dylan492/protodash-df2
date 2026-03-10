"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { custodianAccessSchema, type CustodianAccessFormData } from "@/lib/validations";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil } from "lucide-react";

interface CustodianAccess {
  id: string;
  custodian: string;
  person_name: string;
  person_role: string | null;
  access_level: string;
}

interface CustodianAccessDialogProps {
  access?: CustodianAccess;
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

const ACCESS_LEVELS = [
  { value: "read", label: "Read", description: "View only access" },
  { value: "transact", label: "Transact", description: "Can initiate transactions" },
  { value: "admin", label: "Admin", description: "Full control and management" },
  { value: "two_touch", label: "Two-Touch", description: "Requires dual approval" },
];

export function CustodianAccessDialog({ access, trigger, onSuccess }: CustodianAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const isEditing = !!access;

  const form = useForm<CustodianAccessFormData>({
    resolver: zodResolver(custodianAccessSchema),
    defaultValues: access
      ? {
          custodian: access.custodian,
          person_name: access.person_name,
          person_role: access.person_role || "",
          access_level: access.access_level as any,
        }
      : {
          custodian: "",
          person_name: "",
          person_role: "",
          access_level: "read" as any,
        },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CustodianAccessFormData) => {
      const payload = {
        custodian: data.custodian,
        person_name: data.person_name,
        person_role: data.person_role || null,
        access_level: data.access_level,
      };

      if (isEditing) {
        // Use API route to bypass RLS
        const response = await fetch(`/api/custodian-access/${access.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update access");
        }

        return await response.json();
      } else {
        // Use API route to bypass RLS for INSERT
        console.log(`[Dialog] Calling POST API to create access:`, payload);
        
        const response = await fetch("/api/custodian-access-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log(`[Dialog] POST response status:`, response.status);

        if (!response.ok) {
          const text = await response.text();
          console.error(`[Dialog] POST failed - Response text:`, text);
          
          try {
            const error = JSON.parse(text);
            throw new Error(error.error || "Failed to create access");
          } catch (e) {
            throw new Error(`Failed to create access: ${text.substring(0, 100)}`);
          }
        }

        const result = await response.json();
        console.log(`[Dialog] POST success:`, result);
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custodian_access"] });
      toast({
        title: isEditing ? "Access updated" : "Access granted",
        description: `Successfully ${isEditing ? "updated" : "granted"} custodian access.`,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save access",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!access) return;
      
      console.log(`[Dialog] Calling DELETE API for access ID: ${access.id}`);
      
      // Use API route to bypass RLS
      const response = await fetch(`/api/custodian-access/${access.id}`, {
        method: "DELETE",
      });

      console.log(`[Dialog] DELETE response status:`, response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error(`[Dialog] DELETE failed:`, error);
        throw new Error(error.error || "Failed to delete access");
      }

      const result = await response.json();
      console.log(`[Dialog] DELETE success:`, result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custodian_access"] });
      toast({
        title: "Access revoked",
        description: "Successfully revoked custodian access.",
      });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke access",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustodianAccessFormData) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to revoke this access? This action cannot be undone.")) {
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
                Add Access
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Custodian Access" : "Grant Custodian Access"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the access details below."
              : "Grant access to a custodian for a team member."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="person_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Person Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="person_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Portfolio Manager, Analyst"
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
              name="access_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACCESS_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <div className="font-medium">{level.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {level.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the appropriate access level for this person
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
                  Revoke Access
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Grant Access"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}