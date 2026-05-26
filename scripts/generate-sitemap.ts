import fs from 'node:fs';
import path from 'node:path';
import { CATEGORY_METADATA, PRODUCTS, STATIC_BLOG_POSTS } from '../src/data';
import { normalizeProductSlug } from '../src/lib/productUrls';

type SitemapImage = {
  loc: string;
  title?: string;
  caption?: string;
};

type SitemapRoute = {
  path: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
  images?: SitemapImage[];
};

const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
const baseUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://www.ursport.vn').replace(/\/+$/, '');
const vietnamTimezoneOffset = 7 * 60 * 60 * 1000;
const today = new Date(Date.now() + vietnamTimezoneOffset).toISOString().slice(0, 10);

const xmlEscape = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const absoluteUrl = (pathOrUrl?: string) => {
  if (!pathOrUrl) return baseUrl;
  try {
    return new URL(pathOrUrl, `${baseUrl}/`).toString();
  } catch {
    return baseUrl;
  }
};

const cleanText = (value?: string, maxLength = 220) => String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const toDateString = (value: any) => {
  if (!value) return today;
  if (typeof value === 'string') {
    const vietnamDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    if (vietnamDate) {
      const [, day, month, year] = vietnamDate;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? today : date.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? today : date.toISOString().slice(0, 10);
  }
  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }
  return today;
};

const slugify = (value: string) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const imageList = (items: Array<string | undefined>, title: string, caption?: string) => {
  const seen = new Set<string>();
  return items
    .filter(Boolean)
    .map(item => absoluteUrl(item))
    .filter(loc => {
      if (seen.has(loc)) return false;
      seen.add(loc);
      return true;
    })
    .slice(0, 6)
    .map(loc => ({
      loc,
      title,
      caption: caption || title
    }));
};

const loadFirestoreRoutes = async (): Promise<{ productRoutes: SitemapRoute[]; blogRoutes: SitemapRoute[] } | null> => {
  if (process.env.SITEMAP_USE_FIRESTORE !== 'true') return null;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const appId = process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || 'sitemap-generator';

  if (!projectId || !apiKey) {
    console.warn('SITEMAP_USE_FIRESTORE=true but Firebase project id/api key is missing. Falling back to static routes.');
    return null;
  }

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, collection, getDocs } = await import('firebase/firestore');

    const app = getApps().length
      ? getApps()[0]
      : initializeApp({
          apiKey,
          projectId,
          appId,
          authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
        });
    const db = getFirestore(app);

    const [productsSnap, blogSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'blogPosts')),
    ]);

    const productRoutes = productsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as any)
      .filter(item => normalizeProductSlug(item.slug, item.id))
      .map(item => ({
        path: `/${normalizeProductSlug(item.slug, item.id)}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: toDateString(item.updatedAt || item.createdAt),
        images: imageList(item.images || [], item.name, item.metaDescription || item.description)
      }));

    const blogRoutes = blogSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as any)
      .filter(item => item.slug || item.id)
      .map(item => ({
        path: `/blog/${item.slug || slugify(item.title) || item.id}`,
        priority: '0.6',
        changefreq: 'monthly',
        lastmod: toDateString(item.updatedAt || item.createdAt || item.date),
        images: imageList([item.image, ...(item.images || [])], item.title, item.excerpt || item.metaDescription)
      }));

    console.log(`Loaded ${productRoutes.length} product URLs and ${blogRoutes.length} blog URLs from Firestore.`);
    return { productRoutes, blogRoutes };
  } catch (error: any) {
    console.warn(`Could not load Firestore sitemap data: ${error.message}. Falling back to static routes.`);
    return null;
  }
};

const seoSubcategoryRoutes: SitemapRoute[] = [
  { path: '/ao-thun-cotton-nam', priority: '0.75', changefreq: 'weekly' },
  { path: '/ao-thun-nam-form-rong', priority: '0.75', changefreq: 'weekly' }
];

const firestoreRoutes = await loadFirestoreRoutes();

const categoryRoutes: SitemapRoute[] = CATEGORY_METADATA.map(category => ({
  path: `/${category.slug}`,
  priority: category.slug === 'phu-kien-the-thao' ? '0.7' : '0.8',
  changefreq: 'weekly',
  images: imageList([category.icon], String(category.name), `Danh mục ${category.name} tại UR Sport`)
}));

const staticProductRoutes: SitemapRoute[] = PRODUCTS
  .filter(product => normalizeProductSlug(product.slug, product.id))
  .map(product => ({
    path: `/${normalizeProductSlug(product.slug, product.id)}`,
    priority: '0.7',
    changefreq: 'weekly',
    images: imageList(product.images || [], product.name, product.metaDescription || product.description)
  }));

const staticBlogRoutes: SitemapRoute[] = STATIC_BLOG_POSTS
  .filter(post => post.slug || post.id)
  .map(post => ({
    path: `/blog/${post.slug || post.id}`,
    priority: '0.6',
    changefreq: 'monthly',
    lastmod: toDateString(post.date),
    images: imageList([post.image, ...(post.images || [])], post.title, post.excerpt || post.metaDescription)
  }));

const staticBlogCategoryRoutes: SitemapRoute[] = Array.from(
  new Set(STATIC_BLOG_POSTS.map(post => slugify(post.category || '')).filter(Boolean))
).map(categorySlug => ({
  path: `/blog/category/${categorySlug}`,
  priority: '0.55',
  changefreq: 'monthly'
}));

const routes: SitemapRoute[] = [
  { path: '/', priority: '1.0', changefreq: 'daily', images: imageList(['/images/og-ursport.svg'], 'UR Sport') },
  { path: '/shop', priority: '0.9', changefreq: 'daily', images: imageList(PRODUCTS.slice(0, 6).map(product => product.images?.[0]), 'Shop đồ thể thao nam UR Sport') },
  { path: '/blog', priority: '0.7', changefreq: 'weekly', images: imageList(STATIC_BLOG_POSTS.slice(0, 6).map(post => post.image), 'Blog UR Sport') },
  ...categoryRoutes,
  ...seoSubcategoryRoutes,
  ...staticBlogCategoryRoutes,
  ...(firestoreRoutes?.productRoutes?.length ? firestoreRoutes.productRoutes : staticProductRoutes),
  ...(firestoreRoutes?.blogRoutes?.length ? firestoreRoutes.blogRoutes : staticBlogRoutes)
];

const uniqueRoutes = [...new Map(routes.map(route => [route.path, route])).values()];
const imageCount = uniqueRoutes.reduce((sum, route) => sum + (route.images?.length || 0), 0);

const renderImages = (images?: SitemapImage[]) => (images || []).flatMap(image => [
  '    <image:image>',
  `      <image:loc>${xmlEscape(image.loc)}</image:loc>`,
  image.title ? `      <image:title>${xmlEscape(cleanText(image.title, 110))}</image:title>` : '',
  image.caption ? `      <image:caption>${xmlEscape(cleanText(image.caption, 220))}</image:caption>` : '',
  '    </image:image>'
].filter(Boolean));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ...uniqueRoutes.flatMap(route => [
    '  <url>',
    `    <loc>${xmlEscape(`${baseUrl}${route.path}`)}</loc>`,
    `    <lastmod>${route.lastmod || today}</lastmod>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority}</priority>`,
    ...renderImages(route.images),
    '  </url>'
  ]),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(sitemapPath, xml);
console.log(`Generated ${uniqueRoutes.length} sitemap URLs with ${imageCount} images at ${sitemapPath}`);
