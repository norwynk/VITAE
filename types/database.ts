export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string | null
          email: string
          date_of_birth: string | null
          gender: string | null
          phone: string | null
          company_id: string | null
          doctor_id: string | null
          onboarding_completed: boolean
          onboarding_step: number
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          email: string
          date_of_birth?: string | null
          gender?: string | null
          phone?: string | null
          company_id?: string | null
          doctor_id?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          email?: string
          date_of_birth?: string | null
          gender?: string | null
          phone?: string | null
          company_id?: string | null
          doctor_id?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
        }
      }
      health_baseline: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          height_cm: number | null
          weight_kg: number | null
          bmi: number | null
          chronic_conditions: string[] | null
          medications: string[] | null
          smoker: boolean | null
          alcohol_units_per_week: number | null
          exercise_days_per_week: number | null
          sleep_hours_per_night: number | null
          energy_level: number | null
          pain_level: number | null
          phq9_score: number | null
          gad7_score: number | null
          who5_score: number | null
          stress_level: number | null
          work_life_balance: number | null
          financial_stress: number | null
          social_connection: number | null
          diet_quality: number | null
          primary_health_goal: string | null
          secondary_goals: string[] | null
          motivation_level: number | null
          vitae_score: number | null
          physical_score: number | null
          mental_score: number | null
          emotional_score: number | null
          lifestyle_score: number | null
          social_score: number | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          height_cm?: number | null
          weight_kg?: number | null
          bmi?: number | null
          chronic_conditions?: string[] | null
          medications?: string[] | null
          smoker?: boolean | null
          alcohol_units_per_week?: number | null
          exercise_days_per_week?: number | null
          sleep_hours_per_night?: number | null
          energy_level?: number | null
          pain_level?: number | null
          phq9_score?: number | null
          gad7_score?: number | null
          who5_score?: number | null
          stress_level?: number | null
          work_life_balance?: number | null
          financial_stress?: number | null
          social_connection?: number | null
          diet_quality?: number | null
          primary_health_goal?: string | null
          secondary_goals?: string[] | null
          motivation_level?: number | null
          vitae_score?: number | null
          physical_score?: number | null
          mental_score?: number | null
          emotional_score?: number | null
          lifestyle_score?: number | null
          social_score?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          height_cm?: number | null
          weight_kg?: number | null
          bmi?: number | null
          chronic_conditions?: string[] | null
          medications?: string[] | null
          smoker?: boolean | null
          alcohol_units_per_week?: number | null
          exercise_days_per_week?: number | null
          sleep_hours_per_night?: number | null
          energy_level?: number | null
          pain_level?: number | null
          phq9_score?: number | null
          gad7_score?: number | null
          who5_score?: number | null
          stress_level?: number | null
          work_life_balance?: number | null
          financial_stress?: number | null
          social_connection?: number | null
          diet_quality?: number | null
          primary_health_goal?: string | null
          secondary_goals?: string[] | null
          motivation_level?: number | null
          vitae_score?: number | null
          physical_score?: number | null
          mental_score?: number | null
          emotional_score?: number | null
          lifestyle_score?: number | null
          social_score?: number | null
        }
      }
      daily_checkins: {
        Row: {
          id: string
          user_id: string
          created_at: string
          mood: number
          energy: number
          stress: number
          sleep_quality: number
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          mood: number
          energy: number
          stress: number
          sleep_quality: number
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          mood?: number
          energy?: number
          stress?: number
          sleep_quality?: number
          notes?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type HealthBaseline = Database['public']['Tables']['health_baseline']['Row']
export type HealthBaselineInsert = Database['public']['Tables']['health_baseline']['Insert']
export type HealthBaselineUpdate = Database['public']['Tables']['health_baseline']['Update']

export type DailyCheckin = Database['public']['Tables']['daily_checkins']['Row']
export type DailyCheckinInsert = Database['public']['Tables']['daily_checkins']['Insert']
export type DailyCheckinUpdate = Database['public']['Tables']['daily_checkins']['Update']
