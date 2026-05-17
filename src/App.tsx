import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { CartSidebar } from './components/CartSidebar';
import { Footer } from './components/Footer';
import { FloatingContactMenu } from './components/FloatingContactMenu';
import { useSEO } from './hooks/useSEO';
import { FlashSale } from './components/FlashSale';
import { BestSeller } from './components/BestSeller';
import { FULLCollectionSection } from './components/FULLCollectionSection';
import { StorefrontVoucherBanner } from './components/StorefrontVoucherBanner';
import { PRODUCTS, CATEGORIES, CATEGORY_METADATA, STATIC_BLOG_POSTS } from './data';
import { Product, Category } from './types';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthProvider } from './AuthContext';
import { CartProvider, useCart } from './CartContext';
import { WishlistProvider, useWishlist } from './WishlistContext';
import { RecentlyViewedProvider, useRecentlyViewed } from './RecentlyViewedContext';
import { ProductsProvider, useProducts } from './ProductsContext';
import { Toaster } from 'sonner';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Filter, SlidersHorizontal, ArrowRight, Check, Star, ShieldCheck, Truck, RefreshCcw, ChevronRight, ChevronDown, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LazyImage } from './components/LazyImage';
import { SITE_URL, absoluteUrl, buildBreadcrumbSchema, buildSeoGraph, merchantReturnPolicySchema, offerShippingDetailsSchema } from './lib/seo';
import {
  CATEGORY_PRODUCT_MATCH_TERMS,
  belongsToCategory as categoryBelongsTo,
  DEFAULT_SEO_SUBCATEGORIES
} from './lib/categoryConfig';

const ProductDetail = React.lazy(() => import('./components/ProductDetail').then(module => ({ default: module.ProductDetail })));
const Checkout = React.lazy(() => import('./components/Checkout').then(module => ({ default: module.Checkout })));
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
const NewsPage = React.lazy(() => import('./components/NewsPage').then(module => ({ default: module.NewsPage })));
const AccountPage = React.lazy(() => import('./components/AccountPage').then(module => ({ default: module.AccountPage })));
const OrderSuccessPage = React.lazy(() => import('./components/OrderSuccessPage').then(module => ({ default: module.OrderSuccessPage })));
const WishlistPage = React.lazy(() => import('./components/WishlistPage').then(module => ({ default: module.WishlistPage })));
const RecentlyViewedPage = React.lazy(() => import('./components/RecentlyViewedPage').then(module => ({ default: module.RecentlyViewedPage })));

const getProductUrl = (product: Product) => {
  return `/${product.slug || product.id}`;
};

function PersonalizedRecommendations({ products }: { products: Product[] }) {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { wishlistIds } = useWishlist();
  const { recentProductIds } = useRecentlyViewed();

  const recommendations = React.useMemo(() => {
    const sourceIds = [...recentProductIds.slice(0, 5), ...wishlistIds.slice(0, 5), ...cart.map(item => item.id)];
    if (sourceIds.length === 0) return [];

    const productById = new Map(products.map(product => [product.id, product]));
    const sourceProducts = sourceIds
      .map(id => productById.get(id))
      .filter((product): product is Product => Boolean(product));

    const interestedCategories = new Set(sourceProducts.map(product => product.category));
    const excludedIds = new Set([...sourceIds, ...cart.map(item => item.id)]);

    return products
      .filter(product => !excludedIds.has(product.id) && interestedCategories.has(product.category) && product.stock !== 0)
      .map(product => {
        const categoryHits = sourceProducts.filter(source => source.category === product.category).length;
        const saleBoost = product.discountPrice ? 2 : 0;
        const bestsellerBoost = product.isBestSeller ? 2 : 0;
        const ratingBoost = Math.min(product.rating || 0, 5) / 2;
        return { product, score: categoryHits * 4 + saleBoost + bestsellerBoost + ratingBoost };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.product);
  }, [cart, products, recentProductIds, wishlistIds]);

  if (recommendations.length === 0) return null;

  return (
    <section className="container-custom section-padding bg-white">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="section-subtitle">Dựa trên hành vi mua sắm</span>
          <h2 className="section-title">
            Gợi ý <span className="text-[#1e4b64]">dành riêng cho bạn</span>
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/da-xem')}
          className="h-11 rounded-full border-zinc-200 px-5 text-[11px] font-black uppercase tracking-widest text-zinc-600 hover:border-[#1e4b64]/30 hover:bg-blue-50 hover:text-[#1e4b64]"
        >
          Xem lịch sử
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {recommendations.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.06 }}
          >
            <ProductCard
              product={product}
              onClick={() => navigate(getProductUrl(product))}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HomePage({ onProductSelect, onCategorySelect }: { onProductSelect: (p: Product) => void, onCategorySelect: (c: Category) => void }) {
  const navigate = useNavigate();
  const [featuredFilter, setFeaturedFilter] = useState('Most Popular');
  const { products } = useProducts();
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
        url: absoluteUrl(`/${product.slug || product.id}`),
        name: product.name
      }))
    }
  }), [products]);

  useSEO({
    title: "UR Sport - Phong Cách Thể Thao Đẳng Cấp | Áo Thun, Áo Polo Nam",
    description: "Khám phá bộ sưu tập thời trang thể thao nam cao cấp tại UR Sport. Chuyên cung cấp áo thun, áo polo nam chất lượng, phong cách và bền bỉ. Miễn phí vận chuyển toàn quốc.",
    keywords: "ur sport, thời trang thể thao nam, áo thun nam, áo polo nam, đồ tập gym",
    canonical: '/',
    schema: homeSchema
  });

  return (
    <>
      <Hero onShopClick={() => navigate('/shop')} />

      <StorefrontVoucherBanner />

      <PersonalizedRecommendations products={products} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <FlashSale products={products} />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <FULLCollectionSection onCategorySelect={onCategorySelect} />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <BestSeller products={products} />
      </motion.div>

      {/* In Demand Section - Athletic Shirts */}
      <section className="container-custom section-padding bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4"
        >
          <div>
            <span className="section-subtitle">Performance Collection</span>
            <h2 className="section-title">
              Sản phẩm <span className="text-[#1e4b64]">Áo thể thao</span> nổi bật
            </h2>
          </div>
          <Link 
             to="/ao-thun-the-thao-nam"
             className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1e4b64] hover:translate-x-2 transition-transform group"
          >
            Tất cả sản phẩm <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products
            .filter(p => p.category === 'Áo thun thể thao nam')
            .slice(0, 6)
            .map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <ProductCard 
                  product={product} 
                  onClick={() => navigate(getProductUrl(product))}
                />
              </motion.div>
            ))}
        </div>
        <div className="flex justify-center mt-12">
          <Link 
             to="/ao-thun-the-thao-nam"
             className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-10 text-[12px] font-bold uppercase tracking-widest text-zinc-900 shadow-md transition-all hover:border-[#1e4b64] hover:bg-[#1e4b64] hover:text-white"
          >
             Xem thêm
          </Link>
        </div>
      </section>

      {/* Polo Shirts Section */}
      <section className="container-custom section-padding-bottom bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-8"
        >
          <h2 className="section-title">
            Bộ sưu tập <span className="text-[#1e4b64]">Áo Polo Nam</span>
          </h2>
          <Link 
             to="/ao-polo-nam"
             className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#1e4b64] transition-colors"
          >
            Khám phá <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products
            .filter(p => p.category === 'Áo polo nam')
            .slice(0, 6)
            .map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <ProductCard 
                  product={product} 
                  onClick={() => navigate(getProductUrl(product))}
                />
              </motion.div>
            ))}
        </div>
        <div className="flex justify-center mt-12">
          <Link 
             to="/ao-polo-nam"
             className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-10 text-[12px] font-bold uppercase tracking-widest text-zinc-900 shadow-md transition-all hover:border-[#1e4b64] hover:bg-[#1e4b64] hover:text-white"
          >
             Xem thêm
          </Link>
        </div>
      </section>

      {/* Men's T-Shirts Section */}
      <section className="container-custom section-padding-bottom bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-8"
        >
          <h2 className="section-title">
            <span className="text-[#1e4b64]">Áo Thun Nam</span> Thời Trang
          </h2>
          <Link 
             to="/ao-thun-nam"
             className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#1e4b64] transition-colors"
          >
            Xem ngay <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products
            .filter(p => p.category === 'Áo thun nam')
            .slice(0, 6)
            .map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <ProductCard 
                  product={product} 
                  onClick={() => navigate(getProductUrl(product))}
                />
              </motion.div>
            ))}
        </div>
        <div className="flex justify-center mt-12">
          <Link 
             to="/ao-thun-nam"
             className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-10 text-[12px] font-bold uppercase tracking-widest text-zinc-900 shadow-md transition-all hover:border-[#1e4b64] hover:bg-[#1e4b64] hover:text-white"
          >
             Xem thêm
          </Link>
        </div>
      </section>

      {/* Latest News Section */}
      <section className="container-custom section-padding border-t border-zinc-100">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center text-center mb-16"
        >
          <span className="section-subtitle">Tạp chí UR SPORT</span>
          <h2 className="section-title">
            Stay updated with <span className="text-[#1e4b64]">UR NEWS</span>
          </h2>
          <div className="h-1 w-12 bg-[#1e4b64] mt-6 rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Large Featured Article */}
          {STATIC_BLOG_POSTS[0] && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-5 group cursor-pointer" 
              onClick={() => navigate(`/blog/${STATIC_BLOG_POSTS[0].id}`)}
            >
              <div className="relative aspect-[4/3] sm:aspect-square lg:aspect-auto lg:h-[500px] overflow-hidden rounded-[32px] mb-6 shadow-2xl">
                <LazyImage 
                  src={STATIC_BLOG_POSTS[0].image} 
                  alt={STATIC_BLOG_POSTS[0].title} 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-8 left-8">
                  <div className="bg-[#1e4b64] px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest mb-3 inline-block">
                    {STATIC_BLOG_POSTS[0].date}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tighter">
                    {STATIC_BLOG_POSTS[0].title}
                  </h3>
                </div>
              </div>
            </motion.div>
          )}

          {/* Grid of smaller articles */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
             {STATIC_BLOG_POSTS.slice(1, 5).map((item, i) => (
               <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group cursor-pointer" 
                  onClick={() => navigate(`/blog/${item.id}`)}
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
    </>
  );
}



const SEO_LANDING_PAGES = DEFAULT_SEO_SUBCATEGORIES
  .filter(page => page.slug !== 'ao-thun-the-thao-nam')
  .map(page => ({
    slug: page.slug,
    label: page.label,
    parentCategory: page.parentLabel,
    matchTerms: CATEGORY_PRODUCT_MATCH_TERMS[page.slug] || []
  }));

type SeoLandingPage = typeof SEO_LANDING_PAGES[number];

const belongsToCategory = (product: Product, category: string) => {
  return categoryBelongsTo(product.category, category);
};

const productMatchesTerms = (product: Product, terms: readonly string[]) => {
  const haystack = [
    product.name,
    product.description,
    product.seoTitle,
    product.metaDescription,
    product.keywords,
    product.specifications,
    product.material,
    product.style,
    product.fashionStyle,
    ...(product.features || [])
  ].join(' ').toLowerCase();

  return terms.some(term => haystack.includes(term.toLowerCase()));
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

type CategoryLandingConfig = {
  quickLinks: { label: string; href: string; description: string }[];
  buyingGuides: { title: string; body: string }[];
  faqs: { question: string; answer: string }[];
};

const CATEGORY_LANDING_CONTENT: Record<string, CategoryLandingConfig> = {
  'ao-thun-nam': {
    quickLinks: [
      {
        label: 'Áo thun cotton nam',
        href: '/ao-thun-cotton-nam',
        description: 'Mềm, thoáng, dễ mặc hằng ngày'
      },
      {
        label: 'Áo thun form rộng',
        href: '/ao-thun-nam-form-rong',
        description: 'Thoải mái, trẻ trung, dễ phối streetwear'
      },
      {
        label: 'Áo thun thể thao nam',
        href: '/ao-thun-the-thao-nam',
        description: 'Co giãn, thấm hút, hợp tập luyện'
      }
    ],
    buyingGuides: [
      {
        title: 'Chọn theo chất liệu',
        body: 'Cotton phù hợp mặc hằng ngày, thun lạnh và polyester phù hợp vận động vì nhanh khô, nhẹ và ít bám mồ hôi.'
      },
      {
        title: 'Chọn theo form dáng',
        body: 'Slim-fit gọn người, regular dễ mặc với nhiều dáng, oversize tạo cảm giác thoải mái và hợp phong cách đường phố.'
      },
      {
        title: 'Chọn theo hoàn cảnh',
        body: 'Đi làm hoặc đi chơi nên ưu tiên màu trơn; tập gym, chạy bộ nên chọn áo co giãn, thoáng khí và ít nhăn.'
      }
    ],
    faqs: [
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
  }
};

const buildDefaultLandingContent = (category: string): CategoryLandingConfig => ({
  quickLinks: CATEGORY_METADATA
    .filter(item => item.name !== category)
    .slice(0, 3)
    .map(item => ({
      label: String(item.name),
      href: `/${item.slug}`,
      description: `Xem thêm ${String(item.name).toLowerCase()} tại UR Sport`
    })),
  buyingGuides: [
    {
      title: 'Chọn đúng nhu cầu',
      body: 'Ưu tiên sản phẩm phù hợp hoàn cảnh sử dụng: mặc hằng ngày, đi làm, đi chơi hoặc tập luyện.'
    },
    {
      title: 'Kiểm tra chất liệu và size',
      body: 'Chất liệu, độ co giãn và bảng size là ba yếu tố quan trọng giúp sản phẩm mặc thoải mái hơn.'
    },
    {
      title: 'Ưu tiên sản phẩm còn hàng',
      body: 'Các sản phẩm còn đủ size và màu giúp bạn dễ chọn biến thể phù hợp hơn trước khi đặt hàng.'
    }
  ],
  faqs: [
    {
      question: `Nên chọn ${category.toLowerCase()} như thế nào?`,
      answer: 'Hãy chọn theo nhu cầu sử dụng, chất liệu, form dáng và size. Với đồ thể thao nam, độ thoáng mát và khả năng co giãn là hai yếu tố nên ưu tiên.'
    },
    {
      question: 'UR Sport có hỗ trợ đổi trả không?',
      answer: 'UR Sport hỗ trợ đổi trả theo chính sách của shop, giúp bạn yên tâm hơn khi chọn size hoặc mẫu sản phẩm.'
    },
    {
      question: 'Có thể đặt hàng online toàn quốc không?',
      answer: 'Bạn có thể đặt hàng online trên website, chọn sản phẩm, màu, size và hoàn tất thông tin giao hàng.'
    }
  ]
});

const getCategoryLandingContent = (slug: string | undefined, category: string) => {
  if (!slug || category === 'All') return null;
  return CATEGORY_LANDING_CONTENT[slug] || buildDefaultLandingContent(category);
};

const textFromHtml = (html = '') => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeSeoText = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/\s+/g, ' ')
  .trim();

const isFaqHeadingText = (value = '') => {
  const text = normalizeSeoText(value);
  return text.includes('cau hoi thuong gap') || text === 'faq' || text.includes('faq');
};

const extractPlainFaqs = (root: ParentNode) => {
  const faqs: { question: string; answer: string; answerHtml: string }[] = [];
  const heading = Array.from(root.querySelectorAll('h2, h3')).find(item => isFaqHeadingText(item.textContent || ''));
  if (!heading) return faqs;

  let node = heading.nextElementSibling;
  while (node) {
    const tagName = node.tagName.toLowerCase();
    if (tagName === 'h2') break;

    if (/^h[3-4]$/.test(tagName)) {
      const question = textFromHtml(node.innerHTML);
      const answerNodes: Element[] = [];
      let answerNode = node.nextElementSibling;

      while (answerNode) {
        const answerTag = answerNode.tagName.toLowerCase();
        if (answerTag === 'h2' || /^h[3-4]$/.test(answerTag) || answerNode.matches('.faq, details.seo-faq')) break;
        answerNodes.push(answerNode);
        answerNode = answerNode.nextElementSibling;
      }

      const answerHtml = answerNodes.map(item => item.outerHTML).join('').trim();
      const answer = textFromHtml(answerHtml);
      if (question && answer) {
        faqs.push({ question, answer, answerHtml });
      }

      node = answerNode;
      continue;
    }

    node = node.nextElementSibling;
  }

  return faqs;
};

const parseSeoFaqs = (html: string) => {
  if (typeof window === 'undefined' || !html) return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const faqBlocks = Array.from(doc.querySelectorAll('.faq, details.seo-faq'));

  const faqBlocksResult = faqBlocks
    .map((block) => {
      const questionNode = block.matches('details')
        ? block.querySelector('summary')
        : block.querySelector('.question');
      const answerNode = block.querySelector('.answer, .seo-faq-answer');

      const question = textFromHtml(questionNode?.innerHTML || '');
      const answer = textFromHtml(answerNode?.innerHTML || '');

      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is { question: string; answer: string } => Boolean(item));

  const plainFaqs = extractPlainFaqs(doc.body).map(({ question, answer }) => ({ question, answer }));
  const seen = new Set(faqBlocksResult.map(item => normalizeSeoText(item.question)));

  return [
    ...faqBlocksResult,
    ...plainFaqs.filter(item => {
      const key = normalizeSeoText(item.question);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  ];
};

const formatSeoContentHtml = (html: string) => {
  if (typeof window === 'undefined' || !html) {
    return html.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ');
  }

  const doc = new DOMParser().parseFromString(html.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' '), 'text/html');

  doc.querySelectorAll('.faq').forEach((faqBlock, index) => {
    const questionNode = faqBlock.querySelector('.question');
    const answerNode = faqBlock.querySelector('.answer');
    if (!questionNode || !answerNode) return;

    questionNode.querySelectorAll('i, svg').forEach(icon => icon.remove());

    const details = doc.createElement('details');
    details.className = 'seo-faq';
    if (index === 0) details.open = true;

    const summary = doc.createElement('summary');
    summary.className = 'seo-faq-question';
    summary.innerHTML = `<span>${questionNode.innerHTML.trim()}</span><span class="seo-faq-icon" aria-hidden="true"></span>`;

    const answer = doc.createElement('div');
    answer.className = 'seo-faq-answer';
    answer.innerHTML = answerNode.innerHTML.trim();

    details.append(summary, answer);
    faqBlock.replaceWith(details);
  });

  const faqHeading = Array.from(doc.body.querySelectorAll('h2, h3')).find(item => isFaqHeadingText(item.textContent || ''));
  if (faqHeading && !faqHeading.parentElement?.classList.contains('seo-faq-section')) {
    const faqSection = doc.createElement('section');
    faqSection.className = 'seo-faq-section';

    const title = doc.createElement('h2');
    title.className = 'seo-faq-title';
    title.innerHTML = faqHeading.innerHTML.trim();
    faqSection.appendChild(title);

    let node = faqHeading.nextElementSibling;
    let faqIndex = 0;
    const nodesToRemove: Element[] = [faqHeading];

    while (node) {
      const tagName = node.tagName.toLowerCase();
      if (tagName === 'h2') break;

      if (node.matches('details.seo-faq')) {
        const next = node.nextElementSibling;
        if (faqIndex === 0) (node as HTMLDetailsElement).open = true;
        faqSection.appendChild(node);
        faqIndex += 1;
        node = next;
        continue;
      }

      if (/^h[3-4]$/.test(tagName)) {
        const questionHtml = node.innerHTML.trim();
        const answerNodes: Element[] = [];
        let answerNode = node.nextElementSibling;

        while (answerNode) {
          const answerTag = answerNode.tagName.toLowerCase();
          if (answerTag === 'h2' || /^h[3-4]$/.test(answerTag) || answerNode.matches('details.seo-faq')) break;
          answerNodes.push(answerNode);
          answerNode = answerNode.nextElementSibling;
        }

        if (questionHtml && answerNodes.length) {
          const details = doc.createElement('details');
          details.className = 'seo-faq';
          if (faqIndex === 0) details.open = true;

          const summary = doc.createElement('summary');
          summary.className = 'seo-faq-question';
          summary.innerHTML = `<span>${questionHtml}</span><span class="seo-faq-icon" aria-hidden="true"></span>`;

          const answer = doc.createElement('div');
          answer.className = 'seo-faq-answer';
          answer.innerHTML = answerNodes.map(item => item.outerHTML).join('');

          details.append(summary, answer);
          faqSection.appendChild(details);
          nodesToRemove.push(node, ...answerNodes);
          faqIndex += 1;
        }

        node = answerNode;
        continue;
      }

      const next = node.nextElementSibling;
      nodesToRemove.push(node);
      node = next;
    }

    if (faqIndex > 0) {
      faqHeading.replaceWith(faqSection);
      nodesToRemove.slice(1).forEach(item => item.remove());
    }
  }

  return doc.body.innerHTML;
};

function CategoryLandingBlocks({ config, productCount }: { config: CategoryLandingConfig; productCount: number }) {
  return (
    <section className="mb-10 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {config.quickLinks.map(link => (
          <Link
            key={link.href}
            to={link.href}
            className="group rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1e4b64]/30 hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-zinc-950">{link.label}</span>
              <ArrowRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-[#1e4b64]" />
            </div>
            <p className="text-xs font-medium leading-5 text-zinc-500">{link.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 rounded-3xl border border-zinc-100 bg-zinc-50/60 p-5 sm:grid-cols-[0.8fr_1.2fr] sm:p-6">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#1e4b64]">Gợi ý chọn nhanh</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-950">Chọn sản phẩm theo nhu cầu mặc</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-zinc-500">
            Có {productCount} sản phẩm phù hợp. Dùng các gợi ý này để chọn nhanh theo chất liệu, form dáng và hoàn cảnh sử dụng.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {config.buyingGuides.map(item => (
            <div key={item.title} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
              <Check className="mb-3 h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-black text-zinc-950">{item.title}</h3>
              <p className="mt-2 text-xs font-medium leading-5 text-zinc-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryFaqSection({ faqs }: { faqs: CategoryLandingConfig['faqs'] }) {
  if (!faqs.length) return null;

  return (
    <section className="mt-12 border-t border-zinc-100 pt-10">
      <div className="mb-6 max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#1e4b64]">FAQ</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">Câu hỏi thường gặp</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {faqs.map(item => (
          <details key={item.question} className="group rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-black text-zinc-950">
              {item.question}
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function ShopPage({ activeCategory, setActiveCategory, isLoading, onProductSelect, categoryName, seoLanding }: { activeCategory: any, setActiveCategory: (c: any) => void, isLoading: boolean, onProductSelect: (p: Product) => void, categoryName?: string, seoLanding?: SeoLandingPage }) {
  const navigate = useNavigate();
  const { categorySlug, productSlug } = useParams<{ categorySlug?: string, productSlug?: string }>();
  const categoryNameSlug = categoryName ? CATEGORY_METADATA.find(c => c.name === categoryName)?.slug : undefined;
  const currentSlug = seoLanding?.slug || categorySlug || productSlug || categoryNameSlug;
  const { products, loading: productsLoading } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seoContent, setSeoContent] = React.useState<string>('');
  const [seoMeta, setSeoMeta] = React.useState<{title:string,description:string,keywords:string,canonical:string,robots:string,heading:string}>({title:'',description:'',keywords:'',canonical:'',robots:'',heading:''});
  const [isSeoExpanded, setIsSeoExpanded] = React.useState(false);
  const [openFilterMenu, setOpenFilterMenu] = React.useState<string | null>(null);
  const filtersRef = React.useRef<HTMLDivElement>(null);
  
  const categoryFilter = searchParams.get('category');
  const brandFilter = searchParams.get('brand');
  const priceFilter = searchParams.get('price');
  const colorFilter = searchParams.get('color');
  const sizeFilter = searchParams.get('size');
  const sortFilter = searchParams.get('sort') || 'newest';
  const searchQuery = searchParams.get('q')?.trim() || '';
  const showLoading = isLoading || productsLoading;

  // Derive current category from URL params, prop or state instantly during render
  const currentCategory = React.useMemo(() => {
    if (seoLanding) return seoLanding.parentCategory;
    if (categoryName) return categoryName;
    if (currentSlug) {
      return CATEGORY_METADATA.find(c => c.slug === currentSlug)?.name || 'All';
    }
    return categoryFilter || activeCategory;
  }, [seoLanding, categoryName, currentSlug, categoryFilter, activeCategory]);

  // Extract unique values for filters and normalize them
  const brands = Array.from(new Set(
    products.map(p => p.brand?.trim())
      .filter(Boolean)
  )) as string[];
  
  const colors = Array.from(new Set(
    products.flatMap(p => p.colors || [])
      .map(c => c.trim().toLowerCase())
      .filter(Boolean)
  )).map(c => c.charAt(0).toUpperCase() + c.slice(1)) as string[];

  const sizes = Array.from(new Set(
    products.flatMap(p => p.sizes || [])
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
  )) as string[];

  const priceRanges = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Dưới 100.000đ', value: '0-100000' },
    { label: '100.000đ - 200.000đ', value: '100000-200000' },
    { label: '200.000đ - 500.000đ', value: '200000-500000' },
    { label: 'Trên 500.000đ', value: '500000-10000000' },
  ];

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
    setOpenFilterMenu(null);
  };

  const dropdownClass = (menuId: string, align: 'left' | 'right' = 'left') => cn(
    "absolute top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-[80] transition-all duration-200 transform max-h-80 overflow-y-auto",
    align === 'right' ? "right-0 origin-top-right" : "left-0 origin-top-left",
    openFilterMenu === menuId
      ? "opacity-100 visible translate-y-0 pointer-events-auto"
      : "opacity-0 invisible translate-y-2 pointer-events-none"
  );

  const toggleFilterMenu = (menuId: string) => {
    setOpenFilterMenu(prev => prev === menuId ? null : menuId);
  };

  const selectCategoryFromMenu = (category: Category | 'All') => {
    setActiveCategory(category);
    setOpenFilterMenu(null);
    const catMetadata = CATEGORY_METADATA.find(c => c.name === category);
    navigate(catMetadata ? `/${catMetadata.slug}` : '/shop');
  };

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setOpenFilterMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  React.useEffect(() => {
    if (currentSlug) {
      const catMetadata = CATEGORY_METADATA.find(c => c.slug === currentSlug);
      if (catMetadata && catMetadata.name !== activeCategory) {
        setActiveCategory(catMetadata.name);
      }
    } else if (categoryFilter) {
      if (categoryFilter !== activeCategory) {
        setActiveCategory(categoryFilter);
      }
    } else if (!brandFilter && !priceFilter && !colorFilter && !sizeFilter && activeCategory !== 'All') {
      setActiveCategory('All');
    }
    window.scrollTo(0, 0);
  }, [currentSlug, categoryFilter, setActiveCategory, activeCategory, brandFilter, priceFilter, colorFilter, sizeFilter]);

  React.useEffect(() => {
    const fetchSeo = async () => {
      // === Tier-1 SEO fallbacks (optimized per category) ===
      const CATEGORY_DEFAULT_SEO: Record<string, { title: string; description: string; keywords: string }> = {
        'ao-thun-nam': {
          title: 'Áo Thun Nam Đẹp, Oversize, Cotton Cao Cấp 2026 | UR Sport',
          description: 'Mua áo thun nam đẹp tại UR Sport. Đa dạng mẫu áo thun oversize, slim-fit, cotton 100%, form chuẩn. Miễn phí vận chuyển toàn quốc.',
          keywords: 'áo thun nam, áo thun nam đẹp, áo thun oversize nam, áo thun cotton nam, áo phông nam',
        },
        'ao-thun-the-thao-nam': {
          title: 'Áo Thun Thể Thao Nam Thoáng Mát, Tập Gym & Chạy Bộ | UR Sport',
          description: 'Áo thun thể thao nam cao cấp tại UR Sport. Co giãn 4 chiều, thấm hút mồ hôi, kháng khuẩn. Phù hợp tập gym, chạy bộ, cầu lông. Chính hãng, giá tốt.',
          keywords: 'áo thun thể thao nam, áo thể thao nam, áo tập gym nam, áo chạy bộ nam, áo thể thao nam cao cấp',
        },
        'ao-thun-cotton-nam': {
          title: 'Áo Thun Cotton Nam Mềm Mát, Thoáng Khí | UR Sport',
          description: 'Khám phá áo thun cotton nam mềm mát tại UR Sport. Chất vải dễ chịu, thoáng khí, dễ phối đồ, phù hợp mặc hằng ngày trong thời tiết nóng.',
          keywords: 'áo thun cotton nam, áo thun nam cotton, áo cotton nam, áo thun nam thoáng mát',
        },
        'ao-thun-nam-form-rong': {
          title: 'Áo Thun Nam Form Rộng, Oversize Cá Tính | UR Sport',
          description: 'Mua áo thun nam form rộng tại UR Sport. Kiểu dáng oversize thoải mái, trẻ trung, dễ phối streetwear, phù hợp đi chơi và mặc hằng ngày.',
          keywords: 'áo thun nam form rộng, áo thun oversize nam, áo form rộng nam, áo thun nam streetwear',
        },
        'ao-polo-nam': {
          title: 'Áo Polo Nam Cao Cấp, Thể Thao & Lịch Sự 2026 | UR Sport',
          description: 'Khám phá bộ sưu tập áo polo nam cao cấp tại UR Sport. Vải cá sấu Pique Cotton, chống nhăn, form chuẩn. Phù hợp đi làm, chơi golf và dạo phố.',
          keywords: 'áo polo nam, áo polo nam cao cấp, áo thun có cổ nam, áo polo thể thao nam, áo polo nam đẹp',
        },
        'quan-the-thao-nam': {
          title: 'Quần Thể Thao Nam Jogger & Short Gym Chất Lượng Cao | UR Sport',
          description: 'Mua quần thể thao nam chất lượng cao tại UR Sport. Đủ loại quần jogger, quần short chạy bộ, quần gym co giãn 4 chiều. Giao hàng nhanh toàn quốc.',
          keywords: 'quần thể thao nam, quần short thể thao nam, quần jogger nam, quần tập gym nam, quần chạy bộ nam',
        },
        'phu-kien-the-thao': {
          title: 'Phụ Kiện Thể Thao Chính Hãng: Bình Nước, Găng Tay, Túi Gym | UR Sport',
          description: 'Mua phụ kiện thể thao chính hãng tại UR Sport. Bình nước, găng tay gym, túi duffel, thảm yoga, dây nhảy và nhiều hơn nữa. Giá tốt nhất.',
          keywords: 'phụ kiện thể thao, bình nước thể thao, găng tay tập gym, túi thể thao, phụ kiện gym nam',
        },
      };

      if (currentCategory === 'All') {
        setSeoContent('');
        setSeoMeta({
          title: 'Shop Đồ Thể Thao Nam Cao Cấp | Áo Thun, Áo Polo, Quần Gym | UR Sport',
          description: 'Khám phá toàn bộ bộ sưu tập thời trang thể thao nam tại UR Sport. Áo thun thể thao, áo polo, quần jogger, phụ kiện gym chính hãng. Giao hàng nhanh.',
          keywords: 'ur sport shop, đồ thể thao nam, quần áo gym nam, thời trang thể thao nam, áo thun thể thao, áo polo nam',
          canonical: '',
          robots: '',
          heading: ''
        });
        return;
      }
      const catMetadata = CATEGORY_METADATA.find(c => c.name === currentCategory);
      const seoDocSlug = seoLanding?.slug || catMetadata?.slug;
      if (seoDocSlug) {
        const fallback = CATEGORY_DEFAULT_SEO[seoDocSlug] || CATEGORY_DEFAULT_SEO[catMetadata?.slug || ''] || {
          title: `${seoLanding?.label || currentCategory} Chính Hãng, Giá Tốt | UR Sport`,
          description: `Mua ${seoLanding?.label || currentCategory} chính hãng, chất lượng cao tại UR Sport. Đa dạng mẫu mã, giao hàng toàn quốc, đổi trả dễ dàng.`,
          keywords: `${seoLanding?.label || currentCategory}, đồ thể thao nam, ur sport`,
        };
        try {
          const docRef = doc(db, 'categorySeo', seoDocSlug);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSeoContent(data.content || '');
            setSeoMeta({
              title: data.seoTitle || fallback.title,
              description: data.seoDescription || fallback.description,
              keywords: data.seoKeywords || fallback.keywords,
              canonical: data.seoCanonical || '',
              robots: data.seoRobots || 'index, follow',
              heading: data.heading || seoLanding?.label || '',
            });
          } else {
            setSeoContent('');
            setSeoMeta({
              title: fallback.title,
              description: fallback.description,
              keywords: fallback.keywords,
              canonical: '',
              robots: 'index, follow',
              heading: seoLanding?.label || ''
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchSeo();
  }, [currentCategory, seoLanding]);

  let filteredProducts = currentCategory === 'All' 
    ? [...products]
    : products.filter(p => belongsToCategory(p, currentCategory));

  const pageMatchTerms = seoLanding?.matchTerms || CATEGORY_PRODUCT_MATCH_TERMS[currentSlug || ''] || [];

  if (seoLanding?.matchTerms?.length) {
    filteredProducts = filteredProducts.filter(product => productMatchesTerms(product, seoLanding.matchTerms));
  } else if (pageMatchTerms.length > 0) {
    const matchedProducts = products.filter(product => productMatchesTerms(product, pageMatchTerms));
    filteredProducts = Array.from(
      new Map([...filteredProducts, ...matchedProducts].map(product => [product.id, product])).values()
    );
  }

  if (brandFilter) {
    filteredProducts = filteredProducts.filter(p => p.brand?.trim().toLowerCase() === brandFilter.trim().toLowerCase());
  }

  if (colorFilter) {
    filteredProducts = filteredProducts.filter(p => 
      p.colors?.some(c => c.trim().toLowerCase() === colorFilter.toLowerCase())
    );
  }

  if (sizeFilter) {
    filteredProducts = filteredProducts.filter(p => 
      p.sizes?.some(s => s.trim().toUpperCase() === sizeFilter.toUpperCase())
    );
  }

  if (priceFilter) {
    const [min, max] = priceFilter.split('-').map(Number);
    filteredProducts = filteredProducts.filter(p => {
      const price = p.discountPrice || p.price;
      return price >= min && price <= max;
    });
  }

  if (searchQuery) {
    const normalizedQuery = normalizeSearchText(searchQuery);
    filteredProducts = filteredProducts.filter(product => {
      const haystack = normalizeSearchText([
        product.name,
        product.description,
        product.category,
        product.brand,
        product.material,
        product.style,
        product.keywords,
        product.seoTitle,
        product.metaDescription,
        ...(product.colors || []),
        ...(product.sizes || []),
        ...(product.features || [])
      ].filter(Boolean).join(' '));

      return normalizedQuery
        .split(/\s+/)
        .filter(Boolean)
        .every(term => haystack.includes(term));
    });
  }

  // Sorting
  if (sortFilter === 'price-asc') {
    filteredProducts.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
  } else if (sortFilter === 'price-desc') {
    filteredProducts.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
  } else if (sortFilter === 'rating') {
    filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    // Newest first by default
    filteredProducts.sort((a, b) => {
       const dateA = a.createdAt?.seconds || 0;
       const dateB = b.createdAt?.seconds || 0;
       return dateB - dateA;
     });
  }

  const hasActiveFacetedParams = Boolean(
    categoryFilter ||
    brandFilter ||
    priceFilter ||
    colorFilter ||
    sizeFilter ||
    searchQuery ||
    searchParams.has('sort')
  );
  const finalRobots = currentSlug && filteredProducts.length === 0
    ? 'noindex, follow'
    : hasActiveFacetedParams
      ? 'noindex, follow'
      : seoMeta.robots;

  const shopCanonical = currentSlug ? `/${currentSlug}` : '/shop';
  const categoryIntro = !searchQuery && !brandFilter ? seoMeta.description : '';
  const landingConfig = React.useMemo(
    () => !hasActiveFacetedParams ? getCategoryLandingContent(currentSlug, String(currentCategory)) : null,
    [hasActiveFacetedParams, currentSlug, currentCategory]
  );
  const formattedSeoContent = React.useMemo(() => formatSeoContentHtml(seoContent), [seoContent]);
  const seoContentFaqs = React.useMemo(() => parseSeoFaqs(seoContent), [seoContent]);
  const faqSchema = React.useMemo(() => seoContentFaqs.length
    ? {
        '@type': 'FAQPage',
        '@id': `${absoluteUrl(shopCanonical)}#faq`,
        mainEntity: seoContentFaqs.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer
          }
        }))
      }
    : null, [seoContentFaqs, shopCanonical]);
  const shopSchema = React.useMemo(() => buildSeoGraph(
    {
      '@type': 'CollectionPage',
      '@id': `${absoluteUrl(shopCanonical)}#collection`,
      url: absoluteUrl(shopCanonical),
      name: seoMeta.title || 'UR Sport Shop',
      description: seoMeta.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      inLanguage: 'vi-VN',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: filteredProducts.length,
        itemListElement: filteredProducts.slice(0, 24).map((product, index) => {
          const productUrl = absoluteUrl(`/${product.slug || product.id}`);
          return {
            '@type': 'ListItem',
            position: index + 1,
            url: productUrl,
            name: product.name,
            item: {
              '@type': 'Product',
              '@id': `${productUrl}#product`,
              name: product.name,
              url: productUrl,
              image: (product.images || []).slice(0, 3).map(absoluteUrl),
              brand: {
                '@type': 'Brand',
                name: product.brand || 'UR Sport'
              },
              offers: {
                '@type': 'Offer',
                url: productUrl,
                priceCurrency: 'VND',
                price: product.discountPrice || product.price,
                availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                itemCondition: 'https://schema.org/NewCondition',
                shippingDetails: offerShippingDetailsSchema,
                hasMerchantReturnPolicy: merchantReturnPolicySchema
              }
            }
          };
        })
      }
    },
    buildBreadcrumbSchema([
      { name: 'Trang chủ', url: '/' },
      { name: currentCategory === 'All' ? 'Shop' : String(currentCategory), url: shopCanonical }
    ]),
    faqSchema
  ), [filteredProducts, seoMeta.title, seoMeta.description, shopCanonical, currentCategory, faqSchema]);

  useSEO({
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    canonical: seoMeta.canonical || shopCanonical,
    robots: finalRobots,
    type: "website",
    schema: shopSchema
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link 
          to="/"
          className="hover:text-black transition-colors"
        >
          Trang chủ
        </Link>
        <span>/</span>
        <Link 
          to="/shop"
          onClick={() => {
            setActiveCategory('All');
            setSearchParams({});
          }}
          className="hover:text-black transition-colors"
        >
          Cửa hàng
        </Link>
        {brandFilter && (
          <>
            <span>/</span>
            <span className="text-zinc-500 font-medium">Thương hiệu: {brandFilter}</span>
          </>
        )}
        {searchQuery && (
          <>
            <span>/</span>
            <span className="text-zinc-500 font-medium">Tìm kiếm: {searchQuery}</span>
          </>
        )}
        {currentCategory !== 'All' && !brandFilter && (
          <>
            <span>/</span>
            <span className="text-zinc-500 font-medium">{currentCategory}</span>
          </>
        )}
      </nav>

      <header className="mb-8">
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-[28px] sm:text-[40px] font-black text-black leading-tight tracking-tight">
            {searchQuery
              ? `Kết quả tìm kiếm "${searchQuery}"`
              : brandFilter
                ? `Sản phẩm thương hiệu ${brandFilter}`
                : (seoMeta.heading ? seoMeta.heading : (currentCategory === 'All' ? 'Tất cả sản phẩm' : currentCategory))}
          </h1>
          {categoryIntro && (
            <p className="max-w-3xl text-sm font-medium leading-7 text-zinc-600 sm:text-base">
              {categoryIntro}
            </p>
          )}
          
          <div ref={filtersRef} className="flex flex-col gap-4 pt-4 border-t border-zinc-100 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative z-30 flex flex-wrap items-center gap-2 overflow-visible pb-1">
              <div className="relative">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('all')} className="h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 whitespace-nowrap">
                  <SlidersHorizontal className="h-4 w-4" /> Bộ lọc <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('all'), 'py-3')}>
                  <div className="px-4 pb-2 mb-2 border-b border-zinc-50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tất cả bộ lọc</span>
                    <button onClick={() => { setSearchParams({}); setOpenFilterMenu(null); }} className="text-[10px] text-blue-600 font-bold hover:underline">Xóa tất cả</button>
                  </div>
                  <div className="px-2 space-y-1">
                    {/* Compact quick filters can go here */}
                    <div className="p-2 text-xs text-zinc-400 italic">Chọn các tùy chọn bên cạnh để lọc sản phẩm</div>
                  </div>
                </div>
              </div>

              {/* Price Filter */}
              <div className="relative">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('price')} className={cn("h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 flex whitespace-nowrap", priceFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Giá {priceFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('price'), 'py-2')}>
                  {priceRanges.map(range => (
                    <button 
                      key={range.value}
                      onClick={() => updateFilter('price', range.value)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        priceFilter === range.value ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              <div className="relative">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('brand')} className={cn("h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 flex whitespace-nowrap", brandFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Thương hiệu {brandFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('brand'), 'py-2')}>
                  <button onClick={() => updateFilter('brand', null)} className={cn("w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50", !brandFilter ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600")}>Tất cả</button>
                  {brands.map(brand => (
                    <button 
                      key={brand}
                      onClick={() => updateFilter('brand', brand)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        brandFilter === brand ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div className="relative">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('color')} className={cn("h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 flex whitespace-nowrap", colorFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Màu sắc {colorFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('color'), 'py-2')}>
                  <button onClick={() => updateFilter('color', null)} className={cn("w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50", !colorFilter ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600")}>Tất cả</button>
                  {colors.map(color => (
                    <button 
                      key={color}
                      onClick={() => updateFilter('color', color)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        colorFilter === color ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Filter */}
              <div className="relative">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('size')} className={cn("h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 flex whitespace-nowrap", sizeFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Kích cỡ {sizeFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('size'), 'py-2')}>
                  <button onClick={() => updateFilter('size', null)} className={cn("w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50", !sizeFilter ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600")}>Tất cả</button>
                  {sizes.map(size => (
                    <button 
                      key={size}
                      onClick={() => updateFilter('size', size)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        sizeFilter === size ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <Button type="button" variant="outline" onClick={() => toggleFilterMenu('category')} className="h-10 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 gap-2 hover:bg-zinc-50 whitespace-nowrap sm:h-11 sm:px-5">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="w-4 h-0.5 bg-zinc-900 rounded-full" />
                    <div className="w-3 h-0.5 bg-zinc-900 rounded-full ml-auto" />
                  </div>
                  Danh mục
                </div>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
              
              <div className={cn(dropdownClass('category', 'right'), 'py-3')}>
                <div className="px-4 pb-2 mb-2 border-b border-zinc-50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Danh mục</span>
                </div>
                <button 
                   onClick={() => selectCategoryFromMenu('All')}
                   className={cn(
                     "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                     currentCategory === 'All' ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                   )}
                >
                  Tất cả sản phẩm
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => selectCategoryFromMenu(cat)}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                      currentCategory === cat ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 py-4 border-t border-zinc-100 mt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 text-[13px] font-medium text-zinc-500">
              <div className="relative">
                <button type="button" onClick={() => toggleFilterMenu('sort')} className="flex items-center gap-1.5 cursor-pointer">
                  Sắp xếp: <span className="text-[#1e4b64] hover:underline">
                    {sortFilter === 'newest' ? 'Mới nhất' : 
                     sortFilter === 'price-asc' ? 'Giá thấp đến cao' :
                     sortFilter === 'price-desc' ? 'Giá cao đến thấp' :
                     sortFilter === 'rating' ? 'Đánh giá cao' : 'Nổi bật'}
                  </span> <ChevronDown className="h-3 w-3" />
                </button>
                <div className={cn(dropdownClass('sort'), 'w-56 rounded-xl py-2')}>
                  <button onClick={() => updateFilter('sort', 'newest')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-zinc-50">Mới nhất</button>
                  <button onClick={() => updateFilter('sort', 'price-asc')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-zinc-50">Giá thấp đến cao</button>
                  <button onClick={() => updateFilter('sort', 'price-desc')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-zinc-50">Giá cao đến thấp</button>
                  <button onClick={() => updateFilter('sort', 'rating')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-zinc-50">Đánh giá cao</button>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                Hiển thị: <span className="text-[#1e4b64] cursor-pointer hover:underline">30</span> <ChevronDown className="h-3 w-3" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="h-8 w-8 flex items-center justify-center text-[#1e4b64] bg-blue-50 rounded">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              </button>
              <button className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {landingConfig && (
        <CategoryLandingBlocks config={landingConfig} productCount={filteredProducts.length} />
      )}

      {showLoading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:gap-x-7">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:gap-x-7">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onClick={() => navigate(getProductUrl(product))} 
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 mb-6">
            <SlidersHorizontal className="h-8 w-8 text-zinc-300" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-2">Không tìm thấy sản phẩm</h3>
          <p className="text-zinc-500 mb-8">
            {searchQuery ? `Không có sản phẩm phù hợp với "${searchQuery}".` : 'Thử thay đổi bộ lọc hoặc tìm kiếm theo danh mục khác.'}
          </p>
          <Button 
            onClick={() => {
              setSearchParams({});
              setActiveCategory('All');
            }}
            className="bg-[#1e4b64] hover:bg-[#153a4d] text-white font-bold rounded-full px-8"
          >
            Xóa tất cả bộ lọc
          </Button>
        </div>
      )}

      {seoContent && (
        <div className="mt-16 pt-12 border-t border-zinc-100 w-full">
          <div className="relative w-full overflow-x-hidden">
            <div 
              className={cn(
                "product-description-container notranslate w-full text-zinc-600 transition-[max-height] duration-700 ease-in-out overflow-x-hidden",
                !isSeoExpanded ? "max-h-[500px] overflow-y-hidden" : "max-h-none overflow-y-visible"
              )}
            >
              <div dangerouslySetInnerHTML={{ 
                __html: formattedSeoContent
              }} />
            </div>
            
            {!isSeoExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
            )}
          </div>

          <div className="flex justify-center pt-8 mb-12">
            <Button
              variant="outline"
              onClick={() => setIsSeoExpanded(!isSeoExpanded)}
              className="rounded-full border-zinc-200 bg-white text-zinc-900 text-sm font-bold hover:text-[#1e4b64] hover:border-[#1e4b64] transition-all flex items-center gap-2 group shadow-sm px-8"
            >
              {isSeoExpanded ? 'Thu gọn' : 'Xem thêm'}
              <ChevronDown className={cn("h-4 w-4 transition-all duration-300", isSeoExpanded && "rotate-180")} />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState(() => {
    const path = window.location.pathname.substring(1);
    const cat = CATEGORY_METADATA.find(c => c.slug === path);
    return cat ? cat.name : 'All';
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Inject custom CSS từ Firestore vào mọi trang
  useEffect(() => {
    getDoc(doc(db, 'settings', 'customCss')).then(snap => {
      if (!snap.exists()) return;
      const css = snap.data().css || '';
      if (!css.trim()) return;
      let styleEl = document.getElementById('custom-global-css') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-global-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
    }).catch(() => {});
  }, []);

  const handleCategorySelect = (category: Category) => {
    setActiveCategory(category);
    const catMetadata = CATEGORY_METADATA.find(c => c.name === category);
    if (catMetadata) {
      navigate(`/${catMetadata.slug}`);
    } else {
      navigate('/shop');
    }
  };

  const onPageChange = (page: string) => {
    navigate(page === 'home' ? '/' : `/${page}`);
    window.scrollTo(0, 0);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const handleCheckoutComplete = (orderId?: string) => {
    navigate(orderId ? `/dat-hang-thanh-cong/${orderId}` : '/shop');
  };

  const isAdminRoute = location.pathname === '/quan-tri' || location.pathname === '/quantri';

  const commonShopProps = {
    activeCategory,
    setActiveCategory,
    isLoading,
    onProductSelect: () => {}
  };

  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
        <WishlistProvider>
        <RecentlyViewedProvider>
        <div className="min-h-screen bg-white font-sans selection:bg-black selection:text-white w-full overflow-x-hidden relative">
          {!isAdminRoute && (
            <Navbar 
              onCartClick={() => setIsCartOpen(true)} 
              onPageChange={onPageChange}
              onCategorySelect={handleCategorySelect}
              activeCategory={activeCategory as any}
            />
          )}
          
          <main className={!isAdminRoute ? "pt-16" : ""}>
            <React.Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-[#1e4b64] border-t-transparent animate-spin" /></div>}>
            <Routes>
              <Route path="/" element={
                <>
                  <HomePage onProductSelect={() => {}} onCategorySelect={handleCategorySelect} />
                  
                  {/* Trust Badges Section - Premium Feel */}
                  <section className="bg-zinc-50/50 border-y border-zinc-100">
                    <div className="container-custom py-12">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                          { icon: Truck, title: 'Miễn phí vận chuyển', desc: 'Cho đơn hàng từ 500k' },
                          { icon: ShieldCheck, title: 'Thanh toán an toàn', desc: 'Bảo mật thông tin 100%' },
                          { icon: RefreshCcw, title: 'Đổi trả 30 ngày', desc: 'Dễ dàng và nhanh chóng' },
                          { icon: Phone, title: 'Hỗ trợ tận tâm', desc: 'Hotline: 0917 722 425' },
                        ].map((badge, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-4 group"
                          >
                            <div className="h-14 w-14 shrink-0 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-zinc-100 group-hover:bg-[#1e4b64] group-hover:border-[#1e4b64] transition-all duration-500">
                              <badge.icon className="h-6 w-6 text-[#1e4b64] group-hover:text-white transition-colors duration-500" />
                            </div>
                            <div>
                              <h4 className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-zinc-900 mb-1">{badge.title}</h4>
                              <p className="text-[10px] sm:text-[11px] font-medium text-zinc-400">{badge.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              } />
              <Route path="/shop" element={<ShopPage {...commonShopProps} />} />
              <Route path="/apparel/:categorySlug" element={<ShopPage {...commonShopProps} />} />
              <Route path="/apparel/:categorySlug/:productSlug" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout onComplete={handleCheckoutComplete} />} />
              <Route path="/dat-hang-thanh-cong/:orderId" element={<OrderSuccessPage />} />
              <Route path="/tai-khoan" element={<AccountPage />} />
              <Route path="/yeu-thich" element={<WishlistPage />} />
              <Route path="/da-xem" element={<RecentlyViewedPage />} />
              <Route path="/blog" element={<NewsPage />} />
              <Route path="/blog/category/:categorySlug" element={<NewsPage />} />
              <Route path="/blog/:slug" element={<NewsPage />} />
              <Route path="/quan-tri" element={<AdminPanel />} />
              <Route path="/quantri" element={<AdminPanel />} />
              <Route path="/ao-thun-nam-the-thao" element={<Navigate to="/ao-thun-the-thao-nam" replace />} />
              <Route path="/ao-thun-nam-cotton" element={<Navigate to="/ao-thun-cotton-nam" replace />} />
              {/* Clean Category URLs at root */}
              {CATEGORY_METADATA.map(cat => (
                <Route key={cat.slug} path={`/${cat.slug}`} element={<ShopPage {...commonShopProps} categoryName={cat.name} />} />
              ))}
              {SEO_LANDING_PAGES.map(page => (
                <Route
                  key={page.slug}
                  path={`/${page.slug}`}
                  element={<ShopPage {...commonShopProps} seoLanding={page} />}
                />
              ))}
              {/* Shopee-style clean URLs for products at root */}
              <Route path="/:productSlug" element={<ProductDetail />} />
              <Route path="*" element={<div className="py-20 text-center font-black text-4xl">404 - PAGE NOT FOUND</div>} />
            </Routes>
            </React.Suspense>
          </main>

          {!isAdminRoute && (
            <>
              <Footer 
                onPageChange={onPageChange}
                onCategorySelect={handleCategorySelect}
              />
              <CartSidebar 
                isOpen={isCartOpen} 
                onClose={() => setIsCartOpen(false)} 
                onCheckout={handleCheckout}
              />
            </>
          )}
          
          <Toaster />

          {/* Floating Contact Menu */}
          {!isAdminRoute && <FloatingContactMenu />}
        </div>
        </RecentlyViewedProvider>
        </WishlistProvider>
      </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  );
}
