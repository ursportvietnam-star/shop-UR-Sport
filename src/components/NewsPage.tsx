import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Share2, 
  MessageCircle, 
  ShoppingBag,
  Search,
  Heart,
  Link,
  Facebook,
  ArrowLeft,
  Clock,
  User
} from 'lucide-react';
import { BlogHero } from './BlogHero';
import { CategoryTabs } from './CategoryTabs';
import { FeaturedCarousel } from './FeaturedCarousel';
import { BlogCard } from './BlogCard';
import { cn } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { SITE_URL, absoluteUrl, buildBreadcrumbSchema, buildSeoGraph, cleanSeoText } from '../lib/seo';
import { formatFaqContentHtml } from '../lib/faqHtml';
import { removeEmptyMedia, sanitizeRichHtml } from '../lib/htmlContent';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { STATIC_BLOG_POSTS as POSTS } from '../data';
import { useProducts } from '../ProductsContext';
import { LazyImage } from './LazyImage';
import { getProductPath } from '../lib/productUrls';
import {
  DEFAULT_BLOG_PAGE_SECTIONS,
  mergeBlogPageSections,
  normalizeBlogPageSection,
  readLocalBlogPageSections,
  type BlogPageSectionType,
  type BlogPageSectionConfig,
} from '../lib/blogPageConfig';

interface TocHeading {
  id: string;
  text: string;
  level: number;
  number: string;
}

const POST_CATEGORIES = [
  { label: 'Tất cả', path: '/blog' },
  { label: 'Kiến thức', path: '/blog/ao-thun-nam' },
  { label: 'Chất liệu', path: '/blog/chat-lieu-ao-thun' },
  { label: 'Dáng người', path: '/blog/chon-ao-theo-dang' },
  { label: 'Thể thao', path: '/blog/ao-thun-the-thao' },
  { label: 'Hướng dẫn', path: '/blog/huong-dan-mua-ao' }
];

const BLOG_HUB_CATEGORIES = [
  { label: 'Tất cả', path: '/blog' },
  { label: 'Áo thun nam', path: '/blog/ao-thun-nam' },
  { label: 'Áo thun thể thao nam', path: '/blog/ao-thun-the-thao-nam' },
  { label: 'Quần thể thao nam', path: '/blog/quan-the-thao-nam' },
  { label: 'Chất liệu vải thể thao', path: '/blog/chat-lieu-vai-the-thao' },
  { label: 'Phối đồ thể thao nam', path: '/blog/phoi-do-the-thao-nam' }
];

const slugifyCategory = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

type BlogCategoryItem = {
  id: number | string;
  label: string;
  link: string;
  icon?: string;
  group: 'main' | 'category' | 'subcategory';
  parentLabel?: string;
  h1?: string;
  description?: string;
  seoTitle?: string;
  metaDescription?: string;
};

const BLOG_CATEGORIES_STORAGE_KEY = 'ursport_blog_categories_final_v2';

const normalizeTextForMatch = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const BLOG_CATEGORY_SEO_DEFAULTS: Record<string, { h1: string; description: string; seoTitle: string; metaDescription: string }> = {
  blog: {
    h1: 'Tin tức & Bài viết',
    description: 'Cập nhật kiến thức chọn áo thun nam, chất liệu, dáng người, áo thun thể thao và hướng dẫn mua áo từ UR Sport.',
    seoTitle: 'Tin tức áo thun nam & thời trang thể thao | UR Sport',
    metaDescription: 'Blog UR Sport chia sẻ kiến thức áo thun nam, chất liệu áo thun, cách chọn áo theo dáng người, áo thun thể thao và hướng dẫn mua áo.'
  },
  'ao-thun-nam': {
    h1: 'Kiến thức áo thun nam',
    description: 'Tổng hợp kiến thức chọn áo thun nam đẹp, dễ mặc, đúng form và phù hợp phong cách hằng ngày.',
    seoTitle: 'Kiến thức áo thun nam | Blog UR Sport',
    metaDescription: 'Tìm hiểu cách chọn áo thun nam theo form, phong cách, hoàn cảnh sử dụng và các tiêu chí giúp áo mặc đẹp hơn.'
  },
  'chat-lieu-ao-thun': {
    h1: 'Chất liệu áo thun nam',
    description: 'Phân tích các chất liệu áo thun phổ biến, độ thoáng mát, co giãn, thấm hút và độ bền khi sử dụng.',
    seoTitle: 'Chất liệu áo thun nam | Blog UR Sport',
    metaDescription: 'So sánh cotton, thun lạnh, polyester và các chất liệu áo thun nam để chọn áo thoáng mát, bền đẹp và dễ chăm sóc.'
  },
  'chon-ao-theo-dang': {
    h1: 'Chọn áo thun theo dáng người',
    description: 'Gợi ý chọn form áo thun nam theo dáng người để mặc vừa vặn, tôn dáng và tự tin hơn.',
    seoTitle: 'Chọn áo thun theo dáng người | Blog UR Sport',
    metaDescription: 'Hướng dẫn chọn áo thun nam theo dáng người, từ dáng gầy, đầy đặn đến vai rộng để tối ưu form mặc.'
  },
  'ao-thun-the-thao': {
    h1: 'Áo thun thể thao nam',
    description: 'Kinh nghiệm chọn áo thun thể thao nam thoáng khí, co giãn tốt và phù hợp tập luyện hoặc mặc thường ngày.',
    seoTitle: 'Áo thun thể thao nam | Blog UR Sport',
    metaDescription: 'Cập nhật kiến thức về áo thun thể thao nam, chất liệu thấm hút, form áo tập luyện và cách phối đồ năng động.'
  },
  'huong-dan-mua-ao': {
    h1: 'Hướng dẫn mua áo thun nam',
    description: 'Các hướng dẫn chọn size, kiểm tra chất liệu, chọn form và mua áo thun nam phù hợp nhu cầu.',
    seoTitle: 'Hướng dẫn mua áo thun nam | Blog UR Sport',
    metaDescription: 'Xem hướng dẫn mua áo thun nam: chọn size, chọn chất liệu, chọn form áo và các lưu ý trước khi đặt hàng.'
  },
  'kien-thuc': {
    h1: 'Kiến thức thời trang thể thao nam',
    description: 'Tổng hợp kiến thức về form dáng, chất liệu và cách chọn đồ thể thao nam phù hợp nhu cầu hằng ngày.',
    seoTitle: 'Kiến thức thời trang thể thao nam | Blog UR Sport',
    metaDescription: 'Cập nhật kiến thức về áo thun, áo polo, chất liệu và phong cách thời trang thể thao nam từ UR Sport.'
  },
  'chat-lieu': {
    h1: 'Chất liệu áo quần thể thao nam',
    description: 'Phân tích các loại vải thể thao phổ biến, khả năng thấm hút, co giãn và độ bền khi sử dụng.',
    seoTitle: 'Chất liệu áo quần thể thao nam | UR Sport',
    metaDescription: 'Tìm hiểu cotton, thun lạnh, polyester và các chất liệu áo quần thể thao nam giúp mặc thoáng, bền và đẹp.'
  },
  'dang-nguoi': {
    h1: 'Chọn áo quần thể thao theo dáng người',
    description: 'Gợi ý chọn form áo, quần và cách phối đồ thể thao nam giúp tôn dáng, thoải mái và tự tin hơn.',
    seoTitle: 'Chọn áo quần thể thao theo dáng người | UR Sport',
    metaDescription: 'Hướng dẫn chọn áo thun, áo polo và quần thể thao nam theo dáng người để tôn form và dễ phối đồ.'
  },
  'the-thao': {
    h1: 'Trang phục thể thao nam',
    description: 'Cập nhật kinh nghiệm chọn trang phục cho tập luyện, chạy bộ, gym và các hoạt động thể thao hằng ngày.',
    seoTitle: 'Trang phục thể thao nam | Blog UR Sport',
    metaDescription: 'Bài viết về trang phục thể thao nam, cách chọn đồ tập, đồ chạy bộ và phong cách năng động.'
  },
  'huong-dan': {
    h1: 'Hướng dẫn chọn và phối đồ thể thao nam',
    description: 'Các hướng dẫn thực tế giúp bạn chọn size, phối đồ, bảo quản áo quần và mua sắm hiệu quả.',
    seoTitle: 'Hướng dẫn chọn và phối đồ thể thao nam | UR Sport',
    metaDescription: 'Xem hướng dẫn chọn size, phối đồ và bảo quản áo quần thể thao nam để luôn mặc đẹp và thoải mái.'
  }
};

const BLOG_HUB_SEO_DEFAULTS: Record<string, { h1: string; description: string; seoTitle: string; metaDescription: string }> = {
  'ao-thun-nam': {
    h1: 'Áo thun nam',
    description: 'Cẩm nang chọn áo thun nam mát, bền form, không xù lông, dễ phối đồ và phù hợp mặc hằng ngày.',
    seoTitle: 'Áo thun nam | Blog UR Sport',
    metaDescription: 'Hướng dẫn chọn áo thun nam theo chất liệu, form dáng, size, màu sắc và cách phối đồ để mặc đẹp, thoải mái hằng ngày.'
  },
  'ao-thun-the-thao-nam': {
    h1: 'Áo thun thể thao nam',
    description: 'Kinh nghiệm chọn áo thun thể thao nam cho tập gym, chạy bộ, vận động ngoài trời và mặc hằng ngày.',
    seoTitle: 'Áo thun thể thao nam | Blog UR Sport',
    metaDescription: 'Hướng dẫn chọn áo thun thể thao nam theo chất liệu quick dry, độ co giãn, khả năng thấm hút mồ hôi, form áo và nhu cầu tập luyện.'
  },
  'quan-the-thao-nam': {
    h1: 'Quần thể thao nam',
    description: 'Cẩm nang chọn quần thể thao nam, quần short, jogger và quần gym theo dáng người, chất liệu và mục đích sử dụng.',
    seoTitle: 'Quần thể thao nam | Blog UR Sport',
    metaDescription: 'Tìm hiểu cách chọn quần thể thao nam, quần short, jogger và quần tập gym theo form dáng, chất liệu, size và cách phối đồ.'
  },
  'chat-lieu-vai-the-thao': {
    h1: 'Chất liệu vải thể thao',
    description: 'So sánh cotton, polyester, spandex, quick dry và các chất liệu áo quần thể thao nam thoáng mát, bền form, chống mùi.',
    seoTitle: 'Chất liệu vải thể thao nam | Blog UR Sport',
    metaDescription: 'Phân tích chất liệu vải thể thao như cotton, polyester, spandex, quick dry, khả năng thấm hút, độ co giãn, chống mùi và độ bền.'
  },
  'phoi-do-the-thao-nam': {
    h1: 'Phối đồ thể thao nam',
    description: 'Gợi ý outfit thể thao nam khi đi gym, đi chơi, đi làm, chạy bộ và mặc mùa hè theo phong cách gọn gàng, năng động.',
    seoTitle: 'Phối đồ thể thao nam | Blog UR Sport',
    metaDescription: 'Gợi ý phối đồ thể thao nam với áo thun, áo polo, quần short, jogger và phụ kiện cho đi gym, đi chơi, đi làm hoặc mùa hè.'
  }
};

const getSlugFromCategoryPath = (path: string) => {
  if (!path || path === '/blog') return 'blog';
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'blog';
};

const normalizeBlogCategoryItem = (item: Partial<BlogCategoryItem>, index = 0): BlogCategoryItem => {
  const label = item.label?.trim() || 'Blog';
  const link = item.link || (index === 0 ? '/blog' : `/blog/${slugifyCategory(label)}`);
  const group = item.group === 'category' || item.group === 'subcategory' ? item.group : 'main';
  const routeSlug = getSlugFromCategoryPath(link);
  const defaults = BLOG_HUB_SEO_DEFAULTS[routeSlug] || BLOG_HUB_SEO_DEFAULTS[slugifyCategory(label)] || BLOG_CATEGORY_SEO_DEFAULTS[routeSlug] || BLOG_CATEGORY_SEO_DEFAULTS[slugifyCategory(label)] || BLOG_CATEGORY_SEO_DEFAULTS.blog;
  const savedH1 = item.h1?.trim();
  const hasMainBlogH1 = group !== 'main' && savedH1 && slugifyCategory(savedH1) === slugifyCategory(BLOG_CATEGORY_SEO_DEFAULTS.blog.h1);
  const h1 = savedH1 && !hasMainBlogH1
    ? savedH1
    : defaults.h1 || label;

  return {
    id: item.id || index + 1,
    label,
    link,
    icon: item.icon || '',
    group,
    parentLabel: item.parentLabel || '',
    h1,
    description: item.description || defaults.description || '',
    seoTitle: item.seoTitle || defaults.seoTitle || `${label} | Blog UR Sport`,
    metaDescription: item.metaDescription || defaults.metaDescription || defaults.description || ''
  };
};

const DEFAULT_BLOG_CATEGORY_ITEMS = BLOG_HUB_CATEGORIES.map((item, index) => normalizeBlogCategoryItem({
  id: index + 1,
  label: item.label,
  link: item.path,
  group: index === 0 ? 'main' : 'category'
}, index));

const findBlogCategoryBySlug = (items: BlogCategoryItem[], routeSlug?: string) => {
  if (!routeSlug) return undefined;
  return items.find(item => item.link !== '/blog' && getSlugFromCategoryPath(item.link) === routeSlug)
    || items.find(item => item.group !== 'main' && slugifyCategory(item.label) === routeSlug)
    || DEFAULT_BLOG_CATEGORY_ITEMS.find(item => item.link !== '/blog' && getSlugFromCategoryPath(item.link) === routeSlug)
    || DEFAULT_BLOG_CATEGORY_ITEMS.find(item => item.group !== 'main' && slugifyCategory(item.label) === routeSlug);
};

const findBlogCategoryLabelByPostSlug = (posts: any[], routeSlug?: string) => {
  if (!routeSlug) return undefined;
  const postWithCategory = posts.find(post => slugifyCategory(post.category || '') === routeSlug);
  return postWithCategory?.category?.trim();
};

const getBlogPostSlug = (post: any) => String(post?.slug || post?.id || '').trim();
const getBlogPostPath = (post: any) => `/blog/${getBlogPostSlug(post)}`;

const BLOG_HOME_SEO = {
  h1: 'Blog Đồ Thể Thao Nam: Áo Thun, Quần Thể Thao & Đồ Gym Nam',
  title: 'Blog Đồ Thể Thao Nam: Áo Thun, Đồ Gym | UR Sport',
  description: 'Blog UR Sport chia sẻ cách chọn áo thun nam, áo thun thể thao nam, quần thể thao nam và đồ gym nam theo chất liệu, form dáng, size và phối đồ.',
  primaryKeyword: 'đồ thể thao nam',
  secondaryKeywords: [
    'áo thun nam',
    'áo thun thể thao nam',
    'quần thể thao nam',
    'đồ gym nam',
    'chất liệu áo thể thao',
    'phối đồ thể thao nam'
  ]
};

const BLOG_SEO_HUBS = [
  {
    title: 'Áo thun nam',
    description: 'Cách chọn áo thun nam mát, bền form, không xù lông và dễ mặc hằng ngày.',
    href: '/ao-thun-nam',
    keywords: ['áo thun nam', 'áo thun cotton nam', 'áo thun nam mùa hè']
  },
  {
    title: 'Áo thun thể thao nam',
    description: 'Gợi ý chọn áo tập gym, chạy bộ, quick dry, co giãn và thấm hút mồ hôi.',
    href: '/ao-thun-the-thao-nam',
    keywords: ['áo thun thể thao nam', 'áo gym nam', 'áo chạy bộ nam']
  },
  {
    title: 'Quần thể thao nam',
    description: 'Kinh nghiệm chọn quần short, jogger, quần gym theo dáng người và mục đích sử dụng.',
    href: '/quan-the-thao-nam',
    keywords: ['quần thể thao nam', 'quần jogger nam', 'quần tập gym nam']
  },
  {
    title: 'Chất liệu & form dáng',
    description: 'So sánh cotton, polyester, spandex, quick dry và các form slim, regular, oversize.',
    href: '/blog',
    keywords: ['vải quick dry là gì', 'cotton compact là gì', 'form áo thun nam']
  }
];

const BLOG_HOME_HUBS = [
  {
    title: 'Áo thun nam',
    description: 'Chọn áo thun nam mát, bền form, không xù lông và dễ phối hằng ngày.',
    href: '/blog/ao-thun-nam',
    keywords: ['áo thun nam', 'áo thun cotton nam', 'áo thun nam mùa hè']
  },
  {
    title: 'Áo thun thể thao nam',
    description: 'Áo tập gym, chạy bộ, quick dry, co giãn và thấm hút mồ hôi.',
    href: '/blog/ao-thun-the-thao-nam',
    keywords: ['áo thun thể thao nam', 'áo gym nam', 'áo chạy bộ nam']
  },
  {
    title: 'Quần thể thao nam',
    description: 'Quần short, jogger, quần gym theo dáng người và mục đích sử dụng.',
    href: '/blog/quan-the-thao-nam',
    keywords: ['quần thể thao nam', 'quần jogger nam', 'quần tập gym nam']
  },
  {
    title: 'Chất liệu vải thể thao',
    description: 'Cotton, polyester, spandex, quick dry, thấm hút và chống mùi.',
    href: '/blog/chat-lieu-vai-the-thao',
    keywords: ['vải quick dry', 'cotton compact', 'spandex']
  },
  {
    title: 'Phối đồ thể thao nam',
    description: 'Outfit đi gym, đi chơi, đi làm, chạy bộ và mặc mùa hè.',
    href: '/blog/phoi-do-the-thao-nam',
    keywords: ['phối đồ thể thao nam', 'outfit đi gym', 'đồ nam mùa hè']
  }
];

const BLOG_HUB_MATCH_TERMS: Record<string, string[]> = {
  'ao-thun-nam': ['áo thun nam', 'ao thun nam', 'áo phông', 'ao phong', 't-shirt', 'cotton', 'oversize', 'regular fit', 'slim fit'],
  'ao-thun-the-thao-nam': ['áo thun thể thao', 'ao thun the thao', 'áo gym', 'ao gym', 'chạy bộ', 'chay bo', 'quick dry', 'thấm hút', 'tham hut'],
  'quan-the-thao-nam': ['quần thể thao', 'quan the thao', 'quần short', 'quan short', 'jogger', 'quần gym', 'quan gym'],
  'chat-lieu-vai-the-thao': ['chất liệu', 'chat lieu', 'vải', 'vai', 'cotton', 'polyester', 'spandex', 'quick dry', 'thấm hút', 'tham hut', 'chống mùi', 'chong mui'],
  'phoi-do-the-thao-nam': ['phối đồ', 'phoi do', 'outfit', 'đi gym', 'di gym', 'đi chơi', 'di choi', 'đi làm', 'di lam', 'mùa hè', 'mua he']
};

const BLOG_HUB_PRODUCT_LINKS: Record<string, { href: string; label: string; shortLabel: string }> = {
  'ao-thun-nam': {
    href: '/ao-thun-nam',
    label: 'Xem sản phẩm áo thun nam',
    shortLabel: 'Áo thun nam'
  },
  'ao-thun-the-thao-nam': {
    href: '/ao-thun-the-thao-nam',
    label: 'Xem áo thun thể thao nam',
    shortLabel: 'Áo thun thể thao nam'
  },
  'quan-the-thao-nam': {
    href: '/quan-the-thao-nam',
    label: 'Xem quần thể thao nam',
    shortLabel: 'Quần thể thao nam'
  },
  'chat-lieu-vai-the-thao': {
    href: '/shop',
    label: 'Xem đồ thể thao nam',
    shortLabel: 'Đồ thể thao nam'
  },
  'phoi-do-the-thao-nam': {
    href: '/shop',
    label: 'Xem outfit thể thao nam',
    shortLabel: 'Outfit thể thao nam'
  }
};

const blogPostMatchesHub = (post: any, categoryLabel: string) => {
  const categorySlug = slugifyCategory(categoryLabel);
  if (categorySlug === 'tat-ca' || categorySlug === 'blog') return true;

  const postCategorySlug = slugifyCategory(post.category || '');
  if (postCategorySlug === categorySlug) return true;

  const terms = BLOG_HUB_MATCH_TERMS[categorySlug] || [];
  if (terms.length === 0) return false;

  const haystack = normalizeTextForMatch([
    post.title,
    post.slug,
    post.category,
    post.excerpt,
    post.metaDescription
  ].filter(Boolean).join(' '));

  return terms.some(term => haystack.includes(normalizeTextForMatch(term)));
};

const loadCachedBlogCategories = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = window.localStorage.getItem(BLOG_CATEGORIES_STORAGE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map((item: Partial<BlogCategoryItem>, index: number) => normalizeBlogCategoryItem(item, index))
      : null;
  } catch {
    return null;
  }
};

const cacheBlogCategories = (items: BlogCategoryItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BLOG_CATEGORIES_STORAGE_KEY, JSON.stringify(items));
};

export function NewsPage() {
  const { slug, categorySlug } = useParams<{ slug?: string; categorySlug?: string }>();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>(POSTS);
  const [blogCategories, setBlogCategories] = useState<BlogCategoryItem[]>(() => loadCachedBlogCategories() || DEFAULT_BLOG_CATEGORY_ITEMS);
  const [blogPageSections, setBlogPageSections] = useState<BlogPageSectionConfig[]>(() => readLocalBlogPageSections() || DEFAULT_BLOG_PAGE_SECTIONS);
  const [blogCategoriesLoaded, setBlogCategoriesLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [contentHtml, setContentHtml] = useState('');
  const [contentSchema, setContentSchema] = useState('');
  const [tocHeadings, setTocHeadings] = useState<TocHeading[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStaticTocOpen, setIsStaticTocOpen] = useState(false);
  const [inlineTocOpenId, setInlineTocOpenId] = useState<string | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const blogContentRef = useRef<HTMLDivElement>(null);
  const { products } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [homeHubVisibleCounts, setHomeHubVisibleCounts] = useState<Record<string, number>>({});
  const [readProgress, setReadProgress] = useState(0);
  const [shouldHideSidebar, setShouldHideSidebar] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedPost) return;
    const key = `ursport_blog_liked_${selectedPost.id}`;
    setLiked(localStorage.getItem(key) === 'true');
    setLikesCount(Math.floor((selectedPost.title.length * 7) % 40) + 12);
  }, [selectedPost]);

  const handleLike = () => {
    if (!selectedPost) return;
    const key = `ursport_blog_liked_${selectedPost.id}`;
    if (liked) {
      localStorage.setItem(key, 'false');
      setLiked(false);
      setLikesCount(prev => prev - 1);
    } else {
      localStorage.setItem(key, 'true');
      setLiked(true);
      setLikesCount(prev => prev + 1);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!selectedPost) {
      setReadProgress(0);
      return;
    }
    const handleScrollProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        setReadProgress(100);
        setShouldHideSidebar(true);
        return;
      }
      const progress = Math.min(100, Math.max(0, (window.scrollY / scrollHeight) * 100));
      setReadProgress(progress);
      setShouldHideSidebar(progress > 80);
    };
    window.addEventListener('scroll', handleScrollProgress, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollProgress);
  }, [selectedPost]);

  useEffect(() => {
    setIsExpanded(false);
    setIsStaticTocOpen(false);
    setInlineTocOpenId(null);
  }, [slug]);

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setPosts(POSTS);
      setPostsLoaded(true);
      return;
    }
    const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const allPosts = [...loaded, ...POSTS];
      setPosts(allPosts);
      setPostsLoaded(true);
    }, (error) => {
      console.error("Error fetching blog posts:", error);
      setPosts(POSTS);
      setPostsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setBlogCategories(loadCachedBlogCategories() || DEFAULT_BLOG_CATEGORY_ITEMS);
      setBlogCategoriesLoaded(true);
      return;
    }
    getDoc(doc(db, 'settings', 'blogCategories')).then(snap => {
      if (!snap.exists()) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          const cached = loadCachedBlogCategories();
          cacheBlogCategories(cached || DEFAULT_BLOG_CATEGORY_ITEMS);
          if (!cached) {
            setBlogCategories(DEFAULT_BLOG_CATEGORY_ITEMS);
          }
        }
        return;
      }

      if (!snap.exists()) return;
      const items = snap.data().items;
      if (Array.isArray(items) && items.length > 0) {
        const normalized = items.map((item: Partial<BlogCategoryItem>, index: number) => normalizeBlogCategoryItem(item, index));
        setBlogCategories(normalized);
        cacheBlogCategories(normalized);
      }
    }).catch(() => {
      setBlogCategories(loadCachedBlogCategories() || DEFAULT_BLOG_CATEGORY_ITEMS);
    }).finally(() => {
      setBlogCategoriesLoaded(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBlogPageSections = async () => {
      try {
        const localSections = readLocalBlogPageSections();
        if (localSections?.length && !cancelled) {
          setBlogPageSections(localSections);
        }

        if (!db || !isFirebaseConfigured) return;

        const snap = await getDoc(doc(db, 'settings', 'blogPage'));
        if (cancelled || !snap.exists()) return;

        const sections = Array.isArray(snap.data().sections)
          ? mergeBlogPageSections(snap.data().sections.map(normalizeBlogPageSection))
          : DEFAULT_BLOG_PAGE_SECTIONS;
        setBlogPageSections(sections);
      } catch (error) {
        console.error('Failed to load blog page sections:', error);
        if (!cancelled) {
          setBlogPageSections(readLocalBlogPageSections() || DEFAULT_BLOG_PAGE_SECTIONS);
        }
      }
    };

    loadBlogPageSections();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const effectiveCategorySlug = categorySlug || slug;
    const categoryFromRoute = findBlogCategoryBySlug(blogCategories, effectiveCategorySlug);

    if (categoryFromRoute) {
      setActiveCategory(categoryFromRoute.label);
      return;
    }

    if (effectiveCategorySlug && postsLoaded) {
      const postCategoryLabel = findBlogCategoryLabelByPostSlug(posts, effectiveCategorySlug);
      if (postCategoryLabel) {
        setActiveCategory(postCategoryLabel);
        return;
      }
    }

    if (categorySlug) {
      const category = findBlogCategoryBySlug(blogCategories, categorySlug);
      setActiveCategory(category?.label || DEFAULT_BLOG_CATEGORY_ITEMS[0].label);
    } else if (!slug) {
      setActiveCategory(blogCategories.find(item => item.group === 'main')?.label || DEFAULT_BLOG_CATEGORY_ITEMS[0].label);
    }
  }, [blogCategories, categorySlug, slug, posts, postsLoaded]);

  useEffect(() => {
    if (slug) {
      const categoryFromSlug = findBlogCategoryBySlug(blogCategories, slug);
      const postCategoryLabel = !categoryFromSlug && postsLoaded ? findBlogCategoryLabelByPostSlug(posts, slug) : undefined;
      if (categoryFromSlug || postCategoryLabel) {
        setSelectedPost(null);
        return;
      }

      const post = posts.find(p => getBlogPostSlug(p) === slug) || posts.find(p => p.id === slug);
      if (post) {
        setSelectedPost(post);
        const canonicalSlug = getBlogPostSlug(post);
        if (canonicalSlug && canonicalSlug !== slug) {
          navigate(`/blog/${canonicalSlug}`, { replace: true });
        }
        window.scrollTo(0, 0);
      } else if (postsLoaded && blogCategoriesLoaded) {
        // Only navigate away if we are sure the post doesn't exist after loading everything
        navigate('/blog');
      }
    } else {
      setSelectedPost(null);
    }
  }, [blogCategories, blogCategoriesLoaded, postsLoaded, slug, posts, navigate]);

  useEffect(() => {
    if (!selectedPost) {
      setContentHtml('');
      setContentSchema('');
      setTocHeadings([]);
      return;
    }

    const slugifyHeading = (text: string) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    let rawHtml = selectedPost.content || '';
    if (!rawHtml.trim().startsWith('<')) {
      rawHtml = rawHtml
        .split('\n\n')
        .map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
        .join('');
    }
    rawHtml = formatFaqContentHtml(rawHtml);

    const parser = new DOMParser();
    const document = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
    const wrapper = document.body.firstElementChild as HTMLElement;
    if (!wrapper) {
      setContentHtml(rawHtml);
      setContentSchema('');
      setTocHeadings([]);
      return;
    }

    removeEmptyMedia(wrapper);

    const schemas: string[] = [];
    wrapper.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      const schemaText = script.textContent?.trim();
      if (schemaText) schemas.push(schemaText);
      script.remove();
    });

    const readJsonLdText = (value?: string | null) => {
      const text = (value || '').trim();
      const looksLikeJsonLd = text.startsWith('{') && text.includes('"@context"');
      if (!looksLikeJsonLd) return { text, isJsonLd: false, isValid: false };

      try {
        JSON.parse(text);
        return { text, isJsonLd: true, isValid: true };
      } catch {
        return { text, isJsonLd: text.includes('FAQPage') || text.includes('schema.org'), isValid: false };
      }
    };

    Array.from(wrapper.querySelectorAll('*')).reverse().forEach((element) => {
      const text = element.textContent?.trim() || '';
      const jsonLd = readJsonLdText(text);
      if (!jsonLd.isJsonLd) return;
      if (jsonLd.isValid) {
        schemas.push(text);
      }
      element.remove();
    });

    const textWalker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    const schemaTextNodes: Text[] = [];
    while (textWalker.nextNode()) {
      const node = textWalker.currentNode as Text;
      const text = node.textContent?.trim() || '';
      const jsonLd = readJsonLdText(text);
      if (!jsonLd.isJsonLd) continue;
      if (jsonLd.isValid) {
        schemas.push(text);
      }
      schemaTextNodes.push(node);
    }
    schemaTextNodes.forEach(node => {
      node.textContent = '';
    });

    wrapper.innerHTML = sanitizeRichHtml(wrapper.innerHTML);

    Array.from(wrapper.querySelectorAll('h2, h3')).forEach((heading) => {
      const headingText = normalizeTextForMatch(heading.textContent || '');
      const isFaqHeading = headingText.includes('cau hoi') || headingText.includes('faq');
      if (!isFaqHeading || heading.closest('.seo-faq-section')) return;

      const faqSection = document.createElement('section');
      faqSection.className = 'seo-faq-section';

      const title = document.createElement('h2');
      title.className = 'seo-faq-title';
      title.textContent = 'Câu hỏi thường gặp';

      heading.replaceWith(faqSection);
      faqSection.appendChild(title);

      let faqIndex = 0;
      let sibling = faqSection.nextSibling;
      while (sibling) {
        const questionHeading = sibling instanceof HTMLElement ? sibling : null;
        const tagName = questionHeading?.tagName?.toLowerCase();
        if (tagName === 'h2') break;

        if (tagName !== 'h3' || !questionHeading) {
          const nextSibling = sibling.nextSibling;
          if (faqIndex === 0) {
            faqSection.appendChild(sibling);
          }
          sibling = nextSibling;
          continue;
        }

        const questionText = questionHeading.textContent?.replace(/^\s*\d+[\.\)]\s*/, '').trim() || '';
        if (!questionText) {
          sibling = questionHeading.nextSibling;
          continue;
        }

        const details = document.createElement('details');
        details.className = 'seo-faq';

        const summary = document.createElement('summary');
        summary.className = 'seo-faq-question';
        const questionLabel = document.createElement('span');
        questionLabel.textContent = questionText;
        const icon = document.createElement('span');
        icon.className = 'seo-faq-icon';
        icon.setAttribute('aria-hidden', 'true');
        summary.append(questionLabel, icon);

        const answer = document.createElement('div');
        answer.className = 'seo-faq-answer';

        questionHeading.replaceWith(details);
        let answerSibling = details.nextSibling;
        while (answerSibling) {
          const nextAnswerSibling = answerSibling.nextSibling;
          const answerElement = answerSibling instanceof HTMLElement ? answerSibling : null;
          const answerTag = answerElement?.tagName?.toLowerCase();
          if (answerTag === 'h3' || answerTag === 'h2') break;

          answer.appendChild(answerSibling);
          answerSibling = nextAnswerSibling;
        }

        details.appendChild(summary);
        details.appendChild(answer);
        faqSection.appendChild(details);
        faqIndex += 1;
        sibling = faqSection.nextSibling;
      }

      if (faqIndex === 0) {
        faqSection.replaceWith(heading);
      }
    });

    const seenIds = new Set<string>();
    const headingCounters = { h2: 0, h3: 0, h4: 0 };
    const headings = Array.from(wrapper.querySelectorAll('h2, h3, h4')).map((heading) => {
      const level = Number(heading.tagName.charAt(1));
      const text = heading.textContent?.replace(/^\s*\d+[\.\)]\s*/, '').trim() || '';
      if (level === 2) {
        headingCounters.h2 += 1;
        headingCounters.h3 = 0;
        headingCounters.h4 = 0;
      } else if (level === 3) {
        if (headingCounters.h2 === 0) headingCounters.h2 = 1;
        headingCounters.h3 += 1;
        headingCounters.h4 = 0;
      } else if (level === 4) {
        if (headingCounters.h2 === 0) headingCounters.h2 = 1;
        if (headingCounters.h3 === 0) headingCounters.h3 = 1;
        headingCounters.h4 += 1;
      }
      const number = level === 2
        ? `${headingCounters.h2}`
        : level === 3
          ? `${headingCounters.h2}.${headingCounters.h3}`
          : `${headingCounters.h2}.${headingCounters.h3}.${headingCounters.h4}`;
      let id = heading.id || slugifyHeading(text || 'heading');
      let uniqueId = id;
      let counter = 1;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter += 1;
      }
      seenIds.add(uniqueId);
      heading.id = uniqueId;
      return { id: uniqueId, text, level, number };
    });

    setTocHeadings(headings);
    setContentSchema(schemas[0] || '');
    // Inject anchors for inline TOC buttons
    const processedHtml = wrapper.innerHTML.replace(/<h([23])(.*?)>(.*?)<\/h\1>/g, (match, level, attrs, text) => {
      // Find the ID if it exists
      const idMatch = attrs.match(/id="(.*?)"/);
      const id = idMatch ? idMatch[1] : slugifyHeading(text);
      return `<div class="heading-with-action flex flex-col mb-4">
        <div class="flex items-center justify-between gap-4 group/heading">
          <h${level}${attrs} id="${id}" class="m-0 flex-grow">${text}</h${level}>
          <div id="action-anchor-${id}" class="flex-shrink-0"></div>
        </div>
        <div id="toc-anchor-${id}" class="w-full"></div>
      </div>`;
    });

    setContentHtml(processedHtml);
  }, [selectedPost]);

  useEffect(() => {
    const root = blogContentRef.current;
    if (!selectedPost || !root) return;
    let didBuildFaq = false;

    const buildFaqFromHeading = (heading: HTMLHeadingElement) => {
      if (heading.classList.contains('seo-faq-title') || heading.closest('.seo-faq-section')) return;

      let sibling = heading.nextElementSibling as HTMLElement | null;
      const questionHeadings: HTMLHeadingElement[] = [];
      while (sibling && sibling.tagName.toLowerCase() !== 'h2') {
        if (sibling.tagName.toLowerCase() === 'h3') {
          questionHeadings.push(sibling as HTMLHeadingElement);
        }
        sibling = sibling.nextElementSibling as HTMLElement | null;
      }

      if (questionHeadings.length === 0) return;
      didBuildFaq = true;

      heading.textContent = 'C\u00e2u h\u1ecfi th\u01b0\u1eddng g\u1eb7p';
      heading.classList.add('seo-faq-title');
      heading.parentElement?.classList.add('seo-faq-section');

      questionHeadings.forEach((questionHeading) => {
        const questionText = questionHeading.textContent?.replace(/^\s*\d+[\.\)]\s*/, '').trim() || '';
        if (!questionText) return;

        const details = document.createElement('details');
        details.className = 'seo-faq';

        const summary = document.createElement('summary');
        summary.className = 'seo-faq-question';
        const questionLabel = document.createElement('span');
        questionLabel.textContent = questionText;
        const icon = document.createElement('span');
        icon.className = 'seo-faq-icon';
        icon.setAttribute('aria-hidden', 'true');
        summary.append(questionLabel, icon);

        const answer = document.createElement('div');
        answer.className = 'seo-faq-answer';

        let answerSibling = questionHeading.nextSibling;
        while (answerSibling) {
          const nextAnswerSibling = answerSibling.nextSibling;
          const answerElement = answerSibling instanceof HTMLElement ? answerSibling : null;
          const answerTag = answerElement?.tagName?.toLowerCase();
          if (answerTag === 'h2' || answerTag === 'h3') break;
          answer.appendChild(answerSibling);
          answerSibling = nextAnswerSibling;
        }

        details.appendChild(summary);
        details.appendChild(answer);
        questionHeading.replaceWith(details);
      });
    };

    root.querySelectorAll('h2, h3').forEach((heading) => {
      const headingText = normalizeTextForMatch(heading.textContent || '');
      if (headingText.includes('cau hoi') || headingText.includes('faq')) {
        buildFaqFromHeading(heading as HTMLHeadingElement);
      }
    });

    if (didBuildFaq) {
      setContentHtml(root.innerHTML);
    }
  }, [selectedPost, contentHtml]);

  useEffect(() => {
    if (!selectedPost) return;

    const handleScroll = () => {
      const heroImageContainer = document.querySelector('.blog-hero-image');
      if (!heroImageContainer) return;

      const heroImage = heroImageContainer.querySelector('img') as HTMLImageElement;
      if (!heroImage) return;

      const imageRect = heroImage.getBoundingClientRect();
      const imageHeight = imageRect.height;
      const scrolledDistance = -imageRect.top;
      const scrollProgress = imageHeight > 0 ? scrolledDistance / imageHeight : 0;
      
      const firstH2 = document.querySelector('.blog-content h2');
      if (firstH2) {
        const rect = firstH2.getBoundingClientRect();
        setShowToc(rect.top < 100);
      } else {
        setShowToc(scrollProgress >= 0.7);
      }

      const headingElements = Array.from(document.querySelectorAll('h2[id], h3[id], h4[id]')) as HTMLElement[];
      let currentActiveId = '';

      headingElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.25) {
          currentActiveId = element.id;
        }
      });

      if (!currentActiveId && headingElements.length > 0) {
        currentActiveId = headingElements[0].id;
      }

      setActiveHeadingId(currentActiveId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedPost]);

  useEffect(() => {
    if (!selectedPost) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('animate-underline');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    const headings = document.querySelectorAll('.blog-content h2, .blog-content h3');
    headings.forEach((heading) => {
      observer.observe(heading);
    });

    return () => {
      headings.forEach((heading) => {
        observer.unobserve(heading);
      });
      observer.disconnect();
    };
  }, [selectedPost, contentHtml]);

  useEffect(() => {
    const root = blogContentRef.current;
    if (!selectedPost || !root) return;

    const cleanupHandlers: Array<() => void> = [];
    root.querySelectorAll('img').forEach((image) => {
      const img = image as HTMLImageElement;
      const handleError = () => {
        img.style.visibility = 'hidden';
        img.closest('figure')?.classList.add('blog-media-missing');
      };

      img.addEventListener('error', handleError);
      cleanupHandlers.push(() => img.removeEventListener('error', handleError));
    });

    return () => cleanupHandlers.forEach(cleanup => cleanup());
  }, [selectedPost, contentHtml]);

  const mainBlogCategory = blogCategories.find(item => item.group === 'main') || blogCategories[0] || DEFAULT_BLOG_CATEGORY_ITEMS[0];
  const effectiveCategorySlug = categorySlug || (!selectedPost ? slug : undefined);
  const activeBlogCategory = effectiveCategorySlug
    ? findBlogCategoryBySlug(blogCategories, effectiveCategorySlug)
    : mainBlogCategory;
  const syntheticBlogCategory = !activeBlogCategory && activeCategory && effectiveCategorySlug && activeCategory !== 'Tất cả'
    ? normalizeBlogCategoryItem({ label: activeCategory, link: `/blog/${effectiveCategorySlug}`, group: 'category' }, -1)
    : undefined;
  const currentBlogMeta = activeBlogCategory || syntheticBlogCategory || mainBlogCategory;
  const blogCanonical = currentBlogMeta?.link || '/blog';
  const postCanonical = selectedPost ? getBlogPostPath(selectedPost) : blogCanonical;
  const isBlogHome = !selectedPost && blogCanonical === '/blog';
  const currentBlogHubSlug = !selectedPost && !isBlogHome ? getSlugFromCategoryPath(blogCanonical) : '';
  const currentBlogHubProductLink = currentBlogHubSlug ? BLOG_HUB_PRODUCT_LINKS[currentBlogHubSlug] : undefined;
  const currentBlogHubTitle = currentBlogMeta?.h1 || activeCategory;
  const blogHomeTitle = isBlogHome ? BLOG_HOME_SEO.h1 : currentBlogMeta?.h1;
  const blogHomeDescription = isBlogHome ? BLOG_HOME_SEO.description : currentBlogMeta?.description;
  const blogSchema = selectedPost ? buildSeoGraph(
    {
      '@type': 'Article',
      '@id': `${absoluteUrl(postCanonical)}#article`,
      headline: selectedPost.title || 'Bài viết',
      description: cleanSeoText(selectedPost.metaDescription || selectedPost.excerpt || selectedPost.content, 220),
      image: [absoluteUrl(selectedPost.image)],
      url: absoluteUrl(postCanonical),
      mainEntityOfPage: absoluteUrl(postCanonical),
      datePublished: selectedPost.createdAt && typeof selectedPost.createdAt.toDate === 'function' 
        ? selectedPost.createdAt.toDate().toISOString() 
        : (selectedPost.createdAt?.seconds ? new Date(selectedPost.createdAt.seconds * 1000).toISOString() : new Date().toISOString()),
      dateModified: selectedPost.updatedAt && typeof selectedPost.updatedAt.toDate === 'function'
        ? selectedPost.updatedAt.toDate().toISOString()
        : (selectedPost.updatedAt?.seconds ? new Date(selectedPost.updatedAt.seconds * 1000).toISOString() : (selectedPost.createdAt && typeof selectedPost.createdAt.toDate === 'function' ? selectedPost.createdAt.toDate().toISOString() : (selectedPost.createdAt?.seconds ? new Date(selectedPost.createdAt.seconds * 1000).toISOString() : new Date().toISOString()))),
      author: {
        '@type': 'Person',
        name: selectedPost.author || 'UR Sport',
        url: SITE_URL
      },
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'vi-VN',
      wordCount: selectedPost.content ? selectedPost.content.split(/\s+/).length : 0
    },
    buildBreadcrumbSchema([
      { name: 'Trang chủ', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: selectedPost.title, url: postCanonical }
    ])
  ) : buildSeoGraph({
    '@type': 'Blog',
    '@id': `${absoluteUrl(blogCanonical)}#blog`,
    url: absoluteUrl(blogCanonical),
    name: blogHomeTitle || 'Blog UR Sport',
    description: blogHomeDescription,
    inLanguage: 'vi-VN',
    publisher: { '@id': `${SITE_URL}/#organization` }
  });

  useSEO({
    title: selectedPost ? (selectedPost.seoTitle || `${selectedPost.title} | Blog UR Sport`) : (isBlogHome ? BLOG_HOME_SEO.title : (currentBlogMeta?.seoTitle || `${currentBlogMeta?.h1 || 'Blog'} | UR Sport`)),
    description: selectedPost ? (selectedPost.metaDescription || selectedPost.excerpt || selectedPost.title) : (isBlogHome ? BLOG_HOME_SEO.description : (currentBlogMeta?.metaDescription || currentBlogMeta?.description || '')),
    canonical: postCanonical,
    image: selectedPost?.image,
    type: selectedPost ? "article" : "website",
    schema: blogSchema,
    customSchema: selectedPost?.customSchema || contentSchema
  });

  const filteredPosts = posts.filter(post => {
    const isInCategory = isBlogHome || blogPostMatchesHub(post, activeCategory);
    if (!isInCategory) return false;

    if (!searchQuery) return true;

    const queryNormalized = normalizeTextForMatch(searchQuery);
    return (
      normalizeTextForMatch(post.title || '').includes(queryNormalized) ||
      normalizeTextForMatch(post.excerpt || '').includes(queryNormalized) ||
      normalizeTextForMatch(post.category || '').includes(queryNormalized)
    );
  });
  const mobileFeaturedPosts = filteredPosts.slice(0, 3);
  const homeBlogHubSections = BLOG_HOME_HUBS.map((hub) => {
    const hubSlug = getSlugFromCategoryPath(hub.href);
    const hubPosts = posts.filter(post => blogPostMatchesHub(post, hub.title));
    const visibleCount = homeHubVisibleCounts[hubSlug] || 3;

    return {
      ...hub,
      slug: hubSlug,
      posts: hubPosts,
      visiblePosts: hubPosts.slice(0, visibleCount),
      visibleCount,
      hasMore: hubPosts.length > visibleCount
    };
  });
  const showMoreHomeHubPosts = (hubSlug: string) => {
    setHomeHubVisibleCounts(prev => ({
      ...prev,
      [hubSlug]: (prev[hubSlug] || 3) + 3
    }));
  };
  const getFirstPostContentImage = (html?: string) => {
    if (!html) return '';
    return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
  };
  const getMobilePostFallbackImage = (post: any) => {
    const haystack = `${post?.title || ''} ${post?.category || ''} ${post?.slug || ''}`.toLowerCase();
    if (haystack.includes('quáº§n') || haystack.includes('quan')) return '/images/blog/quan-the-thao-nam.webp';
    if (haystack.includes('size')) return '/images/blog/bang-size-ao-thun-nam-ursport-chuan-form.png';
    if (haystack.includes('polo')) return '/images/blog/ao-polo-nam.webp';
    if (haystack.includes('gym') || haystack.includes('thá»ƒ thao') || haystack.includes('the thao')) {
      return '/images/blog/ao-thun-nam-the-thao-ursport.webp';
    }

    return '/images/blog/ao-thun-nam-mac-hang-ngay-ursport.webp';
  };
  const getMobilePostImage = (post: any) =>
    post?.image?.trim?.() ||
    post?.images?.find((image: string) => image?.trim?.()) ||
    getFirstPostContentImage(post?.content) ||
    getMobilePostFallbackImage(post);
  const getMobilePostText = (post: any) =>
    post?.excerpt || post?.metaDescription || post?.title || '';

  const scrollToTocHeading = (headingId: string, offset = 100) => {
    setIsExpanded(true);
    setInlineTocOpenId(null);

    window.setTimeout(() => {
      const element = document.getElementById(headingId);
      if (!element) return;

      const targetPosition = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }, isExpanded ? 0 : 120);
  };

  if (selectedPost) {
    const relatedPosts = posts.filter(p => p.id !== selectedPost.id).slice(0, 5);

    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        {/* Scroll Reading Progress Bar */}
        <div className="fixed top-0 left-0 w-full h-1 bg-zinc-100 z-[70] lg:top-[80px]">
          <div 
            className="h-full bg-gradient-to-r from-sky-400 to-[#1e4b64] transition-all duration-100" 
            style={{ width: `${readProgress}%` }}
          />
        </div>

        {/* Sticky Mobile Header TOC */}
        <AnimatePresence>
          {showToc && activeHeadingId && (
            <motion.div 
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="fixed top-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-md border-b border-zinc-100 shadow-sm lg:hidden lg:top-[80px]"
            >
              <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
                <div className="flex-grow min-w-0">
                  <h3 className="text-[13px] sm:text-[14px] font-black text-[#1e4b64] truncate">
                    {tocHeadings.find(h => h.id === activeHeadingId)?.text || selectedPost?.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setInlineTocOpenId(inlineTocOpenId === activeHeadingId ? null : activeHeadingId)}
                  className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-[#1e4b64] transition-all flex items-center gap-1 border border-zinc-200 cursor-pointer"
                >
                  {inlineTocOpenId === activeHeadingId ? 'Thu gọn' : 'Xem mục lục'}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", inlineTocOpenId === activeHeadingId && "rotate-180")} />
                </button>
              </div>

              {/* Inline TOC portal inside the sticky bar */}
              <AnimatePresence>
                {inlineTocOpenId === activeHeadingId && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-transparent px-4 pb-5 overflow-hidden"
                  >
                    <div className="max-w-[936px] mx-auto rounded-2xl bg-zinc-50 border border-zinc-200 p-6 shadow-md max-h-[min(70vh,720px)] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
                        <h4 className="text-sm font-black text-zinc-955 uppercase tracking-wider">
                          Mục lục bài viết
                        </h4>
                        <button
                          onClick={() => setInlineTocOpenId(null)}
                          className="text-xs text-[#1e4b64] flex items-center gap-1 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Đóng <ChevronDown className="h-4 w-4 rotate-180" />
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        {tocHeadings.map((item) => (
                          <button
                            key={`sticky-item-${item.id}`}
                            onClick={() => {
                              scrollToTocHeading(item.id, 160);
                            }}
                            className={cn(
                              "block w-full text-left text-[14px] text-zinc-600 hover:text-zinc-900 transition-colors leading-snug cursor-pointer",
                              item.level !== 2 && "pl-6 text-zinc-500",
                              activeHeadingId === item.id && "text-[#1e4b64] font-black"
                            )}
                          >
                            <span>{item.number}. {item.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breadcrumb Navigation */}
        <nav className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs font-bold text-zinc-400 mb-8 pb-4 border-b border-zinc-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button onClick={() => navigate("/")} className="shrink-0 hover:text-zinc-900 transition-colors cursor-pointer">Trang chủ</button>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <button onClick={() => navigate("/blog")} className="shrink-0 hover:text-zinc-900 transition-colors cursor-pointer">Blog</button>
          {selectedPost.category && (() => {
            const cat = blogCategories.find(c => 
              c.label.toLowerCase() === selectedPost.category.toLowerCase() ||
              selectedPost.category.toLowerCase().includes(c.label.toLowerCase()) ||
              c.label.toLowerCase().includes(selectedPost.category.toLowerCase())
            ) || DEFAULT_BLOG_CATEGORY_ITEMS.find(c => 
              c.label.toLowerCase() === selectedPost.category.toLowerCase() ||
              selectedPost.category.toLowerCase().includes(c.label.toLowerCase()) ||
              c.label.toLowerCase().includes(selectedPost.category.toLowerCase())
            );
            const catLink = cat ? cat.link : `/blog/category/${slugifyCategory(selectedPost.category)}`;
            return (
              <>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <button 
                  onClick={() => navigate(catLink)} 
                  className="shrink-0 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  {selectedPost.category}
                </button>
              </>
            );
          })()}
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="min-w-[140px] max-w-[55vw] truncate text-zinc-600 sm:max-w-md">{selectedPost.title}</span>
        </nav>

        {/* Post Metadata Hero Block */}
        <div className="max-w-4xl mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-955 leading-tight tracking-tight mb-6">
            {selectedPost.title}
          </h1>

          <div className="flex items-center gap-3.5 pb-6 border-b border-zinc-100">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#1e4b64] text-white font-black flex items-center justify-center text-sm uppercase shadow-sm">
              {(selectedPost.author || 'U').charAt(0)}
            </div>
            <div>
              <span className="block text-sm font-black text-zinc-955 leading-none mb-1.5">{selectedPost.author || 'UR Sport'}</span>
              <div className="flex items-center gap-2.5 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{selectedPost.date || 'Gần đây'}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                  <span>{Math.max(1, Math.ceil((selectedPost.content?.split(/\s+/).length || 0) / 200))} phút đọc</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Large Featured Image */}
        <div className="blog-hero-image relative aspect-video overflow-hidden rounded-[32px] mb-12 shadow-lg border border-zinc-100">
          <img 
            src={selectedPost.image} 
            alt={selectedPost.title} 
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-102"
          />
        </div>

        {/* Two-Column Grid Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-16 items-start">
          <div className="min-w-0 w-full">
            <div className="relative w-full overflow-x-hidden">
              {/* Static Collapsible TOC for Mobile/Tablet */}
              {tocHeadings.length > 0 && (
                <div className="mb-10 p-6 rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-sm w-full lg:hidden">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
                    <h4 className="text-sm font-black text-zinc-955 uppercase tracking-wider">
                      Mục lục
                    </h4>
                    <button 
                      onClick={() => setIsStaticTocOpen(!isStaticTocOpen)}
                      className="text-xs text-[#1e4b64] flex items-center gap-1 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {isStaticTocOpen ? 'Ẩn' : 'Hiện'} 
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isStaticTocOpen ? "rotate-180" : "rotate-0")} />
                    </button>
                  </div>
                  
                  {isStaticTocOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2.5 overflow-hidden"
                    >
                      {tocHeadings.map((item) => (
                        <button
                          key={`static-${item.id}`}
                          onClick={() => {
                            scrollToTocHeading(item.id, 100);
                          }}
                          className={cn(
                            "block w-full text-left text-[14px] text-zinc-600 hover:text-zinc-955 transition-colors leading-snug cursor-pointer",
                            item.level !== 2 && "pl-6 text-zinc-500"
                          )}
                        >
                          <span>{item.number}. {item.text}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Main Content Render */}
              <div 
                ref={blogContentRef}
                className={cn(
                  "blog-content product-description-container notranslate w-full text-zinc-700 transition-[max-height] duration-700 ease-in-out overflow-x-hidden text-base sm:text-lg leading-relaxed font-medium",
                  !isExpanded ? "max-h-[1200px] overflow-y-hidden" : "max-h-none overflow-y-visible"
                )}
              >
                <div dangerouslySetInnerHTML={{ 
                  __html: contentHtml
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\u00a0/g, ' ')
                }} />
              </div>

              {/* Portals for Inline TOC Actions */}
              {contentHtml && tocHeadings.map(heading => {
                const actionAnchor = document.getElementById(`action-anchor-${heading.id}`);
                const tocAnchor = document.getElementById(`toc-anchor-${heading.id}`);
                
                if (!actionAnchor) return null;

                const isThisOpen = inlineTocOpenId === heading.id;

                return (
                  <React.Fragment key={heading.id}>
                    {createPortal(
                      <button 
                        onClick={() => setInlineTocOpenId(isThisOpen ? null : heading.id)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-[#1e4b64] transition-all flex items-center gap-1 border border-zinc-200 cursor-pointer"
                      >
                        {isThisOpen ? 'Thu gọn' : 'Xem thêm'}
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", isThisOpen && "rotate-180")} />
                      </button>,
                      actionAnchor
                    )}
                    {isThisOpen && tocAnchor && createPortal(
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 mb-8 p-6 rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-md lg:hidden"
                      >
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-150">
                          <h4 className="text-sm font-black text-zinc-955 uppercase tracking-wider">
                            Mục lục
                          </h4>
                          <button 
                            onClick={() => setInlineTocOpenId(null)}
                            className="text-xs text-[#1e4b64] flex items-center gap-1 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Ẩn <ChevronDown className="h-4 w-4 rotate-180" />
                          </button>
                        </div>
                        <div className="space-y-2.5">
                          {tocHeadings.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                scrollToTocHeading(item.id, 100);
                              }}
                              className={cn(
                                "block w-full text-left text-[14px] text-zinc-600 hover:text-zinc-955 transition-colors leading-snug cursor-pointer",
                                item.level !== 2 && "pl-6 text-zinc-500"
                              )}
                            >
                              <span>{item.number}. {item.text}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>,
                      tocAnchor
                    )}
                  </React.Fragment>
                );
              })}
              
              {!isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none z-10" />
              )}
            </div>

            {/* Read more button wrapper */}
            <div className="flex justify-center pt-8 mb-6">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-8 py-3.5 bg-white text-[#1e4b64] border border-zinc-200 text-sm font-black uppercase tracking-wider rounded-full shadow-md hover:text-[#153446] hover:border-[#1e4b64] hover:-translate-y-1 transition-all flex items-center gap-2 group cursor-pointer"
              >
                <span>{isExpanded ? 'Thu gọn bài viết' : 'Đọc tiếp bài viết'}</span>
                <ChevronDown className={cn("h-4 w-4 transition-all duration-300", isExpanded && "rotate-180")} />
              </button>
            </div>

            {/* Premium Likes and Shares Engagement Bar */}
            <div className="my-10 p-6 rounded-3xl bg-zinc-50 border border-zinc-150 flex flex-wrap items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleLike}
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center border shadow-xs transition-all duration-300 transform active:scale-95 cursor-pointer",
                    liked 
                      ? "bg-rose-500 border-rose-500 text-white shadow-rose-500/25 hover:bg-rose-600"
                      : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                  )}
                  aria-label="Yêu thích bài viết"
                >
                  <Heart className={cn("h-5 w-5", liked && "fill-current")} />
                </button>
                <div>
                  <span className="block text-sm font-black text-zinc-955 leading-none mb-1.5">Bài viết hữu ích?</span>
                  <span className="text-xs font-bold text-zinc-500">{likesCount} lượt yêu thích</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                  className="h-10 w-10 rounded-full flex items-center justify-center bg-[#1877f2] hover:bg-[#166fe5] text-white transition-colors shadow-xs cursor-pointer"
                  title="Chia sẻ lên Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </button>
                <button 
                  onClick={handleCopyLink}
                  className={cn(
                    "h-10 px-4 rounded-full flex items-center gap-2 border text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer",
                    copied 
                      ? "bg-emerald-500 border-emerald-500 text-white" 
                      : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
                  )}
                >
                  <Link className="h-3.5 w-3.5" />
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép link'}</span>
                </button>
              </div>
            </div>

            {selectedPost.images?.length > 0 && (
              <div className="grid gap-6 mt-10 sm:grid-cols-2 w-full">
                {selectedPost.images.map((img, index) => (
                  <div key={index} className="overflow-hidden rounded-[24px] bg-zinc-50 border border-zinc-100 shadow-sm w-full aspect-[4/3]">
                    <img src={img} alt={`${selectedPost.title} - Ảnh ${index + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-103" />
                  </div>
                ))}
              </div>
            )}

            {selectedPost.videos?.length > 0 && (
              <div className="mt-10 space-y-6 w-full">
                {selectedPost.videos.map((video, index) => (
                  <div key={index} className="overflow-hidden rounded-[24px] bg-black shadow-md w-full">
                    <video 
                      controls 
                      src={video} 
                      className="w-full object-cover" 
                      controlsList="nodownload"
                      crossOrigin="anonymous"
                      preload="metadata"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {tocHeadings.length > 0 && (
            <aside className={cn(
              "hidden lg:block lg:w-[320px] shrink-0 transition-opacity duration-300 self-stretch h-full",
              shouldHideSidebar ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
              <div className="space-y-8 lg:sticky lg:top-24">
                {/* Dynamic scroll-following TOC */}
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-xs">
                  <h4 className="text-[11px] font-black text-zinc-455 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-zinc-150">
                    Mục lục bài viết
                  </h4>
                  <nav className="space-y-3">
                      {tocHeadings.map((heading) => {
                        const isActive = activeHeadingId === heading.id;
                        return (
                          <button
                            key={heading.id}
                            onClick={() => scrollToTocHeading(heading.id, 100)}
                            className={cn(
                              "block text-left text-[13px] leading-relaxed transition-all duration-200 cursor-pointer w-full font-bold",
                              heading.level !== 2 ? "pl-3 text-[12px] font-semibold" : "",
                              isActive 
                                ? "text-[#1e4b64] font-black translate-x-1" 
                                : "text-zinc-500 hover:text-zinc-800"
                            )}
                          >
                            {heading.number}. {heading.text}
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                {/* Related Posts */}
                <div>
                  <h3 className="text-[11px] font-black text-zinc-455 uppercase tracking-[0.2em] mb-5 border-b border-zinc-150 pb-2 truncate">
                    BÀI VIẾT LIÊN QUAN
                  </h3>
                  <div className="space-y-5">
                    {relatedPosts.slice(0, 3).map((post) => (
                      <div 
                        key={post.id} 
                        className="flex gap-4 group cursor-pointer"
                        onClick={() => navigate(getBlogPostPath(post))}
                      >
                        <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-50 border border-zinc-100 shadow-xs">
                           <LazyImage 
                            src={post.image} 
                            alt={post.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                           />
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                           <h4 className="font-bold text-xs text-zinc-900 group-hover:text-[#1e4b64] transition-colors leading-snug line-clamp-2">
                             {post.title}
                           </h4>
                           <span className="text-[10px] font-bold text-zinc-400 mt-1">{post.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sidebar Brand Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1e4b64] to-[#153446] text-white text-center shadow-md relative overflow-hidden">
                  <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-white/5 blur-2xl pointer-events-none" />
                  <h4 className="text-sm font-black uppercase tracking-wider mb-2">UR SPORT Premium</h4>
                  <p className="text-xs text-zinc-300 mb-4 leading-normal">
                    Chất liệu tối ưu hoàn hảo cho buổi tập hiệu năng cao. Khám phá bộ sưu tập mới nhất.
                  </p>
                  <button 
                    onClick={() => navigate('/shop')}
                    className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-xs"
                  >
                    Mua sắm ngay
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Related Products Widget */}
        <div className="w-full mt-16 pt-12 border-t border-zinc-200">
          <div className="flex items-center justify-between gap-6 mb-8">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#1e4b64] uppercase tracking-tight">SẢN PHẨM PHÙ HỢP VỚI BẠN</h3>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="text-[#1e4b64] text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-1 hover:opacity-80 transition-all group flex-shrink-0 cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {products.slice(0, 5).map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  navigate(getProductPath(product));
                }}
                className="group cursor-pointer flex flex-col h-full bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-50">
                  <LazyImage
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {product.discountPrice && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded bg-rose-500 text-white font-black text-[9px] uppercase tracking-wider shadow-sm">
                      Giảm giá
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/2 transition-colors" />
                  <button className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white text-zinc-955 shadow-md flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 cursor-pointer hover:bg-zinc-50 border border-zinc-100">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <h4 className="text-[13px] font-bold text-zinc-800 leading-snug line-clamp-2 group-hover:text-[#1e4b64] transition-colors mb-2">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="text-[15px] font-black text-[#ff3b30]">{(product.discountPrice || product.price).toLocaleString('vi-VN')}đ</span>
                    {product.discountPrice && (
                      <span className="text-xs text-zinc-400 line-through font-bold">{(product.price).toLocaleString('vi-VN')}đ</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getBlogSectionOrder = (type: BlogPageSectionType) => {
    const index = blogPageSections.findIndex(section => section.type === type && section.enabled);
    return index >= 0 ? index : 99;
  };

  const getBlogSection = (type: BlogPageSectionType) => blogPageSections.find(item => item.type === type);

  const isBlogSectionEnabled = (type: BlogPageSectionType) => {
    const section = getBlogSection(type);
    return section ? section.enabled !== false : true;
  };

  const categoryTabsSection = getBlogSection('category-tabs');
  const selectedTabLinks = categoryTabsSection?.settings?.selectedTabLinks;
  const blogCategoryTabs = blogCategories
    .filter(c => !selectedTabLinks?.length || selectedTabLinks.includes(c.link))
    .map(c => ({ id: c.id, label: c.label, link: c.link }));
  const featuredSection = getBlogSection('featured');
  const heroSection = getBlogSection('hero');
  const normalizeSavedCategorySlug = (value?: string) => value?.toString().split('/').filter(Boolean).pop() || '';
  const selectedFeaturedCategorySlug = normalizeSavedCategorySlug(featuredSection?.settings?.featuredCategorySlug);
  const blogHeroTitle = heroSection?.settings?.title || blogHomeTitle;
  const blogHeroSubtitle = heroSection?.settings?.subtitle || blogHomeDescription;
  const blogHeroTrendingTags = heroSection?.settings?.trendingTags;
  const blogHeroSearchPlaceholder = heroSection?.settings?.searchPlaceholder;
  const featuredPosts = featuredSection?.settings?.featuredMode === 'manual'
    ? (featuredSection.settings.selectedPostIds || [])
      .map(id => posts.find(post => post.id === id))
      .filter(Boolean) as any[]
    : posts.filter(post => {
      if (!selectedFeaturedCategorySlug) return true;
      return slugifyCategory(post.category || '') === selectedFeaturedCategorySlug;
    });
  const featuredMobilePosts = featuredPosts.slice(0, 3);
  const categorySectionsConfig = getBlogSection('category-sections');
  const normalizeCategorySectionSlug = (value?: string) => {
  if (!value) return '';
  return value.toString().split('/').filter(Boolean).pop() || '';
};

  const configuredHomeBlogHubSections = categorySectionsConfig?.settings?.categoryMode === 'single'
    ? homeBlogHubSections.filter(section => {
      const selectedSlug = normalizeCategorySectionSlug(categorySectionsConfig.settings?.categorySlug);
      const sectionSlug = normalizeCategorySectionSlug(section.href);
      return selectedSlug && sectionSlug === selectedSlug;
    })
    : homeBlogHubSections;
  const visibleHomeBlogHubSections = categorySectionsConfig?.settings?.postMode === 'manual'
    ? configuredHomeBlogHubSections.map(section => {
      const selectedPosts = (categorySectionsConfig.settings?.selectedPostIds || [])
        .map(id => posts.find(post => post.id === id))
        .filter(Boolean) as any[];
      return {
        ...section,
        posts: selectedPosts,
        visiblePosts: selectedPosts.slice(0, section.visibleCount),
        hasMore: selectedPosts.length > section.visibleCount,
      };
    })
    : configuredHomeBlogHubSections;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 py-8 sm:px-6 lg:px-8">
      {isBlogSectionEnabled('hero') && (
        <div style={{ order: getBlogSectionOrder('hero') }}>
          <BlogHero
            title={blogHeroTitle || mainBlogCategory.label}
            subtitle={blogHeroSubtitle}
            searchValue={searchQuery}
            searchPlaceholder={blogHeroSearchPlaceholder}
            trendingTags={blogHeroTrendingTags}
            onSearchChange={setSearchQuery}
            onSearchSubmit={() => setSearchQuery(searchQuery.trim())}
            onTagClick={setSearchQuery}
          />
        </div>
      )}

      {/* Categories Tabs filter */}
      {isBlogSectionEnabled('category-tabs') && (
        <div style={{ order: getBlogSectionOrder('category-tabs') }}>
          <CategoryTabs
            categories={blogCategoryTabs}
            active={activeCategory}
            onSelect={(c) => { setActiveCategory(c.label); navigate(c.link); }}
          />
        </div>
      )}

      {/* Featured articles grid - hidden during searching to highlight search results */}
      {isBlogSectionEnabled('featured') && isBlogHome && !searchQuery && featuredMobilePosts.length > 0 && (
        <div className="mx-auto mb-10 w-full max-w-[430px] lg:hidden" style={{ order: getBlogSectionOrder('featured') }}>
          <article
            onClick={() => navigate(getBlogPostPath(featuredMobilePosts[0]))}
            className="cursor-pointer"
          >
            <div className="relative aspect-[1.08/1] overflow-hidden rounded-2xl bg-zinc-100">
              <img
                src={getMobilePostImage(featuredMobilePosts[0])}
                alt={featuredMobilePosts[0].title}
                className="h-full w-full object-cover"
                loading="eager"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = getMobilePostFallbackImage(featuredMobilePosts[0]);
                }}
              />
              <span className="absolute bottom-3 left-3 rounded-full bg-[#1e4b64] px-3 py-1 text-[10px] font-black text-white">
                {featuredMobilePosts[0].date || 'Mới'}
              </span>
            </div>
            <h3 className="mt-3 text-[17px] font-semibold leading-tight text-zinc-950">
              {featuredMobilePosts[0].title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-zinc-700">
              {getMobilePostText(featuredMobilePosts[0])}
            </p>
          </article>

          {featuredMobilePosts.length > 1 && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {featuredMobilePosts.slice(1, 3).map((post, index) => (
                <article
                  key={post.id || index}
                  onClick={() => navigate(getBlogPostPath(post))}
                  className="min-w-0 cursor-pointer"
                >
                  <div className="relative aspect-[1.35/1] overflow-hidden rounded-xl bg-zinc-100">
                    <img
                      src={getMobilePostImage(post)}
                      alt={post.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = getMobilePostFallbackImage(post);
                      }}
                    />
                    <span className="absolute bottom-2 left-2 rounded-full bg-[#1e4b64] px-2.5 py-0.5 text-[9px] font-black text-white">
                      {post.date || 'Mới'}
                    </span>
                  </div>
                  <h4 className="mt-2 line-clamp-3 text-[14px] font-semibold leading-tight text-zinc-950">
                    {post.title}
                  </h4>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
      {isBlogSectionEnabled('featured') && isBlogHome && !searchQuery && (
        <div className="hidden lg:block" style={{ order: getBlogSectionOrder('featured') }}>
          <FeaturedCarousel posts={featuredPosts} />
        </div>
      )}

      {isBlogSectionEnabled('category-sections') && isBlogHome && !searchQuery && (
        <div className="space-y-16 pb-8" style={{ order: getBlogSectionOrder('category-sections') }}>
            {visibleHomeBlogHubSections.map((hubSection) => (
            <section key={hubSection.slug} className="w-full">
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#1e4b64]">
                    Danh mục blog
                  </span>
                  <h2 className="mt-2 text-2xl font-extrabold leading-tight text-zinc-950 sm:text-3xl">
                    {hubSection.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-600">
                    {hubSection.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(hubSection.href)}
                  className="inline-flex w-fit items-center gap-1.5 text-sm font-black text-[#1e4b64] transition-colors hover:text-[#153446]"
                >
                  <span>Xem danh mục</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {hubSection.visiblePosts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {hubSection.visiblePosts.map(post => (
                      <div
                        key={post.id}
                        className="cursor-pointer"
                        onClick={() => navigate(getBlogPostPath(post))}
                      >
                        <BlogCard post={post} />
                      </div>
                    ))}
                  </div>

                  {hubSection.hasMore && (
                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        onClick={() => showMoreHomeHubPosts(hubSection.slug)}
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3 text-sm font-black text-zinc-950 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1e4b64] hover:text-[#1e4b64] hover:shadow-md"
                      >
                        <span>Xem thêm</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
                  <h3 className="text-lg font-black text-zinc-900">Chưa có bài viết {hubSection.title}</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-zinc-500">
                    Khi thêm bài blog có danh mục, tiêu đề hoặc mô tả chứa từ khóa liên quan đến {hubSection.title.toLowerCase()}, bài sẽ tự hiển thị tại đây.
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Main articles listing */}
      {isBlogSectionEnabled('article-list') && (!isBlogHome || searchQuery) && <div className="w-full" style={{ order: getBlogSectionOrder('article-list') }}>
        {!searchQuery && (
          <div className="flex flex-col items-start mb-8">
            <span className="text-[10px] font-black uppercase text-[#1e4b64] tracking-[0.28em] mb-2">
              {isBlogHome ? 'BÀI VIẾT MỚI' : 'BÀI VIẾT THEO DANH MỤC'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">
              {isBlogHome ? 'Bài viết mới về đồ thể thao nam' : `Bài viết ${currentBlogHubTitle}`}
            </h2>
          </div>
        )}
        
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {filteredPosts.map(post => (
              <div 
                key={post.id} 
                className="cursor-pointer"
                onClick={() => navigate(getBlogPostPath(post))}
              >
                <BlogCard post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 rounded-[32px] bg-zinc-50 border border-zinc-150 mb-20 shadow-xs max-w-xl mx-auto">
            <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mb-6 shadow-inner border border-zinc-150">
              <Search className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-extrabold text-zinc-955 mb-2">
              {searchQuery ? 'Không tìm thấy bài viết' : `Chưa có bài viết ${currentBlogHubTitle}`}
            </h3>
            <p className="text-zinc-500 text-sm max-w-sm mb-6 font-semibold">
              {searchQuery
                ? `Chúng tôi không tìm thấy bài viết nào phù hợp với từ khóa "${searchQuery}". Bạn hãy thử tìm kiếm với từ khóa khác như "size", "chất liệu", "đồ tập"...`
                : `Danh mục ${currentBlogHubTitle} đã sẵn cấu trúc SEO. Khi thêm bài viết có tiêu đề, danh mục hoặc mô tả chứa cụm từ liên quan, bài sẽ tự hiển thị tại đây.`}
            </p>
            <button
              onClick={() => {
                if (searchQuery) {
                  setSearchQuery('');
                  return;
                }
                navigate(currentBlogHubProductLink?.href || '/blog');
              }}
              className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-zinc-900 hover:bg-[#1e4b64] text-white transition-all shadow-sm cursor-pointer border border-zinc-955 hover:border-[#1e4b64]"
            >
              {searchQuery ? 'Xóa tìm kiếm' : (currentBlogHubProductLink?.label || 'Về trang blog')}
            </button>
          </div>
        )}
      </div>}
    </div>
  );}
