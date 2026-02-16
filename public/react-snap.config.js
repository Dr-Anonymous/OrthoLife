module.exports = {
  // Pre-rendering options
  reactSnap: {
    crawl: true,
    include: [
      "/",
      "/appointment",
      "/pharmacy",
      "/diagnostics",
      "/resources",
      "/faqs",
      "/legal",
      "/blog",
      "/te/blog",
      "/guides",
      "/te/guides",
      "/symptom-checker",
      "/services/joint-replacement",
      "/services/arthroscopy",
      "/services/fracture-care"
    ],
    // Enable crawling to discover dynamic routes
    crawl: true,
    // Follow internal links to discover blog posts and guides
    inlineCss: true,
    exclude: [
      "/admin",
      "/api",
      "/edit",
      "/create"
    ],
    // Skip external requests
    skipThirdPartyRequests: true,
    // Remove script tags that aren't needed for SEO
    removeBlobs: true,
    // Preload critical resources
    preloadImages: true,
    // Viewport for mobile-first indexing
    viewport: {
      width: 1200,
      height: 630
    },
    // Wait for content to load
    waitFor: "data-prerender-ready",
    // User agent for crawling
    userAgent: "ReactSnap"
  }
};
