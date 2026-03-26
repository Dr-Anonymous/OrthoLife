
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import vitePrerender from 'vite-plugin-prerender';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

const getDiscoveredData = () => {
  try {
    const data = fs.readFileSync('public/discovered-routes.json', 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('discovered-routes.json not found, using empty object');
    return { routes: [], metadata: [] };
  }
}

const { routes: discoveredRoutes, metadata } = getDiscoveredData();
const debugRoutes = ['/', '/blog/1'];
const staticRoutes = [
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
  '/services/fracture-care',
  '/op',
  '/stats',
  '/followups',
  '/ip'
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/' : '/',
  server: {
    host: "127.0.0.1",
    port: 8080,
  },
  plugins: [
    react(),

    mode === 'production' ? vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: [...staticRoutes, ...discoveredRoutes],
      postProcess(renderedRoute: any) {
        const routeMetadata = metadata.find((meta: any) => meta.route === renderedRoute.originalRoute);

        let html = renderedRoute.html;

        if (routeMetadata) {
          const { title, description, image } = routeMetadata;
          const absoluteUrl = `https://ortho.life${renderedRoute.originalRoute}`;

          // Helper to upsert meta tags
          const upsertMeta = (propertyName: string, value: string, isProperty = true) => {
            const attr = isProperty ? 'property' : 'name';
            const regex = new RegExp(`<meta\\s+${attr}="${propertyName}"\\s+content="[^"]*"\\s*\/?>`, 'i');
            const newTag = `<meta ${attr}="${propertyName}" content="${value}" />`;

            if (regex.test(html)) {
              html = html.replace(regex, newTag);
            } else {
              html = html.replace('</head>', `  ${newTag}\n</head>`);
            }
          };

          // Update standard tags
          html = html.replace(/<title>.*<\/title>/i, `<title>${title} | OrthoLife</title>`);
          upsertMeta('description', description, false);

          // Update Open Graph tags
          upsertMeta('og:title', title);
          upsertMeta('og:description', description);
          upsertMeta('og:image', image);
          upsertMeta('og:image:alt', title);
          upsertMeta('og:url', absoluteUrl);
          upsertMeta('og:type', renderedRoute.originalRoute.includes('/blog/') || renderedRoute.originalRoute.includes('/guides/') ? 'article' : 'website');
          upsertMeta('og:site_name', 'OrthoLife');
          upsertMeta('og:locale', 'en_US');
          upsertMeta('og:image:width', '1200');
          upsertMeta('og:image:height', '630');

          // Update Twitter tags
          upsertMeta('twitter:card', 'summary_large_image', false);
          upsertMeta('twitter:title', title, false);
          upsertMeta('twitter:description', description, false);
          upsertMeta('twitter:image', image, false);
          upsertMeta('twitter:image:alt', title, false);
          upsertMeta('twitter:url', absoluteUrl, false);
        }

        const canonicalRoute = renderedRoute.originalRoute.startsWith('/te/')
          ? renderedRoute.originalRoute.substring(3)
          : renderedRoute.originalRoute;

        const canonicalUrl = `https://ortho.life${canonicalRoute}`;

        if (/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i.test(html)) {
          html = html.replace(
            /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
            `<link rel="canonical" href="${canonicalUrl}" />`
          );
        } else {
          html = html.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`);
        }

        renderedRoute.html = html;
        return renderedRoute;
      },
      // Use Puppeteer for pre-rendering
      renderer: (!process.env.CI)
        ? new vitePrerender.PuppeteerRenderer({
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          maxConcurrentRoutes: 5,
          renderAfterTime: 5000,
          renderAfterDocumentEvent: 'data-prerender-ready'
        })
        : undefined
    }) : null,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'favicon/apple-touch-icon.png', 'favicon/favicon-32x32.png', 'favicon/favicon-16x16.png'],
      manifest: {
        name: 'OrthoLife',
        short_name: 'OrthoLife',
        description: 'OrthoLife - Back to Health.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/favicon/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/favicon/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}']
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
