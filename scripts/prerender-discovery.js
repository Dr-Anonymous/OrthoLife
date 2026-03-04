const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Script to discover dynamic routes for pre-rendering
const discoverDynamicRoutes = async () => {
  console.log('🔍 Discovering dynamic routes for pre-rendering...');

  try {
    // Initialize Supabase client with environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials not found, skipping dynamic route discovery');
      console.log('Environment variables found:', {
        url: !!supabaseUrl,
        key: !!supabaseKey
      });
      return { routes: [], metadata: [] };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const dynamicRoutes = [];
    const metadata = [];

    // Fetch blog posts
    try {
      const { data: posts } = await supabase.from('posts').select('id, slug, title, excerpt, image_url');
      if (posts) {
        posts.forEach(post => {
          const identifier = post.slug || post.id;
          const route = `/blog/${identifier}`;
          dynamicRoutes.push(route);
          metadata.push({ route, title: post.title, description: post.excerpt, image: post.image_url });
        });
        console.log(`📝 Found ${posts.length} blog posts`);
      }

      const { data: translatedPosts } = await supabase.from('post_translations').select('post_id, title, excerpt, slug').eq('language', 'te');
      if (translatedPosts && posts) {
        translatedPosts.forEach(translation => {
          const parentPost = posts.find(p => p.id === translation.post_id);
          if (parentPost) {
            // Main translation route (uses Telugu slug if available)
            const identifier = translation.slug || parentPost.slug || parentPost.id;
            const route = `/te/blog/${identifier}`;
            if (!dynamicRoutes.includes(route)) {
              dynamicRoutes.push(route);
              metadata.push({ route, title: translation.title, description: translation.excerpt, image: parentPost.image_url });
            }

            // Also add the English slug version with /te/ prefix for compatibility/deep-links
            if (parentPost.slug && identifier !== parentPost.slug) {
              const engRoute = `/te/blog/${parentPost.slug}`;
              if (!dynamicRoutes.includes(engRoute)) {
                dynamicRoutes.push(engRoute);
                metadata.push({ route: engRoute, title: translation.title, description: translation.excerpt, image: parentPost.image_url });
              }
            }
          }
        });
        console.log(`📝 Found ${translatedPosts.length} translated blog posts and added metadata for English slug variants`);
      }
    } catch (error) {
      console.warn('Could not fetch blog posts:', error.message);
    }

    try {
      const { data: guides } = await supabase.from('guides').select('id, slug, title, description, cover_image_url');
      if (guides) {
        guides.forEach(guide => {
          const identifier = guide.slug || guide.id;
          const route = `/guides/${identifier}`;
          dynamicRoutes.push(route);
          metadata.push({ route, title: guide.title, description: guide.description, image: guide.cover_image_url });
        });
        console.log(`📚 Found ${guides.length} guides`);
      }

      const { data: translatedGuides } = await supabase.from('guide_translations').select('guide_id, title, description, slug').eq('language', 'te');
      if (translatedGuides && guides) {
        // Need to match translation to guide to get the slug
        translatedGuides.forEach(translation => {
          const parentGuide = guides.find(g => g.id === translation.guide_id);
          if (parentGuide) {
            // Main translation route (uses Telugu slug if available)
            const identifier = translation.slug || parentGuide.slug || parentGuide.id;
            const route = `/te/guides/${identifier}`;
            if (!dynamicRoutes.includes(route)) {
              dynamicRoutes.push(route);
              metadata.push({ route, title: translation.title, description: translation.description, image: parentGuide.cover_image_url });
            }

            // Also add the English slug version with /te/ prefix
            if (parentGuide.slug && identifier !== parentGuide.slug) {
              const engRoute = `/te/guides/${parentGuide.slug}`;
              if (!dynamicRoutes.includes(engRoute)) {
                dynamicRoutes.push(engRoute);
                metadata.push({ route: engRoute, title: translation.title, description: translation.description, image: parentGuide.cover_image_url });
              }
            }
          }
        });
        console.log(`📚 Found ${translatedGuides.length} translated guides and added metadata for English slug variants`);
      }
    } catch (error) {
      console.warn('Could not fetch guides:', error.message);
    }

    // Write discovered routes to a file for react-snap
    const routesFile = path.join(__dirname, '../public/discovered-routes.json');
    fs.writeFileSync(routesFile, JSON.stringify({ routes: dynamicRoutes, metadata }, null, 2));

    console.log(`✅ Discovered ${dynamicRoutes.length} dynamic routes with metadata`);
    return { routes: dynamicRoutes, metadata };

  } catch (error) {
    console.warn('❌ Error discovering dynamic routes:', error.message);
    return { routes: [], metadata: [] };
  }
};

// Export for use in build process
module.exports = { discoverDynamicRoutes };

// Run if called directly
if (require.main === module) {
  discoverDynamicRoutes();
}