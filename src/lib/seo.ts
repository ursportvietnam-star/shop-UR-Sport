import { stripHtml } from './utils';

export const SITE_URL = 'https://ursport.vn';
export const SITE_NAME = 'UR Sport';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.svg`;
export const BRAND_PHONE = '+84917722425';

export const cleanSeoText = (value?: string, maxLength = 160) => {
  return stripHtml(String(value || ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

export const absoluteUrl = (pathOrUrl?: string) => {
  if (!pathOrUrl) return SITE_URL;
  try {
    return new URL(pathOrUrl, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
};

export const canonicalUrl = (canonical?: string) => {
  if (canonical) {
    try {
      const url = new URL(canonical, SITE_URL);
      if (url.hostname === 'shop-ur-sport.vercel.app' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return `${SITE_URL}${url.pathname}`;
      }
      return url.toString();
    } catch {
      return SITE_URL;
    }
  }
  if (typeof window === 'undefined') return SITE_URL;
  return absoluteUrl(window.location.pathname);
};

export const normalizeImageUrl = (image?: string) => absoluteUrl(image || DEFAULT_OG_IMAGE);

export const organizationSchema = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: BRAND_PHONE,
    contactType: 'customer support',
    areaServed: 'VN',
    availableLanguage: ['vi']
  },
  sameAs: [
    'https://www.facebook.com/ursportvietnam',
    'https://www.tiktok.com/@ursportvietnam'
  ]
};

export const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'vi-VN',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/shop?search={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
};

export const buildBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  '@type': 'BreadcrumbList',
  '@id': `${absoluteUrl(items[items.length - 1]?.url || '/')}/#breadcrumb`,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.url)
  }))
});

export const buildSeoGraph = (...nodes: any[]) => ({
  '@context': 'https://schema.org',
  '@graph': [
    organizationSchema,
    websiteSchema,
    ...nodes.filter(Boolean)
  ]
});
