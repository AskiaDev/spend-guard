export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          currency: string;
          monthly_income: number;
          current_savings: number;
          emergency_fund_target: number;
          emergency_buffer: number;
          cooldown_preference: string;
          intent: string[];
          spending_pain_points: string[];
          full_name: string | null;
          pay_frequency: string;
          estimated_variable_expenses: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          currency?: string;
          monthly_income: number;
          current_savings: number;
          emergency_fund_target: number;
          emergency_buffer?: number;
          cooldown_preference?: string;
          intent?: string[];
          spending_pain_points?: string[];
          full_name?: string | null;
          pay_frequency?: string;
          estimated_variable_expenses?: number;
          onboarding_completed?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          amount: number;
          due_day: number;
          is_recurring: boolean;
          payment_cadence: string;
          next_due_date: string | null;
          second_due_day: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          label: string;
          amount: number;
          due_day: number;
          is_recurring?: boolean;
          payment_cadence?: string;
          next_due_date?: string | null;
          second_due_day?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          outstanding_balance: number;
          minimum_payment: number;
          due_day: number;
          interest_rate: number | null;
          payment_cadence: string;
          next_due_date: string | null;
          second_due_day: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          label: string;
          outstanding_balance: number;
          minimum_payment: number;
          due_day: number;
          interest_rate?: number | null;
          payment_cadence?: string;
          next_due_date?: string | null;
          second_due_day?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["debts"]["Insert"]>;
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          target_amount: number;
          saved_amount: number;
          monthly_contribution: number;
          target_date: string | null;
          priority: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          label: string;
          target_amount: number;
          saved_amount: number;
          monthly_contribution: number;
          target_date?: string | null;
          priority?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
        Relationships: [];
      };
      purchase_checks: {
        Row: {
          id: string;
          user_id: string;
          item_name: string;
          amount: number;
          category: string | null;
          sale_deadline: string | null;
          location: string | null;
          notes: string | null;
          urgency: string;
          payment_method: string;
          down_payment: number | null;
          installment_months: number | null;
          monthly_payment: number | null;
          is_income_generating: boolean;
          current_alternative_still_works: boolean;
          decision: string;
          risk_score: number;
          safe_to_spend: number;
          monthly_free_cash_flow: number;
          savings_after_purchase: number;
          emergency_fund_progress: number;
          debt_pressure: number;
          goal_delay_months: number;
          health_score: number;
          cooldown_days: number;
          status: string;
          advisor_text: string;
          reasons: Json;
          created_at: string;
        };
        Insert: {
          user_id: string;
          item_name: string;
          amount: number;
          category?: string | null;
          sale_deadline?: string | null;
          location?: string | null;
          notes?: string | null;
          urgency: string;
          payment_method: string;
          down_payment?: number | null;
          installment_months?: number | null;
          monthly_payment?: number | null;
          is_income_generating?: boolean;
          current_alternative_still_works?: boolean;
          decision: string;
          risk_score: number;
          safe_to_spend: number;
          monthly_free_cash_flow: number;
          savings_after_purchase: number;
          emergency_fund_progress?: number;
          debt_pressure?: number;
          goal_delay_months?: number;
          health_score?: number;
          cooldown_days: number;
          status?: string;
          advisor_text: string;
          reasons: Json;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_checks"]["Insert"]>;
        Relationships: [];
      };
      cooldown_items: {
        Row: {
          id: string;
          user_id: string;
          item_name: string;
          amount: number;
          urgency: string;
          payment_method: string;
          source_check_id: string | null;
          added_at: string;
          recheck_at: string;
          down_payment: number | null;
          installment_months: number | null;
          monthly_payment: number | null;
          is_income_generating: boolean;
          current_alternative_still_works: boolean;
          baseline_decision: string | null;
          baseline_risk_score: number | null;
          baseline_safe_to_spend: number | null;
        };
        Insert: {
          user_id: string;
          item_name: string;
          amount: number;
          urgency: string;
          payment_method: string;
          source_check_id?: string | null;
          recheck_at: string;
          down_payment?: number | null;
          installment_months?: number | null;
          monthly_payment?: number | null;
          is_income_generating?: boolean;
          current_alternative_still_works?: boolean;
          baseline_decision?: string | null;
          baseline_risk_score?: number | null;
          baseline_safe_to_spend?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["cooldown_items"]["Insert"]>;
        Relationships: [];
      };
      weekly_reports: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          summary: string;
          health_score: number;
          safe_to_spend: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          week_start: string;
          summary: string;
          health_score: number;
          safe_to_spend: number;
        };
        Update: Partial<Database["public"]["Tables"]["weekly_reports"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          label: string;
          created_at: string;
          occurred_at: string | null;
          direction: string | null;
          category: string | null;
          counterparty: string | null;
          source: string | null;
          source_ref: string | null;
          confidence: number | null;
          status: string;
          raw_extract: Json | null;
        };
        Insert: {
          user_id: string;
          amount: number;
          label: string;
          occurred_at?: string | null;
          direction?: string | null;
          category?: string | null;
          counterparty?: string | null;
          source?: string | null;
          source_ref?: string | null;
          confidence?: number | null;
          status?: string;
          raw_extract?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
      voice_sessions: {
        Row: { id: string; user_id: string; transcript: string; extracted_fields: Json; created_at: string };
        Insert: { user_id: string; transcript: string; extracted_fields: Json };
        Update: Partial<Database["public"]["Tables"]["voice_sessions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
