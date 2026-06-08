import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getDoc, getDocs, doc, query, collection, orderBy, limit } from 'firebase/firestore';

import { Hero } from '../components/Hero';
import { StorefrontVoucherBanner } from '../components/StorefrontVoucherBanner';
import { FlashSale } from '../components/FlashSale';
import { BestSeller } from '../components/BestSeller';
import { FULLCollectionSection } from '../components/FULLCollectionSection';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';
import { LazyImage } from '../components/LazyImage';
import { PersonalizedRecommendations } from '../components/PersonalizedRecommendations';
import { TrustBadgesSection } from '../components/TrustBadgesSection';

import { useProducts } from '../ProductsContext';
import { useSEO } from '../hooks/useSEO';
import { db, isFirebaseConfigured } from '../firebase';
import { STATIC_BLOG_POSTS, CATEGORY_METADATA } from '../data';
import { Product, Category, BlogPost } from '../types';
import { readLocalHomepageSections } from '../lib/homepageConfig';
import { getProductPath } from '../lib/productUrls';
import { cn } from '@/lib/utils';
import { SITE_URL, absoluteUrl, buildSeoGraph } from '../lib/seo';
import { sanitizeRichHtml } from '../lib/htmlContent';

const getProductUrl = (product: Product) => {
  return getProductPath(product);
};

type HomepageSectionType =
  | 'hero'
  | 'promo'
  | 'recommend'
  | 'flashsale'
  | 'featured'
  | 'bestseller'
  | 'sport-products'
  | 'polo-products'
  | 'tshirt-products'
  | 'news'
  | 'trust-badges'
  | 'footer'
  | 'custom';

interface HomepageSectionConfig {
  id: string;
  type: HomepageSectionType;
  name?: string;
  enabled?: boolean;
  content?: string;
  settings?: {
    newsMode?: 'auto' | 'manual';
    selectedPostIds?: string[];
    customLayout?: 'html' | 'products';
    productMode?: 'category' | 'manual';
    productCategory?: string;
    selectedProductIds?: string[];
    productLimit?: number;
    subtitle?: string;
    cta?: string;
    href?: string;
  };
}

export default function HomePage({
  onCategorySelect,
  onPageChange
}: {
  onCategorySelect: (c: Category) => void;
  onPageChange: (page: string) => void;
}) {
  const navigate = useNavigate();
  const { products } = useProducts();
  const [homeSeo, setHomeSeo] = useState({
    heading: 'UR Sport - Thương Hiệu Thời Trang Chất Lượng Từ Việt Nam',
    title: 'UR Sport - Phong Cách Thể Thao Đẳng Cấp | Áo Thun, Áo Polo Nam',
    description: 'Khám phá bộ sưu tập thời trang thể thao nam cao cấp tại UR Sport. Chuyên cung cấp áo thun, áo polo nam chất lượng, phong cách và bền bỉ. Miễn phí vận chuyển toàn quốc.',
    keywords: 'ur sport, thời trang thể thao nam, áo thun nam, áo polo nam, đồ tập gym',
    canonical: '/',
    robots: 'index, follow'
  });

  const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
    { id: 'hero', type: 'hero', name: 'Hero Banner', enabled: true },
    { id: 'promo', type: 'promo', name: 'Siêu ưu đãi / Coupon', enabled: true },
    { id: 'recommend', type: 'recommend', name: 'Gợi ý dành riêng', enabled: true },
    { id: 'flashsale', type: 'flashsale', name: 'Flash Sale', enabled: true },
    { id: 'featured', type: 'featured', name: 'Mua theo nhu cầu', enabled: true },
    { id: 'bestseller', type: 'bestseller', name: 'Sản phẩm - bán chạy', enabled: true },
    { id: 'sport-products', type: 'sport-products', name: 'Sản phẩm Áo thể thao nổi bật', enabled: true },
    { id: 'polo-products', type: 'polo-products', name: 'Bộ sưu tập Áo Polo Nam', enabled: true },
    { id: 'tshirt-products', type: 'tshirt-products', name: 'Áo Thun Nam Thời Trang', enabled: true },
    { id: 'news', type: 'news', name: 'Stay updated with UR NEWS', enabled: true },
    { id: 'trust-badges', type: 'trust-badges', name: 'Cam kết dịch vụ', enabled: true },
    { id: 'footer', type: 'footer', name: 'Chân trang', enabled: true }
  ];

  const getSectionLabel = (type: HomepageSectionType) => {
    switch (type) {
      case 'hero': return 'Hero Banner';
      case 'promo': return 'Siêu ưu đãi / Coupon';
      case 'recommend': return 'Gợi ý dành riêng';
      case 'flashsale': return 'Flash Sale';
      case 'featured': return 'Danh mục nổi bật';
      case 'bestseller': return 'Sản phẩm - bán chạy';
      case 'sport-products': return 'Sản phẩm Áo thể thao nổi bật';
      case 'polo-products': return 'Bộ sưu tập Áo Polo Nam';
      case 'tshirt-products': return 'Áo Thun Nam Thời Trang';
      case 'news': return 'Stay updated with UR NEWS';
      case 'trust-badges': return 'Cam kết dịch vụ';
      case 'footer': return 'Chân trang';
      case 'custom': return 'Block tùy chỉnh';
      default: return 'Mục mới';
    }
  };

  const normalizeSection = (section: any): HomepageSectionConfig => {
    const defaultType = 'custom' as HomepageSectionType;
    const type = section.type || (typeof section.id === 'string' ? (
      section.id.startsWith('hero') ? 'hero' :
      section.id.startsWith('promo') ? 'promo' :
      section.id.startsWith('recommend') ? 'recommend' :
      section.id.startsWith('flashsale') ? 'flashsale' :
      section.id.startsWith('featured') ? 'featured' :
      section.id.startsWith('bestseller') ? 'bestseller' :
      section.id.startsWith('sport-products') ? 'sport-products' :
      section.id.startsWith('polo-products') ? 'polo-products' :
      section.id.startsWith('tshirt-products') ? 'tshirt-products' :
      section.id.startsWith('news') ? 'news' :
      section.id.startsWith('trust-badges') ? 'trust-badges' :
      section.id.startsWith('footer') ? 'footer' :
      defaultType
    ) : defaultType);
    return {
      id: section.id || `${type}-${Date.now()}`,
      type,
      name: section.name || getSectionLabel(type),
      enabled: section.enabled !== false,
      content: section.content || '',
      settings: section.settings || {}
    };
  };

  const [homepageSections, setHomepageSections] = useState<HomepageSectionConfig[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [homeBlogPosts, setHomeBlogPosts] = useState<BlogPost[]>(STATIC_BLOG_POSTS);
  const [visibleProductCounts, setVisibleProductCounts] = useState<Record<string, number>>({});

  const getVisibleProductCount = (sectionId: string, initialCount = 6) => visibleProductCounts[sectionId] ?? initialCount;

  const showMoreProducts = (sectionId: string, initialCount = 6) => {
    setVisibleProductCounts(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? initialCount) + 4
    }));
  };

  useEffect(() => {
    const fetchHomeSeo = async () => {
      if (!db || !isFirebaseConfigured) {
        return;
      }

      try {
        const seoDoc = await getDoc(doc(db, 'categorySeo', 'homepage'));
        if (seoDoc.exists()) {
          const data = seoDoc.data();
          setHomeSeo(prev => ({
            heading: data.heading || prev.heading,
            title: data.seoTitle || prev.title,
            description: data.seoDescription || prev.description,
            keywords: data.seoKeywords || prev.keywords,
            canonical: data.seoCanonical || prev.canonical,
            robots: data.seoRobots || prev.robots
          }));
        }
      } catch (error) {
        console.error('Error loading homepage SEO:', error);
      }
    };

    fetchHomeSeo();

    // load homepage sections config
    const fetchHomepageConfig = async () => {
      const localSections = readLocalHomepageSections();
      if (localSections) {
        setHomepageSections(localSections as HomepageSectionConfig[]);
        return;
      }

      if (!db || !isFirebaseConfigured) {
        setHomepageSections(DEFAULT_HOMEPAGE_SECTIONS);
        return;
      }

      try {
        const cfgDoc = await getDoc(doc(db, 'settings', 'homepage'));
        if (cfgDoc.exists()) {
          const data = cfgDoc.data();
          const rawSections = (data.sections || DEFAULT_HOMEPAGE_SECTIONS) as any[];
          const sections = rawSections.map(normalizeSection);
          const ids = sections.map(s => s.id);
          const merged = DEFAULT_HOMEPAGE_SECTIONS
            .map(normalizeSection)
            .filter(d => !ids.includes(d.id))
            .reduce((result, defaultSection) => {
              if (defaultSection.id === 'trust-badges') {
                const footerIndex = result.findIndex(section => section.id === 'footer');
                if (footerIndex >= 0) {
                  result.splice(footerIndex, 0, defaultSection);
                  return result;
                }
              }

              result.push(defaultSection);
              return result;
            }, [...sections] as HomepageSectionConfig[]);
          setHomepageSections(merged);
        } else {
          setHomepageSections(DEFAULT_HOMEPAGE_SECTIONS);
        }
      } catch (err) {
        console.error('Error loading homepage config', err);
        setHomepageSections((readLocalHomepageSections() as HomepageSectionConfig[] | null) || DEFAULT_HOMEPAGE_SECTIONS);
      }
    };

    fetchHomepageConfig();
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchHomeBlogPosts = async () => {
      if (!db || !isFirebaseConfigured) {
        return;
      }

      try {
        const snapshot = await getDocs(query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'), limit(12)));
        const posts = snapshot.docs.map(postDoc => ({
          ...(postDoc.data() as Omit<BlogPost, 'id'>),
          id: postDoc.id
        })) as BlogPost[];
        if (mounted && posts.length > 0) setHomeBlogPosts(posts);
      } catch (error) {
        console.error('Error loading homepage blog posts:', error);
        if (mounted) setHomeBlogPosts(STATIC_BLOG_POSTS);
      }
    };

    fetchHomeBlogPosts();
    return () => {
      mounted = false;
    };
  }, []);

  const renderProductCategorySection = ({
    key,
    category,
    subtitle,
    title,
    titleAccent,
    href,
    cta,
    compactHeader = false
  }: {
    key: string;
    category: Category;
    subtitle?: string;
    title: string;
    titleAccent: string;
    href: string;
    cta: string;
    compactHeader?: boolean;
  }) => {
    const sectionProducts = products.filter(p => p.category === category);
    const visibleCount = getVisibleProductCount(key, 6);
    const displayedProducts = sectionProducts.slice(0, visibleCount);
    const hasMore = visibleCount < sectionProducts.length;

    return (
      <section key={key} className={cn("container-custom bg-white", compactHeader ? "section-padding-bottom" : "section-padding")}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn(
            compactHeader ? "flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left mb-8" : "flex flex-col items-center text-center md:flex-row md:items-end md:text-left justify-between mb-10 gap-4"
          )}
        >
          <div className="homepage-heading-copy">
            {subtitle && <span className="section-subtitle">{subtitle}</span>}
            <h2 className="section-title">
              {title} <span className="text-[#1e4b64]">{titleAccent}</span>
            </h2>
          </div>
          <Link
            to={href}
            title={cta}
            className="text-[#1e4b64] text-[11px] sm:text-[14px] font-bold flex items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap"
          >
            <span>Xem tất cả</span>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayedProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(idx, 5) * 0.08 }}
            >
              <ProductCard
                product={product}
                onClick={() => navigate(getProductUrl(product))}
              />
            </motion.div>
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center mt-12">
            <button
              type="button"
              onClick={() => showMoreProducts(key, 6)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-bold text-zinc-900 shadow-sm transition-colors hover:border-[#1e4b64] hover:text-[#1e4b64] active:scale-[0.98]"
            >
              Xem thêm
            </button>
          </div>
        )}
      </section>
    );
  };

  const getCustomProducts = (section: HomepageSectionConfig) => {
    if (section.settings?.productMode === 'manual') {
      const selectedIds = section.settings.selectedProductIds || [];
      return selectedIds
        .map(id => products.find(product => product.id === id))
        .filter((product): product is Product => Boolean(product));
    }

    const category = section.settings?.productCategory;
    const belongsToCategory = (productCategory: string, filterCategory: string) => {
      // Check prefix or similarity matching
      return productCategory.toLowerCase().includes(filterCategory.toLowerCase());
    };

    return category
      ? products.filter(product => belongsToCategory(product.category, category))
      : products;
  };

  const renderCustomProductSection = (section: HomepageSectionConfig) => {
    const customProducts = getCustomProducts(section);
    if (customProducts.length === 0) return null;
    const href = section.settings?.href;
    const initialCount = section.settings?.productLimit ? Math.max(1, section.settings.productLimit) : 6;
    const visibleCount = getVisibleProductCount(section.id, initialCount);
    const displayedProducts = customProducts.slice(0, visibleCount);
    const hasMore = visibleCount < customProducts.length;

    return (
      <section key={section.id} className="container-custom section-padding bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center text-center md:flex-row md:items-end md:text-left justify-between mb-10 gap-4"
        >
          <div className="homepage-heading-copy">
            {section.settings?.subtitle && <span className="section-subtitle">{section.settings.subtitle}</span>}
            <h2 className="section-title">{section.name}</h2>
          </div>
          {href && (
            <Link
              to={href}
              className="text-[#1e4b64] text-[11px] sm:text-[14px] font-bold flex items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayedProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(idx, 5) * 0.08 }}
            >
              <ProductCard
                product={product}
                onClick={() => navigate(getProductUrl(product))}
              />
            </motion.div>
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center mt-12">
            <button
              type="button"
              onClick={() => showMoreProducts(section.id, initialCount)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-bold text-zinc-900 shadow-sm transition-colors hover:border-[#1e4b64] hover:text-[#1e4b64] active:scale-[0.98]"
            >
              Xem thêm
            </button>
          </div>
        )}
      </section>
    );
  };

  const getBlogPostTime = (post: BlogPost) => {
    const createdAt = post.createdAt as { toMillis?: () => number; seconds?: number } | undefined;
    if (createdAt?.toMillis) return createdAt.toMillis();
    if (typeof createdAt?.seconds === 'number') return createdAt.seconds * 1000;
    const parsed = Date.parse(post.date || '');
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getNewsPosts = (section: HomepageSectionConfig) => {
    const sourcePosts = homeBlogPosts.length > 0 ? homeBlogPosts : STATIC_BLOG_POSTS;
    if (section.settings?.newsMode === 'manual') {
      const selectedIds = section.settings.selectedPostIds || [];
      const selectedPosts = selectedIds
        .map(id => sourcePosts.find(post => post.id === id || post.slug === id))
        .filter((post): post is BlogPost => Boolean(post));
      if (selectedPosts.length > 0) return selectedPosts.slice(0, 8);
    }

    return [...sourcePosts]
      .sort((a, b) => getBlogPostTime(b) - getBlogPostTime(a))
      .slice(0, 8);
  };

  const renderNewsSection = (key: string, posts: BlogPost[]) => {
    const [featuredPost, ...sidePosts] = posts;
    if (!featuredPost) return null;
    const featuredPath = `/blog/${featuredPost.slug || featuredPost.id}`;
    const topSidePosts = sidePosts.slice(0, 2);
    const latestPosts = sidePosts.slice(0, 6);
    const mobileNewsPosts = [featuredPost, ...sidePosts].slice(0, 3);
    const quickLinks = Array.from(new Set(posts.map(post => post.category).filter(Boolean))).slice(0, 6);
    const getPostPath = (post: BlogPost) => `/blog/${post.slug || post.id}`;
    const getPostDate = (post: BlogPost) => post.date || 'Mới cập nhật';
    const getPostExcerpt = (post: BlogPost) => post.excerpt || post.metaDescription || 'Khám phá góc nhìn mới từ UR Sport.';
    const getFirstContentImage = (html?: string) => {
      if (!html) return '';
      return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
    };
    const getFallbackBlogImage = (post: BlogPost) => {
      const haystack = `${post.title} ${post.category} ${post.slug}`.toLowerCase();
      if (haystack.includes('quần') || haystack.includes('quan')) return '/images/blog/quan-the-thao-nam.webp';
      if (haystack.includes('size')) return '/images/blog/bang-size-ao-thun-nam-ursport-chuan-form.png';
      if (haystack.includes('polo')) return '/images/blog/ao-polo-nam.webp';
      if (haystack.includes('quick') || haystack.includes('gym') || haystack.includes('thể thao') || haystack.includes('the thao')) {
        return '/images/blog/ao-thun-nam-the-thao-ursport.webp';
      }

      return '/images/blog/ao-thun-nam-mac-hang-ngay-ursport.webp';
    };
    const getBlogImage = (post: BlogPost) =>
      post.image?.trim() ||
      post.images?.find(image => image?.trim()) ||
      getFirstContentImage(post.content) ||
      getFallbackBlogImage(post);
    const getCategorySlug = (label: string) => label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return (
      <section key={key} className="container-custom border-t border-zinc-100 bg-white py-8 sm:py-10">
        <div className="mb-5 hidden flex-wrap items-center gap-2.5 lg:flex">
          <span className="mr-1 text-sm font-black text-zinc-900">Quick Links</span>
          {(quickLinks.length > 0 ? quickLinks : ['Áo thun nam', 'Bảng size', 'Phối đồ', 'Chất liệu']).map(label => (
            <Link
              key={label}
              to={`/blog/category/${getCategorySlug(label)}`}
              className="rounded bg-zinc-100 px-5 py-2.5 text-sm font-black text-[#005594] transition-colors hover:bg-[#e4eef6] hover:text-[#003e6e]"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mb-5 text-center lg:hidden">
          <h2 className="text-[30px] font-black leading-tight tracking-tight text-zinc-950">
            Stay updated with the
            <span className="block text-[#ff5a00]">latest news</span>
          </h2>
        </div>

        <div className="mx-auto w-full max-w-[430px] lg:hidden">
          {mobileNewsPosts[0] && (
            <article
              onClick={() => navigate(getPostPath(mobileNewsPosts[0]))}
              className="cursor-pointer"
            >
              <div className="relative aspect-[1.08/1] overflow-hidden rounded-2xl bg-zinc-100">
                <img
                  src={getBlogImage(mobileNewsPosts[0])}
                  alt={mobileNewsPosts[0].title}
                  className="h-full w-full object-cover"
                  loading="eager"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = getFallbackBlogImage(mobileNewsPosts[0]);
                  }}
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-[#1e4b64] px-3 py-1 text-[10px] font-black text-white">
                  {getPostDate(mobileNewsPosts[0])}
                </span>
              </div>
              <h3 className="mt-3 text-[17px] font-semibold leading-tight text-zinc-950">
                {mobileNewsPosts[0].title}
              </h3>
              <p className="mt-1 text-sm font-medium leading-5 text-zinc-700 line-clamp-2">
                {getPostExcerpt(mobileNewsPosts[0])}
              </p>
            </article>
          )}

          {mobileNewsPosts.length > 1 && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {mobileNewsPosts.slice(1, 3).map((post, index) => (
                <article
                  key={post.id || index}
                  onClick={() => navigate(getPostPath(post))}
                  className="min-w-0 cursor-pointer"
                >
                  <div className="relative aspect-[1.35/1] overflow-hidden rounded-xl bg-zinc-100">
                    <img
                      src={getBlogImage(post)}
                      alt={post.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = getFallbackBlogImage(post);
                      }}
                    />
                    <span className="absolute bottom-2 left-2 rounded-full bg-[#1e4b64] px-2.5 py-0.5 text-[9px] font-black text-white">
                      {getPostDate(post)}
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

        <div className="hidden lg:grid lg:grid-cols-[1.65fr_0.78fr_0.78fr] lg:gap-7">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group cursor-pointer"
            onClick={() => navigate(featuredPath)}
          >
            <div className="relative min-h-[360px] overflow-hidden bg-zinc-900 sm:min-h-[430px] lg:h-[515px]">
              <LazyImage
                src={getBlogImage(featuredPost)}
                fallbackSrc={getFallbackBlogImage(featuredPost)}
                alt={featuredPost.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#061c35] via-[#061c35]/55 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
                <h3 className="max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-[34px]">
                  {featuredPost.title}
                </h3>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-5 text-white">
                  {getPostExcerpt(featuredPost)}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-7 lg:h-[515px] lg:grid-rows-2">
            {topSidePosts.map((item, i) => (
              <motion.div
                key={item.id || i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex min-h-0 cursor-pointer flex-col"
                onClick={() => navigate(getPostPath(item))}
              >
                <div className="relative mb-3 aspect-[16/9] overflow-hidden bg-zinc-100 lg:h-[178px] lg:shrink-0">
                  <LazyImage
                    src={getBlogImage(item)}
                    fallbackSrc={getFallbackBlogImage(item)}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h4 className="text-xl font-black leading-tight text-zinc-950 transition-colors group-hover:text-[#005594] lg:text-[19px]">
                  {item.title}
                </h4>
                {i === 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="bg-red-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Live</span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">{getPostDate(item)}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <aside className="border-t border-zinc-300 pt-3 lg:h-[515px] lg:border-t-0 lg:pt-0">
            <div className="border-t border-zinc-500">
              <div className="h-1 w-28 bg-[#0077c8]" />
              <h3 className="pt-2 text-xl font-black uppercase tracking-tight text-[#061c35]">LATEST NEWS</h3>
            </div>
            <div className="mt-2 max-h-[465px] overflow-y-auto border-b-4 border-[#061c35] pr-2 lg:h-[465px]">
              {latestPosts.map((item, index) => (
                <button
                  key={item.id || index}
                  type="button"
                  onClick={() => navigate(getPostPath(item))}
                  className="group flex w-full gap-3 border-t border-zinc-200 py-4 text-left first:border-t-0"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <span>
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                      {getPostDate(item)}
                    </span>
                    <span className="block text-base font-black leading-tight text-zinc-950 transition-colors group-hover:text-[#005594]">
                      {item.title}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    );
  };

  const homeSchema = React.useMemo(() => buildSeoGraph({
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/#homepage`,
    url: SITE_URL,
    name: 'UR Sport - Thời trang thể thao nam',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'vi-VN',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.slice(0, 12).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(getProductPath(product)),
        name: product.name
      }))
    }
  }), [products]);

  useSEO({
    title: homeSeo.title,
    description: homeSeo.description,
    keywords: homeSeo.keywords,
    canonical: homeSeo.canonical,
    robots: homeSeo.robots,
    schema: homeSchema
  });

  return (
    <>
      {homepageSections.map((s, idx) => {
        if (s.enabled === false) return null;
        switch (s.type) {
          case 'hero':
            return <Hero key={s.id} headingOverride={homeSeo.heading} onShopClick={() => navigate('/shop')} />;
          case 'promo':
            return <StorefrontVoucherBanner key={s.id} />;
          case 'recommend':
            return <PersonalizedRecommendations key={s.id} products={products} />;
          case 'flashsale':
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <FlashSale products={products} />
              </motion.div>
            );
          case 'featured':
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
                <FULLCollectionSection onCategorySelect={onCategorySelect} />
              </motion.div>
            );
          case 'bestseller':
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <BestSeller products={products} />
              </motion.div>
            );
          case 'sport-products':
            return renderProductCategorySection({
              key: s.id,
              category: 'Áo thun thể thao nam',
              subtitle: 'Performance Collection',
              title: 'Sản phẩm',
              titleAccent: 'Áo thể thao nổi bật',
              href: '/ao-thun-the-thao-nam',
              cta: 'Tất cả sản phẩm'
            });
          case 'polo-products':
            return renderProductCategorySection({
              key: s.id,
              category: 'Áo polo nam',
              title: 'Bộ sưu tập',
              titleAccent: 'Áo Polo Nam',
              href: '/ao-polo-nam',
              cta: 'Khám phá',
              compactHeader: true
            });
          case 'tshirt-products':
            return renderProductCategorySection({
              key: s.id,
              category: 'Áo thun nam',
              title: '',
              titleAccent: 'Áo Thun Nam Thời Trang',
              href: '/ao-thun-nam',
              cta: 'Xem ngay',
              compactHeader: true
            });
          case 'news':
            return renderNewsSection(s.id, getNewsPosts(s));
          case 'trust-badges':
            return <TrustBadgesSection key={s.id} />;
          case 'footer':
            return <Footer key={s.id} onPageChange={onPageChange} onCategorySelect={onCategorySelect} />;
          case 'custom':
            if ((s.settings?.customLayout || 'products') === 'products') {
              return renderCustomProductSection(s);
            }
            return s.content ? (
              <section key={s.id} className="container-custom section-padding bg-white">
                <div dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(s.content) }} />
              </section>
            ) : null;
          default:
            return null;
        }
      })}
    </>
  );
}
