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
    const { data: posts, error: postsError } = await supabase.from('posts').select('id, title, excerpt, content');
    if (postsError) throw postsError;
    posts.forEach(post => {
      const route = `/blog/${post.id}`;
      allRoutes.push(route);
      metadata.push({ route, title: post.title, description: post.excerpt });
    });

    const { data: translatedPosts, error: translatedPostsError } = await supabase.from('post_translations').select('post_id, title, excerpt, content').eq('language', 'te');
    if (translatedPostsError) throw translatedPostsError;
    translatedPosts.forEach(post => {
      const route = `/te/blog/${post.post_id}`;
      allRoutes.push(route);
      metadata.push({ route, title: post.title, description: post.excerpt });
    });

    const { data: guides, error: guidesError } = await supabase.from('guides').select('id, title, description, content');
    if (guidesError) throw guidesError;
    guides.forEach(guide => {
      const route = `/guides/${guide.id}`;
      allRoutes.push(route);
      metadata.push({ route, title: guide.title, description: guide.description });
    });

    const { data: translatedGuides, error: translatedGuidesError } = await supabase.from('guide_translations').select('guide_id, title, description, content').eq('language', 'te');
    if (translatedGuidesError) throw translatedGuidesError;
    translatedGuides.forEach(guide => {
      const route = `/te/guides/${guide.guide_id}`;
      allRoutes.push(route);
      metadata.push({ route, title: guide.title, description: guide.description });
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
