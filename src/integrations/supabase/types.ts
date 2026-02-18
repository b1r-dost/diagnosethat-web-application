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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content_en: string
          content_tr: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          priority: number
          starts_at: string | null
          title_en: string
          title_tr: string
          updated_at: string
        }
        Insert: {
          content_en: string
          content_tr: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string | null
          title_en: string
          title_tr: string
          updated_at?: string
        }
        Update: {
          content_en?: string
          content_tr?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string | null
          title_en?: string
          title_tr?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dismissed_prompts: {
        Row: {
          created_at: string
          dismissed_at: string
          id: string
          prompt_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string
          id?: string
          prompt_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string
          id?: string
          prompt_type?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string | null
          document_type: string
          file_url: string | null
          id: string
          original_filename: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string | null
          document_type: string
          file_url?: string | null
          id?: string
          original_filename?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string | null
          document_type?: string
          file_url?: string | null
          id?: string
          original_filename?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          dentist_id: string
          first_name: string
          id: string
          identity_number: string | null
          last_name: string
          patient_ref: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          dentist_id: string
          first_name: string
          id?: string
          identity_number?: string | null
          last_name: string
          patient_ref: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          dentist_id?: string
          first_name?: string
          id?: string
          identity_number?: string | null
          last_name?: string
          patient_ref?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          doctor_ref: string | null
          first_name: string | null
          id: string
          institution_logo_url: string | null
          institution_name: string | null
          last_login_at: string | null
          last_name: string | null
          patient_ref: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          doctor_ref?: string | null
          first_name?: string | null
          id?: string
          institution_logo_url?: string | null
          institution_name?: string | null
          last_login_at?: string | null
          last_name?: string | null
          patient_ref?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          doctor_ref?: string | null
          first_name?: string | null
          id?: string
          institution_logo_url?: string | null
          institution_name?: string | null
          last_login_at?: string | null
          last_name?: string | null
          patient_ref?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      radiographs: {
        Row: {
          analysis_result: Json | null
          analysis_result_path: string | null
          analysis_status: string | null
          created_at: string
          file_size: number | null
          id: string
          job_id: string | null
          original_filename: string | null
          owner_user_id: string | null
          patient_id: string | null
          radiograph_type: string | null
          storage_path: string
          thumbnail_path: string | null
          updated_at: string
        }
        Insert: {
          analysis_result?: Json | null
          analysis_result_path?: string | null
          analysis_status?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          job_id?: string | null
          original_filename?: string | null
          owner_user_id?: string | null
          patient_id?: string | null
          radiograph_type?: string | null
          storage_path: string
          thumbnail_path?: string | null
          updated_at?: string
        }
        Update: {
          analysis_result?: Json | null
          analysis_result_path?: string | null
          analysis_status?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          job_id?: string | null
          original_filename?: string | null
          owner_user_id?: string | null
          patient_id?: string | null
          radiograph_type?: string | null
          storage_path?: string
          thumbnail_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radiographs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          created_at: string
          description_en: string | null
          description_tr: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          title_en: string
          title_tr: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_tr?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          title_en: string
          title_tr: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_tr?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          title_en?: string
          title_tr?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string
          currency: string
          ends_at: string
          id: string
          package_month: string
          package_year: number
          payment_provider: string | null
          payment_reference: string | null
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          ends_at: string
          id?: string
          package_month: string
          package_year: number
          payment_provider?: string | null
          payment_reference?: string | null
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          ends_at?: string
          id?: string
          package_month?: string
          package_year?: number
          payment_provider?: string | null
          payment_reference?: string | null
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestion_responses: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          response: string
          suggestion_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          response: string
          suggestion_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          response?: string
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_responses_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_doctor_ref: { Args: never; Returns: string }
      generate_patient_ref: { Args: never; Returns: string }
      generate_unique_patient_ref: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "dentist" | "patient"
      suggestion_status: "open" | "in_progress" | "resolved" | "closed"
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
      app_role: ["admin", "dentist", "patient"],
      suggestion_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
