// Static sitemap generation without database dependencies
import * as fs from 'fs';

const BASE_URL = 'https://ortho.life';

// Static routes with their priorities and change frequencies
const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/appointment', priority: '0.9', changefreq: 'weekly' },
  { path: '/pharmacy', priority: '0.8', changefreq: 'weekly' },
  { path: '/diagnostics', priority: '0.8', changefreq: 'weekly' },
  { path: '/blog', priority: '0.8', changefreq: 'daily' },
  { path: '/guides', priority: '0.8', changefreq: 'weekly' },
  { path: '/faqs', priority: '0.6', changefreq: 'monthly' },
  { path: '/resources', priority: '0.6', changefreq: 'monthly' },
  { path: '/legal', priority: '0.3', changefreq: 'yearly' },
  { path: '/upload-prescription', priority: '0.7', changefreq: 'weekly' },
  { path: '/track-test-results', priority: '0.7', changefreq: 'weekly' },
];

export const generateSitemap = () => {
  console.log('Generating sitemap...');
  
  const currentDate = new Date().toISOString();
  
  // Load discovered routes if they exist
  let dynamicRoutes: string[] = [];
  try {
    const discoveredRoutesPath = 'public/discovered-routes.json';
    if (fs.existsSync(discoveredRoutesPath)) {
      const discoveredData = fs.readFileSync(discoveredRoutesPath, 'utf8');
      dynamicRoutes = JSON.parse(discoveredData);
      console.log(`Found ${dynamicRoutes.length} dynamic routes`);
    }
  } catch (error) {
    console.warn('Could not load discovered routes, using static routes only');
  }

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes.map(route => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
${dynamicRoutes.map(route => `  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

  // Write sitemap to public folder
  fs.writeFileSync('public/sitemap.xml', sitemap.trim());
  console.log('Sitemap generated successfully!');
};

// Generate the sitemap
generateSitemap();

