import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { CartSidebar } from './components/CartSidebar';
import { Checkout } from './components/Checkout';
import { AdminPanel } from './components/AdminPanel';
import { NewsPage } from './components/NewsPage';
import { Footer } from './components/Footer';
import { FloatingContactMenu } from './components/FloatingContactMenu';
import { FlashSale } from './components/FlashSale';
import { BestSeller } from './components/BestSeller';
import { FULLCollectionSection } from './components/FULLCollectionSection';
import { PRODUCTS, CATEGORIES, CATEGORY_METADATA, STATIC_BLOG_POSTS } from './data';
import { Product, Category } from './types';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { ProductsProvider, useProducts } from './ProductsContext';
import { Toaster } from 'sonner';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Filter, SlidersHorizontal, ArrowRight, Check, Star, ShieldCheck, Truck, RefreshCcw, 
  ChevronRight, ChevronDown, Phone, MessageCircle, Instagram, Facebook 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const getProductUrl = (product: Product) => {
  return `/${product.slug || product.id}`;
};

function HomePage({ onProductSelect, onCategorySelect }: { onProductSelect: (p: Product) => void, onCategorySelect: (c: Category) => void }) {
  const navigate = useNavigate();
  const [featuredFilter, setFeaturedFilter] = useState('Most Popular');
  const { products } = useProducts();

  return (
    <>
      <Hero onShopClick={() => navigate('/shop')} />
      
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
              onClick={() => navigate(`/news/${STATIC_BLOG_POSTS[0].id}`)}
            >
              <div className="relative aspect-[4/3] sm:aspect-square lg:aspect-auto lg:h-[500px] overflow-hidden rounded-[32px] mb-6 shadow-2xl">
                <img 
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
                  onClick={() => navigate(`/news/${item.id}`)}
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl mb-4 shadow-lg">
                    <img 
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



function ShopPage({ activeCategory, setActiveCategory, isLoading, onProductSelect }: { activeCategory: string, setActiveCategory: (c: string) => void, isLoading: boolean, onProductSelect: (p: Product) => void }) {
  const navigate = useNavigate();
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const { products } = useProducts();
  const queryParams = new URLSearchParams(window.location.search);
  const brandFilter = queryParams.get('brand');

  React.useEffect(() => {
    if (categorySlug) {
      const catMetadata = CATEGORY_METADATA.find(c => c.slug === categorySlug);
      if (catMetadata && catMetadata.name !== activeCategory) {
        setActiveCategory(catMetadata.name);
      }
    } else if (!brandFilter && activeCategory !== 'All') {
      setActiveCategory('All');
    }
  }, [categorySlug, setActiveCategory, activeCategory, brandFilter]);

  let filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  if (brandFilter) {
    filteredProducts = products.filter(p => p.brand === brandFilter);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
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
          }}
          className="hover:text-black transition-colors"
        >
          Cửa hàng
        </button>
        {brandFilter ? (
          <>
            <span>/</span>
            <span className="text-zinc-500 font-medium">Thương hiệu: {brandFilter}</span>
          </>
        ) : activeCategory !== 'All' && (
          <>
            <span>/</span>
            <span className="text-zinc-500 font-medium">{activeCategory}</span>
          </>
        )}
      </nav>

      <header className="mb-10">
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-[32px] sm:text-[40px] font-black text-black leading-tight tracking-tight">
            {brandFilter ? `Sản phẩm thương hiệu ${brandFilter}` : (activeCategory === 'All' ? 'Tất cả sản phẩm' : activeCategory)}
          </h1>
          
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-100">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-5 gap-2 hover:bg-zinc-50">
                <SlidersHorizontal className="h-4 w-4" /> Bộ lọc <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
              <Button variant="outline" className="h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-5 gap-2 hover:bg-zinc-50 hidden sm:flex">
                Giá <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
              <Button variant="outline" className="h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-5 gap-2 hover:bg-zinc-50 hidden sm:flex">
                Thương hiệu <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
              <Button variant="outline" className="h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-5 gap-2 hover:bg-zinc-50 hidden md:flex">
                Màu sắc <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
              <Button variant="outline" className="h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-5 gap-2 hover:bg-zinc-50 hidden md:flex">
                Kích cỡ <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </div>

            <div className="relative group">
              <Button variant="outline" className="h-11 rounded-full border-zinc-200 text-zinc-900 font-bold px-5 gap-2 hover:bg-zinc-50">
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Category</span>
                </div>
                <button 
                   onClick={() => setActiveCategory('All')}
                   className={cn(
                     "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                     activeCategory === 'All' ? "text-blue-600 bg-blue-50/50" : "text-zinc-600"
                   )}
                >
                  All Products
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                      activeCategory === cat ? "text-blue-600 bg-blue-50/50" : "text-zinc-600"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-4 border-t border-zinc-100 mt-2">
            <div className="flex items-center gap-6 text-[13px] font-medium text-zinc-500">
              <div className="flex items-center gap-1.5">
                Sort by: <span className="text-blue-600 cursor-pointer hover:underline">Newest Items First</span> <ChevronDown className="h-3 w-3" />
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                Show: <span className="text-blue-600 cursor-pointer hover:underline">30</span> <ChevronDown className="h-3 w-3" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="h-8 w-8 flex items-center justify-center text-blue-600 bg-blue-50 rounded">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              </button>
              <button className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
              </button>
              <button className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-todo"><rect width="6" height="6" x="3" y="3" rx="1"/><rect width="6" height="6" x="3" y="15" rx="1"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
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
  const [activeCategory, setActiveCategory] = useState('All');
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
    setIsLoading(true);
    setActiveCategory(category);
    const catMetadata = CATEGORY_METADATA.find(c => c.name === category);
    if (catMetadata) {
      navigate(`/apparel/${catMetadata.slug}`);
    } else {
      navigate('/shop');
    }
    setTimeout(() => setIsLoading(false), 500);
  };

  const onPageChange = (page: string) => {
    navigate(page === 'home' ? '/' : `/${page}`);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const isAdminRoute = window.location.pathname === '/quan-tri';

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
              <Route path="/shop" element={<ShopPage activeCategory={activeCategory} setActiveCategory={setActiveCategory} isLoading={isLoading} onProductSelect={() => {}} />} />
              <Route path="/apparel/:categorySlug" element={<ShopPage activeCategory={activeCategory} setActiveCategory={setActiveCategory} isLoading={isLoading} onProductSelect={() => {}} />} />
              <Route path="/apparel/:categorySlug/:productSlug" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout onComplete={() => {}} />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/:slug" element={<NewsPage />} />
              <Route path="/blog" element={<NewsPage />} />
              <Route path="/blog/:slug" element={<NewsPage />} />
              <Route path="/quan-tri" element={<AdminPanel />} />
              {/* Shopee-style clean URLs for products at root */}
              <Route path="/:productSlug" element={<ProductDetail />} />
              <Route path="*" element={<div className="py-20 text-center font-black text-4xl">404 - PAGE NOT FOUND</div>} />
            </Routes>
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
