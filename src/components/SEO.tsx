import React from 'react';
import {
  SITE_NAME,
  buildSeoGraph,
  canonicalUrl,
  cleanSeoText,
  normalizeImageUrl
} from '../lib/seo';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  schema?: any;
}

/**
 * @deprecated Use useSEO hook from src/hooks/useSEO.ts instead of this component.
 * This component is retained for backwards compatibility but is no longer maintained.
 */
export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonical,
  robots = 'index, follow',
  image = '/favicon.svg',
  type = 'website',
  schema
}) => {
  const finalCanonical = canonicalUrl(canonical);

  React.useEffect(() => {
    try {
      // 1. Update Title
      const cleanTitle = cleanSeoText(Array.isArray(title) ? title.join('') : String(title || ''), 70);
      if (cleanTitle) {
        document.title = cleanTitle;
      }

      const cleanDescription = cleanSeoText(description, 160);
      const finalImage = normalizeImageUrl(image);

      const injectedElements: HTMLElement[] = [];

      // Helper to inject/update meta tags
      const injectMeta = (attr: string, attrValue: string, content: string) => {
        if (!content) return;
        let el = document.head.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement;
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attr, attrValue);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
        injectedElements.push(el);
      };

      // Helper to inject/update link tags
      const injectLink = (rel: string, href: string) => {
        if (!href) return;
        let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
        if (!el) {
          el = document.createElement('link');
          el.setAttribute('rel', rel);
          document.head.appendChild(el);
        }
        el.setAttribute('href', href);
        injectedElements.push(el);
      };

      // Helper to inject Schema JSON-LD
      const injectSchema = (data: any) => {
        if (!data) return;
        let el = document.head.querySelector('script[type="application/ld+json"][data-seo-schema="primary"]') as HTMLScriptElement;
        if (!el) {
          el = document.createElement('script');
          el.setAttribute('type', 'application/ld+json');
          el.setAttribute('data-seo-schema', 'primary');
          document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
        injectedElements.push(el);
      };

      // --- Standard Meta Tags ---
      injectMeta('name', 'description', cleanDescription);
      injectMeta('name', 'keywords', keywords || '');
      injectMeta('name', 'robots', robots);
      injectMeta('name', 'author', 'UR Sport Team');
      injectLink('canonical', finalCanonical);

      // --- Open Graph / Facebook ---
      injectMeta('property', 'og:type', type);
      injectMeta('property', 'og:url', finalCanonical);
      injectMeta('property', 'og:title', cleanTitle);
      injectMeta('property', 'og:description', cleanDescription);
      injectMeta('property', 'og:image', finalImage);
      injectMeta('property', 'og:image:secure_url', finalImage);
      injectMeta('property', 'og:image:alt', cleanTitle || SITE_NAME);
      injectMeta('property', 'og:site_name', SITE_NAME);
      injectMeta('property', 'og:locale', 'vi_VN');

      // --- Twitter Card ---
      injectMeta('name', 'twitter:card', 'summary_large_image');
      injectMeta('name', 'twitter:url', finalCanonical);
      injectMeta('name', 'twitter:title', cleanTitle);
      injectMeta('name', 'twitter:description', cleanDescription);
      injectMeta('name', 'twitter:image', finalImage);
      injectMeta('name', 'twitter:image:alt', cleanTitle || SITE_NAME);
      injectMeta('name', 'twitter:site', '@ursportvietnam');
      injectMeta('name', 'twitter:creator', '@ursportvietnam');

      // --- Language alternates ---
      const setAlternate = (href: string, hreflang: string) => {
        if (!href) return;
        let el = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`) as HTMLLinkElement | null;
        if (!el) {
          el = document.createElement('link');
          el.setAttribute('rel', 'alternate');
          el.setAttribute('hreflang', hreflang);
          document.head.appendChild(el);
        }
        el.setAttribute('href', href);
      };
      setAlternate(finalCanonical, 'vi');
      setAlternate(finalCanonical, 'x-default');

      // --- Schema / JSON-LD ---
      injectSchema(schema || buildSeoGraph());
    } catch (error) {
      console.error("SEO Error:", error);
    }
  }, [title, description, keywords, finalCanonical, robots, image, type, schema]);

  return null; // This component doesn't render anything to DOM
};
