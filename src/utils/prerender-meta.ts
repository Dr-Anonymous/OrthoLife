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

  // Open Graph tags
  updateMetaTag('og:title', meta.title, true);
  updateMetaTag('og:description', meta.description, true);
  updateMetaTag('og:url', `https://ortho.life${route}`, true);

  // Twitter tags
  updateMetaTag('twitter:title', meta.title);
  updateMetaTag('twitter:description', meta.description);

  // Canonical URL
  let canonicalTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonicalTag) {
    canonicalTag = document.createElement('link');
    canonicalTag.rel = 'canonical';
    document.head.appendChild(canonicalTag);
  }
  canonicalTag.href = `https://ortho.life${route}`;
};

// Check if we're in pre-rendering mode
export const isPrerendering = () => {
  return navigator.userAgent.includes('Chrome-Lighthouse') || 
         navigator.userAgent.includes('HeadlessChrome') ||
         window.location.search.includes('prerender=true');
};