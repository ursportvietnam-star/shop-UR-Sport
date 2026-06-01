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
      if (selectedPosts.length > 0) return selectedPosts.slice(0, 5);
    }

    return [...sourcePosts]
      .sort((a, b) => getBlogPostTime(b) - getBlogPostTime(a))
      .slice(0, 5);
  };

  const renderNewsSection = (key: string, posts: BlogPost[]) => {
    const [featuredPost, ...sidePosts] = posts;
    if (!featuredPost) return null;

    return (
      <section key={key} className="container-custom section-padding border-t border-zinc-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center text-center mb-16"
        >
          <span className="section-subtitle">Tạp chí UR SPORT</span>
          <h2 className="section-title homepage-heading-center">
            Stay updated with <span className="text-[#1e4b64]">UR NEWS</span>
          </h2>
          <div className="h-1 w-12 bg-[#1e4b64] mt-6 rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 group cursor-pointer"
            onClick={() => navigate(`/blog/${featuredPost.slug || featuredPost.id}`)}
          >
            <div className="relative aspect-[4/3] sm:aspect-square lg:aspect-auto lg:h-[500px] overflow-hidden rounded-[32px] mb-6 shadow-2xl">
              <LazyImage
                src={featuredPost.image}
                alt={featuredPost.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-8 left-8">
                <div className="bg-[#1e4b64] px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest mb-3 inline-block">
                  {featuredPost.date}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tighter">
                  {featuredPost.title}
                </h3>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
            {sidePosts.slice(0, 4).map((item, i) => (
              <motion.div
                key={item.id || i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
                onClick={() => navigate(`/blog/${item.slug || item.id}`)}
              >
                <div className="relative aspect-[1024/682] overflow-hidden rounded-2xl mb-4 shadow-lg">
                  <LazyImage
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black text-zinc-900 tracking-widest leading-none">
                    {item.date}
                  </div>
                </div>
                <h4 className="text-[16px] font-black text-zinc-900 group-hover:text-[#1e4b64] transition-colors leading-tight line-clamp-2 uppercase italic tracking-tight">
                  {item.title}
                </h4>
              </motion.div>
            ))}
          </div>
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
