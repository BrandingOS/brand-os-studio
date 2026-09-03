export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          attempts: number
          cancelled_at: string | null
          email: string
          grace_days: number
          id: string
          last_error: string | null
          outcome: Json | null
          purge_after: string
          purge_started_at: string | null
          purged_at: string | null
          reason: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          cancelled_at?: string | null
          email: string
          grace_days?: number
          id?: string
          last_error?: string | null
          outcome?: Json | null
          purge_after: string
          purge_started_at?: string | null
          purged_at?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          cancelled_at?: string | null
          email?: string
          grace_days?: number
          id?: string
          last_error?: string | null
          outcome?: Json | null
          purge_after?: string
          purge_started_at?: string | null
          purged_at?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
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
      ai_rate_limits: {
        Row: {
          called_at: string
          cost_estimate_usd: number | null
          function_name: string
          id: number
          input_tokens: number | null
          ip_address: unknown
          model: string | null
          output_tokens: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          called_at?: string
          cost_estimate_usd?: number | null
          function_name: string
          id?: number
          input_tokens?: number | null
          ip_address?: unknown
          model?: string | null
          output_tokens?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          called_at?: string
          cost_estimate_usd?: number | null
          function_name?: string
          id?: number
          input_tokens?: number | null
          ip_address?: unknown
          model?: string | null
          output_tokens?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          brand_id: string | null
          created_at: string
          credits_charged: number
          id: number
          image_count: number | null
          image_size: string | null
          input_tokens: number | null
          job_id: string | null
          latency_ms: number | null
          model: string | null
          operation: string | null
          output_tokens: number | null
          pricing_snapshot: Json | null
          pricing_version: string | null
          provider: string | null
          provider_cost_usd: number | null
          reservation_id: string | null
          status: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          credits_charged?: number
          id?: number
          image_count?: number | null
          image_size?: string | null
          input_tokens?: number | null
          job_id?: string | null
          latency_ms?: number | null
          model?: string | null
          operation?: string | null
          output_tokens?: number | null
          pricing_snapshot?: Json | null
          pricing_version?: string | null
          provider?: string | null
          provider_cost_usd?: number | null
          reservation_id?: string | null
          status?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          credits_charged?: number
          id?: number
          image_count?: number | null
          image_size?: string | null
          input_tokens?: number | null
          job_id?: string | null
          latency_ms?: number | null
          model?: string | null
          operation?: string | null
          output_tokens?: number | null
          pricing_snapshot?: Json | null
          pricing_version?: string | null
          provider?: string | null
          provider_cost_usd?: number | null
          reservation_id?: string | null
          status?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          workspace_id: string
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
          workspace_id: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      assets: {
        Row: {
          archived_at: string | null
          brand_id: string
          category: string
          created_at: string
          deleted_at: string | null
          folder_id: string | null
          id: string
          is_disliked: boolean
          is_favorite: boolean
          legacy_ref_id: string | null
          metadata: Json | null
          name: string
          origin: string
          provenance: Json | null
          size: number | null
          source: string
          storage_path: string | null
          tags: string[] | null
          type: string
          updated_at: string
          uploaded_by: string | null
          url: string
          use_as_reference: boolean
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          brand_id: string
          category: string
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          is_disliked?: boolean
          is_favorite?: boolean
          legacy_ref_id?: string | null
          metadata?: Json | null
          name: string
          origin?: string
          provenance?: Json | null
          size?: number | null
          source?: string
          storage_path?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string
          uploaded_by?: string | null
          url: string
          use_as_reference?: boolean
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          brand_id?: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          is_disliked?: boolean
          is_favorite?: boolean
          legacy_ref_id?: string | null
          metadata?: Json | null
          name?: string
          origin?: string
          provenance?: Json | null
          size?: number | null
          source?: string
          storage_path?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          use_as_reference?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "assets_folder_fk"
            columns: ["folder_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "brand_folders"
            referencedColumns: ["id", "brand_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          after: Json | null
          before: Json | null
          brand_id: string | null
          created_at: string
          id: number
          ip: unknown
          metadata: Json | null
          target_id: string | null
          target_kind: string | null
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind?: string
          after?: Json | null
          before?: Json | null
          brand_id?: string | null
          created_at?: string
          id?: number
          ip?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_kind?: string | null
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          after?: Json | null
          before?: Json | null
          brand_id?: string | null
          created_at?: string
          id?: number
          ip?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_kind?: string | null
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      billing_archive: {
        Row: {
          amount_paid: number
          currency: string
          id: string
          invoice_created_at: string | null
          period_end: string | null
          period_start: string | null
          purged_at: string
          status: string
          stripe_invoice_id: string
        }
        Insert: {
          amount_paid: number
          currency: string
          id?: string
          invoice_created_at?: string | null
          period_end?: string | null
          period_start?: string | null
          purged_at?: string
          status: string
          stripe_invoice_id: string
        }
        Update: {
          amount_paid?: number
          currency?: string
          id?: string
          invoice_created_at?: string | null
          period_end?: string | null
          period_start?: string | null
          purged_at?: string
          status?: string
          stripe_invoice_id?: string
        }
        Relationships: []
      }
      brand_access: {
        Row: {
          brand_id: string
          capability_overrides: Json
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["brand_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          brand_id: string
          capability_overrides?: Json
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["brand_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          brand_id?: string
          capability_overrides?: Json
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["brand_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_access_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "brand_access_membership_fk"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_member_state"
            referencedColumns: ["workspace_id", "user_id"]
          },
          {
            foreignKeyName: "brand_access_membership_fk"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
        ]
      }
      brand_context_signals: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          kind: string
          source: string
          target_kind: string | null
          target_ref: string | null
          value: Json | null
          workspace_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          kind: string
          source: string
          target_kind?: string | null
          target_ref?: string | null
          value?: Json | null
          workspace_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          kind?: string
          source?: string
          target_kind?: string | null
          target_ref?: string | null
          value?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_context_signals_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      brand_folders: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_folders_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "brand_folders_parent_same_brand"
            columns: ["parent_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "brand_folders"
            referencedColumns: ["id", "brand_id"]
          },
        ]
      }
      brand_identity_publications: {
        Row: {
          brand_id: string
          brand_name: string
          published_at: string
          published_by: string | null
          snapshot: Json
          token: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_id: string
          brand_name: string
          published_at?: string
          published_by?: string | null
          snapshot: Json
          token: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_id?: string
          brand_name?: string
          published_at?: string
          published_by?: string | null
          snapshot?: Json
          token?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_identity_publications_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      brand_kit_adoptions: {
        Row: {
          adopted_at: string
          adopted_by: string
          brand_id: string
          id: string
          note: string | null
          target_kind: string
          target_ref: string
          workspace_id: string
        }
        Insert: {
          adopted_at?: string
          adopted_by: string
          brand_id: string
          id?: string
          note?: string | null
          target_kind: string
          target_ref: string
          workspace_id: string
        }
        Update: {
          adopted_at?: string
          adopted_by?: string
          brand_id?: string
          id?: string
          note?: string | null
          target_kind?: string
          target_ref?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_adoptions_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      brand_kit_state: {
        Row: {
          brand_id: string
          state: Json
          updated_at: string
          updated_by: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          brand_id: string
          state?: Json
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id: string
        }
        Update: {
          brand_id?: string
          state?: Json
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_state_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      brands: {
        Row: {
          archived_at: string | null
          audience: string | null
          brand_assets: Json | null
          business_info: Json | null
          created_at: string
          custom_domain: string | null
          fonts: Json | null
          guidelines: Json | null
          id: string
          identity: Json | null
          identity_meta: Json | null
          identity_schema_version: number | null
          is_public: boolean | null
          logo_assets: Json | null
          logo_system: Json | null
          logo_url: string | null
          name: string
          onboarding: Json | null
          primary_color: string
          public_url: string | null
          secondary_color: string | null
          slug: string
          strategy: string | null
          tone: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
          workspace_card: Json | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          audience?: string | null
          brand_assets?: Json | null
          business_info?: Json | null
          created_at?: string
          custom_domain?: string | null
          fonts?: Json | null
          guidelines?: Json | null
          id?: string
          identity?: Json | null
          identity_meta?: Json | null
          identity_schema_version?: number | null
          is_public?: boolean | null
          logo_assets?: Json | null
          logo_system?: Json | null
          logo_url?: string | null
          name: string
          onboarding?: Json | null
          primary_color: string
          public_url?: string | null
          secondary_color?: string | null
          slug: string
          strategy?: string | null
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
          workspace_card?: Json | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          audience?: string | null
          brand_assets?: Json | null
          business_info?: Json | null
          created_at?: string
          custom_domain?: string | null
          fonts?: Json | null
          guidelines?: Json | null
          id?: string
          identity?: Json | null
          identity_meta?: Json | null
          identity_schema_version?: number | null
          is_public?: boolean | null
          logo_assets?: Json | null
          logo_system?: Json | null
          logo_url?: string | null
          name?: string
          onboarding?: Json | null
          primary_color?: string
          public_url?: string | null
          secondary_color?: string | null
          slug?: string
          strategy?: string | null
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
          workspace_card?: Json | null
          workspace_id?: string
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
          workspace_id: string
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
          workspace_id: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
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
      credit_accounts: {
        Row: {
          balance_credits: number
          created_at: string
          lifetime_granted: number
          lifetime_spent: number
          reserved_credits: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          balance_credits?: number
          created_at?: string
          lifetime_granted?: number
          lifetime_spent?: number
          reserved_credits?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          balance_credits?: number
          created_at?: string
          lifetime_granted?: number
          lifetime_spent?: number
          reserved_credits?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: number
          idempotency_key: string | null
          job_id: string | null
          kind: Database["public"]["Enums"]["credit_entry_kind"]
          meta: Json | null
          reason: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          id?: number
          idempotency_key?: string | null
          job_id?: string | null
          kind: Database["public"]["Enums"]["credit_entry_kind"]
          meta?: Json | null
          reason?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: number
          idempotency_key?: string | null
          job_id?: string | null
          kind?: Database["public"]["Enums"]["credit_entry_kind"]
          meta?: Json | null
          reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "image_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_reservations: {
        Row: {
          amount: number
          brand_id: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string | null
          purpose: string
          ref_id: string | null
          ref_kind: string | null
          resolved_at: string | null
          status: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          brand_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key?: string | null
          purpose?: string
          ref_id?: string | null
          ref_kind?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          brand_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string | null
          purpose?: string
          ref_id?: string | null
          ref_kind?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_reservations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          brand_id: string
          content_type: string | null
          created_at: string
          data: Json
          family_id: string | null
          folder_id: string | null
          height: number | null
          id: string
          is_template: boolean
          name: string | null
          source_design_id: string | null
          source_template_id: string | null
          thumbnail_url: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
          width: number | null
          workspace_id: string
        }
        Insert: {
          brand_id: string
          content_type?: string | null
          created_at?: string
          data?: Json
          family_id?: string | null
          folder_id?: string | null
          height?: number | null
          id: string
          is_template?: boolean
          name?: string | null
          source_design_id?: string | null
          source_template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
          width?: number | null
          workspace_id: string
        }
        Update: {
          brand_id?: string
          content_type?: string | null
          created_at?: string
          data?: Json
          family_id?: string | null
          folder_id?: string | null
          height?: number | null
          id?: string
          is_template?: boolean
          name?: string | null
          source_design_id?: string | null
          source_template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "designs_folder_fk"
            columns: ["folder_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "brand_folders"
            referencedColumns: ["id", "brand_id"]
          },
        ]
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
          workspace_id: string
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
          workspace_id: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guideline_presentations_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
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
            foreignKeyName: "fk_presentation"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "guideline_presentations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guideline_slides_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "guideline_presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      image_generation_job_diagnostics: {
        Row: {
          created_at: string
          detail: Json | null
          job_id: string
          provider_error: string | null
          provider_status: number | null
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          job_id: string
          provider_error?: string | null
          provider_status?: number | null
        }
        Update: {
          created_at?: string
          detail?: Json | null
          job_id?: string
          provider_error?: string | null
          provider_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "image_generation_job_diagnostics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "image_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      image_generation_jobs: {
        Row: {
          brand_id: string
          charged_credits: number
          compiled_prompt: string | null
          completed_at: string | null
          cost_source: string | null
          cost_usd: number | null
          created_at: string
          design_id: string | null
          error_code: string | null
          error_message: string | null
          estimated_credits: number
          id: string
          idempotency_key: string | null
          input_assets: Json
          latency_ms: number | null
          model: string
          negative_prompt: string | null
          operation: string
          output_assets: Json
          pricing_snapshot: Json | null
          pricing_version: string | null
          project_id: string | null
          provider: string
          provider_request_id: string | null
          settings: Json
          started_at: string | null
          status: Database["public"]["Enums"]["generation_job_status"]
          usage: Json | null
          user_id: string
          user_prompt: string
          workspace_id: string
        }
        Insert: {
          brand_id: string
          charged_credits?: number
          compiled_prompt?: string | null
          completed_at?: string | null
          cost_source?: string | null
          cost_usd?: number | null
          created_at?: string
          design_id?: string | null
          error_code?: string | null
          error_message?: string | null
          estimated_credits?: number
          id?: string
          idempotency_key?: string | null
          input_assets?: Json
          latency_ms?: number | null
          model: string
          negative_prompt?: string | null
          operation?: string
          output_assets?: Json
          pricing_snapshot?: Json | null
          pricing_version?: string | null
          project_id?: string | null
          provider: string
          provider_request_id?: string | null
          settings?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_job_status"]
          usage?: Json | null
          user_id: string
          user_prompt: string
          workspace_id: string
        }
        Update: {
          brand_id?: string
          charged_credits?: number
          compiled_prompt?: string | null
          completed_at?: string | null
          cost_source?: string | null
          cost_usd?: number | null
          created_at?: string
          design_id?: string | null
          error_code?: string | null
          error_message?: string | null
          estimated_credits?: number
          id?: string
          idempotency_key?: string | null
          input_assets?: Json
          latency_ms?: number | null
          model?: string
          negative_prompt?: string | null
          operation?: string
          output_assets?: Json
          pricing_snapshot?: Json | null
          pricing_version?: string | null
          project_id?: string | null
          provider?: string
          provider_request_id?: string | null
          settings?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_job_status"]
          usage?: Json | null
          user_id?: string
          user_prompt?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_generation_jobs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_generation_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "image_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_generation_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      image_projects: {
        Row: {
          archived_at: string | null
          brand_id: string
          cover_url: string | null
          created_at: string
          id: string
          last_settings: Json
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          brand_id: string
          cover_url?: string | null
          created_at?: string
          id?: string
          last_settings?: Json
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          brand_id?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          last_settings?: Json
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_projects_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "image_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      migration_log: {
        Row: {
          action: string
          created_at: string
          detail: Json | null
          id: number
          target_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json | null
          id?: number
          target_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json | null
          id?: number
          target_id?: string | null
        }
        Relationships: []
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
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
      plan_entitlements: {
        Row: {
          key: string
          plan_key: string
          value: number
        }
        Insert: {
          key: string
          plan_key: string
          value: number
        }
        Update: {
          key?: string
          plan_key?: string
          value?: number
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_sign_in: string | null
          status: string
          suspension_reason: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          last_sign_in?: string | null
          status?: string
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_sign_in?: string | null
          status?: string
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_capabilities: {
        Row: {
          capability: string
          role: string
          scope: string
        }
        Insert: {
          capability: string
          role: string
          scope: string
        }
        Update: {
          capability?: string
          role?: string
          scope?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          allow_download: boolean
          brand_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          password_hash: string | null
          revoked_at: string | null
          revoked_by: string | null
          target_id: string | null
          target_kind: Database["public"]["Enums"]["share_target"]
          token_hash: string
          view_count: number
          workspace_id: string
        }
        Insert: {
          allow_download?: boolean
          brand_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          password_hash?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          target_id?: string | null
          target_kind: Database["public"]["Enums"]["share_target"]
          token_hash: string
          view_count?: number
          workspace_id: string
        }
        Update: {
          allow_download?: boolean
          brand_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          password_hash?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          target_id?: string | null
          target_kind?: Database["public"]["Enums"]["share_target"]
          token_hash?: string
          view_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_brand_workspace_fk"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
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
      user_preferences: {
        Row: {
          created_at: string
          preferences: Json
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          preferences?: Json
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_entitlement_overrides: {
        Row: {
          created_at: string
          key: string
          reason: string | null
          set_by: string | null
          value: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          key: string
          reason?: string | null
          set_by?: string | null
          value: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          key?: string
          reason?: string | null
          set_by?: string | null
          value?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_entitlement_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          brand_access_mode: Database["public"]["Enums"]["brand_access_mode"]
          brand_grants: Json
          capability_overrides: Json
          created_at: string
          default_brand_role: Database["public"]["Enums"]["brand_role"] | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          message: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["workspace_role_v2"]
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          brand_access_mode: Database["public"]["Enums"]["brand_access_mode"]
          brand_grants?: Json
          capability_overrides?: Json
          created_at?: string
          default_brand_role?: Database["public"]["Enums"]["brand_role"] | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          message?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["workspace_role_v2"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          brand_access_mode?: Database["public"]["Enums"]["brand_access_mode"]
          brand_grants?: Json
          capability_overrides?: Json
          created_at?: string
          default_brand_role?: Database["public"]["Enums"]["brand_role"] | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          message?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role_v2"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          brand_access_mode: Database["public"]["Enums"]["brand_access_mode"]
          capability_overrides: Json
          created_at: string
          credits_monthly_cap: number | null
          default_brand_role: Database["public"]["Enums"]["brand_role"] | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["workspace_role_v2"]
          status: Database["public"]["Enums"]["member_status"]
          suspend_reason: string | null
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          brand_access_mode?: Database["public"]["Enums"]["brand_access_mode"]
          capability_overrides?: Json
          created_at?: string
          credits_monthly_cap?: number | null
          default_brand_role?: Database["public"]["Enums"]["brand_role"] | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role_v2"]
          status?: Database["public"]["Enums"]["member_status"]
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          brand_access_mode?: Database["public"]["Enums"]["brand_access_mode"]
          capability_overrides?: Json
          created_at?: string
          credits_monthly_cap?: number | null
          default_brand_role?: Database["public"]["Enums"]["brand_role"] | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role_v2"]
          status?: Database["public"]["Enums"]["member_status"]
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
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
          deleted_at: string | null
          id: string
          is_personal: boolean
          logo_url: string | null
          name: string
          owner_id: string
          settings: Json
          slug: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_personal?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          settings?: Json
          slug: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_personal?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          settings?: Json
          slug?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      brand_members_legacy: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string | null
          role: Database["public"]["Enums"]["workspace_role"] | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string | null
          role?: never
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string | null
          role?: never
          user_id?: string | null
        }
        Relationships: []
      }
      workspace_member_state: {
        Row: {
          brand_access_mode:
            | Database["public"]["Enums"]["brand_access_mode"]
            | null
          capability_overrides: Json | null
          credits_monthly_cap: number | null
          default_brand_role: Database["public"]["Enums"]["brand_role"] | null
          id: string | null
          role: Database["public"]["Enums"]["workspace_role_v2"] | null
          status: Database["public"]["Enums"]["member_status"] | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          brand_access_mode?:
            | Database["public"]["Enums"]["brand_access_mode"]
            | null
          capability_overrides?: Json | null
          credits_monthly_cap?: number | null
          default_brand_role?: Database["public"]["Enums"]["brand_role"] | null
          id?: string | null
          role?: Database["public"]["Enums"]["workspace_role_v2"] | null
          status?: Database["public"]["Enums"]["member_status"] | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          brand_access_mode?:
            | Database["public"]["Enums"]["brand_access_mode"]
            | null
          capability_overrides?: Json | null
          credits_monthly_cap?: number | null
          default_brand_role?: Database["public"]["Enums"]["brand_role"] | null
          id?: string | null
          role?: Database["public"]["Enums"]["workspace_role_v2"] | null
          status?: Database["public"]["Enums"]["member_status"] | null
          user_id?: string | null
          workspace_id?: string | null
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
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: Json }
      account_deletion_grace_days: { Args: never; Returns: number }
      account_deletion_preview: { Args: never; Returns: Json }
      archive_brand: {
        Args: { _archived: boolean; _brand_id: string }
        Returns: undefined
      }
      assert_capability: {
        Args: { _brand_id?: string; _capability: string; _workspace_id: string }
        Returns: undefined
      }
      assert_limit: {
        Args: { _adding?: number; _key: string; _workspace_id: string }
        Returns: undefined
      }
      brand_people: { Args: { _brand_id: string }; Returns: Json }
      brands_with_capability: {
        Args: { _capability: string }
        Returns: string[]
      }
      can_edit_brand: { Args: { _brand_id: string }; Returns: boolean }
      can_view_brand: { Args: { _brand_id: string }; Returns: boolean }
      cancel_account_deletion: {
        Args: never
        Returns: {
          attempts: number
          cancelled_at: string | null
          email: string
          grace_days: number
          id: string
          last_error: string | null
          outcome: Json | null
          purge_after: string
          purge_started_at: string | null
          purged_at: string | null
          reason: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_deletion_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_generation_job: { Args: { _job_id: string }; Returns: Json }
      check_limit: {
        Args: { _adding?: number; _key: string; _workspace_id: string }
        Returns: Json
      }
      claim_due_account_deletions: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          cancelled_at: string | null
          email: string
          grace_days: number
          id: string
          last_error: string | null
          outcome: Json | null
          purge_after: string
          purge_started_at: string | null
          purged_at: string | null
          reason: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "account_deletion_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_invitation: {
        Args: {
          _brand_grants?: Json
          _default_brand_role?: Database["public"]["Enums"]["brand_role"]
          _email: string
          _message?: string
          _mode?: Database["public"]["Enums"]["brand_access_mode"]
          _overrides?: Json
          _role: Database["public"]["Enums"]["workspace_role_v2"]
          _workspace_id: string
        }
        Returns: Json
      }
      create_share_link: {
        Args: {
          _allow_download?: boolean
          _brand_id: string
          _expires_at?: string
          _password?: string
          _target_id?: string
          _target_kind: Database["public"]["Enums"]["share_target"]
        }
        Returns: Json
      }
      create_workspace: {
        Args: { _name: string; _slug?: string }
        Returns: string
      }
      default_credit_grant: { Args: never; Returns: number }
      effective_capabilities: {
        Args: { _brand_id?: string; _user_id: string; _workspace_id: string }
        Returns: string[]
      }
      ensure_credit_account: {
        Args: { _workspace_id: string }
        Returns: {
          balance_credits: number
          created_at: string
          lifetime_granted: number
          lifetime_spent: number
          reserved_credits: number
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      entitlement: {
        Args: { _key: string; _workspace_id: string }
        Returns: number
      }
      entitlement_usage: {
        Args: { _key: string; _workspace_id: string }
        Returns: number
      }
      expire_stale_reservations: { Args: never; Returns: number }
      finish_account_deletion: {
        Args: { _error?: string; _id: string; _ok: boolean; _outcome?: Json }
        Returns: undefined
      }
      generate_brand_slug: {
        Args: { brand_id?: string; brand_name: string }
        Returns: string
      }
      get_brand_workspace_id: { Args: { _brand_id: string }; Returns: string }
      grant_brand_access: {
        Args: {
          _allow_ai?: boolean
          _brand_id: string
          _overrides?: Json
          _role: Database["public"]["Enums"]["brand_role"]
          _user_id: string
        }
        Returns: undefined
      }
      grant_credits: {
        Args: {
          _amount: number
          _idem_key?: string
          _reason?: string
          _workspace_id: string
        }
        Returns: Json
      }
      has_capability: {
        Args: { _brand_id?: string; _capability: string; _workspace_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      hash_token: { Args: { _token: string }; Returns: string }
      invitation_preview: { Args: { _token: string }; Returns: Json }
      is_admin_or_above: { Args: never; Returns: boolean }
      is_brand_member: {
        Args: {
          _brand_id: string
          _min_role?: Database["public"]["Enums"]["workspace_role"]
        }
        Returns: boolean
      }
      is_moderator_or_above: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_workspace_member: {
        Args: {
          _min_role?: Database["public"]["Enums"]["workspace_role"]
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_owner: { Args: { _workspace_id: string }; Returns: boolean }
      leave_workspace: { Args: { _workspace_id: string }; Returns: undefined }
      my_access: { Args: never; Returns: Json }
      my_brand_access: { Args: { _workspace_id: string }; Returns: Json }
      new_invite_token: { Args: never; Returns: string }
      overridable_capabilities: {
        Args: { _role: string; _scope: string }
        Returns: string[]
      }
      owned_storage_object_names: {
        Args: { _bucket: string; _user_id: string }
        Returns: string[]
      }
      prepare_account_purge: { Args: { _user_id: string }; Returns: Json }
      prune_audit_events: { Args: never; Returns: number }
      purge_account_data: { Args: { _user_id: string }; Returns: Json }
      reconcile_all_credit_accounts: { Args: never; Returns: number }
      reconcile_credit_account: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      record_audit: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _brand_id?: string
          _metadata?: Json
          _target_id?: string
          _target_kind?: string
          _workspace_id: string
        }
        Returns: undefined
      }
      release_credits: {
        Args: {
          _idem_key?: string
          _job_id: string
          _reason?: string
          _ref_id?: string
          _reserved: number
          _workspace_id: string
        }
        Returns: Json
      }
      remove_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: undefined
      }
      request_account_deletion: {
        Args: { _reason?: string }
        Returns: {
          attempts: number
          cancelled_at: string | null
          email: string
          grace_days: number
          id: string
          last_error: string | null
          outcome: Json | null
          purge_after: string
          purge_started_at: string | null
          purged_at: string | null
          reason: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_deletion_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resend_invitation: { Args: { _id: string }; Returns: Json }
      reserve_credits: {
        Args: {
          _amount: number
          _brand_id?: string
          _idem_key?: string
          _job_id: string
          _purpose?: string
          _ref_id?: string
          _ref_kind?: string
          _ttl?: string
          _user_id?: string
          _workspace_id: string
        }
        Returns: Json
      }
      reserved_capabilities: { Args: never; Returns: string[] }
      resolve_share_link: {
        Args: { _password?: string; _token: string }
        Returns: Json
      }
      resolve_showcase: { Args: { _slug: string }; Returns: Json }
      revoke_brand_access: {
        Args: { _brand_id: string; _user_id: string }
        Returns: undefined
      }
      revoke_invitation: { Args: { _id: string }; Returns: undefined }
      revoke_share_link: { Args: { _id: string }; Returns: undefined }
      save_design_checked: {
        Args: {
          _brand_id: string
          _data: Json
          _design_id: string
          _expected_version: number
          _name?: string
          _thumbnail_url?: string
        }
        Returns: Json
      }
      set_member_role: {
        Args: {
          _default_brand_role?: Database["public"]["Enums"]["brand_role"]
          _mode?: Database["public"]["Enums"]["brand_access_mode"]
          _overrides?: Json
          _role: Database["public"]["Enums"]["workspace_role_v2"]
          _user_id: string
          _workspace_id: string
        }
        Returns: undefined
      }
      settle_credits: {
        Args: {
          _actual: number
          _idem_key?: string
          _job_id: string
          _ref_id?: string
          _reserved: number
          _workspace_id: string
        }
        Returns: Json
      }
      shares_workspace_with: { Args: { _other_user: string }; Returns: boolean }
      transfer_ownership: {
        Args: {
          _demote_self?: boolean
          _to_user: string
          _workspace_id: string
        }
        Returns: undefined
      }
      transfer_ownership_on_purge: {
        Args: { _user_id: string }
        Returns: number
      }
      update_brand_checked: {
        Args: { _brand_id: string; _expected_version: number; _patch: Json }
        Returns: Json
      }
      workspace_plan: { Args: { _workspace_id: string }; Returns: string }
      workspaces_with_capability: {
        Args: { _capability: string }
        Returns: string[]
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "moderator" | "user"
      brand_access_mode: "all" | "selected"
      brand_role: "manager" | "editor" | "designer" | "viewer"
      credit_entry_kind:
        | "grant"
        | "reserve"
        | "settle"
        | "refund"
        | "release"
        | "adjust"
      generation_job_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      member_status: "active" | "suspended"
      share_target: "identity" | "design" | "showcase" | "guideline"
      workspace_role: "owner" | "admin" | "editor" | "exporter" | "viewer"
      workspace_role_v2: "owner" | "admin" | "member" | "guest"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "moderator", "user"],
      brand_access_mode: ["all", "selected"],
      brand_role: ["manager", "editor", "designer", "viewer"],
      credit_entry_kind: [
        "grant",
        "reserve",
        "settle",
        "refund",
        "release",
        "adjust",
      ],
      generation_job_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
      ],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      member_status: ["active", "suspended"],
      share_target: ["identity", "design", "showcase", "guideline"],
      workspace_role: ["owner", "admin", "editor", "exporter", "viewer"],
      workspace_role_v2: ["owner", "admin", "member", "guest"],
    },
  },
} as const

