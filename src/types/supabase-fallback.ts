// Temporary fallback types for Supabase when types are not available
export type Database = {
  public: {
    Tables: {
      posts: {
        Row: { id: string; title: string; content: string; excerpt?: string; next_steps?: string; image_url?: string; author?: string; read_time_minutes?: number; category_id?: string; created_at: string };
        Insert: { id?: string; title: string; content: string; excerpt?: string; next_steps?: string; image_url?: string; author?: string; read_time_minutes?: number; category_id?: string };
        Update: { title?: string; content?: string; excerpt?: string; next_steps?: string; image_url?: string; author?: string; read_time_minutes?: number; category_id?: string };
      };
      guides: {
        Row: { id: string; title: string; content: string; description?: string; next_steps?: string; cover_image_url?: string; pages?: number; estimated_time?: string; category_id?: string; created_at: string; last_updated?: string };
        Insert: { id?: string; title: string; content: string; description?: string; next_steps?: string; cover_image_url?: string; pages?: number; estimated_time?: string; category_id?: string };
        Update: { title?: string; content?: string; description?: string; next_steps?: string; cover_image_url?: string; pages?: number; estimated_time?: string; category_id?: string };
      };
      categories: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string };
        Update: { name?: string };
      };
      post_translations: {
        Row: { id: string; post_id: string; language: string; title: string; content: string; excerpt?: string; next_steps?: string; created_at: string };
        Insert: { post_id: string; language: string; title: string; content: string; excerpt?: string; next_steps?: string };
        Update: { title?: string; content?: string; excerpt?: string; next_steps?: string };
      };
      guide_translations: {
        Row: { id: string; guide_id: string; language: string; title: string; content: string; description?: string; next_steps?: string };
        Insert: { guide_id: string; language: string; title: string; content: string; description?: string; next_steps?: string };
        Update: { title?: string; content?: string; description?: string; next_steps?: string };
      };
    };
    Functions: {
      search_patients_normalized: {
        Args: { search_term: string };
        Returns: { id: string; name: string; phone: string }[];
      };
    };
  };
};

