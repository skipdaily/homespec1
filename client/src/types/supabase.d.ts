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
      // Define your table types here
      // Example:
      // items: {
      //   Row: {
      //     id: string
      //     created_at: string
      //     name: string
      //   }
      //   Insert: {
      //     id?: string
      //     created_at?: string
      //     name: string
      //   }
      //   Update: {
      //     id?: string
      //     created_at?: string
      //     name?: string
      //   }
      // }
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
