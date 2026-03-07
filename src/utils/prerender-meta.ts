import { prerenderConfig } from '@/config/prerender';

// Inject meta tags during pre-rendering
export const injectPrerenderMeta = (route: string) => {
  const meta = prerenderConfig.metaTags[route as keyof typeof prerenderConfig.metaTags];

  if (!meta) return;

  // Update document title
  document.title = meta.title;

  // Update or create meta tags
  const updateMetaTag = (name: string, content: string, property?: boolean) => {
    const attribute = property ? 'property' : 'name';
    let metaTag = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;

    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute(attribute, name);
      document.head.appendChild(metaTag);
    }

    metaTag.content = content;
  };

  // Standard meta tags
  updateMetaTag('description', meta.description);
  updateMetaTag('keywords', meta.keywords);

  const absoluteUrl = `https://ortho.life${route}`;

  // Open Graph tags
  updateMetaTag('og:title', meta.title, true);
  updateMetaTag('og:description', meta.description, true);
  updateMetaTag('og:url', absoluteUrl, true);
  updateMetaTag('og:site_name', 'OrthoLife', true);
  updateMetaTag('og:type', route.includes('/blog/') || route.includes('/guides/') ? 'article' : 'website', true);

  // Determine image
  let image = 'https://ortho.life/favicon/android-chrome-512x512.png';
  updateMetaTag('og:image', image, true);
  updateMetaTag('og:image:width', '1200', true);
  updateMetaTag('og:image:height', '630', true);

  // Twitter tags
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', meta.title);
  updateMetaTag('twitter:description', meta.description);
  updateMetaTag('twitter:image', image);
  updateMetaTag('twitter:url', absoluteUrl);

  // Canonical URL
  let canonicalTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonicalTag) {
    canonicalTag = document.createElement('link');
    canonicalTag.rel = 'canonical';
    document.head.appendChild(canonicalTag);
  }
  canonicalTag.href = absoluteUrl;
};

// Check if we're in pre-rendering mode
export const isPrerendering = () => {
  return navigator.userAgent.includes('Chrome-Lighthouse') ||
    navigator.userAgent.includes('HeadlessChrome') ||
    window.location.search.includes('prerender=true');
};