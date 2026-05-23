import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Calendar, Share2, MessageCircle, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { SITE_URL, absoluteUrl, buildBreadcrumbSchema, buildSeoGraph, cleanSeoText } from '../lib/seo';
import { formatFaqContentHtml } from '../lib/faqHtml';
import { removeEmptyMedia, sanitizeRichHtml } from '../lib/htmlContent';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { STATIC_BLOG_POSTS as POSTS } from '../data';
import { useProducts } from '../ProductsContext';
import { LazyImage } from './LazyImage';
import { getProductPath } from '../lib/productUrls';

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

const BLOG_CATEGORIES_STORAGE_KEY = 'ursport_blog_categories_final_v1';

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

const getSlugFromCategoryPath = (path: string) => {
  if (!path || path === '/blog') return 'blog';
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'blog';
};

const normalizeBlogCategoryItem = (item: Partial<BlogCategoryItem>, index = 0): BlogCategoryItem => {
  const label = item.label?.trim() || 'Blog';
  const link = item.link || (index === 0 ? '/blog' : `/blog/${slugifyCategory(label)}`);
  const group = item.group === 'category' || item.group === 'subcategory' ? item.group : 'main';
  const defaults = BLOG_CATEGORY_SEO_DEFAULTS[getSlugFromCategoryPath(link)] || BLOG_CATEGORY_SEO_DEFAULTS[slugifyCategory(label)] || BLOG_CATEGORY_SEO_DEFAULTS.blog;
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

const DEFAULT_BLOG_CATEGORY_ITEMS = POST_CATEGORIES.map((item, index) => normalizeBlogCategoryItem({
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

const getBlogPostSlug = (post: any) => String(post?.slug || post?.id || '').trim();
const getBlogPostPath = (post: any) => `/blog/${getBlogPostSlug(post)}`;

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

  useEffect(() => {
    setIsExpanded(false);
    setIsStaticTocOpen(false);
    setInlineTocOpenId(null);
  }, [slug]);

  useEffect(() => {
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
    const effectiveCategorySlug = categorySlug || slug;
    const categoryFromRoute = findBlogCategoryBySlug(blogCategories, effectiveCategorySlug);

    if (categoryFromRoute) {
      setActiveCategory(categoryFromRoute.label);
    } else if (categorySlug) {
      const category = findBlogCategoryBySlug(blogCategories, categorySlug);
      setActiveCategory(category?.label || DEFAULT_BLOG_CATEGORY_ITEMS[0].label);
    } else if (!slug) {
      setActiveCategory(blogCategories.find(item => item.group === 'main')?.label || DEFAULT_BLOG_CATEGORY_ITEMS[0].label);
    }
  }, [blogCategories, categorySlug, slug]);

  useEffect(() => {
    if (slug) {
      const categoryFromSlug = findBlogCategoryBySlug(blogCategories, slug);
      if (categoryFromSlug) {
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

  const mainBlogCategory = blogCategories.find(item => item.group === 'main') || blogCategories[0] || DEFAULT_BLOG_CATEGORY_ITEMS[0];
  const effectiveCategorySlug = categorySlug || (!selectedPost ? slug : undefined);
  const activeBlogCategory = effectiveCategorySlug
    ? findBlogCategoryBySlug(blogCategories, effectiveCategorySlug)
    : mainBlogCategory;
  const currentBlogMeta = activeBlogCategory || mainBlogCategory;
  const blogCanonical = currentBlogMeta?.link || '/blog';
  const postCanonical = selectedPost ? getBlogPostPath(selectedPost) : blogCanonical;
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
      author: {
        '@type': 'Organization',
        name: selectedPost.author || 'UR Sport',
        url: SITE_URL
      },
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'vi-VN'
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
    name: currentBlogMeta?.h1 || 'Blog UR Sport',
    inLanguage: 'vi-VN',
    publisher: { '@id': `${SITE_URL}/#organization` }
  });

  useSEO({
    title: selectedPost ? (selectedPost.seoTitle || `${selectedPost.title} | Blog UR Sport`) : (currentBlogMeta?.seoTitle || `${currentBlogMeta?.h1 || 'Blog'} | UR Sport`),
    description: selectedPost ? (selectedPost.metaDescription || selectedPost.excerpt || selectedPost.title) : (currentBlogMeta?.metaDescription || currentBlogMeta?.description || ''),
    canonical: postCanonical,
    image: selectedPost?.image,
    type: selectedPost ? "article" : "website",
    schema: blogSchema,
    customSchema: selectedPost?.customSchema || contentSchema
  });

  const filteredPosts = activeCategory === mainBlogCategory.label
    ? posts
    : posts.filter(p => slugifyCategory(p.category || '') === slugifyCategory(activeCategory));

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
        {/* Sticky Section Header TOC */}
        <AnimatePresence>
          {showToc && activeHeadingId && (
            <motion.div 
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="fixed top-0 left-0 right-0 z-[60] bg-white border-b border-zinc-100 shadow-sm lg:top-[80px]"
            >
              <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
                <div className="flex-grow min-w-0">
                  <h3 className="text-[14px] font-bold text-[#0066cc] truncate">
                    {tocHeadings.find(h => h.id === activeHeadingId)?.text || selectedPost?.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setInlineTocOpenId(inlineTocOpenId === activeHeadingId ? null : activeHeadingId)}
                  className="flex-shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#f0f7ff] text-[#0066cc] hover:bg-[#e0efff] transition-all flex items-center gap-1.5 border border-[#d0e6ff]"
                >
                  {inlineTocOpenId === activeHeadingId ? 'Thu gọn' : 'Xem thêm'}
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
                    <div className="max-w-[936px] mx-auto rounded-2xl bg-[#f8f9fa] border border-zinc-200 p-6 shadow-sm max-h-[min(70vh,720px)] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[16px] font-bold text-zinc-900">
                          Mục lục
                        </h4>
                        <button
                          onClick={() => setInlineTocOpenId(null)}
                          className="text-[14px] text-[#0066cc] flex items-center gap-1 hover:underline font-medium"
                        >
                          Ẩn <ChevronDown className="h-4 w-4 rotate-180" />
                        </button>
                      </div>
                      <div className="mt-6 space-y-2.5">
                        {tocHeadings.map((item) => (
                          <button
                            key={`sticky-item-${item.id}`}
                            onClick={() => {
                              scrollToTocHeading(item.id, 160);
                            }}
                            className={cn(
                              "block w-full text-left text-[15px] text-[#0066cc] hover:underline transition-colors leading-snug",
                              item.level !== 2 && "pl-6"
                            )}
                          >
                            <span className="font-medium">{item.number}. {item.text}</span>
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
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-8 pb-4 border-b border-zinc-100">
          <button onClick={() => navigate("/")} className="hover:text-black transition-colors">Home</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate("/blog")} className="hover:text-black transition-colors">Blog</button>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate max-w-[200px] sm:max-w-md">{selectedPost.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-16">
          <div className="min-w-0 w-full">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black leading-tight tracking-tight mb-4">
              {selectedPost.title}
            </h1>

            <div className="mb-6 flex flex-wrap items-center gap-2 sm:mb-10">
              <div className="flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase text-zinc-500 sm:text-[11px]">
                <Calendar className="h-3 w-3" />
                {selectedPost.date}
              </div>
              <span className="rounded bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase text-orange-600 sm:text-[11px]">
                {selectedPost.category}
              </span>
            </div>

            <div className="mb-8 flex items-center justify-between gap-4 border-b border-zinc-100 pb-6 sm:mb-12 sm:pb-10">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 text-base font-black text-white sm:h-12 sm:w-12 sm:text-lg">
                  {(selectedPost.author || 'U').charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-black leading-tight text-zinc-900 sm:text-base">{selectedPost.author || 'UR Sport'}</div>
                  <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400 sm:text-xs sm:tracking-widest">UrSport Specialist</div>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {[Share2, MessageCircle].map((Icon, i) => (
                  <button key={i} className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-all hover:bg-zinc-50 hover:text-black sm:h-9 sm:w-9">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="blog-hero-image relative aspect-[1024/682] overflow-hidden rounded-[32px] mb-12 shadow-2xl w-full">
              <img 
                src={selectedPost.image} 
                alt={selectedPost.title} 
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="relative w-full overflow-x-hidden">
              {/* Static TOC at the top of content */}
              {tocHeadings.length > 0 && (
                <div className="mb-12 p-6 rounded-2xl bg-[#f8f9fa] border border-zinc-200 shadow-sm w-full">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[16px] font-bold text-zinc-900">
                      Mục lục
                    </h4>
                    <button 
                      onClick={() => setIsStaticTocOpen(!isStaticTocOpen)}
                      className="text-[14px] text-[#0066cc] flex items-center gap-1 hover:underline font-medium"
                    >
                      {isStaticTocOpen ? 'Ẩn' : 'Hiện'} 
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isStaticTocOpen ? "rotate-180" : "rotate-0")} />
                    </button>
                  </div>
                  
                  {isStaticTocOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 space-y-2.5 overflow-hidden"
                    >
                      {tocHeadings.map((item) => (
                        <button
                          key={`static-${item.id}`}
                          onClick={() => {
                            scrollToTocHeading(item.id, 100);
                          }}
                          className={cn(
                            "block w-full text-left text-[15px] text-[#0066cc] hover:underline transition-colors leading-snug",
                            item.level !== 2 && "pl-6"
                          )}
                        >
                          <span className="font-medium">{item.number}. {item.text}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}

              <div 
                ref={blogContentRef}
                className={cn(
                  "blog-content product-description-container notranslate w-full text-zinc-600 transition-[max-height] duration-700 ease-in-out overflow-x-hidden",
                  !isExpanded ? "max-h-[1000px] overflow-y-hidden" : "max-h-none overflow-y-visible"
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
                        className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#f0f7ff] text-[#0066cc] hover:bg-[#e0efff] transition-all flex items-center gap-1.5 border border-[#d0e6ff]"
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
                        className="mt-4 mb-8 p-6 rounded-2xl bg-[#f8f9fa] border border-zinc-200 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[16px] font-bold text-zinc-900">
                            Mục lục
                          </h4>
                          <button 
                            onClick={() => setInlineTocOpenId(null)}
                            className="text-[13px] text-[#0066cc] flex items-center gap-1 hover:underline"
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
                                "block w-full text-left text-[15px] text-[#0066cc] hover:underline transition-colors leading-snug",
                                item.level !== 2 && "pl-6"
                              )}
                            >
                              <span className="font-medium">{item.number}. {item.text}</span>
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
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
              )}
            </div>

            <div className="flex justify-center pt-8 mb-12">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-8 py-3 bg-white text-[#1e4b64] border border-zinc-200 text-sm font-bold rounded-full shadow-sm hover:text-[#153446] hover:border-[#1e4b64] hover:-translate-y-1 transition-all flex items-center gap-2 group"
              >
                {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                <ChevronDown className={cn("h-4 w-4 transition-all duration-300", isExpanded && "rotate-180")} />
              </button>
            </div>

            {selectedPost.images?.length > 0 && (
              <div className="grid gap-4 mt-10 sm:grid-cols-2 w-full">
                {selectedPost.images.map((img: string, index: number) => (
                  <div key={index} className="overflow-hidden rounded-[28px] bg-zinc-100 shadow-sm w-full">
                    <img src={img} alt={`${selectedPost.title} - Ảnh ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {selectedPost.videos?.length > 0 && (
              <div className="mt-10 space-y-6 w-full">
                {selectedPost.videos.map((video: string, index: number) => (
                  <div key={index} className="overflow-hidden rounded-[28px] bg-black shadow-lg w-full">
                    <video controls src={video} className="w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

          </div>

          <aside className="relative w-full lg:w-[320px]">


            <div>
              <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6 border-b border-zinc-100 pb-2 truncate">
                BÀI VIẾT LIÊN QUAN
              </h3>
              <div className="space-y-6">
                {relatedPosts.slice(0, 3).map((post) => (
                  <div 
                    key={post.id} 
                    className="flex gap-4 group cursor-pointer"
                    onClick={() => navigate(getBlogPostPath(post))}
                  >
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl">
                       <LazyImage 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                       />
                    </div>
                    <div className="flex flex-col justify-center">
                       <h4 className="font-black text-xs text-zinc-900 group-hover:text-orange-600 transition-colors leading-tight line-clamp-2">
                         {post.title}
                       </h4>
                       <span className="text-[10px] font-bold text-zinc-400 mt-1">{post.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Suggested Products Section */}
          <div className="lg:col-span-2 w-full mt-10 pt-12 border-t border-zinc-200">
            <div className="flex items-center justify-between gap-6 mb-10">
              <h3 className="text-[20px] font-bold text-zinc-900 uppercase tracking-tight">CÓ THỂ BẠN CŨNG THÍCH</h3>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="shrink-0 text-[#1e4b64] text-sm font-bold hover:underline"
              >
                Xem tất cả
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {products.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    navigate(getProductPath(product));
                  }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-50 border border-zinc-100 shadow-sm transition-all duration-500 group-hover:shadow-md">
                    <LazyImage
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    <button className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white text-zinc-900 shadow-lg flex items-center justify-center opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <h4 className="mt-4 mb-2 text-[14px] font-bold text-zinc-800 leading-snug line-clamp-2 group-hover:text-[#1e4b64] transition-colors">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-black text-[#ff3b30]">{(product.discountPrice || product.price).toLocaleString('vi-VN')}đ</span>
                    {product.discountPrice && (
                      <span className="text-xs text-zinc-400 line-through">{product.price.toLocaleString('vi-VN')}đ</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-[32px] sm:text-[40px] font-black text-black leading-tight tracking-tight mb-4">
          {currentBlogMeta?.h1 || mainBlogCategory.label}
        </h1>
        <p className="text-zinc-500 max-w-2xl font-medium text-sm sm:text-base">
          {currentBlogMeta?.description}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {blogCategories.filter(cat => cat.group !== 'subcategory').map(cat => (
          <button
            key={cat.label}
            onClick={() => {
              setActiveCategory(cat.label);
              navigate(cat.link);
            }}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
              activeCategory === cat.label
                ? "bg-[#16a34a] text-white shadow-lg" 
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        {filteredPosts.map(post => (
          <article 
            key={post.id} 
            className="group cursor-pointer"
            onClick={() => navigate(getBlogPostPath(post))}
          >
            <div className="relative aspect-[1024/682] overflow-hidden rounded-3xl mb-6 shadow-sm">
              <LazyImage 
                src={post.image} 
                alt={post.title} 
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-md text-black px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm">
                  {post.category}
                </span>
              </div>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 group-hover:text-[#16a34a] transition-colors leading-tight mb-4 line-clamp-2 min-h-[3.5rem]">
              {post.title}
            </h2>
            
            <p className="text-zinc-500 font-medium line-clamp-2 mb-6">
              {post.excerpt}
            </p>

          </article>
        ))}
      </div>
    </div>
  );
}
