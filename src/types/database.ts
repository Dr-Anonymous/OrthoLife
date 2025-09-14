// Database types for better type safety
export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  next_steps?: string;
  image_url?: string;
  author?: string;
  read_time_minutes?: number;
  category_id?: string;
  created_at: string;
}

export interface Guide {
  id: string;
  title: string;
  content: string;
  description?: string;
  next_steps?: string;
  cover_image_url?: string;
  pages?: number;
  estimated_time?: string;
  category_id?: string;
  created_at: string;
  last_updated?: string;
}

export interface PostTranslation {
  id: string;
  post_id: string;
  language: string;
  title?: string;
  excerpt?: string;
  content?: string;
  next_steps?: string;
  created_at: string;
}

export interface GuideTranslation {
  id: string;
  guide_id: string;
  language: string;
  title?: string;
  description?: string;
  content?: string;
  next_steps?: string;
}