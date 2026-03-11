export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      assets: {
        Row: {
          id: string;
          symbol: string;
          name: string;
          network: string | null;
          coingecko_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          name: string;
          network?: string | null;
          coingecko_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          name?: string;
          network?: string | null;
          coingecko_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      holdings: {
        Row: {
          id: string;
          asset_id: string;
          custodian: string;
          units: number;
          total_units: number;
          vested_units: number | null;
          unvested_units: number | null;
          unvested_status: string | null;
          wallet_address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          custodian: string;
          units?: number;
          total_units?: number;
          vested_units?: number | null;
          unvested_units?: number | null;
          unvested_status?: string | null;
          wallet_address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          custodian?: string;
          units?: number;
          total_units?: number;
          vested_units?: number | null;
          unvested_units?: number | null;
          unvested_status?: string | null;
          wallet_address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trading_instructions: {
        Row: {
          id: string;
          asset_id: string;
          action: string;
          amount: string;
          timing: string | null;
          execution_notes: string | null;
          jira_ticket_id: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          action: string;
          amount: string;
          timing?: string | null;
          execution_notes?: string | null;
          jira_ticket_id?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          action?: string;
          amount?: string;
          timing?: string | null;
          execution_notes?: string | null;
          jira_ticket_id?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          asset_id: string;
          custodian: string;
          type: string;
          quantity: number;
          usd_cost_basis: number | null;
          jira_ticket_id: string | null;
          executed_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          custodian: string;
          type: string;
          quantity: number;
          usd_cost_basis?: number | null;
          jira_ticket_id?: string | null;
          executed_at: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          custodian?: string;
          type?: string;
          quantity?: number;
          usd_cost_basis?: number | null;
          jira_ticket_id?: string | null;
          executed_at?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          asset_id: string | null;
          title: string;
          event_type: string;
          event_date: string;
          status: string;
          description: string | null;
          jira_ticket_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_id?: string | null;
          title: string;
          event_type: string;
          event_date: string;
          status?: string;
          description?: string | null;
          jira_ticket_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string | null;
          title?: string;
          event_type?: string;
          event_date?: string;
          status?: string;
          description?: string | null;
          jira_ticket_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      custodian_access: {
        Row: {
          id: string;
          custodian: string;
          person_name: string;
          person_role: string | null;
          access_level: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          custodian: string;
          person_name: string;
          person_role?: string | null;
          access_level: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          custodian?: string;
          person_name?: string;
          person_role?: string | null;
          access_level?: string;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
      };
      custodian_api_keys: {
        Row: {
          id: string;
          custodian: string;
          key_masked: string | null;
          status: string;
          last_tested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          custodian: string;
          key_masked?: string | null;
          status?: string;
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          custodian?: string;
          key_masked?: string | null;
          status?: string;
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      asset_prices: {
        Row: {
          id: string;
          symbol: string;
          current_price: number | null;
          change_24h: number | null;
          last_updated: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          current_price?: number | null;
          change_24h?: number | null;
          last_updated?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          current_price?: number | null;
          change_24h?: number | null;
          last_updated?: string;
        };
      };
    };
    Views: {
      consolidated_assets: {
        Row: {
          id: string;
          symbol: string;
          name: string;
          network: string | null;
          coingecko_id: string | null;
          total_units: number;
          custodian_count: number;
        };
      };
      holdings_with_asset: {
        Row: {
          id: string;
          asset_id: string;
          custodian: string;
          units: number;
          total_units: number;
          vested_units: number | null;
          unvested_units: number | null;
          unvested_status: string | null;
          wallet_address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          symbol: string;
          asset_name: string;
          network: string | null;
        };
      };
    };
    Functions: {
      get_user_role: {
        Args: { check_user_id: string };
        Returns: string;
      };
    };
  };
}