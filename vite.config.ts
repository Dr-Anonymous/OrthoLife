
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import vitePrerender from 'vite-plugin-prerender';
import fs from 'fs';

const discoveredRoutes = () => {
  try {
    return JSON.parse(fs.readFileSync('public/discovered-routes.json', 'utf-8'));
  } catch (error) {
    console.warn('discovered-routes.json not found, using empty array');
    return [];
  }
}

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
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: [...staticRoutes, ...discoveredRoutes()],
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
