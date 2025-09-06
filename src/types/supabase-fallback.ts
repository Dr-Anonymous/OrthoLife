// Temporary fallback types for Supabase when types are not available
export interface Database {
  public: {
    Tables: {
      posts: {
        Row: { id: string; title: string; content: string; excerpt?: string; created_at: string; updated_at: string };
        Insert: { id?: string; title: string; content: string; excerpt?: string };
        Update: { title?: string; content?: string; excerpt?: string };
      };
      guides: {
        Row: { id: string; title: string; content: string; description?: string; created_at: string; updated_at: string };
        Insert: { id?: string; title: string; content: string; description?: string };
        Update: { title?: string; content?: string; description?: string };
      };
      categories: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string };
        Update: { name?: string };
      };
      post_translations: {
        Row: { id: string; post_id: string; language: string; title: string; content: string; excerpt?: string };
        Insert: { post_id: string; language: string; title: string; content: string; excerpt?: string };
        Update: { title?: string; content?: string; excerpt?: string };
      };
    };
  };
}

declare module '@supabase/supabase-js' {
  interface SupabaseClientOptions<Database = any> {
    db?: Database;
  }
}