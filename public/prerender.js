// Pre-rendering script for react-snap
window.reactSnap = {
  // Wait for content to load
  waitFor: 'data-prerender-ready',

  // Pre-rendering options
  options: {
    removeBlobs: true,
    removeScriptTags: false,
    preloadImages: true,
    cacheAjaxRequests: false,

    // Crawl configuration
    crawl: true,
    include: [
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
      '/services/joint-replacement',
      '/services/arthroscopy',
      '/services/fracture-care',
      '/symptom-checker'
    ],

    // Enable discovery of dynamic routes through crawling
    crawlFromInternalLinks: true,
    includePathsFromRouter: true,

    // Skip external URLs and API calls
    skipThirdPartyRequests: true,

    // Viewport for mobile-first indexing
    viewport: {
      width: 1200,
      height: 630
    }
  }
};

// Mark page as ready for pre-rendering after a fallback timeout
document.addEventListener('DOMContentLoaded', function () {
  // If the page hasn't signaled ready in 3 seconds, force it
  setTimeout(function () {
    if (!document.body.getAttribute('data-prerender-ready')) {
      document.body.setAttribute('data-prerender-ready', 'true');
    }
  }, 3000);
});
