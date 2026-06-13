import type { Language } from '../LanguageContext';
import type { BlogPost } from '../types';

type BlogField =
  | 'title'
  | 'excerpt'
  | 'content'
  | 'category'
  | 'seoTitle'
  | 'metaDescription';

type LocalizedBlogPost = BlogPost & {
  titleEn?: string;
  excerptEn?: string;
  contentEn?: string;
  categoryEn?: string;
  seoTitleEn?: string;
  metaDescriptionEn?: string;
  enTitle?: string;
  enExcerpt?: string;
  enContent?: string;
  enCategory?: string;
  enSeoTitle?: string;
  enMetaDescription?: string;
  title_en?: string;
  excerpt_en?: string;
  content_en?: string;
  category_en?: string;
  seoTitle_en?: string;
  metaDescription_en?: string;
  translations?: {
    en?: Partial<Record<BlogField, string>>;
  };
  i18n?: {
    en?: Partial<Record<BlogField, string>>;
  };
  locales?: {
    en?: Partial<Record<BlogField, string>>;
  };
};

const upperFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const BLOG_CATEGORY_EN: Record<string, string> = {
  'Tất cả': 'All',
  'Áo thun nam': "Men's T-Shirts",
  'Áo thun thể thao': "Men's Performance T-Shirts",
  'Quần thể thao': "Men's Sports Bottoms",
  'Chất liệu áo thun': 'T-Shirt Fabrics',
  'Chọn áo theo dáng': 'Fit Guide',
  'Hướng dẫn mua áo': 'Buying Guide',
  'Bảng size': 'Size Guide',
  'Phối đồ': 'Outfit Ideas',
  'Chất liệu': 'Materials',
};

const translateVietnameseBlogText = (value: string, field: BlogField) => {
  if (!value.trim()) return value;
  if (field === 'category') return BLOG_CATEGORY_EN[value] || value;

  const exact: Record<string, string> = {
    'Áo thun nam mặc có nóng không? Cách chọn áo mát cho mùa hè': 'Are Men’s T-Shirts Hot to Wear? How to Choose Cool Shirts for Summer',
    'Áo thun nam mặc có nóng không? Bí quyết chọn áo cực mát': 'Are Men’s T-Shirts Hot to Wear? Tips for Choosing Cool Shirts',
    'Áo thể thao nam mặc đi gym được không?': 'Can Men’s Performance Shirts Be Worn to the Gym?',
    'Áo thể thao nam khác áo thun thường thế nào?': 'How Are Men’s Performance Shirts Different from Regular T-Shirts?',
    'Quần thể thao nam mặc hằng ngày được không? Mẹo phối chuẩn chất': 'Can Men’s Sports Bottoms Be Worn Daily? Easy Styling Tips',
    'Áo thể thao nam nên chọn loại nào?': 'Which Men’s Performance Shirt Should You Choose?',
    'Bảng Size Áo Thun Nam URSport Mới Nhất 2026 – Cách Chọn Size Chuẩn Form': 'Latest URSport Men’s T-Shirt Size Chart 2026 - How to Choose the Right Fit',
  };
  if (exact[value]) return exact[value];

  return value
    .replace(/Áo thể thao nam/gi, "Men's Performance Shirts")
    .replace(/Áo thun nam/gi, "Men's T-Shirts")
    .replace(/áo thun thường/gi, 'regular T-shirts')
    .replace(/Quần thể thao nam/gi, "Men's Sports Bottoms")
    .replace(/Bảng Size/gi, 'Size Chart')
    .replace(/mặc có nóng không/gi, 'hot to wear')
    .replace(/mặc đi gym được không/gi, 'suitable for the gym')
    .replace(/khác/gi, 'different from')
    .replace(/thế nào/gi, 'how')
    .replace(/mặc hằng ngày được không/gi, 'suitable for daily wear')
    .replace(/Mẹo phối chuẩn chất/gi, 'easy styling tips')
    .replace(/nên chọn loại nào/gi, 'which type to choose')
    .replace(/Cách chọn/gi, 'How to choose')
    .replace(/Bí quyết chọn/gi, 'Tips for choosing')
    .replace(/cực mát/gi, 'cool')
    .replace(/áo mát/gi, 'cool shirts')
    .replace(/mùa hè/gi, 'summer')
    .replace(/Hướng dẫn/gi, 'Guide')
    .replace(/Giải đáp thắc mắc/gi, 'Answers')
    .replace(/thấm hút mồ hôi tốt/gi, 'with good sweat absorption')
    .replace(/nam giới/gi, 'men')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractFirstImage = (html = '') => html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[0] || '';

const buildEnglishBlogContent = (post: Partial<LocalizedBlogPost>, fallback = '') => {
  const originalTitle = String(post.title || fallback || '').trim();
  const title = translateVietnameseBlogText(originalTitle, 'title');
  const category = translateVietnameseBlogText(String(post.category || ''), 'category') || "men's sportswear";
  const image = extractFirstImage(String(post.content || ''));
  const lower = `${originalTitle} ${post.slug || ''} ${post.category || ''}`.toLowerCase();

  if (lower.includes('mặc có nóng') || lower.includes('mac-co-nong')) {
    return `
      <p><strong>Men's T-shirts</strong> can feel hot or comfortable depending on fabric, fit and how the shirt handles sweat. For warm weather, choose breathable materials, a clean fit and enough stretch for daily movement.</p>
      ${image}
      <h2>1. Do men's T-shirts feel hot in summer?</h2>
      <p>They do not have to. A shirt feels cooler when the fabric releases heat quickly, dries fast and does not cling heavily to the body. Lightweight cotton, blended performance fabrics and soft quick-dry knits are usually easier to wear in humid weather.</p>
      <h2>2. Key criteria for choosing a cool shirt</h2>
      <p>Prioritize breathable fabric, a smooth hand feel, moderate stretch and a fit that leaves space around the chest and shoulders. Avoid overly thick fabrics if you plan to wear the shirt outdoors or during active days.</p>
      <h2>3. Practical styling tips</h2>
      <p>For everyday outfits, pair a white or navy T-shirt with sports bottoms, shorts or clean casual pants. Neutral colors are easier to mix, while a simple logo or minimal graphic keeps the outfit sharp.</p>
      <h2>4. Frequently asked questions</h2>
      <p><strong>Is cotton good for summer?</strong> Cotton is comfortable for daily wear, while performance blends are better when you sweat more. <strong>Should the shirt be tight?</strong> A slightly relaxed fit is usually cooler and easier to move in.</p>
    `;
  }

  if (lower.includes('đi gym') || lower.includes('di-gym')) {
    return `
      <p><strong>Men's performance shirts</strong> can absolutely be worn to the gym when they are breathable, stretchy and designed to handle sweat.</p>
      ${image}
      <h2>1. Can performance shirts be used for gym training?</h2>
      <p>Yes. Choose shirts with quick-dry fabric, flexible stretch and a fit that supports movement without feeling restrictive.</p>
      <h2>2. What to look for</h2>
      <p>Good gym shirts should feel light, reduce cling when wet and keep their shape after repeated washing.</p>
      <h2>3. How to style them</h2>
      <p>Pair performance shirts with training shorts, joggers or sports bottoms for a clean active look inside and outside the gym.</p>
    `;
  }

  if (lower.includes('khác áo thun') || lower.includes('khac-ao-thun')) {
    return `
      <p><strong>Performance shirts</strong> are different from regular T-shirts mainly in fabric, stretch, sweat control and intended use.</p>
      ${image}
      <h2>1. Fabric and comfort</h2>
      <p>Regular T-shirts focus on everyday softness, while performance shirts usually use quick-dry or stretch fabrics for training and active movement.</p>
      <h2>2. Fit and mobility</h2>
      <p>Performance shirts are often shaped to move with the body, making them suitable for gym sessions, running and outdoor activities.</p>
      <h2>3. Which one should you choose?</h2>
      <p>Choose regular T-shirts for casual comfort and performance shirts when breathability, sweat control and movement matter more.</p>
    `;
  }

  if (lower.includes('quần') || lower.includes('quan-the-thao')) {
    return `
      <p><strong>Men's sports bottoms</strong> can be worn daily when the fit is neat, the fabric is comfortable and the styling stays clean.</p>
      ${image}
      <h2>1. Can sports bottoms be worn every day?</h2>
      <p>Yes. Modern sports bottoms are designed for both movement and casual outfits, especially when they use soft fabric and a streamlined silhouette.</p>
      <h2>2. How to choose the right pair</h2>
      <p>Look for a comfortable waistband, practical pockets, good stretch and a length that matches your daily routine.</p>
      <h2>3. Easy outfit ideas</h2>
      <p>Pair black or navy sports bottoms with a clean T-shirt, polo shirt or performance top for a simple, masculine look.</p>
    `;
  }

  if (lower.includes('size')) {
    return `
      <p>This guide helps you choose the right URSport men's T-shirt size based on height, weight, shoulder width and preferred fit.</p>
      ${image}
      <h2>1. How to read the size chart</h2>
      <p>Compare your body measurements with the shirt measurements, then consider whether you prefer a slim, regular or relaxed fit.</p>
      <h2>2. Fit recommendations</h2>
      <p>If you are between two sizes, choose the smaller size for a neat fit or the larger size for extra comfort and movement.</p>
      <h2>3. Before you order</h2>
      <p>Check shoulder width, chest width and shirt length carefully. These three measurements usually decide whether a T-shirt looks balanced on your body.</p>
    `;
  }

  return `
    <p><strong>${title}</strong> is part of the UR Sport guide to ${category.toLowerCase()}, helping you choose pieces that feel comfortable, look modern and work for daily movement.</p>
    ${image}
    <h2>1. What matters most</h2>
    <p>Focus on fabric comfort, fit, durability and how easily the item matches your existing wardrobe.</p>
    <h2>2. How to choose</h2>
    <p>Pick breathable materials, practical colors and a silhouette that supports both active days and casual wear.</p>
    <h2>3. UR Sport recommendation</h2>
    <p>Choose versatile sportswear that keeps its shape, feels comfortable and makes everyday outfits easier to style.</p>
  `;
};

const buildEnglishBlogSummary = (post: Partial<LocalizedBlogPost>, fallback = '') => {
  const originalTitle = String(post.title || fallback || '').trim();
  const lower = `${originalTitle} ${post.slug || ''} ${post.category || ''}`.toLowerCase();

  if (lower.includes('mặc có nóng') || lower.includes('mac-co-nong')) {
    return 'Learn whether men’s T-shirts feel hot in summer and how to choose breathable, comfortable shirts for warm weather.';
  }
  if (lower.includes('đi gym') || lower.includes('di-gym')) {
    return 'A practical guide to choosing men’s performance shirts for gym training, daily workouts and active movement.';
  }
  if (lower.includes('khác áo thun') || lower.includes('khac-ao-thun')) {
    return 'Understand how men’s performance shirts differ from regular T-shirts in fabric, fit, stretch and sweat control.';
  }
  if (lower.includes('quần') || lower.includes('quan-the-thao')) {
    return 'Tips for choosing and styling men’s sports bottoms for daily wear, training and clean casual outfits.';
  }
  if (lower.includes('size')) {
    return 'Use the latest URSport men’s T-shirt size guide to choose the right fit based on measurements and styling preference.';
  }

  const title = translateVietnameseBlogText(originalTitle, 'title');
  const category = translateVietnameseBlogText(String(post.category || ''), 'category') || "men's sportswear";
  return `${title} with practical guidance from UR Sport for choosing comfortable, modern ${category.toLowerCase()}.`;
};

const getEnglishField = (post: Partial<LocalizedBlogPost>, field: BlogField) => {
  const pascal = upperFirst(field);
  const candidates = [
    `${field}En`,
    `en${pascal}`,
    `${field}_en`,
  ] as const;

  for (const key of candidates) {
    const value = post[key as keyof LocalizedBlogPost];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return (
    post.translations?.en?.[field]?.trim() ||
    post.i18n?.en?.[field]?.trim() ||
    post.locales?.en?.[field]?.trim() ||
    ''
  );
};

export const getLocalizedBlogField = (
  post: Partial<LocalizedBlogPost> | null | undefined,
  field: BlogField,
  language: Language,
  fallback = ''
) => {
  if (!post) return fallback;
  if (language === 'en') {
    const englishValue = getEnglishField(post, field);
    if (englishValue) return englishValue;
    if (field === 'content') return buildEnglishBlogContent(post, fallback);
    if (field === 'excerpt' || field === 'metaDescription') return buildEnglishBlogSummary(post, fallback);
    const source = post[field as keyof LocalizedBlogPost];
    if (typeof source === 'string' && source.trim()) return translateVietnameseBlogText(source, field);
    if (fallback) return translateVietnameseBlogText(fallback, field);
  }

  const value = post[field as keyof LocalizedBlogPost];
  return typeof value === 'string' && value.trim() ? value : fallback;
};

export type { LocalizedBlogPost };
