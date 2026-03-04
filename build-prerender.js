const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build configuration for pre-rendering
const buildPrerender = () => {
  console.log('🚀 Starting pre-render build process...');

  try {
    // Step 1: Discover dynamic routes
    console.log('🔍 Discovering dynamic routes...');
    try {
      execSync('node scripts/prerender-discovery.js', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Could not discover dynamic routes, continuing with static routes only');
    }

    // Step 2: Build the application
    console.log('📦 Building application...');
    execSync('npm run build', { stdio: 'inherit' });

    // Step 3: Run react-snap for pre-rendering
    console.log('🎯 Pre-rendering pages...');
    execSync('npx react-snap', { stdio: 'inherit' });

    // Step 4: Generate sitemap with pre-rendered routes
    console.log('🗺️  Generating sitemap...');
    generateSitemap();

    // Step 5: Create robots.txt
    console.log('🤖 Creating robots.txt...');
    createRobotsTxt();

    console.log('✅ Pre-render build completed successfully!');

  } catch (error) {
    console.error('❌ Pre-render build failed:', error.message);
    process.exit(1);
  }
};

const escapeXml = (unsafe) => {
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

// Generate sitemap for pre-rendered pages
const generateSitemap = () => {
  const routes = [
    '/',
    '/appointment',
    '/pharmacy',
    '/diagnostics',
    '/resources',
    '/faqs',
    '/legal',
    '/blog',
    '/te/blog',
    '/guides',
    '/te/guides',
    '/symptom-checker',
    '/services/joint-replacement',
    '/services/arthroscopy',
    '/services/fracture-care'
  ];

  const baseUrl = 'https://ortho.life';
  const currentDate = new Date().toISOString();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${escapeXml(`${baseUrl}${route}`)}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join('dist', 'sitemap.xml'), sitemap);
};

// Create robots.txt
const createRobotsTxt = () => {
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://ortho.life/sitemap.xml

# Optimize crawl budget
Crawl-delay: 1

# Block unnecessary paths
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
`;

  fs.writeFileSync(path.join('dist', 'robots.txt'), robotsTxt);
};

// Run the build process
if (require.main === module) {
  buildPrerender();
}

module.exports = { buildPrerender };
