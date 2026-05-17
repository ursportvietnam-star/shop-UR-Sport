import fs from 'node:fs/promises';
import path from 'node:path';
import { CATEGORY_METADATA, PRODUCTS, STATIC_BLOG_POSTS } from '../src/data';
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  buildBreadcrumbSchema,
  buildSeoGraph,
  cleanSeoText,
  merchantReturnPolicySchema,
  offerShippingDetailsSchema
} from '../src/lib/seo';

type Snapshot = {
  route: string;
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  schema?: unknown;
};

const distDir = path.join(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

const cleanTitle = (value: string) => cleanSeoText(value, 90)
  .replace(/\s*\|\s*(Blog)?\s*$/i, '')
  .trim();

const toIsoDate = (value?: string) => {
  const text = String(value || '').trim();
  const vietnamDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (vietnamDate) {
    const [, day, month, year] = vietnamDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

const CATEGORY_FAQS: Record<string, { question: string; answer: string }[]> = {
  'ao-thun-nam': [
    {
      question: 'Nên chọn áo thun nam cotton hay áo thun thể thao?',
      answer: 'Nếu mặc hằng ngày, cotton là lựa chọn dễ chịu và tự nhiên. Nếu tập luyện hoặc vận động nhiều, áo thun thể thao với chất liệu nhanh khô, co giãn sẽ phù hợp hơn.'
    },
    {
      question: 'Áo thun nam form rộng hợp với dáng người nào?',
      answer: 'Form rộng hợp với người thích cảm giác thoải mái, vai ngang hoặc muốn phối theo phong cách streetwear. Người thấp nên chọn độ dài vừa phải để tránh bị nuốt dáng.'
    },
    {
      question: 'Làm sao chọn size áo thun nam online?',
      answer: 'Bạn nên đo ngang vai, vòng ngực và chiều dài áo đang mặc vừa nhất, sau đó đối chiếu bảng size của sản phẩm. Nếu ở giữa hai size, hãy chọn size lớn hơn khi thích mặc thoải mái.'
    },
    {
      question: 'Áo thun nam màu nào dễ phối đồ nhất?',
      answer: 'Trắng, đen, xám và xanh navy là các màu dễ phối nhất. Các màu này đi tốt với jean, kaki, jogger, quần short và áo khoác nhẹ.'
    }
  ]
};

const faqSchemaForCategory = (slug: string, route: string) => {
  const faqs = CATEGORY_FAQS[slug];
  if (!faqs?.length) return null;

  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(route)}#faq`,
    mainEntity: faqs.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };
};

const snapshotPath = (route: string) => {
  const cleanRoute = route.replace(/^\/+|\/+$/g, '');
  return cleanRoute ? path.join(distDir, cleanRoute, 'index.html') : indexPath;
};

const injectSeo = (html: string, snapshot: Snapshot) => {
  const canonical = absoluteUrl(snapshot.route);
  const title = cleanTitle(snapshot.title);
  const description = cleanSeoText(snapshot.description, 170);
  const image = absoluteUrl(snapshot.image || '/images/og-ursport.svg');
  const schema = snapshot.schema || buildSeoGraph();
  const keywords = cleanSeoText(snapshot.keywords || '', 240);
  const type = snapshot.type || 'website';

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="title" content="${escapeHtml(title)}" />`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}" />` : '',
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />',
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(title)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    '<meta property="og:locale" content="vi_VN" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<script type="application/ld+json" data-seo-snapshot="true">${safeJson(schema)}</script>`
  ].filter(Boolean).join('\n    ');

  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+name=["']title["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name=["']keywords["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/\s*<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>\s*/gi, '');

  return cleaned.replace(/<head>/i, `<head>\n    ${tags}`);
};

const productSnapshot = (product: (typeof PRODUCTS)[number]): Snapshot => {
  const route = `/${product.slug}`;
  const productUrl = absoluteUrl(route);
  const category = CATEGORY_METADATA.find(item => item.name === product.category);
  const categoryUrl = category ? `/${category.slug}` : '/shop';
  const productSchema: any = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    image: (product.images || []).map(absoluteUrl),
    description: cleanSeoText(product.metaDescription || product.description, 500),
    sku: product.id,
    category: product.category,
    color: product.colors,
    size: product.sizes,
    material: product.material,
    brand: {
      '@type': 'Brand',
      name: product.brand || SITE_NAME
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'VND',
      price: product.discountPrice || product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: offerShippingDetailsSchema,
      hasMerchantReturnPolicy: merchantReturnPolicySchema,
      seller: { '@id': `${SITE_URL}/#organization` }
    }
  };

  if ((product.reviewsCount || 0) > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 5,
      reviewCount: product.reviewsCount
    };
  }

  return {
    route,
    title: product.seoTitle || `${product.name} | ${SITE_NAME}`,
    description: product.metaDescription || product.description,
    keywords: product.keywords || `${product.name}, ${product.category}, UR Sport`,
    image: product.images?.[0],
    type: 'product',
    schema: buildSeoGraph(
      productSchema,
      buildBreadcrumbSchema([
        { name: 'Trang chủ', url: '/' },
        { name: String(product.category), url: categoryUrl },
        { name: product.name, url: route }
      ])
    )
  };
};

const categorySnapshot = (category: (typeof CATEGORY_METADATA)[number]): Snapshot => {
  const route = `/${category.slug}`;
  const categoryProducts = PRODUCTS.filter(product => product.category === category.name).slice(0, 12);

  return {
    route,
    title: `${category.name} | ${SITE_NAME}`,
    description: `Mua ${category.name.toLowerCase()} tại ${SITE_NAME}. Sản phẩm thể thao nam dễ mặc, thoải mái, có nhiều lựa chọn size và màu.`,
    keywords: `${category.name}, thời trang thể thao nam, UR Sport`,
    image: category.icon,
    type: 'website',
    schema: buildSeoGraph(
      {
        '@type': 'CollectionPage',
        '@id': `${absoluteUrl(route)}#collection`,
        name: category.name,
        url: absoluteUrl(route),
        description: `Bộ sưu tập ${category.name} tại ${SITE_NAME}.`
      },
      {
        '@type': 'ItemList',
        '@id': `${absoluteUrl(route)}#items`,
        itemListElement: categoryProducts.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(`/${product.slug}`),
          name: product.name
        }))
      },
      buildBreadcrumbSchema([
        { name: 'Trang chủ', url: '/' },
        { name: String(category.name), url: route }
      ]),
      faqSchemaForCategory(category.slug, route)
    )
  };
};

const blogSnapshot = (post: (typeof STATIC_BLOG_POSTS)[number]): Snapshot => {
  const slug = post.slug || post.id;
  const route = `/blog/${slug}`;
  const image = post.image || '/images/og-ursport.svg';
  const date = toIsoDate(post.date);

  return {
    route,
    title: post.seoTitle || `${post.title} | Blog ${SITE_NAME}`,
    description: post.metaDescription || post.excerpt || post.content,
    keywords: `${post.title}, ${post.category}, UR Sport`,
    image,
    type: 'article',
    schema: buildSeoGraph(
      {
        '@type': 'Article',
        '@id': `${absoluteUrl(route)}#article`,
        headline: post.title,
        description: cleanSeoText(post.metaDescription || post.excerpt || post.content, 220),
        image: absoluteUrl(image),
        ...(date ? { datePublished: date, dateModified: date } : {}),
        author: {
          '@type': 'Person',
          name: post.author || SITE_NAME
        },
        publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntityOfPage: absoluteUrl(route),
        inLanguage: 'vi-VN'
      },
      buildBreadcrumbSchema([
        { name: 'Trang chủ', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: post.title, url: route }
      ])
    )
  };
};

const shopSnapshot = (): Snapshot => ({
  route: '/shop',
  title: `Shop đồ thể thao nam | ${SITE_NAME}`,
  description: `Khám phá sản phẩm thể thao nam tại ${SITE_NAME}: áo thun, áo polo, quần thể thao và phụ kiện dễ mặc hằng ngày.`,
  keywords: 'đồ thể thao nam, áo thun nam, áo polo nam, quần thể thao nam, UR Sport',
  image: '/images/og-ursport.svg',
  schema: buildSeoGraph({
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl('/shop')}#collection`,
    name: `Shop ${SITE_NAME}`,
    url: absoluteUrl('/shop'),
    description: `Danh sách sản phẩm thể thao nam của ${SITE_NAME}.`
  })
});

const blogIndexSnapshot = (): Snapshot => ({
  route: '/blog',
  title: `Blog thời trang thể thao nam | ${SITE_NAME}`,
  description: `Kiến thức chọn áo thun, áo polo, chất liệu và cách phối đồ thể thao nam từ ${SITE_NAME}.`,
  keywords: 'blog thời trang nam, áo thun nam, áo polo nam, đồ thể thao nam',
  image: '/images/og-ursport.svg',
  schema: buildSeoGraph({
    '@type': 'Blog',
    '@id': `${absoluteUrl('/blog')}#blog`,
    name: `Blog ${SITE_NAME}`,
    url: absoluteUrl('/blog'),
    inLanguage: 'vi-VN'
  })
});

const run = async () => {
  const indexHtml = await fs.readFile(indexPath, 'utf8');
  const snapshots: Snapshot[] = [
    shopSnapshot(),
    blogIndexSnapshot(),
    ...CATEGORY_METADATA.map(categorySnapshot),
    ...PRODUCTS.filter(product => product.slug).map(productSnapshot),
    ...STATIC_BLOG_POSTS.filter(post => post.slug || post.id).map(blogSnapshot)
  ];

  const uniqueSnapshots = [...new Map(snapshots.map(snapshot => [snapshot.route, snapshot])).values()];

  for (const snapshot of uniqueSnapshots) {
    const filePath = snapshotPath(snapshot.route);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, injectSeo(indexHtml, snapshot), 'utf8');
  }

  console.log(`Generated ${uniqueSnapshots.length} SEO HTML snapshots.`);
};

run().catch(error => {
  console.error('SEO snapshot generation failed:', error);
  process.exit(1);
});
