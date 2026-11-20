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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          activity_type: string
          course_id: string | null
          created_at: string
          description: string
          id: string
          ref_id: string | null
          student_id: string
        }
        Insert: {
          activity_type: string
          course_id?: string | null
          created_at?: string
          description: string
          id?: string
          ref_id?: string | null
          student_id?: string
        }
        Update: {
          activity_type?: string
          course_id?: string | null
          created_at?: string
          description?: string
          id?: string
          ref_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string
          feature: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          admin_emails: string[]
          ai_enabled: boolean
          ai_hourly_limit: number
          allowed_email_domains: string[]
          id: number
          require_admin_approval: boolean
          updated_at: string
        }
        Insert: {
          admin_emails?: string[]
          ai_enabled?: boolean
          ai_hourly_limit?: number
          allowed_email_domains?: string[]
          id?: number
          require_admin_approval?: boolean
          updated_at?: string
        }
        Update: {
          admin_emails?: string[]
          ai_enabled?: boolean
          ai_hourly_limit?: number
          allowed_email_domains?: string[]
          id?: number
          require_admin_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          active: boolean
          course_name: string
          created_at: string
          created_by: string | null
          description: string | null
          grades: number[]
          id: string
          is_custom: boolean
          school: string | null
          subject: string
        }
        Insert: {
          active?: boolean
          course_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          grades?: number[]
          id?: string
          is_custom?: boolean
          school?: string | null
          subject?: string
        }
        Update: {
          active?: boolean
          course_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          grades?: number[]
          id?: string
          is_custom?: boolean
          school?: string | null
          subject?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          cards: Json
          course_id: string | null
          created_at: string
          id: string
          note_id: string | null
          student_id: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          cards?: Json
          course_id?: string | null
          created_at?: string
          id?: string
          note_id?: string | null
          student_id?: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          cards?: Json
          course_id?: string | null
          created_at?: string
          id?: string
          note_id?: string | null
          student_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          name: string
          student_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          name: string
          student_id?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          name?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          message: string
          status: string
          student_id: string
          subject: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          student_id?: string
          subject: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          content_text: string
          course_id: string | null
          created_at: string
          folder_id: string | null
          id: string
          student_id: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          content?: string
          content_text?: string
          course_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          student_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_text?: string
          course_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          student_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          eligibility_note: string | null
          eligibility_status: string
          email: string
          first_name: string
          grade: number | null
          guardian_consent: boolean
          guardian_email: string | null
          id: string
          last_name: string
          requested_grade: number | null
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          eligibility_note?: string | null
          eligibility_status?: string
          email: string
          first_name?: string
          grade?: number | null
          guardian_consent?: boolean
          guardian_email?: string | null
          id: string
          last_name?: string
          requested_grade?: number | null
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          eligibility_note?: string | null
          eligibility_status?: string
          email?: string
          first_name?: string
          grade?: number | null
          guardian_consent?: boolean
          guardian_email?: string | null
          id?: string
          last_name?: string
          requested_grade?: number | null
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          answers: Json | null
          completed_at: string | null
          course_id: string | null
          created_at: string
          difficulty: string
          id: string
          note_id: string | null
          questions: Json
          results: Json | null
          score: number | null
          student_id: string
          title: string
          topic: string | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          note_id?: string | null
          questions?: Json
          results?: Json | null
          score?: number | null
          student_id?: string
          title: string
          topic?: string | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          note_id?: string | null
          questions?: Json
          results?: Json | null
          score?: number | null
          student_id?: string
          title?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          audio_path: string
          course_id: string | null
          created_at: string
          duration: number
          id: string
          note_id: string | null
          student_id: string
          title: string
          transcript: string | null
        }
        Insert: {
          audio_path: string
          course_id?: string | null
          created_at?: string
          duration?: number
          id?: string
          note_id?: string | null
          student_id?: string
          title?: string
          transcript?: string | null
        }
        Update: {
          audio_path?: string
          course_id?: string | null
          created_at?: string
          duration?: number
          id?: string
          note_id?: string | null
          student_id?: string
          title?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_resources: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          kind: string
          source: string | null
          student_id: string
          title: string
          topic: string | null
          url: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          source?: string | null
          student_id?: string
          title: string
          topic?: string | null
          url: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          source?: string | null
          student_id?: string
          title?: string
          topic?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          district: string
          grades_supported: number[]
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          district?: string
          grades_supported?: number[]
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          district?: string
          grades_supported?: number[]
          id?: string
          name?: string
        }
        Relationships: []
      }
      student_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_courses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_guides: {
        Row: {
          content: Json
          course_id: string | null
          created_at: string
          id: string
          note_id: string | null
          student_id: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          course_id?: string | null
          created_at?: string
          id?: string
          note_id?: string | null
          student_id?: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          course_id?: string | null
          created_at?: string
          id?: string
          note_id?: string | null
          student_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_guides_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_guides_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_guides_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          parts: Json
          role: string
          student_id: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          parts?: Json
          role: string
          student_id?: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          parts?: Json
          role?: string
          student_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "tutor_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_threads: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_threads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_threads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worksheets: {
        Row: {
          answers: Json | null
          completed_at: string | null
          course_id: string | null
          created_at: string
          difficulty: string
          id: string
          note_id: string | null
          questions: Json
          results: Json | null
          score: number | null
          student_id: string
          title: string
          topic: string | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          note_id?: string | null
          questions?: Json
          results?: Json | null
          score?: number | null
          student_id?: string
          title: string
          topic?: string | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          note_id?: string | null
          questions?: Json
          results?: Json | null
          score?: number | null
          student_id?: string
          title?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worksheets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksheets_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksheets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_platform_stats: { Args: never; Returns: Json }
      check_signup_eligibility: {
        Args: { _email: string; _grade: number; _school_id: string }
        Returns: string
      }
      consume_ai_quota: { Args: { _feature: string }; Returns: string }
      grant_admin_if_verified: {
        Args: { _confirmed: string; _email: string; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
