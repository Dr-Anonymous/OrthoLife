// https://vike.dev/data

import { supabase } from '@/integrations/supabase/client';
import type { DataAsync } from 'vike/types';

export type Post = {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  read_time_minutes: number;
  image_url: string;
  categories: { name: string };
  next_steps?: string;
};

export const data: DataAsync<{ post: Post }> = async (pageContext) => {
  const { postId } = pageContext.routeParams;
  const { data: post } = await supabase
    .from('posts')
    .select('*, categories(name)')
    .eq('id', postId)
    .single();
  return { post };
};
