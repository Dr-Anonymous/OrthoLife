import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Helper function to update a file on GitHub
async function updateGitHubFile(content: string, token: string) {
  const owner = 'Dr-Anonymous';
  const repo = 'OrthoLife';
  const path = 'public/discovered-routes.json';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  let sha;
  try {
    const response = await fetch(apiUrl, { headers });
    if (response.ok) {
      const fileData = await response.json();
      sha = fileData.sha;
    } else if (response.status !== 404) {
      const errorBody = await response.text();
      throw new Error(`Failed to get file SHA: ${response.statusText}. Body: ${errorBody}`);
    }
  } catch (error) {
    console.error('Error getting file SHA:', error);
  }

  const contentBase64 = btoa(unescape(encodeURIComponent(content)));

  const body = JSON.stringify({
    message: 'feat: Update dynamic routes',
    content: contentBase64,
    sha: sha,
  });

  const updateResponse = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body,
  });

  if (!updateResponse.ok) {
    const errorBody = await updateResponse.text();
    throw new Error(`Failed to update file on GitHub: ${updateResponse.statusText}. Body: ${errorBody}`);
  }

  console.log('✅ File updated on GitHub successfully');
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allRoutes = [];
    const metadata = [];

    // Fetch posts, guides, and translations
    const { data: posts, error: postsError } = await supabase.from('posts').select('id, slug, title, excerpt, content, image_url');
    if (postsError) throw postsError;
    posts.forEach(post => {
      // 1. Add SEO slug route
      const identifier = post.slug || post.id;
      const route = `/blog/${identifier}`;
      allRoutes.push(route);
      metadata.push({ route, title: post.title, description: post.excerpt, image: post.image_url });

      // 2. Add short ID route if slug exists
      if (post.slug) {
        const shortRoute = `/blog/${post.id}`;
        if (!allRoutes.includes(shortRoute)) {
          allRoutes.push(shortRoute);
          metadata.push({ route: shortRoute, title: post.title, description: post.excerpt, image: post.image_url });
        }
      }
    });

    const { data: translatedPosts, error: translatedPostsError } = await supabase.from('post_translations').select('post_id, slug, title, excerpt, content').eq('language', 'te');
    if (translatedPostsError) throw translatedPostsError;
    translatedPosts.forEach(translation => {
      const parentPost = posts.find(p => p.id === translation.post_id);
      if (parentPost) {
        // Main translation route (uses Telugu slug if available)
        const identifier = translation.slug || parentPost.slug || parentPost.id;
        const route = `/te/blog/${identifier}`;
        if (!allRoutes.includes(route)) {
          allRoutes.push(route);
          metadata.push({ route: route, title: translation.title, description: translation.excerpt, image: parentPost.image_url });
        }

        // Also add the English slug version with /te/ prefix
        if (parentPost.slug && identifier !== parentPost.slug) {
          const engRoute = `/te/blog/${parentPost.slug}`;
          if (!allRoutes.includes(engRoute)) {
            allRoutes.push(engRoute);
            metadata.push({ route: engRoute, title: translation.title, description: translation.excerpt, image: parentPost.image_url });
          }
        }

        // 3. Add short ID route for Telugu
        const shortTeRoute = `/te/blog/${parentPost.id}`;
        if (!allRoutes.includes(shortTeRoute)) {
          allRoutes.push(shortTeRoute);
          metadata.push({ route: shortTeRoute, title: translation.title, description: translation.excerpt, image: parentPost.image_url });
        }
      }
    });

    const { data: guides, error: guidesError } = await supabase.from('guides').select('id, slug, title, description, content, cover_image_url');
    if (guidesError) throw guidesError;
    guides.forEach(guide => {
      // 1. Add SEO slug route
      const identifier = guide.slug || guide.id;
      const route = `/guides/${identifier}`;
      allRoutes.push(route);
      metadata.push({ route, title: guide.title, description: guide.description, image: guide.cover_image_url });

      // 2. Add short ID route if slug exists
      if (guide.slug) {
        const shortRoute = `/guides/${guide.id}`;
        if (!allRoutes.includes(shortRoute)) {
          allRoutes.push(shortRoute);
          metadata.push({ route: shortRoute, title: guide.title, description: guide.description, image: guide.cover_image_url });
        }
      }
    });

    const { data: translatedGuides, error: translatedGuidesError } = await supabase.from('guide_translations').select('guide_id, slug, title, description, content').eq('language', 'te');
    if (translatedGuidesError) throw translatedGuidesError;
    translatedGuides.forEach(translation => {
      const parentGuide = guides.find(g => g.id === translation.guide_id);
      if (parentGuide) {
        // Main translation route (uses Telugu slug if available)
        const identifier = translation.slug || parentGuide.slug || parentGuide.id;
        const route = `/te/guides/${identifier}`;
        if (!allRoutes.includes(route)) {
          allRoutes.push(route);
          metadata.push({ route: route, title: translation.title, description: translation.description, image: parentGuide.cover_image_url });
        }

        // Also add the English slug version with /te/ prefix
        if (parentGuide.slug && identifier !== parentGuide.slug) {
          const engRoute = `/te/guides/${parentGuide.slug}`;
          if (!allRoutes.includes(engRoute)) {
            allRoutes.push(engRoute);
            metadata.push({ route: engRoute, title: translation.title, description: translation.description, image: parentGuide.cover_image_url });
          }
        }

        // 3. Add short ID route for Telugu
        const shortTeRoute = `/te/guides/${parentGuide.id}`;
        if (!allRoutes.includes(shortTeRoute)) {
          allRoutes.push(shortTeRoute);
          metadata.push({ route: shortTeRoute, title: translation.title, description: translation.description, image: parentGuide.cover_image_url });
        }
      }
    });

    const routesData = {
      routes: allRoutes,
      metadata: metadata,
    };

    const fileContent = JSON.stringify(routesData, null, 2);

    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) {
      throw new Error("GITHUB_TOKEN environment variable not set");
    }
    await updateGitHubFile(fileContent, githubToken);

    return new Response(JSON.stringify({ message: "Successfully updated discovered-routes.json in GitHub." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in update-routes function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
