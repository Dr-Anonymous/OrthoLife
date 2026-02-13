
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

const staticRoutes = [
  '/',
  '/appointment',
  '/services',
  '/about',
  '/contact',
  '/pharmacy',
  '/diagnostics',
  '/resources',
  '/faq',
  '/legal-policies',
  '/blog',
  '/guides'
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

    process.env.CI ? vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: [...staticRoutes, ...discoveredRoutes],
      postProcess(renderedRoute: any) {
        const routeMetadata = metadata.find((meta: any) => meta.route === renderedRoute.originalRoute);
        if (routeMetadata) {
          renderedRoute.html = renderedRoute.html
            .replace(/<title>.*<\/title>/, `<title>${routeMetadata.title}</title>`)
            .replace(/<meta name="description" content=".*"\s*\/?>/, `<meta name="description" content="${routeMetadata.description}" />`)
            .replace(/<meta property="og:title" content=".*"\s*\/?>/, `<meta property="og:title" content="${routeMetadata.title}" />`)
            .replace(/<meta property="og:description" content=".*"\s*\/?>/, `<meta property="og:description" content="${routeMetadata.description}" />`);
        }

        const canonicalRoute = renderedRoute.originalRoute.startsWith('/te/')
          ? renderedRoute.originalRoute.substring(3)
          : renderedRoute.originalRoute;

        renderedRoute.html = renderedRoute.html.replace(
          /<link rel="canonical" href=".*"\s*\/?>/,
          `<link rel="canonical" href="https://ortho.life${canonicalRoute}" />`
        );

        return renderedRoute;
      },
    }) : null,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon/apple-touch-icon.png', 'favicon/favicon-32x32.png', 'favicon/favicon-16x16.png'],
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
