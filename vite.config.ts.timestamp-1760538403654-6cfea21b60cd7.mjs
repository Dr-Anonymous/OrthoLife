// vite.config.ts
import { defineConfig } from "file:///app/node_modules/vite/dist/node/index.js";
import react from "file:///app/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///app/node_modules/lovable-tagger/dist/index.js";
import vitePrerender from "file:///app/node_modules/vite-plugin-prerender/dist/index.mjs";
import fs from "fs";
var __vite_injected_original_dirname = "/app";
var getDiscoveredData = () => {
  try {
    const data = fs.readFileSync("public/discovered-routes.json", "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.warn("discovered-routes.json not found, using empty object");
    return { routes: [], metadata: [] };
  }
};
var { routes: discoveredRoutes, metadata } = getDiscoveredData();
var staticRoutes = [
  "/",
  "/appointment",
  "/services",
  "/about",
  "/contact",
  "/pharmacy",
  "/diagnostics",
  "/resources",
  "/faq",
  "/legal-policies",
  "/blog",
  "/guides"
];
var vite_config_default = defineConfig(({ mode }) => ({
  base: mode === "production" ? "/" : "/",
  server: {
    host: "127.0.0.1",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    vitePrerender({
      staticDir: path.join(__vite_injected_original_dirname, "dist"),
      routes: [...staticRoutes, ...discoveredRoutes],
      postProcess(renderedRoute) {
        const routeMetadata = metadata.find((meta) => meta.route === renderedRoute.originalRoute);
        if (routeMetadata) {
          renderedRoute.html = renderedRoute.html.replace(/<title>.*<\/title>/, `<title>${routeMetadata.title}</title>`).replace(/<meta name="description" content=".*"\s*\/?>/, `<meta name="description" content="${routeMetadata.description}" />`).replace(/<meta property="og:title" content=".*"\s*\/?>/, `<meta property="og:title" content="${routeMetadata.title}" />`).replace(/<meta property="og:description" content=".*"\s*\/?>/, `<meta property="og:description" content="${routeMetadata.description}" />`);
        }
        const canonicalRoute = renderedRoute.originalRoute.startsWith("/te/") ? renderedRoute.originalRoute.substring(3) : renderedRoute.originalRoute;
        renderedRoute.html = renderedRoute.html.replace(
          /<link rel="canonical" href=".*"\s*\/?>/,
          `<link rel="canonical" href="https://ortho.life${canonicalRoute}" />`
        );
        return renderedRoute;
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9hcHAvdml0ZS5jb25maWcudHNcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xuaW1wb3J0IHZpdGVQcmVyZW5kZXIgZnJvbSAndml0ZS1wbHVnaW4tcHJlcmVuZGVyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmNvbnN0IGdldERpc2NvdmVyZWREYXRhID0gKCkgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoJ3B1YmxpYy9kaXNjb3ZlcmVkLXJvdXRlcy5qc29uJywgJ3V0Zi04Jyk7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS53YXJuKCdkaXNjb3ZlcmVkLXJvdXRlcy5qc29uIG5vdCBmb3VuZCwgdXNpbmcgZW1wdHkgb2JqZWN0Jyk7XG4gICAgcmV0dXJuIHsgcm91dGVzOiBbXSwgbWV0YWRhdGE6IFtdIH07XG4gIH1cbn1cblxuY29uc3QgeyByb3V0ZXM6IGRpc2NvdmVyZWRSb3V0ZXMsIG1ldGFkYXRhIH0gPSBnZXREaXNjb3ZlcmVkRGF0YSgpO1xuXG5jb25zdCBzdGF0aWNSb3V0ZXMgPSBbXG4gICcvJyxcbiAgJy9hcHBvaW50bWVudCcsXG4gICcvc2VydmljZXMnLFxuICAnL2Fib3V0JyxcbiAgJy9jb250YWN0JyxcbiAgJy9waGFybWFjeScsXG4gICcvZGlhZ25vc3RpY3MnLFxuICAnL3Jlc291cmNlcycsXG4gICcvZmFxJyxcbiAgJy9sZWdhbC1wb2xpY2llcycsXG4gICcvYmxvZycsXG4gICcvZ3VpZGVzJ1xuXTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIGJhc2U6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/ICcvJyA6ICcvJyxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCIxMjcuMC4wLjFcIixcbiAgICBwb3J0OiA4MDgwLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXG4gICAgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgdml0ZVByZXJlbmRlcih7XG4gICAgICBzdGF0aWNEaXI6IHBhdGguam9pbihfX2Rpcm5hbWUsICdkaXN0JyksXG4gICAgICByb3V0ZXM6IFsuLi5zdGF0aWNSb3V0ZXMsIC4uLmRpc2NvdmVyZWRSb3V0ZXNdLFxuICAgICAgcG9zdFByb2Nlc3MocmVuZGVyZWRSb3V0ZTogYW55KSB7XG4gICAgICAgIGNvbnN0IHJvdXRlTWV0YWRhdGEgPSBtZXRhZGF0YS5maW5kKChtZXRhOiBhbnkpID0+IG1ldGEucm91dGUgPT09IHJlbmRlcmVkUm91dGUub3JpZ2luYWxSb3V0ZSk7XG4gICAgICAgIGlmIChyb3V0ZU1ldGFkYXRhKSB7XG4gICAgICAgICAgcmVuZGVyZWRSb3V0ZS5odG1sID0gcmVuZGVyZWRSb3V0ZS5odG1sXG4gICAgICAgICAgICAucmVwbGFjZSgvPHRpdGxlPi4qPFxcL3RpdGxlPi8sIGA8dGl0bGU+JHtyb3V0ZU1ldGFkYXRhLnRpdGxlfTwvdGl0bGU+YClcbiAgICAgICAgICAgIC5yZXBsYWNlKC88bWV0YSBuYW1lPVwiZGVzY3JpcHRpb25cIiBjb250ZW50PVwiLipcIlxccypcXC8/Pi8sIGA8bWV0YSBuYW1lPVwiZGVzY3JpcHRpb25cIiBjb250ZW50PVwiJHtyb3V0ZU1ldGFkYXRhLmRlc2NyaXB0aW9ufVwiIC8+YClcbiAgICAgICAgICAgIC5yZXBsYWNlKC88bWV0YSBwcm9wZXJ0eT1cIm9nOnRpdGxlXCIgY29udGVudD1cIi4qXCJcXHMqXFwvPz4vLCBgPG1ldGEgcHJvcGVydHk9XCJvZzp0aXRsZVwiIGNvbnRlbnQ9XCIke3JvdXRlTWV0YWRhdGEudGl0bGV9XCIgLz5gKVxuICAgICAgICAgICAgLnJlcGxhY2UoLzxtZXRhIHByb3BlcnR5PVwib2c6ZGVzY3JpcHRpb25cIiBjb250ZW50PVwiLipcIlxccypcXC8/Pi8sIGA8bWV0YSBwcm9wZXJ0eT1cIm9nOmRlc2NyaXB0aW9uXCIgY29udGVudD1cIiR7cm91dGVNZXRhZGF0YS5kZXNjcmlwdGlvbn1cIiAvPmApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2Fub25pY2FsUm91dGUgPSByZW5kZXJlZFJvdXRlLm9yaWdpbmFsUm91dGUuc3RhcnRzV2l0aCgnL3RlLycpXG4gICAgICAgICAgPyByZW5kZXJlZFJvdXRlLm9yaWdpbmFsUm91dGUuc3Vic3RyaW5nKDMpXG4gICAgICAgICAgOiByZW5kZXJlZFJvdXRlLm9yaWdpbmFsUm91dGU7XG5cbiAgICAgICAgcmVuZGVyZWRSb3V0ZS5odG1sID0gcmVuZGVyZWRSb3V0ZS5odG1sLnJlcGxhY2UoXG4gICAgICAgICAgLzxsaW5rIHJlbD1cImNhbm9uaWNhbFwiIGhyZWY9XCIuKlwiXFxzKlxcLz8+LyxcbiAgICAgICAgICBgPGxpbmsgcmVsPVwiY2Fub25pY2FsXCIgaHJlZj1cImh0dHBzOi8vb3J0aG8ubGlmZSR7Y2Fub25pY2FsUm91dGV9XCIgLz5gXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHJlbmRlcmVkUm91dGU7XG4gICAgICB9LFxuICAgIH0pLFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsT0FBTyxtQkFBbUI7QUFDMUIsT0FBTyxRQUFRO0FBTmYsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTSxvQkFBb0IsTUFBTTtBQUM5QixNQUFJO0FBQ0YsVUFBTSxPQUFPLEdBQUcsYUFBYSxpQ0FBaUMsT0FBTztBQUNyRSxXQUFPLEtBQUssTUFBTSxJQUFJO0FBQUEsRUFDeEIsU0FBUyxPQUFPO0FBQ2QsWUFBUSxLQUFLLHNEQUFzRDtBQUNuRSxXQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsVUFBVSxDQUFDLEVBQUU7QUFBQSxFQUNwQztBQUNGO0FBRUEsSUFBTSxFQUFFLFFBQVEsa0JBQWtCLFNBQVMsSUFBSSxrQkFBa0I7QUFFakUsSUFBTSxlQUFlO0FBQUEsRUFDbkI7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUNGO0FBR0EsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxNQUFNLFNBQVMsZUFBZSxNQUFNO0FBQUEsRUFDcEMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVMsaUJBQ1QsZ0JBQWdCO0FBQUEsSUFDaEIsY0FBYztBQUFBLE1BQ1osV0FBVyxLQUFLLEtBQUssa0NBQVcsTUFBTTtBQUFBLE1BQ3RDLFFBQVEsQ0FBQyxHQUFHLGNBQWMsR0FBRyxnQkFBZ0I7QUFBQSxNQUM3QyxZQUFZLGVBQW9CO0FBQzlCLGNBQU0sZ0JBQWdCLFNBQVMsS0FBSyxDQUFDLFNBQWMsS0FBSyxVQUFVLGNBQWMsYUFBYTtBQUM3RixZQUFJLGVBQWU7QUFDakIsd0JBQWMsT0FBTyxjQUFjLEtBQ2hDLFFBQVEsc0JBQXNCLFVBQVUsY0FBYyxLQUFLLFVBQVUsRUFDckUsUUFBUSxnREFBZ0QscUNBQXFDLGNBQWMsV0FBVyxNQUFNLEVBQzVILFFBQVEsaURBQWlELHNDQUFzQyxjQUFjLEtBQUssTUFBTSxFQUN4SCxRQUFRLHVEQUF1RCw0Q0FBNEMsY0FBYyxXQUFXLE1BQU07QUFBQSxRQUMvSTtBQUVBLGNBQU0saUJBQWlCLGNBQWMsY0FBYyxXQUFXLE1BQU0sSUFDaEUsY0FBYyxjQUFjLFVBQVUsQ0FBQyxJQUN2QyxjQUFjO0FBRWxCLHNCQUFjLE9BQU8sY0FBYyxLQUFLO0FBQUEsVUFDdEM7QUFBQSxVQUNBLGlEQUFpRCxjQUFjO0FBQUEsUUFDakU7QUFFQSxlQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0gsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
