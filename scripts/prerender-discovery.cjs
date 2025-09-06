require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Script to discover dynamic routes for pre-rendering
const discoverDynamicRoutes = async () => {
  console.log('🔍 Discovering dynamic routes for pre-rendering...');
  
  try {
    // Initialize Supabase client with environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials not found, skipping dynamic route discovery');
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const dynamicRoutes = [];

    // Fetch blog posts
    try {
      const { data: posts } = await supabase.from('posts').select('id');
      if (posts) {
        posts.forEach(post => {
          dynamicRoutes.push(`/blog/${post.id}`);
        });
        console.log(`📝 Found ${posts.length} blog posts`);
      }
    } catch (error) {
      console.warn('Could not fetch blog posts:', error.message);
    }

    // Fetch guides
    try {
      const { data: guides } = await supabase.from('guides').select('id');
      if (guides) {
        guides.forEach(guide => {
          dynamicRoutes.push(`/guides/${guide.id}`);
        });
        console.log(`📚 Found ${guides.length} guides`);
      }
    } catch (error) {
      console.warn('Could not fetch guides:', error.message);
    }

    // Write discovered routes to a file for react-snap
    const routesFile = path.join(__dirname, '../public/discovered-routes.json');
    fs.writeFileSync(routesFile, JSON.stringify(dynamicRoutes, null, 2));
    
    console.log(`✅ Discovered ${dynamicRoutes.length} dynamic routes`);
    return dynamicRoutes;
    
  } catch (error) {
    console.warn('❌ Error discovering dynamic routes:', error.message);
    return [];
  }
};

// Export for use in build process
module.exports = { discoverDynamicRoutes };

// Run if called directly
if (require.main === module) {
  discoverDynamicRoutes();
}