// Static sitemap generation without database dependencies
import * as fs from 'fs';

const BASE_URL = 'https://ortho.life';

// Static routes with their priorities and change frequencies
const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/appointment', priority: '0.9', changefreq: 'weekly' },
  { path: '/services/joint-replacement', priority: '0.9', changefreq: 'weekly' },
  { path: '/services/arthroscopy', priority: '0.9', changefreq: 'weekly' },
  { path: '/services/fracture-care', priority: '0.9', changefreq: 'weekly' },
  { path: '/pharmacy', priority: '0.8', changefreq: 'weekly' },
  { path: '/diagnostics', priority: '0.8', changefreq: 'weekly' },
  { path: '/blog', priority: '0.8', changefreq: 'daily' },
  { path: '/guides', priority: '0.8', changefreq: 'weekly' },
  { path: '/faqs', priority: '0.6', changefreq: 'monthly' },
  { path: '/resources', priority: '0.6', changefreq: 'monthly' },
  { path: '/legal', priority: '0.3', changefreq: 'yearly' },
  { path: '/symptom-checker', priority: '0.6', changefreq: 'monthly' },
  { path: '/upload-prescription', priority: '0.7', changefreq: 'weekly' },
  { path: '/track-test-results', priority: '0.7', changefreq: 'weekly' },
];

const escapeXml = (unsafe: string) => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

export const generateSitemap = () => {
  console.log('Generating sitemap...');

  const currentDate = new Date().toISOString();

  // Load discovered routes if they exist
  let dynamicRoutes: string[] = [];
  try {
    const discoveredRoutesPath = 'public/discovered-routes.json';
    if (fs.existsSync(discoveredRoutesPath)) {
      const discoveredData = fs.readFileSync(discoveredRoutesPath, 'utf8');
      const discoveredJson = JSON.parse(discoveredData);

      // Handle both old array format and new object ({ routes, metadata }) format
      if (Array.isArray(discoveredJson)) {
        dynamicRoutes = discoveredJson.filter(route => !/(\/blog\/|\/guides\/)\d+$/.test(route) && !/\/te\/(blog|guides)\/\d+$/.test(route));
      } else if (discoveredJson.routes && Array.isArray(discoveredJson.routes)) {
        dynamicRoutes = discoveredJson.routes.filter(route => !/(\/blog\/|\/guides\/)\d+$/.test(route) && !/\/te\/(blog|guides)\/\d+$/.test(route));
      }

      console.log(`Found ${dynamicRoutes.length} dynamic routes`);
    }
  } catch (error) {
    console.warn('Could not load discovered routes, using static routes only');
  }

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes.map(route => `  <url>
    <loc>${escapeXml(`${BASE_URL}${route.path}`)}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
${dynamicRoutes.map(route => `  <url>
    <loc>${escapeXml(`${BASE_URL}${route}`)}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.includes('/guides/') ? 'monthly' : 'weekly'}</changefreq>
    <priority>${route.includes('/guides/') ? '0.8' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>`;

  // Write sitemap to public folder
  fs.writeFileSync('public/sitemap.xml', sitemap.trim());
  console.log('Sitemap generated successfully!');
};

// Generate the sitemap
generateSitemap();
