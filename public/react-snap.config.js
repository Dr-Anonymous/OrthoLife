module.exports = {
  // Pre-rendering options
  reactSnap: {
    crawl: true,
    include: [
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