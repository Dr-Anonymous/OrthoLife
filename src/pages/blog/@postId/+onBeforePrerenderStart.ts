// https://vike.dev/onBeforePrerenderStart
import { supabase } from '@/integrations/supabase/client';

export async function onBeforePrerenderStart() {
  const { data: posts } = await supabase.from('posts').select('id');
  return posts.map(({ id }) => `/blog/${id}`);
}
