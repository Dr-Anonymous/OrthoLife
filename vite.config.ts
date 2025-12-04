
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import vitePrerender from 'vite-plugin-prerender';
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

    vitePrerender({
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
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
