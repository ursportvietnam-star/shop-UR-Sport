import fs from 'node:fs/promises';
import path from 'node:path';
import { CATEGORY_METADATA, PRODUCTS, STATIC_BLOG_POSTS } from '../src/data';
import { CATEGORY_DEFAULT_SEO } from '../src/data/categoryLandingContent';
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  buildBreadcrumbSchema,
  buildSeoGraph,
  cleanSeoText,
  merchantReturnPolicySchema,
  offerShippingDetailsSchema,
  localBusinessSchema
} from '../src/lib/seo';
import { getProductPath } from '../src/lib/productUrls';

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
  ],
  'ao-thun-the-thao-nam': [
    {
      question: 'Áo thun thể thao UR Sport dùng chất liệu gì và có mát không?',
      answer: 'Áo thun thể thao UR Sport được làm từ chất liệu thun lạnh cao cấp (90% Polyester và 10% Spandex) tích hợp công nghệ Pro-Dry dệt 3D siêu thoáng khí, thấm hút mồ hôi cực nhanh và đem lại cảm giác mát lạnh tức thì khi mặc.'
    },
    {
      question: 'Làm thế nào để chọn size áo thun thể thao nam chuẩn nhất?',
      answer: 'Bạn nên dựa vào chiều cao, cân nặng và tham khảo bảng size chi tiết của UR Sport. Nếu bạn muốn mặc ôm body để tập luyện tốt hơn, hãy chọn đúng size. Nếu muốn thoải mái khi vận động hằng ngày, nên tăng 1 size.'
    },
    {
      question: 'Áo thun thể thao nam của shop có bị bay màu hay co rút sau khi giặt không?',
      answer: 'Không. Với công nghệ hoàn tất sợi hiện đại, các dòng áo thun thể thao UR Sport giữ màu cực tốt, không bị co rút hay xơ vải sau khi giặt máy nhiều lần.'
    },
    {
      question: 'Mua áo thun thể thao UR Sport ở đâu uy tín và có được đổi trả không?',
      answer: 'Bạn có thể mua trực tiếp tại website chính thức ursport.vn. UR Sport hỗ trợ đổi trả miễn phí trong vòng 7 ngày nếu sản phẩm có lỗi từ nhà sản xuất hoặc không vừa size.'
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

const assetPrefixForRoute = (route: string) => {
  const cleanRoute = route.replace(/^\/+|\/+$/g, '');
  if (!cleanRoute) return './assets/';
  const depth = cleanRoute.split('/').filter(Boolean).length;
  return `${'../'.repeat(depth)}assets/`;
};

const injectSeo = (html: string, snapshot: Snapshot) => {
  const canonical = absoluteUrl(snapshot.route);
  const title = cleanTitle(snapshot.title);
  const description = cleanSeoText(snapshot.description, 170);
  const image = absoluteUrl(snapshot.image || '/images/og-ursport.jpg');
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
    `<link rel="alternate" hreflang="vi" href="${escapeHtml(canonical)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}" />`,
    `<script type="application/ld+json" data-seo-snapshot="true">${safeJson(schema)}</script>`
  ].filter(Boolean).join('\n    ');

  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+name=["']title["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name=["']keywords["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/\s*<link\s+rel=["']alternate["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/\s*<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>\s*/gi, '');

  return cleaned
    .replace(/(src|href)="\.\/assets\//g, `$1="${assetPrefixForRoute(snapshot.route)}`)
    .replace(/<head>/i, `<head>\n    ${tags}`);
};

const faqSchemaForProduct = (product: (typeof PRODUCTS)[number]) => {
  const route = getProductPath(product);
  const returnDays = merchantReturnPolicySchema.merchantReturnDays || 7;
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(route)}#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: `Chính sách đổi trả sản phẩm ${product.name} tại UR Sport như thế nào?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `UR Sport hỗ trợ khách hàng đổi trả sản phẩm ${product.name} miễn phí trong vòng ${returnDays} ngày kể từ ngày nhận hàng với bất kỳ lý do gì, miễn là sản phẩm còn nguyên tem mác, chưa qua sử dụng và chưa giặt tẩy.`
        }
      },
      {
        '@type': 'Question',
        name: `Sản phẩm ${product.name} có phù hợp để tập thể thao hay mặc hằng ngày không?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Sản phẩm ${product.name} thuộc danh mục ${product.category} được thiết kế với kiểu dáng thể thao hiện đại, tối ưu cho cả vận động thể chất lẫn mặc hằng ngày. Chất liệu ${product.material || 'cao cấp'} thoáng khí, co giãn tốt mang lại cảm giác dễ chịu suốt cả ngày.`
        }
      },
      {
        '@type': 'Question',
        name: `Thời gian và chi phí giao hàng khi mua ${product.name} là bao nhiêu?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `UR Sport hỗ trợ vận chuyển nhanh toàn quốc từ 1 đến 5 ngày tùy khu vực. Đặc biệt, tất cả đơn đặt hàng mua ${product.name} đều được miễn phí vận chuyển 100%.`
        }
      }
    ]
  };
};

const productSnapshot = (product: (typeof PRODUCTS)[number]): Snapshot => {
  const route = getProductPath(product);
  const productUrl = absoluteUrl(route);
  const category = CATEGORY_METADATA.find(item => item.name === product.category);
  const categoryUrl = category ? `/${category.slug}` : '/shop';
  const nextYear = new Date().getFullYear() + 1;
  const priceValidUntil = `${nextYear}-12-31`;

  const productSchema: any = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    image: (product.images || []).map(absoluteUrl),
    description: cleanSeoText(product.metaDescription || product.description, 500),
    sku: product.id,
    mpn: product.id,
    category: product.category,
    color: product.colors,
    size: product.sizes,
    material: product.material,
    brand: {
      '@type': 'Brand',
      name: product.brand || SITE_NAME,
      logo: absoluteUrl('/images/og-ursport.svg'),
      url: SITE_URL
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'VND',
      price: product.discountPrice || product.price,
      priceValidUntil,
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
      ]),
      faqSchemaForProduct(product)
    )
  };
};

const categorySnapshot = (category: (typeof CATEGORY_METADATA)[number]): Snapshot => {
  const route = `/${category.slug}`;
  const categoryProducts = PRODUCTS.filter(product => product.category === category.name).slice(0, 12);
  const defaultSeo = CATEGORY_DEFAULT_SEO[category.slug] || {
    title: `${category.name} | ${SITE_NAME}`,
    description: `Mua ${category.name.toLowerCase()} tại ${SITE_NAME}. Sản phẩm thể thao nam dễ mặc, thoải mái, có nhiều lựa chọn size và màu.`,
    keywords: `${category.name}, thời trang thể thao nam, UR Sport`
  };

  return {
    route,
    title: defaultSeo.title,
    description: defaultSeo.description,
    keywords: defaultSeo.keywords,
    image: category.icon,
    type: 'website',
    schema: buildSeoGraph(
      {
        '@type': 'CollectionPage',
        '@id': `${absoluteUrl(route)}#collection`,
        name: category.name,
        url: absoluteUrl(route),
        description: defaultSeo.description
      },
      {
        '@type': 'ItemList',
        '@id': `${absoluteUrl(route)}#items`,
        itemListElement: categoryProducts.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(getProductPath(product)),
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

const seoSubcategorySnapshots = (): Snapshot[] => [
  {
    route: '/ao-thun-cotton-nam',
    title: 'Áo Thun Cotton Nam Mềm Mát, Thoáng Khí | UR Sport',
    description: 'Khám phá áo thun cotton nam mềm mát tại UR Sport. Chất vải dễ chịu, thoáng khí, dễ phối đồ, phù hợp mặc hằng ngày trong thời tiết nóng.',
    keywords: 'áo thun cotton nam, áo thun nam cotton, áo cotton nam, áo thun nam thoáng mát'
  },
  {
    route: '/ao-thun-nam-form-rong',
    title: 'Áo Thun Nam Form Rộng, Oversize Cá Tính | UR Sport',
    description: 'Mua áo thun nam form rộng tại UR Sport. Kiểu dáng oversize thoải mái, trẻ trung, dễ phối streetwear, phù hợp đi chơi và mặc hằng ngày.',
    keywords: 'áo thun nam form rộng, áo thun oversize nam, áo form rộng nam, áo thun nam streetwear'
  }
].map(snapshot => ({
  ...snapshot,
  image: '/images/og-ursport.jpg',
  type: 'website',
  schema: buildSeoGraph(
    {
      '@type': 'CollectionPage',
      '@id': `${absoluteUrl(snapshot.route)}#collection`,
      name: snapshot.title,
      url: absoluteUrl(snapshot.route),
      description: snapshot.description
    },
    buildBreadcrumbSchema([
      { name: 'Trang chủ', url: '/' },
      { name: 'Áo thun nam', url: '/ao-thun-nam' },
      { name: snapshot.title.split(' | ')[0], url: snapshot.route }
    ])
  )
}));

const blogSnapshot = (post: (typeof STATIC_BLOG_POSTS)[number]): Snapshot => {
  const slug = post.slug || post.id;
  const route = `/blog/${slug}`;
  const image = post.image || '/images/og-ursport.jpg';
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
  image: '/images/og-ursport.jpg',
  schema: buildSeoGraph(
    {
      '@type': 'CollectionPage',
      '@id': `${absoluteUrl('/shop')}#collection`,
      name: `Shop ${SITE_NAME}`,
      url: absoluteUrl('/shop'),
      description: `Danh sách sản phẩm thể thao nam của ${SITE_NAME}.`
    },
    localBusinessSchema
  )
});

const homeSnapshot = (): Snapshot => ({
  route: '/',
  title: `UR Sport - Phong Cách Thể Thao Đẳng Cấp | Áo Thun, Áo Polo Nam`,
  description: `Khám phá bộ sưu tập thời trang thể thao nam cao cấp tại UR Sport. Chuyên cung cấp áo thun, áo polo nam chất lượng, phong cách và bền bỉ. Miễn phí vận chuyển toàn quốc.`,
  keywords: `ur sport, thời trang thể thao nam, áo thun nam, áo polo nam, quần thể thao, phụ kiện thể thao, đồ tập gym nam`,
  image: '/images/og-ursport.jpg',
  schema: buildSeoGraph(localBusinessSchema)
});

const blogIndexSnapshot = (): Snapshot => ({
  route: '/blog',
  title: `Blog thời trang thể thao nam | ${SITE_NAME}`,
  description: `Kiến thức chọn áo thun, áo polo, chất liệu và cách phối đồ thể thao nam từ ${SITE_NAME}.`,
  keywords: 'blog thời trang nam, áo thun nam, áo polo nam, đồ thể thao nam',
  image: '/images/og-ursport.jpg',
  schema: buildSeoGraph({
    '@type': 'Blog',
    '@id': `${absoluteUrl('/blog')}#blog`,
    name: `Blog ${SITE_NAME}`,
    url: absoluteUrl('/blog'),
    inLanguage: 'vi-VN'
  })
});

const optimizedBlogIndexSnapshot = (): Snapshot => ({
  route: '/blog',
  title: `Blog Đồ Thể Thao Nam: Áo Thun, Đồ Gym | ${SITE_NAME}`,
  description: `Blog ${SITE_NAME} chia sẻ cách chọn áo thun nam, áo thun thể thao nam, quần thể thao nam và đồ gym nam theo chất liệu, form dáng, size và phối đồ.`,
  keywords: 'đồ thể thao nam, áo thun nam, áo thun thể thao nam, quần thể thao nam, đồ gym nam, chất liệu áo thể thao, phối đồ thể thao nam',
  image: '/images/og-ursport.jpg',
  schema: buildSeoGraph({
    '@type': 'Blog',
    '@id': `${absoluteUrl('/blog')}#blog`,
    name: `Blog Đồ Thể Thao Nam ${SITE_NAME}`,
    url: absoluteUrl('/blog'),
    description: `Cẩm nang chọn áo thun nam, quần thể thao nam và đồ gym nam từ ${SITE_NAME}.`,
    inLanguage: 'vi-VN'
  })
});

const blogHubSnapshots = (): Snapshot[] => [
  {
    route: '/blog/ao-thun-nam',
    title: `Áo thun nam | Blog ${SITE_NAME}`,
    description: 'Cẩm nang chọn áo thun nam mát, bền form, không xù lông, dễ phối đồ và phù hợp mặc hằng ngày.',
    keywords: 'áo thun nam, áo thun cotton nam, áo thun nam mùa hè, form áo thun nam, áo thun nam bền form'
  },
  {
    route: '/blog/ao-thun-the-thao-nam',
    title: `Áo thun thể thao nam | Blog ${SITE_NAME}`,
    description: 'Hướng dẫn chọn áo thun thể thao nam cho tập gym, chạy bộ, quick dry, co giãn và thấm hút mồ hôi.',
    keywords: 'áo thun thể thao nam, áo gym nam, áo chạy bộ nam, áo quick dry nam, áo thấm hút mồ hôi nam'
  },
  {
    route: '/blog/quan-the-thao-nam',
    title: `Quần thể thao nam | Blog ${SITE_NAME}`,
    description: 'Kinh nghiệm chọn quần thể thao nam, quần short, jogger và quần gym theo dáng người, chất liệu và mục đích sử dụng.',
    keywords: 'quần thể thao nam, quần jogger nam, quần short thể thao nam, quần tập gym nam, quần chạy bộ nam'
  },
  {
    route: '/blog/chat-lieu-vai-the-thao',
    title: `Chất liệu vải thể thao nam | Blog ${SITE_NAME}`,
    description: 'So sánh cotton, polyester, spandex, quick dry và các chất liệu áo quần thể thao nam thoáng mát, bền form, chống mùi.',
    keywords: 'chất liệu vải thể thao, cotton, polyester, spandex, quick dry, vải thấm hút mồ hôi, vải chống mùi'
  },
  {
    route: '/blog/phoi-do-the-thao-nam',
    title: `Phối đồ thể thao nam | Blog ${SITE_NAME}`,
    description: 'Gợi ý outfit thể thao nam khi đi gym, đi chơi, đi làm, chạy bộ và mặc mùa hè theo phong cách gọn gàng, năng động.',
    keywords: 'phối đồ thể thao nam, outfit đi gym nam, đồ nam mùa hè, phối áo thun nam, phối quần jogger nam'
  }
].map(snapshot => ({
  ...snapshot,
  image: '/images/og-ursport.jpg',
  schema: buildSeoGraph({
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl(snapshot.route)}#blog-hub`,
    name: snapshot.title,
    url: absoluteUrl(snapshot.route),
    description: snapshot.description,
    isPartOf: { '@id': `${absoluteUrl('/blog')}#blog` },
    inLanguage: 'vi-VN'
  })
}));

const run = async () => {
  const indexHtml = await fs.readFile(indexPath, 'utf8');
  const snapshots: Snapshot[] = [
    homeSnapshot(),
    shopSnapshot(),
    optimizedBlogIndexSnapshot(),
    ...blogHubSnapshots(),
    ...CATEGORY_METADATA.map(categorySnapshot),
    ...seoSubcategorySnapshots(),
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
