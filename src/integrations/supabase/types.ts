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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
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
      certificate_secrets: {
        Row: {
          id: number
          secret: string
        }
        Insert: {
          id: number
          secret: string
        }
        Update: {
          id?: number
          secret?: string
        }
        Relationships: []
      }
      certificate_transfers: {
        Row: {
          company_id: string
          created_at: string
          from_certificate_id: string | null
          from_user_id: string | null
          id: string
          previous_hash: string | null
          price_fcfa: number
          quantity: number
          record_hash: string
          to_certificate_id: string | null
          to_user_id: string | null
          transfer_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          from_certificate_id?: string | null
          from_user_id?: string | null
          id?: string
          previous_hash?: string | null
          price_fcfa?: number
          quantity: number
          record_hash: string
          to_certificate_id?: string | null
          to_user_id?: string | null
          transfer_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          from_certificate_id?: string | null
          from_user_id?: string | null
          id?: string
          previous_hash?: string | null
          price_fcfa?: number
          quantity?: number
          record_hash?: string
          to_certificate_id?: string | null
          to_user_id?: string | null
          transfer_type?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          company_id: string
          current_owner_id: string
          id: string
          issued_at: string
          parent_certificate_id: string | null
          public_code: string
          qr_secret_hash: string
          quantity: number
          status: string
          superseded_at: string | null
          user_share_id: string | null
          version: number
        }
        Insert: {
          company_id: string
          current_owner_id: string
          id?: string
          issued_at?: string
          parent_certificate_id?: string | null
          public_code: string
          qr_secret_hash: string
          quantity: number
          status?: string
          superseded_at?: string | null
          user_share_id?: string | null
          version?: number
        }
        Update: {
          company_id?: string
          current_owner_id?: string
          id?: string
          issued_at?: string
          parent_certificate_id?: string | null
          public_code?: string
          qr_secret_hash?: string
          quantity?: number
          status?: string
          superseded_at?: string | null
          user_share_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_parent_certificate_id_fkey"
            columns: ["parent_certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
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
          is_frozen: boolean
          location: string
          logo_url: string | null
          name: string
          previous_price: number
          price_per_share: number
          registre_commerce: string
          requires_issuer_approval: boolean
          sector: string
          total_shares: number
          transfer_rules: string | null
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
          is_frozen?: boolean
          location?: string
          logo_url?: string | null
          name: string
          previous_price?: number
          price_per_share?: number
          registre_commerce: string
          requires_issuer_approval?: boolean
          sector: string
          total_shares?: number
          transfer_rules?: string | null
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
          is_frozen?: boolean
          location?: string
          logo_url?: string | null
          name?: string
          previous_price?: number
          price_per_share?: number
          registre_commerce?: string
          requires_issuer_approval?: boolean
          sector?: string
          total_shares?: number
          transfer_rules?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      company_media: {
        Row: {
          caption: string | null
          company_id: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          media_type: Database["public"]["Enums"]["company_media_type"]
          media_url: string
        }
        Insert: {
          caption?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          media_type?: Database["public"]["Enums"]["company_media_type"]
          media_url: string
        }
        Update: {
          caption?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          media_type?: Database["public"]["Enums"]["company_media_type"]
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_media_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          admin_note: string | null
          created_at: string
          doc_type: string
          file_path: string
          id: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          doc_type: string
          file_path: string
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          doc_type?: string
          file_path?: string
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
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
          city: string | null
          created_at: string
          first_name: string
          id: string
          is_frozen: boolean
          kyc_note: string | null
          kyc_status: string
          last_name: string
          msn_id: string
          phone: string | null
          risk_ack_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_frozen?: boolean
          kyc_note?: string | null
          kyc_status?: string
          last_name?: string
          msn_id: string
          phone?: string | null
          risk_ack_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_frozen?: boolean
          kyc_note?: string | null
          kyc_status?: string
          last_name?: string
          msn_id?: string
          phone?: string | null
          risk_ack_at?: string | null
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
      accept_risk_warning: { Args: never; Returns: string }
      admin_review_kyc: {
        Args: { _approve: boolean; _note: string; _user_id: string }
        Returns: undefined
      }
      assert_can_trade: { Args: { _user: string }; Returns: undefined }
      cert_token: { Args: { _cert_id: string }; Returns: string }
      compute_transfer_hash: {
        Args: {
          _at: string
          _from: string
          _prev: string
          _price: number
          _qty: number
          _to: string
        }
        Returns: string
      }
      generate_cert_code: { Args: never; Returns: string }
      generate_msn_id: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      get_company_transfer_history: {
        Args: { _company_id: string }
        Returns: {
          created_at: string
          from_label: string
          price_fcfa: number
          quantity: number
          record_hash: string
          to_label: string
          transfer_type: string
        }[]
      }
      get_my_certificate_token: { Args: { _cert_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      issue_certificate: {
        Args: {
          _company: string
          _from_user: string
          _owner: string
          _parent: string
          _price: number
          _qty: number
          _share: string
          _type: string
        }
        Returns: string
      }
      submit_kyc: { Args: never; Returns: undefined }
      verify_certificate: { Args: { _token: string }; Returns: Json }
      verify_chain: { Args: { _company_id: string }; Returns: Json }
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
      company_media_type: "logo" | "banner" | "photo" | "video"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      company_media_type: ["logo", "banner", "photo", "video"],
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
