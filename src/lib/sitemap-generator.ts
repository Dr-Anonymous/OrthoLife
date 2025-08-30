import { supabase } from '@/integrations/supabase/client';
import * as fs from 'fs';

const BASE_URL = 'https://ortho.life';

const staticRoutes = [
  '/',
  '/appointment',
  '/pharmacy',
  '/diagnostics',
  '/blog',
  '/guides',
  '/faqs',
  '/resources',
  '/legal',
  '/upload-prescription',
  '/track-test-results',
];

async function generateSitemap() {
  console.log('Generating sitemap...');

  const { data: posts, error: postsError } = await supabase.from('posts').select('id');
  if (postsError) {
    console.error('Error fetching posts:', postsError);
    return;
  }

  const { data: guides, error: guidesError } = await supabase.from('guides').select('id');
  if (guidesError) {
    console.error('Error fetching guides:', guidesError);
    return;
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticRoutes.map(route => `
        <url>
          <loc>${BASE_URL}${route}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `).join('')}
      ${posts?.map(({ id }) => `
        <url>
          <loc>${BASE_URL}/blog/${id}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>
      `).join('')}
      ${guides?.map(({ id }) => `
        <url>
          <loc>${BASE_URL}/guides/${id}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>
      `).join('')}
    </urlset>
  `;

  fs.writeFileSync('public/sitemap.xml', sitemap.trim());
  console.log('Sitemap generated successfully!');
}

generateSitemap();
