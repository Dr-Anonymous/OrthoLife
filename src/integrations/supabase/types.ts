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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer_key: string
          category_id: number | null
          created_at: string
          id: number
          question_key: string
        }
        Insert: {
          answer_key: string
          category_id?: number | null
          created_at?: string
          id?: number
          question_key: string
        }
        Update: {
          answer_key?: string
          category_id?: number | null
          created_at?: string
          id?: number
          question_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      google_reviews_cache: {
        Row: {
          cached_at: string
          place_id: string
          reviews_data: Json
        }
        Insert: {
          cached_at?: string
          place_id: string
          reviews_data: Json
        }
        Update: {
          cached_at?: string
          place_id?: string
          reviews_data?: Json
        }
        Relationships: []
      }
      guide_translations: {
        Row: {
          content: string | null
          description: string | null
          guide_id: number
          id: number
          language: string
          next_steps: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          description?: string | null
          guide_id: number
          id?: number
          language: string
          next_steps?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          description?: string | null
          guide_id?: number
          id?: number
          language?: string
          next_steps?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_translations_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          category_id: number | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          estimated_time: string | null
          id: number
          last_updated: string | null
          next_steps: string | null
          pages: number | null
          title: string
        }
        Insert: {
          category_id?: number | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          estimated_time?: string | null
          id?: number
          last_updated?: string | null
          next_steps?: string | null
          pages?: number | null
          title: string
        }
        Update: {
          category_id?: number | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          estimated_time?: string | null
          id?: number
          last_updated?: string | null
          next_steps?: string | null
          pages?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_counters: {
        Row: {
          counter: number | null
          date_key: string
        }
        Insert: {
          counter?: number | null
          date_key: string
        }
        Update: {
          counter?: number | null
          date_key?: string
        }
        Relationships: []
      }
      post_translations: {
        Row: {
          content: string | null
          created_at: string
          excerpt: string | null
          id: number
          language: string
          next_steps: string | null
          post_id: number
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          language: string
          next_steps?: string | null
          post_id: number
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          language?: string
          next_steps?: string | null
          post_id?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_translations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author: string | null
          category_id: number | null
          content: string | null
          created_at: string
          excerpt: string | null
          id: number
          image_url: string | null
          next_steps: string | null
          read_time_minutes: number | null
          title: string
        }
        Insert: {
          author?: string | null
          category_id?: number | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          image_url?: string | null
          next_steps?: string | null
          read_time_minutes?: number | null
          title: string
        }
        Update: {
          author?: string | null
          category_id?: number | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          image_url?: string | null
          next_steps?: string | null
          read_time_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_cache: {
        Row: {
          created_at: string
          id: number
          source_language: string
          source_text: string
          target_language: string
          translated_text: string
        }
        Insert: {
          created_at?: string
          id?: never
          source_language: string
          source_text: string
          target_language: string
          translated_text: string
        }
        Update: {
          created_at?: string
          id?: never
          source_language?: string
          source_text?: string
          target_language?: string
          translated_text?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_patient_counter: {
        Args: { input_date_key: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
