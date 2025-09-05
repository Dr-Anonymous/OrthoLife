import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export const useSEO = ({
  title = 'OrthoLife - Expert Orthopaedic Care',
  description = 'OrthoLife offers expert orthopaedic care for fractures, sports injuries, spine, joint, and orthobiologic treatments. Get back to health, doing what you love—stronger, faster, pain-free.',
  keywords = 'orthopaedic, orthopedic, fracture, sports injury, spine, joint, bone, physiotherapy, rehabilitation',
  image = 'https://vqskeanwpnvuyxorymib.supabase.co/storage/v1/object/public/post_images/landing%20pics/cover.jpeg',
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
}: SEOProps) => {
  useEffect(() => {
    // Set page title
    document.title = title;

    // Helper function to set or update meta tag
    const setMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Helper function to set or update Open Graph meta tag
    const setOGMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Helper function to set canonical URL
    const setCanonicalURL = (href: string) => {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = href;
    };

    // Set basic meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    setMetaTag('robots', 'index, follow');
    setMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Set Open Graph tags
    setOGMetaTag('og:title', title);
    setOGMetaTag('og:description', description);
    setOGMetaTag('og:image', image);
    setOGMetaTag('og:type', type);
    setOGMetaTag('og:site_name', 'OrthoLife');

    // Set Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);

    // Set article-specific tags
    if (type === 'article') {
      if (author) setMetaTag('article:author', author);
      if (publishedTime) setOGMetaTag('article:published_time', publishedTime);
      if (modifiedTime) setOGMetaTag('article:modified_time', modifiedTime);
    }

    // Set canonical URL if provided
    if (url) {
      setCanonicalURL(url);
      setOGMetaTag('og:url', url);
    }

    // Cleanup function
    return () => {
      document.title = 'OrthoLife';
    };
  }, [title, description, keywords, image, url, type, author, publishedTime, modifiedTime]);
};