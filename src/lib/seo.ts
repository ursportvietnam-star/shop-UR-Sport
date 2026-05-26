import { stripHtml } from './utils';

const siteUrlFromEnv = (import.meta as ImportMeta & { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL;

export const SITE_URL = (siteUrlFromEnv || 'https://www.ursport.vn').replace(/\/+$/, '');
export const SITE_NAME = 'UR Sport';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-ursport.svg`;
export const BRAND_PHONE = '+84917722425';
const CANONICAL_HOSTS = new Set([
  'shop-ur-sport.vercel.app',
  'ursport.vn',
  'www.ursport.vn',
  'localhost',
  '127.0.0.1'
]);

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
      if (CANONICAL_HOSTS.has(url.hostname)) {
        return `${SITE_URL}${url.pathname}${url.search}`;
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

export const merchantReturnPolicySchema = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'VN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn'
};

export const offerShippingDetailsSchema = {
  '@type': 'OfferShippingDetails',
  shippingDestination: {
    '@type': 'DefinedRegion',
    addressCountry: 'VN'
  },
  shippingRate: {
    '@type': 'MonetaryAmount',
    value: 0,
    currency: 'VND'
  },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: {
      '@type': 'QuantitativeValue',
      minValue: 0,
      maxValue: 2,
      unitCode: 'DAY'
    },
    transitTime: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 5,
      unitCode: 'DAY'
    }
  }
};

export const organizationSchema = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  hasMerchantReturnPolicy: merchantReturnPolicySchema,
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

export const localBusinessSchema = {
  '@type': 'SportsActivityLocation',
  '@id': `${SITE_URL}/#localbusiness`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  image: DEFAULT_OG_IMAGE,
  telephone: BRAND_PHONE,
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Số 123 Đường Thể Thao, Quận 1',
    addressLocality: 'Thành phố Hồ Chí Minh',
    addressRegion: 'Thành phố Hồ Chí Minh',
    postalCode: '700000',
    addressCountry: 'VN'
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 10.776889,
    longitude: 106.700806
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '08:00',
      closes: '22:00'
    }
  ],
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
