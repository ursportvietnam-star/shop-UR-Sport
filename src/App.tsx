import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
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
import { CartProvider } from './CartContext';
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
import { SITE_URL, absoluteUrl, buildBreadcrumbSchema, buildSeoGraph } from './lib/seo';

const ProductDetail = React.lazy(() => import('./components/ProductDetail').then(module => ({ default: module.ProductDetail })));
const Checkout = React.lazy(() => import('./components/Checkout').then(module => ({ default: module.Checkout })));
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
const NewsPage = React.lazy(() => import('./components/NewsPage').then(module => ({ default: module.NewsPage })));

const getProductUrl = (product: Product) => {
  return `/${product.slug || product.id}`;
};

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
          <button 
             onClick={() => onCategorySelect('Áo thun thể thao nam')}
             className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1e4b64] hover:translate-x-2 transition-transform group"
          >
            Tất cả sản phẩm <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </button>
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
          <Button 
             variant="outline" 
             onClick={() => onCategorySelect('Áo thun thể thao nam')}
             className="rounded-full border-zinc-200 bg-white text-zinc-900 hover:text-white hover:bg-[#1e4b64] hover:border-[#1e4b64] transition-all font-bold px-10 h-12 text-[12px] uppercase tracking-widest shadow-md"
          >
             Xem thêm
          </Button>
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
          <button 
             onClick={() => onCategorySelect('Áo polo nam')}
             className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#1e4b64] transition-colors"
          >
            Khám phá <ChevronRight className="h-4 w-4" />
          </button>
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
          <Button 
             variant="outline" 
             onClick={() => onCategorySelect('Áo polo nam')}
             className="rounded-full border-zinc-200 bg-white text-zinc-900 hover:text-white hover:bg-[#1e4b64] hover:border-[#1e4b64] transition-all font-bold px-10 h-12 text-[12px] uppercase tracking-widest shadow-md"
          >
             Xem thêm
          </Button>
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
          <button 
             onClick={() => onCategorySelect('Áo thun nam')}
             className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#1e4b64] transition-colors"
          >
            Xem ngay <ChevronRight className="h-4 w-4" />
          </button>
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
          <Button 
             variant="outline" 
             onClick={() => onCategorySelect('Áo thun nam')}
             className="rounded-full border-zinc-200 bg-white text-zinc-900 hover:text-white hover:bg-[#1e4b64] hover:border-[#1e4b64] transition-all font-bold px-10 h-12 text-[12px] uppercase tracking-widest shadow-md"
          >
             Xem thêm
          </Button>
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



function ShopPage({ activeCategory, setActiveCategory, isLoading, onProductSelect, categoryName }: { activeCategory: any, setActiveCategory: (c: any) => void, isLoading: boolean, onProductSelect: (p: Product) => void, categoryName?: string }) {
  const navigate = useNavigate();
  const { categorySlug, productSlug } = useParams<{ categorySlug?: string, productSlug?: string }>();
  const currentSlug = categorySlug || productSlug;
  const { products } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seoContent, setSeoContent] = React.useState<string>('');
  const [seoMeta, setSeoMeta] = React.useState<{title:string,description:string,keywords:string,canonical:string,robots:string}>({title:'',description:'',keywords:'',canonical:'',robots:''});
  const [isSeoExpanded, setIsSeoExpanded] = React.useState(false);
  
  const categoryFilter = searchParams.get('category');
  const brandFilter = searchParams.get('brand');
  const priceFilter = searchParams.get('price');
  const colorFilter = searchParams.get('color');
  const sizeFilter = searchParams.get('size');
  const sortFilter = searchParams.get('sort') || 'newest';

  // Derive current category from URL params, prop or state instantly during render
  const currentCategory = React.useMemo(() => {
    if (categoryName) return categoryName;
    if (currentSlug) {
      return CATEGORY_METADATA.find(c => c.slug === currentSlug)?.name || 'All';
    }
    return categoryFilter || activeCategory;
  }, [categoryName, currentSlug, categoryFilter, activeCategory]);

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
  };

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
          robots: ''
        });
        return;
      }
      const catMetadata = CATEGORY_METADATA.find(c => c.name === currentCategory);
      if (catMetadata) {
        const fallback = CATEGORY_DEFAULT_SEO[catMetadata.slug] || {
          title: `${currentCategory} Chính Hãng, Giá Tốt | UR Sport`,
          description: `Mua ${currentCategory} chính hãng, chất lượng cao tại UR Sport. Đa dạng mẫu mã, giao hàng toàn quốc, đổi trả dễ dàng.`,
          keywords: `${currentCategory}, đồ thể thao nam, ur sport`,
        };
        try {
          const docRef = doc(db, 'categorySeo', catMetadata.slug);
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
            });
          } else {
            setSeoContent('');
            setSeoMeta({
              title: fallback.title,
              description: fallback.description,
              keywords: fallback.keywords,
              canonical: '',
              robots: 'index, follow'
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchSeo();
  }, [currentCategory]);

  let filteredProducts = currentCategory === 'All' 
    ? [...products]
    : products.filter(p => p.category === currentCategory);

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

  const shopCanonical = currentSlug ? `/${currentSlug}` : '/shop';
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
        itemListElement: filteredProducts.slice(0, 24).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(`/${product.slug || product.id}`),
          name: product.name
        }))
      }
    },
    buildBreadcrumbSchema([
      { name: 'Trang chủ', url: '/' },
      { name: currentCategory === 'All' ? 'Shop' : String(currentCategory), url: shopCanonical }
    ])
  ), [filteredProducts, seoMeta.title, seoMeta.description, shopCanonical, currentCategory]);

  useSEO({
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    canonical: seoMeta.canonical || shopCanonical,
    robots: seoMeta.robots,
    type: "website",
    schema: shopSchema
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <button 
          onClick={() => navigate('/')}
          className="hover:text-black transition-colors"
        >
          Trang chủ
        </button>
        <span>/</span>
        <button 
          onClick={() => {
            navigate('/shop');
            setActiveCategory('All');
            setSearchParams({});
          }}
          className="hover:text-black transition-colors"
        >
          Cửa hàng
        </button>
        {brandFilter && (
          <>
            <span>/</span>
            <span className="text-zinc-500 font-medium">Thương hiệu: {brandFilter}</span>
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
            {brandFilter ? `Sản phẩm thương hiệu ${brandFilter}` : (currentCategory === 'All' ? 'Tất cả sản phẩm' : currentCategory)}
          </h1>
          
          <div className="flex flex-col gap-4 pt-4 border-t border-zinc-100 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="relative group">
                <Button variant="outline" className="h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 whitespace-nowrap">
                  <SlidersHorizontal className="h-4 w-4" /> Bộ lọc <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 py-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left group-hover:translate-y-0 translate-y-2">
                  <div className="px-4 pb-2 mb-2 border-b border-zinc-50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tất cả bộ lọc</span>
                    <button onClick={() => setSearchParams({})} className="text-[10px] text-blue-600 font-bold hover:underline">Xóa tất cả</button>
                  </div>
                  <div className="px-2 space-y-1">
                    {/* Compact quick filters can go here */}
                    <div className="p-2 text-xs text-zinc-400 italic">Chọn các tùy chọn bên cạnh để lọc sản phẩm</div>
                  </div>
                </div>
              </div>

              {/* Price Filter */}
              <div className="relative group">
                <Button variant="outline" className={cn("h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 flex whitespace-nowrap", priceFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Giá {priceFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left group-hover:translate-y-0 translate-y-2">
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
              <div className="relative group">
                <Button variant="outline" className={cn("h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 flex whitespace-nowrap", brandFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Thương hiệu {brandFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left group-hover:translate-y-0 translate-y-2 max-h-80 overflow-y-auto">
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
              <div className="relative group">
                <Button variant="outline" className={cn("h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 flex whitespace-nowrap", colorFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Màu sắc {colorFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left group-hover:translate-y-0 translate-y-2 max-h-80 overflow-y-auto">
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
              <div className="relative group">
                <Button variant="outline" className={cn("h-10 sm:h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 sm:px-5 gap-2 hover:bg-zinc-50 flex whitespace-nowrap", sizeFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Kích cỡ {sizeFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left group-hover:translate-y-0 translate-y-2 max-h-80 overflow-y-auto">
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

            <div className="relative group">
              <Button variant="outline" className="h-10 rounded-full border-zinc-200 text-zinc-900 font-bold px-4 gap-2 hover:bg-zinc-50 whitespace-nowrap sm:h-11 sm:px-5">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="w-4 h-0.5 bg-zinc-900 rounded-full" />
                    <div className="w-3 h-0.5 bg-zinc-900 rounded-full ml-auto" />
                  </div>
                  Danh mục
                </div>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
              
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 py-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right group-hover:translate-y-0 translate-y-2">
                <div className="px-4 pb-2 mb-2 border-b border-zinc-50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Danh mục</span>
                </div>
                <button 
                   onClick={() => setActiveCategory('All')}
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
                    onClick={() => setActiveCategory(cat)}
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
              <div className="relative group">
                <div className="flex items-center gap-1.5 cursor-pointer">
                  Sắp xếp: <span className="text-[#1e4b64] hover:underline">
                    {sortFilter === 'newest' ? 'Mới nhất' : 
                     sortFilter === 'price-asc' ? 'Giá thấp đến cao' :
                     sortFilter === 'price-desc' ? 'Giá cao đến thấp' :
                     sortFilter === 'rating' ? 'Đánh giá cao' : 'Nổi bật'}
                  </span> <ChevronDown className="h-3 w-3" />
                </div>
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
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

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:gap-x-7">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : (
            filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onClick={() => navigate(getProductUrl(product))} 
              />
            ))
          )}
        </div>
      ) : (
        <div className="py-20 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 mb-6">
            <SlidersHorizontal className="h-8 w-8 text-zinc-300" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-2">Không tìm thấy sản phẩm</h3>
          <p className="text-zinc-500 mb-8">Thử thay đổi bộ lọc hoặc tìm kiếm theo danh mục khác.</p>
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
                __html: seoContent
                  .replace(/&nbsp;/g, ' ')
                  .replace(/\u00a0/g, ' ')
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
              <Route path="/checkout" element={<Checkout onComplete={() => {}} />} />
              <Route path="/blog" element={<NewsPage />} />
              <Route path="/blog/:slug" element={<NewsPage />} />
              <Route path="/quan-tri" element={<AdminPanel />} />
              <Route path="/quantri" element={<AdminPanel />} />
              {/* Clean Category URLs at root */}
              {CATEGORY_METADATA.map(cat => (
                <Route key={cat.slug} path={`/${cat.slug}`} element={<ShopPage {...commonShopProps} categoryName={cat.name} />} />
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
      </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  );
}
