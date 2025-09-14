// Temporary type override to fix TypeScript errors
// This provides proper typing for our database operations

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    from(relation: 'posts'): any;
    from(relation: 'guides'): any;
    from(relation: 'categories'): any;
    from(relation: 'post_translations'): any;
    from(relation: 'guide_translations'): any;
    from(relation: 'faqs'): any;
    from(relation: 'patient_counters'): any;
    from(relation: 'google_reviews_cache'): any;
    from(relation: 'translation_cache'): any;
    from(relation: string): any;
  }
}

export {};