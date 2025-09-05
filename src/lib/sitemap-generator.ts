import * as fs from 'fs';

const BASE_URL = 'https://ortho.life';

const staticRoutes = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/appointment', priority: '0.9', changefreq: 'weekly' },
  { url: '/pharmacy', priority: '0.8', changefreq: 'weekly' },
  { url: '/diagnostics', priority: '0.8', changefreq: 'weekly' },
  { url: '/blog', priority: '0.9', changefreq: 'daily' },
  { url: '/guides', priority: '0.9', changefreq: 'daily' },
  { url: '/faqs', priority: '0.7', changefreq: 'weekly' },
  { url: '/resources', priority: '0.7', changefreq: 'weekly' },
  { url: '/legal', priority: '0.5', changefreq: 'monthly' },
  { url: '/upload-prescription', priority: '0.8', changefreq: 'weekly' },
  { url: '/track-test-results', priority: '0.8', changefreq: 'weekly' },
];

async function generateSitemap() {
  console.log('Generating sitemap...');

  const lastmod = new Date().toISOString();
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticRoutes.map(route => `  <url>
    <loc>${BASE_URL}${route.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>${route.url === '/' ? `
    <image:image>
      <image:loc>https://vqskeanwpnvuyxorymib.supabase.co/storage/v1/object/public/post_images/landing%20pics/cover.jpeg</image:loc>
      <image:title>OrthoLife - Expert Orthopaedic Care</image:title>
      <image:caption>Specialized orthopaedic care for fractures, sports injuries, spine and joint treatments</image:caption>
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync('public/sitemap.xml', sitemap);
  console.log('Sitemap generated successfully!');
}

// Only run if called directly
if (require.main === module) {
  generateSitemap().catch(console.error);
}

export { generateSitemap };
