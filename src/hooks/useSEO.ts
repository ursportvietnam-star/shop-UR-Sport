import { useEffect } from 'react';
import { stripHtml } from '../lib/utils';


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

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  robots = 'index, follow',
  image = '/favicon.svg',
  type = 'website',
  schema
}: SEOProps) {
  useEffect(() => {
    try {
      const baseUrl = 'https://shop-ur-sport.vercel.app';
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const finalCanonical = canonical || currentUrl;

      // 1. Update Title
      const cleanTitle = stripHtml(Array.isArray(title) ? title.join('') : String(title || ''));
      if (cleanTitle) {
        document.title = cleanTitle;
      }

      const cleanDescription = stripHtml(description || '').slice(0, 160);

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
        let el = document.head.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
        if (!el) {
          el = document.createElement('script');
          el.setAttribute('type', 'application/ld+json');
          document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(data);
      };

      // --- Standard Meta Tags ---
      injectMeta('name', 'description', cleanDescription);
      injectMeta('name', 'keywords', keywords || '');
      injectMeta('name', 'robots', robots);
      injectLink('canonical', finalCanonical);

      // --- Open Graph / Facebook ---
      injectMeta('property', 'og:type', type);
      injectMeta('property', 'og:url', finalCanonical);
      injectMeta('property', 'og:title', cleanTitle);
      injectMeta('property', 'og:description', cleanDescription);
      injectMeta('property', 'og:image', image.startsWith('http') ? image : `${baseUrl}${image}`);

      // --- Twitter Card ---
      injectMeta('name', 'twitter:card', 'summary_large_image');
      injectMeta('name', 'twitter:url', finalCanonical);
      injectMeta('name', 'twitter:title', cleanTitle);
      injectMeta('name', 'twitter:description', cleanDescription);
      injectMeta('name', 'twitter:image', image.startsWith('http') ? image : `${baseUrl}${image}`);

      // --- Schema / JSON-LD ---
      if (schema) {
        injectSchema(schema);
      } else {
        injectSchema({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "UR Sport",
          "url": baseUrl,
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${baseUrl}/shop?search={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        });
      }
    } catch (error) {
      console.error("SEO Error:", error);
    }
  }, [title, description, keywords, canonical, robots, image, type, schema]);
}
