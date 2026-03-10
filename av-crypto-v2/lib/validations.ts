import { z } from "zod";

// Holdings validation
export const holdingSchema = z.object({
  asset_id: z.string().min(1, "Asset is required"),
  custodian: z.string().min(1, "Custodian is required"),
  total_units: z.coerce.number().positive("Total units must be positive"),
  vested_units: z.coerce.number().optional().nullable(),
  unvested_units: z.coerce.number().optional().nullable(),
  unvested_status: z.string().optional().nullable(),
  wallet_address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type HoldingFormData = z.infer<typeof holdingSchema>;

// Trading Instructions validation
export const tradingInstructionSchema = z.object({
  asset_id: z.string().min(1, "Asset is required"),
  action: z.enum(["Buy", "Sell", "Hold"], {
    required_error: "Action is required",
  }),
  amount: z.string().min(1, "Amount is required"),
  timing: z.string().optional().nullable(),
  execution_notes: z.string().optional().nullable(),
  jira_ticket_id: z.string().optional().nullable(),
  status: z.enum(["Draft", "Approved", "Executed"]).default("Draft"),
});

export type TradingInstructionFormData = z.infer<typeof tradingInstructionSchema>;

// Event validation
export const eventSchema = z.object({
  asset_id: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  event_type: z.enum(["drop", "unlock", "planned_trade", "rec"], {
    required_error: "Event type is required",
  }),
  event_date: z.date({
    required_error: "Event date is required",
  }),
  description: z.string().optional().nullable(),
  jira_ticket_id: z.string().optional().nullable(),
  status: z.enum(["pending", "complete"]).default("pending"),
});

export type EventFormData = z.infer<typeof eventSchema>;

// Transaction validation
export const transactionSchema = z.object({
  asset_id: z.string().min(1, "Asset is required"),
  custodian: z.string().min(1, "Custodian is required"),
  type: z.enum(["trade", "transfer", "reward"], {
    required_error: "Transaction type is required",
  }),
  quantity: z.coerce.number({
    required_error: "Quantity is required",
  }),
  usd_cost_basis: z.coerce.number().optional().nullable(),
  jira_ticket_id: z.string().optional().nullable(),
  executed_at: z.date({
    required_error: "Execution date is required",
  }),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

// Custodian Access validation
export const custodianAccessSchema = z.object({
  custodian: z.string().min(1, "Custodian is required"),
  person_name: z.string().min(1, "Person name is required"),
  person_role: z.string().optional().nullable(),
  access_level: z.enum(["read", "transact", "admin", "two_touch"], {
    required_error: "Access level is required",
  }),
});

export type CustodianAccessFormData = z.infer<typeof custodianAccessSchema>;