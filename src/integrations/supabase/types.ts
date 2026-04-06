export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      broker_commissions: {
        Row: {
          commission_rate: number
          company_id: string
          created_at: string
          created_by: string | null
          fixed_commission: number
          id: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          fixed_commission?: number
          id?: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          fixed_commission?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_objectives: {
        Row: {
          broker_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          is_completed: boolean
          target_amount: number
          target_quantity: number
          updated_at: string
        }
        Insert: {
          broker_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          target_amount?: number
          target_quantity?: number
          updated_at?: string
        }
        Update: {
          broker_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          target_amount?: number
          target_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_objectives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_sales: {
        Row: {
          broker_id: string
          buyer_id: string | null
          commission_earned: number
          company_id: string
          created_at: string
          id: string
          quantity: number
          sale_method: string | null
          sale_price: number
        }
        Insert: {
          broker_id: string
          buyer_id?: string | null
          commission_earned?: number
          company_id: string
          created_at?: string
          id?: string
          quantity: number
          sale_method?: string | null
          sale_price: number
        }
        Update: {
          broker_id?: string
          buyer_id?: string | null
          commission_earned?: number
          company_id?: string
          created_at?: string
          id?: string
          quantity?: number
          sale_method?: string | null
          sale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "broker_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          available_shares: number
          city: string
          country: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          location: string
          logo_url: string | null
          name: string
          previous_price: number
          price_per_share: number
          registre_commerce: string
          sector: string
          total_shares: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          available_shares?: number
          city: string
          country: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          location?: string
          logo_url?: string | null
          name: string
          previous_price?: number
          price_per_share?: number
          registre_commerce: string
          sector: string
          total_shares?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          available_shares?: number
          city?: string
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          location?: string
          logo_url?: string | null
          name?: string
          previous_price?: number
          price_per_share?: number
          registre_commerce?: string
          sector?: string
          total_shares?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      p2p_listings: {
        Row: {
          buyer_id: string | null
          company_id: string
          created_at: string
          id: string
          price_per_share: number
          quantity: number
          seller_id: string
          sold_at: string | null
          status: Database["public"]["Enums"]["listing_status"]
          updated_at: string
          user_share_id: string
        }
        Insert: {
          buyer_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          price_per_share: number
          quantity: number
          seller_id: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
          user_share_id: string
        }
        Update: {
          buyer_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          price_per_share?: number
          quantity?: number
          seller_id?: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
          user_share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_listings_user_share_id_fkey"
            columns: ["user_share_id"]
            isOneToOne: false
            referencedRelation: "user_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_services: {
        Row: {
          contact: string
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          is_active: boolean
          name: string
          payment_link: string | null
          updated_at: string
        }
        Insert: {
          contact?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name: string
          payment_link?: string | null
          updated_at?: string
        }
        Update: {
          contact?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          payment_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          msn_id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          msn_id: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          msn_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          from_user_id: string
          id: string
          quantity: number
          status: Database["public"]["Enums"]["transfer_status"]
          to_user_id: string
          transfer_price: number
          user_share_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          from_user_id: string
          id?: string
          quantity: number
          status?: Database["public"]["Enums"]["transfer_status"]
          to_user_id: string
          transfer_price?: number
          user_share_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["transfer_status"]
          to_user_id?: string
          transfer_price?: number
          user_share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfers_user_share_id_fkey"
            columns: ["user_share_id"]
            isOneToOne: false
            referencedRelation: "user_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_shares: {
        Row: {
          company_id: string
          created_at: string
          id: string
          order_number: string
          purchase_date: string
          purchase_price: number
          quantity: number
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          order_number: string
          purchase_date?: string
          purchase_price: number
          quantity?: number
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          order_number?: string
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shares_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_contact: string | null
          payment_date: string | null
          payment_service_id: string | null
          payment_transaction_id: string | null
          processed_at: string | null
          processed_by: string | null
          recipient_msn_id: string | null
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_contact?: string | null
          payment_date?: string | null
          payment_service_id?: string | null
          payment_transaction_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          recipient_msn_id?: string | null
          recipient_user_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_contact?: string | null
          payment_date?: string | null
          payment_service_id?: string | null
          payment_transaction_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          recipient_msn_id?: string | null
          recipient_user_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_payment_service_id_fkey"
            columns: ["payment_service_id"]
            isOneToOne: false
            referencedRelation: "payment_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_msn_id: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "courtier"
        | "financier"
        | "moderateur"
        | "consultant"
        | "comptable"
        | "informaticien"
        | "communication"
        | "gestionnaire_entreprises"
        | "gestionnaire_achats"
        | "gestionnaire_utilisateurs"
      listing_status: "active" | "sold" | "cancelled"
      transaction_status: "pending" | "approved" | "rejected"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "purchase"
        | "sale"
        | "transfer"
      transfer_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "courtier",
        "financier",
        "moderateur",
        "consultant",
        "comptable",
        "informaticien",
        "communication",
        "gestionnaire_entreprises",
        "gestionnaire_achats",
        "gestionnaire_utilisateurs",
      ],
      listing_status: ["active", "sold", "cancelled"],
      transaction_status: ["pending", "approved", "rejected"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "purchase",
        "sale",
        "transfer",
      ],
      transfer_status: ["pending", "approved", "rejected"],
    },
  },
} as const
