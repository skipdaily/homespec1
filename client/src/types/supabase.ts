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
      // Add your Supabase tables here
      projects: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      // Chatbot related tables
      conversations: {
        Row: {
          id: string
          project_id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
          archived: boolean
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
          archived?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
          archived?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json | null
          token_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json | null
          token_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json | null
          token_count?: number | null
          created_at?: string
        }
      }
      chat_settings: {
        Row: {
          id: string
          project_id: string
          user_id: string
          provider: 'openai' | 'anthropic' | 'gemini' | 'ollama'
          model: string
          temperature: number
          max_tokens: number
          system_prompt: string | null
          restrict_to_project_data: boolean
          enable_web_search: boolean
          max_conversation_length: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          provider: 'openai' | 'anthropic' | 'gemini' | 'ollama'
          model: string
          temperature?: number
          max_tokens?: number
          system_prompt?: string | null
          restrict_to_project_data?: boolean
          enable_web_search?: boolean
          max_conversation_length?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          provider?: 'openai' | 'anthropic' | 'gemini' | 'ollama'
          model?: string
          temperature?: number
          max_tokens?: number
          system_prompt?: string | null
          restrict_to_project_data?: boolean
          enable_web_search?: boolean
          max_conversation_length?: number
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_base: {
        Row: {
          id: string
          project_id: string
          content_type: 'document' | 'image' | 'webpage' | 'note'
          title: string
          content: string
          metadata: Json | null
          embedding: string | null
          indexed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          content_type: 'document' | 'image' | 'webpage' | 'note'
          title: string
          content: string
          metadata?: Json | null
          embedding?: string | null
          indexed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          content_type?: 'document' | 'image' | 'webpage' | 'note'
          title?: string
          content?: string
          metadata?: Json | null
          embedding?: string | null
          indexed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_knowledge_base: {
        Args: {
          query_embedding: string
          project_id: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      llm_provider: 'openai' | 'anthropic' | 'gemini' | 'ollama'
      message_role: 'user' | 'assistant' | 'system'
      content_type: 'document' | 'image' | 'webpage' | 'note'
    }
  }
}