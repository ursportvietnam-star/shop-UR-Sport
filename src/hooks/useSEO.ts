import { useEffect } from 'react';
import {
  SITE_NAME,
  absoluteUrl,
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
  customSchema?: string;
}

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  robots = 'index, follow',
  image = '/images/og-ursport.jpg',
  type = 'website',
  schema,
  customSchema
}: SEOProps) {
  useEffect(() => {
    try {
      const finalCanonical = canonicalUrl(canonical);
      const finalImage = normalizeImageUrl(image);

      // 1. Update Title
      const cleanTitle = cleanSeoText(Array.isArray(title) ? title.join('') : String(title || ''), 70);
      if (cleanTitle) {
        document.title = cleanTitle;
      }

      const cleanDescription = cleanSeoText(description, 160);

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
      };

      const removeMeta = (attr: string, attrValue: string) => {
        document.head.querySelectorAll(`meta[${attr}="${attrValue}"]`).forEach(el => el.remove());
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
      };

      // --- Standard Meta Tags ---
      injectMeta('name', 'description', cleanDescription);
      injectMeta('name', 'keywords', keywords || '');
      injectMeta('name', 'robots', robots);
      injectMeta('name', 'author', 'UR Sport Team');
      injectMeta('name', 'theme-color', '#1e4b64');
      injectLink('canonical', finalCanonical);

      // --- Open Graph / Facebook ---
      injectMeta('property', 'og:type', type);
      injectMeta('property', 'og:url', finalCanonical);
      injectMeta('property', 'og:title', cleanTitle);
      injectMeta('property', 'og:description', cleanDescription);
      injectMeta('property', 'og:image', finalImage);
      injectMeta('property', 'og:image:secure_url', finalImage);
      injectMeta('property', 'og:image:width', '1200');
      injectMeta('property', 'og:image:height', '630');
      injectMeta('property', 'og:image:type', 'image/jpeg');
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

      // Product/article-only tags should not leak between route changes.
      if (type !== 'article') {
        removeMeta('property', 'article:author');
        removeMeta('property', 'article:published_time');
      }

      // --- Schema / JSON-LD ---
      injectSchema(schema || buildSeoGraph());

      // --- Custom Schema ---
      const injectCustomSchema = (schemaStr: string) => {
        let el = document.head.querySelector('script[type="application/ld+json"][data-seo-schema="custom"]') as HTMLScriptElement;
        if (schemaStr) {
          if (!el) {
            el = document.createElement('script');
            el.setAttribute('type', 'application/ld+json');
            el.setAttribute('data-seo-schema', 'custom');
            document.head.appendChild(el);
          }
          let cleanStr = schemaStr;
          const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
          const match = scriptRegex.exec(schemaStr);
          if (match && match[1]) {
            cleanStr = match[1];
          }
          el.textContent = cleanStr.replace(/</g, '\\u003c');
        } else if (el) {
          el.remove();
        }
      };
      
      injectCustomSchema(customSchema || '');

      return () => {
        const customEl = document.head.querySelector('script[type="application/ld+json"][data-seo-schema="custom"]');
        if (customEl) customEl.remove();
        const primaryEl = document.head.querySelector('script[type="application/ld+json"][data-seo-schema="primary"]');
        if (primaryEl) primaryEl.remove();
      };
    } catch (error) {
      console.error("SEO Error:", error);
    }
  }, [title, description, keywords, canonical, robots, image, type, schema, customSchema]);
}
