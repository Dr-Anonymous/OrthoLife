// scripts/generate-blog-routes.js
import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const createExcerpt = (content, maxLength = 160) => {
  if (!content) return '';
  const stripped = content.replace(/<[^>]*>/g, '');
  return stripped.length > maxLength
    ? stripped.substring(0, maxLength).trim() + '...'
    : stripped;
};

const generateDynamicRoutes = async () => {
  const allRoutes = [];
  const metadata = [];

  // Fetch posts
  const { data: posts, error: postsError } = await supabase.from('posts').select('id, title, excerpt, content');
  if (postsError) {
    console.error('Error fetching posts:', postsError);
  } else {
    posts.forEach(post => {
      const route = `/blog/${post.id}`;
      allRoutes.push(route);
      metadata.push({
        route,
        title: post.title,
        description: post.excerpt || createExcerpt(post.content),
      });
    });
    console.log(`Generated ${posts.length} English blog routes`);
  }

  // Fetch Telugu post translations
  const { data: translatedPosts, error: translatedPostsError } = await supabase.from('post_translations').select('post_id, title, excerpt, content').eq('language', 'te');
  if (translatedPostsError) {
    console.error('Error fetching translated posts:', translatedPostsError);
  } else {
    translatedPosts.forEach(post => {
      const route = `/te/blog/${post.post_id}`;
      allRoutes.push(route);
      metadata.push({
        route,
        title: post.title,
        description: post.excerpt || createExcerpt(post.content),
      });
    });
    console.log(`Generated ${translatedPosts.length} Telugu blog routes`);
  }

  // Fetch guides
  const { data: guides, error: guidesError } = await supabase.from('guides').select('id, title, description, content');
  if (guidesError) {
    console.error('Error fetching guides:', guidesError);
  } else {
    guides.forEach(guide => {
      const route = `/guides/${guide.id}`;
      allRoutes.push(route);
      metadata.push({
        route,
        title: guide.title,
        description: guide.description || createExcerpt(guide.content),
      });
    });
    console.log(`Generated ${guides.length} English guide routes`);
  }

  // Fetch Telugu guide translations
  const { data: translatedGuides, error: translatedGuidesError } = await supabase.from('guide_translations').select('guide_id, title, description, content').eq('language', 'te');
  if (translatedGuidesError) {
    console.error('Error fetching translated guides:', translatedGuidesError);
  } else {
    translatedGuides.forEach(guide => {
      const route = `/te/guides/${guide.guide_id}`;
      allRoutes.push(route);
      metadata.push({
        route,
        title: guide.title,
        description: guide.description || createExcerpt(guide.content),
      });
    });
    console.log(`Generated ${translatedGuides.length} Telugu guide routes`);
  }

  const routesData = {
    routes: allRoutes,
    metadata: metadata,
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'public/discovered-routes.json'),
    JSON.stringify(routesData, null, 2)
  );
};

generateDynamicRoutes();
