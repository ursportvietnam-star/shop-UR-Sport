import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const dataPath = path.join(rootDir, 'src', 'data.ts');
const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
const baseUrl = 'https://ursport.vn';
const vietnamTimezoneOffset = 7 * 60 * 60 * 1000;
const today = new Date(Date.now() + vietnamTimezoneOffset).toISOString().slice(0, 10);

const dataSource = fs.readFileSync(dataPath, 'utf8');

const categorySection = dataSource.split('export const CATEGORIES')[0] || dataSource;
const categorySlugs = [...categorySection.matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);

const productSection = (dataSource.split('export const PRODUCTS')[1] || '').split('export const BANNERS')[0] || '';
const productSlugs = [...productSection.matchAll(/slug:\s*['"]([^'"]+)['"]/g)]
  .map(match => match[1])
  .filter(slug => !categorySlugs.includes(slug));

const blogSection = dataSource.split('export const STATIC_BLOG_POSTS')[1] || '';
const blogSlugs = [...blogSection.matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);

const unique = values => [...new Set(values.filter(Boolean))];

const seoSubcategoryRoutes = [
  '/ao-thun-cotton-nam',
  '/ao-thun-nam-form-rong'
];

const routes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/blog', priority: '0.7', changefreq: 'weekly' },
  ...unique(categorySlugs).map(slug => ({
    path: `/${slug}`,
    priority: slug === 'phu-kien-the-thao' ? '0.7' : '0.8',
    changefreq: 'weekly'
  })),
  ...seoSubcategoryRoutes.map(path => ({
    path,
    priority: '0.75',
    changefreq: 'weekly'
  })),
  ...unique(productSlugs).map(slug => ({
    path: `/${slug}`,
    priority: '0.7',
    changefreq: 'weekly'
  })),
  ...unique(blogSlugs).map(slug => ({
    path: `/blog/${slug}`,
    priority: '0.6',
    changefreq: 'monthly'
  }))
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.flatMap(route => [
    '  <url>',
    `    <loc>${baseUrl}${route.path}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority}</priority>`,
    '  </url>'
  ]),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(sitemapPath, xml);
console.log(`Generated ${routes.length} sitemap URLs at ${sitemapPath}`);
