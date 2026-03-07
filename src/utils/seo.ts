const SITE_URL = 'https://ortho.life';
const DEFAULT_IMAGE = 'https://ortho.life/favicon/android-chrome-512x512.png';

type JsonLdObject = Record<string, unknown>;

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  canonicalUrl?: string;
  ogType?: string;
  image?: string;
  keywords?: string;
  noindex?: boolean;
  jsonLd?: JsonLdObject | JsonLdObject[];
}

const upsertMetaTag = (name: string, content: string, useProperty = false) => {
  const attribute = useProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
};

const normalizePath = (path?: string) => {
  if (!path || path === '/') {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
};

const setCanonical = (canonicalHref: string) => {
  let canonicalTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!canonicalTag) {
    canonicalTag = document.createElement('link');
    canonicalTag.rel = 'canonical';
    document.head.appendChild(canonicalTag);
  }

  canonicalTag.href = canonicalHref;
};

const setJsonLd = (jsonLd?: JsonLdObject | JsonLdObject[]) => {
  const existingScripts = document.querySelectorAll('script[data-seo-json-ld="true"]');
  existingScripts.forEach((script) => script.remove());

  if (!jsonLd) return;

  const entries = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  entries.forEach((entry) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-json-ld', 'true');
    script.text = JSON.stringify(entry);
    document.head.appendChild(script);
  });
};

export const applySeo = (config: SeoConfig) => {
  if (typeof document === 'undefined') {
    return;
  }

  const canonicalPath = normalizePath(config.canonicalPath);
  const canonicalUrl = config.canonicalUrl || `${SITE_URL}${canonicalPath}`;

  // Ensure image is absolute
  let image = config.image || DEFAULT_IMAGE;
  if (image.startsWith('/')) {
    image = `${SITE_URL}${image}`;
  }

  document.title = config.title;

  upsertMetaTag('description', config.description);
  upsertMetaTag('keywords', config.keywords || 'orthopaedic clinic, orthopaedic surgeon, joint replacement, fracture care, arthroscopy');
  upsertMetaTag('robots', config.noindex ? 'noindex, nofollow' : 'index, follow');

  // Open Graph / Facebook
  upsertMetaTag('og:title', config.title, true);
  upsertMetaTag('og:description', config.description, true);
  upsertMetaTag('og:type', config.ogType || 'website', true);
  upsertMetaTag('og:url', canonicalUrl, true);
  upsertMetaTag('og:image', image, true);
  upsertMetaTag('og:image:alt', config.title, true);
  upsertMetaTag('og:site_name', 'OrthoLife', true);
  upsertMetaTag('og:locale', 'en_US', true);

  // Recommended for Facebook to show image on first share
  upsertMetaTag('og:image:width', '1200', true);
  upsertMetaTag('og:image:height', '630', true);

  // Twitter
  upsertMetaTag('twitter:card', 'summary_large_image');
  upsertMetaTag('twitter:title', config.title);
  upsertMetaTag('twitter:description', config.description);
  upsertMetaTag('twitter:image', image);
  upsertMetaTag('twitter:image:alt', config.title);
  upsertMetaTag('twitter:url', canonicalUrl);

  setCanonical(canonicalUrl);
  setJsonLd(config.jsonLd);

  // Signal pre-renderer that metadata is ready
  if (typeof document !== 'undefined') {
    document.body.setAttribute('data-seo-ready', 'true');
    document.dispatchEvent(new Event('data-prerender-ready'));
  }
};

export const buildBreadcrumbJsonLd = (items: Array<{ name: string; path: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${SITE_URL}${normalizePath(item.path)}`
  }))
});
