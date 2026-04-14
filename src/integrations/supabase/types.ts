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
      activity_log: {
        Row: {
          brand_id: string | null
          brand_name: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          title: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          brand_id?: string | null
          brand_name?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          title: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          brand_id?: string | null
          brand_name?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          brand_id: string
          comment: string | null
          created_at: string
          id: string
          kind: string
          ref_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          status: string
          submitted_by: string
          submitted_by_name: string | null
          subtitle: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          comment?: string | null
          created_at?: string
          id?: string
          kind: string
          ref_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
          submitted_by: string
          submitted_by_name?: string | null
          subtitle?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          kind?: string
          ref_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
          submitted_by?: string
          submitted_by_name?: string | null
          subtitle?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          brand_id: string
          category: string
          created_at: string
          id: string
          metadata: Json | null
          name: string
          size: number | null
          source: string
          storage_path: string | null
          tags: string[] | null
          type: string
          updated_at: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          brand_id: string
          category: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          size?: number | null
          source?: string
          storage_path?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          brand_id?: string
          category?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          size?: number | null
          source?: string
          storage_path?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_members: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          audience: string | null
          created_at: string
          custom_domain: string | null
          fonts: Json | null
          guidelines: Json | null
          id: string
          is_public: boolean | null
          logo_assets: Json | null
          logo_url: string | null
          name: string
          primary_color: string
          public_url: string | null
          secondary_color: string | null
          slug: string
          strategy: string | null
          tone: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          audience?: string | null
          created_at?: string
          custom_domain?: string | null
          fonts?: Json | null
          guidelines?: Json | null
          id?: string
          is_public?: boolean | null
          logo_assets?: Json | null
          logo_url?: string | null
          name: string
          primary_color: string
          public_url?: string | null
          secondary_color?: string | null
          slug: string
          strategy?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          audience?: string | null
          created_at?: string
          custom_domain?: string | null
          fonts?: Json | null
          guidelines?: Json | null
          id?: string
          is_public?: boolean | null
          logo_assets?: Json | null
          logo_url?: string | null
          name?: string
          primary_color?: string
          public_url?: string | null
          secondary_color?: string | null
          slug?: string
          strategy?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          anchor: string | null
          author_email: string | null
          author_id: string
          author_name: string
          body: string
          brand_id: string
          created_at: string
          id: string
          mentions: string[] | null
          page_key: string
          parent_id: string | null
          resolved: boolean | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          anchor?: string | null
          author_email?: string | null
          author_id: string
          author_name: string
          body: string
          brand_id: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          page_key: string
          parent_id?: string | null
          resolved?: boolean | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          anchor?: string | null
          author_email?: string | null
          author_id?: string
          author_name?: string
          body?: string
          brand_id?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          page_key?: string
          parent_id?: string | null
          resolved?: boolean | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      early_access: {
        Row: {
          created_at: string
          email: string
          id: string
          interesting_feature: string | null
          name: string | null
          role: string | null
          source: string | null
          tester_interest: string | null
          use_case: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interesting_feature?: string | null
          name?: string | null
          role?: string | null
          source?: string | null
          tester_interest?: string | null
          use_case?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interesting_feature?: string | null
          name?: string | null
          role?: string | null
          source?: string | null
          tester_interest?: string | null
          use_case?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      guideline_presentations: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string | null
          export_settings: Json | null
          id: string
          is_published: boolean | null
          layout_type: string | null
          published_at: string | null
          slide_order: string[] | null
          slides: Json | null
          theme_settings: Json | null
          title: string
          updated_at: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          description?: string | null
          export_settings?: Json | null
          id?: string
          is_published?: boolean | null
          layout_type?: string | null
          published_at?: string | null
          slide_order?: string[] | null
          slides?: Json | null
          theme_settings?: Json | null
          title?: string
          updated_at?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          export_settings?: Json | null
          id?: string
          is_published?: boolean | null
          layout_type?: string | null
          published_at?: string | null
          slide_order?: string[] | null
          slides?: Json | null
          theme_settings?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guideline_presentations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      guideline_slides: {
        Row: {
          background_color: string | null
          content: Json | null
          created_at: string | null
          custom_styles: Json | null
          id: string
          is_enabled: boolean | null
          is_locked: boolean | null
          order_index: number
          presentation_id: string
          slide_type: string
          subtitle: string | null
          text_color: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          content?: Json | null
          created_at?: string | null
          custom_styles?: Json | null
          id?: string
          is_enabled?: boolean | null
          is_locked?: boolean | null
          order_index?: number
          presentation_id: string
          slide_type: string
          subtitle?: string | null
          text_color?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          content?: Json | null
          created_at?: string | null
          custom_styles?: Json | null
          id?: string
          is_enabled?: boolean | null
          is_locked?: boolean | null
          order_index?: number
          presentation_id?: string
          slide_type?: string
          subtitle?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guideline_slides_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "guideline_presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          currency: string
          id: string
          invoice_pdf: string | null
          invoice_url: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_invoice_id: string
          workspace_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          currency?: string
          id?: string
          invoice_pdf?: string | null
          invoice_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status: string
          stripe_invoice_id: string
          workspace_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_pdf?: string | null
          invoice_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          brand_id: string | null
          created_at: string
          href: string | null
          id: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          brand_id?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          brand_id?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_answers: {
        Row: {
          answers: Json
          completed: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          id: string
          metric: string
          period_end: string
          period_start: string
          updated_at: string
          value: number
          workspace_id: string
        }
        Insert: {
          id?: string
          metric: string
          period_end: string
          period_start: string
          updated_at?: string
          value?: number
          workspace_id: string
        }
        Update: {
          id?: string
          metric?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          value?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_brand_slug: {
        Args: { brand_id?: string; brand_name: string }
        Returns: string
      }
      get_brand_workspace_id: { Args: { _brand_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_brand_member: {
        Args: {
          _brand_id: string
          _min_role?: Database["public"]["Enums"]["workspace_role"]
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: {
          _min_role?: Database["public"]["Enums"]["workspace_role"]
          _workspace_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      workspace_role: "owner" | "admin" | "editor" | "exporter" | "viewer"
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
      app_role: ["admin", "user"],
      workspace_role: ["owner", "admin", "editor", "exporter", "viewer"],
    },
  },
} as const
