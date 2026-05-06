import React, { useState, useEffect } from 'react';
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
import { PRODUCTS, CATEGORIES, CATEGORY_METADATA } from './data';
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
      
      {/* Featured Section - Possibly interested */}
      <section className="mx-auto max-w-[1600px] px-4 pt-0 pb-4 sm:px-6 lg:px-8 xl:px-10 bg-white">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="h-px bg-zinc-200 flex-1" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-zinc-900 leading-none whitespace-nowrap">
            Có thể bạn sẽ <span className="text-[#0082c8]">quan tâm</span>
          </h2>
          <div className="h-px bg-zinc-200 flex-1" />
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center p-1 bg-white border border-zinc-200 rounded-full shadow-sm">
            <button 
              onClick={() => setFeaturedFilter('Most Popular')}
              className={cn(
                "px-6 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap",
                featuredFilter === 'Most Popular' ? "bg-white text-black shadow-md border border-zinc-100" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              Phổ biến nhất
            </button>
            <button 
              onClick={() => setFeaturedFilter('Bestsellers')}
              className={cn(
                "px-6 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap",
                featuredFilter === 'Bestsellers' ? "bg-white text-black shadow-md border border-zinc-100" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              Bán chạy nhất
            </button>
            <button 
              onClick={() => setFeaturedFilter('On Sale')}
              className={cn(
                "px-6 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap",
                featuredFilter === 'On Sale' ? "bg-white text-black shadow-md border border-zinc-100" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              Đang giảm giá
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products
            .filter(p => {
              if (featuredFilter === 'Most Popular') return p.rating >= 4.5;
              if (featuredFilter === 'Bestsellers') return p.isBestSeller;
              if (featuredFilter === 'On Sale') return p.discountPrice;
              return true;
            })
            .slice(0, 6)
            .map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onClick={() => navigate(getProductUrl(product))}
              />
            ))}
        </div>

        <div className="flex justify-center mt-5">
          <Button 
            variant="outline" 
            className="rounded-full border-zinc-200 text-zinc-900 hover:bg-zinc-50 font-bold px-10 h-10 text-[14px] shadow-sm transform transition hover:scale-105"
            onClick={() => navigate('/shop')}
          >
            Xem thêm
          </Button>
        </div>
      </section>

      {/* In Demand Section - Athletic Shirts */}
      <section className="mx-auto max-w-[1440px] px-4 pt-20 pb-12 sm:px-6 lg:px-8 bg-white">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="section-subtitle">Performance Collection</span>
            <h2 className="section-title">
              Sản phẩm <span className="text-[#0082c8]">Áo thể thao</span> nổi bật
            </h2>
          </div>
          <button 
             onClick={() => onCategorySelect('Áo thun thể thao nam')}
             className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#0082c8] hover:translate-x-2 transition-transform"
          >
            Xem tất cả bộ sưu tập <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products
            .filter(p => p.category === 'Áo thun thể thao nam')
            .slice(0, 6)
            .map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onClick={() => navigate(getProductUrl(product))}
              />
            ))}
        </div>
        <div className="flex justify-center mt-5">
          <Button 
             variant="outline" 
             onClick={() => onCategorySelect('Áo thun thể thao nam')}
             className="rounded-full border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 font-bold px-8 h-10 text-[13px] shadow-sm"
          >
             Xem thêm
          </Button>
        </div>
      </section>

      {/* Polo Shirts Section */}
      <section className="mx-auto max-w-[1440px] px-4 pt-0 pb-6 sm:px-6 lg:px-8 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-900 leading-none">
            Bộ sưu tập <span className="text-blue-600">Áo Polo Nam</span>
          </h2>
          <button 
             onClick={() => onCategorySelect('Áo polo nam')}
             className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
          >
            Xem thêm <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products
            .filter(p => p.category === 'Áo polo nam')
            .slice(0, 6)
            .map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onClick={() => navigate(getProductUrl(product))}
              />
            ))}
        </div>
        <div className="flex justify-center mt-5">
          <Button 
             variant="outline" 
             onClick={() => onCategorySelect('Áo polo nam')}
             className="rounded-full border-zinc-200 text-zinc-900 hover:bg-zinc-50 font-bold px-8 h-10 text-[13px] shadow-sm"
          >
             Xem thêm
          </Button>
        </div>
      </section>

      {/* Men's T-Shirts Section */}
      <section className="mx-auto max-w-[1440px] px-4 pt-0 pb-12 sm:px-6 lg:px-8 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-900 leading-none">
            <span className="text-[#0082c8]">Áo Thun Nam</span> Thời Trang
          </h2>
          <button 
             onClick={() => onCategorySelect('Áo thun nam')}
             className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
          >
            Xem thêm <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products
            .filter(p => p.category === 'Áo thun nam')
            .slice(0, 6)
            .map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onClick={() => navigate(getProductUrl(product))}
              />
            ))}
        </div>
        <div className="flex justify-center mt-5">
          <Button 
             variant="outline" 
             onClick={() => onCategorySelect('Áo thun nam')}
             className="rounded-full border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 font-bold px-8 h-10 text-[13px] shadow-sm"
          >
             Xem thêm
          </Button>
        </div>
      </section>

      {/* Latest News Section - Matching Screenshot */}
      <section className="mx-auto max-w-[1440px] px-4 pt-4 pb-4 sm:px-6 lg:px-8 bg-white border-t border-zinc-100">
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="h-px bg-zinc-200 flex-1" />
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 leading-none whitespace-wrap text-center">
            Stay updated with the <span className="text-[#16a34a]">latest news</span>
          </h2>
          <div className="h-px bg-zinc-200 flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Large Featured Article */}
          <div className="lg:col-span-5 group cursor-pointer" onClick={() => navigate('/news/1')}>
            <div className="relative aspect-[4/3] sm:aspect-square lg:aspect-auto lg:h-[450px] overflow-hidden rounded-[40px] mb-6">
              <img 
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000" 
                alt="Featured News" 
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute bottom-6 left-6 bg-blue-600/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] font-black text-white uppercase tracking-widest shadow-lg leading-none">
                11/06/2026
              </div>
            </div>
            <h3 className="text-2xl font-black leading-tight text-zinc-900 group-hover:text-[#16a34a] transition-colors">
              Dành cho những người yêu thích âm thanh và chuyển động: Trải nghiệm không giới hạn
            </h3>
          </div>

          {/* Grid of smaller articles */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
             {[
               {
                 id: 2,
                 title: "Thế giới trò chơi Nintendo Wii mới cập bến",
                 image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&q=80&w=600",
                 date: "10/06/2026"
               },
               {
                 id: 3,
                 title: "Mẫu lều WeatherMaster nổi tiếng đã có mặt",
                 image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600",
                 date: "09/06/2026"
               },
               {
                 id: 4,
                 title: "Những bản nhạc huyền thoại của B.B.King",
                 image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600",
                 date: "08/06/2026"
               },
               {
                 id: 5,
                 title: "Tìm kiếm điện thoại Nokia phím bấm hoài cổ",
                 image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&get=80&w=600",
                 date: "07/06/2026"
               },
               {
                 id: 6,
                 title: "Chuẩn bị cho những tình huống khẩn cấp bất ngờ",
                 image: "https://images.unsplash.com/photo-1518310323263-d3434682054a?auto=format&fit=crop&q=80&w=600",
                 date: "06/06/2026"
               },
               {
                 id: 7,
                 title: "Xe đạp Drifter Cruiser: Đẳng cấp Mỹ cổ điển",
                 image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=600",
                 date: "05/06/2026"
               }
             ].map((item, i) => (
               <div key={i} className="group cursor-pointer" onClick={() => navigate(`/news/${item.id}`)}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[25px] mb-3">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute bottom-3 left-3 bg-zinc-900/80 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-black text-white tracking-widest leading-none">
                      {item.date}
                    </div>
                  </div>
                  <h4 className="text-[14px] font-bold text-zinc-900 group-hover:text-[#16a34a] transition-colors leading-snug line-clamp-2">
                    {item.title}
                  </h4>
               </div>
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
        <div className="min-h-screen bg-white font-sans selection:bg-black selection:text-white">
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
                  <section className="bg-slate-50 border-b border-slate-100">
                    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                          { icon: Truck, title: 'Miễn phí vận chuyển', desc: 'Cho đơn hàng từ 500k' },
                          { icon: ShieldCheck, title: 'Thanh toán linh hoạt', desc: 'COD, Chuyển khoản, Ví điện tử' },
                          { icon: RefreshCcw, title: 'Đổi trả 30 ngày', desc: 'Dễ dàng và nhanh chóng' },
                          { icon: Phone, title: 'Hỗ trợ 24/7', desc: 'Hotline: 0917 722 425' },
                        ].map((badge, idx) => (
                          <div key={idx} className="flex items-center gap-4 group">
                            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                              <badge.icon className="h-6 w-6 text-[#0082c8]" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">{badge.title}</h4>
                              <p className="text-[11px] font-medium text-slate-400">{badge.desc}</p>
                            </div>
                          </div>
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

          {/* Floating Action Buttons - Vietnam Style */}
          {!isAdminRoute && (
            <div className="fixed bottom-8 right-8 z-[60] flex flex-col gap-4">
              <a 
                href="https://zalo.me/0917722425" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center h-16 w-16 bg-white rounded-2xl shadow-2xl hover:scale-110 transition-all duration-300 border border-blue-50"
              >
                <div className="absolute right-full mr-4 bg-white px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-100">
                  <span className="text-[12px] font-black uppercase text-blue-600 whitespace-nowrap">Chat Zalo</span>
                </div>
                <MessageCircle className="h-7 w-7 text-blue-500" />
              </a>
              <a 
                href="tel:0917722425" 
                className="group relative flex items-center justify-center h-16 w-16 bg-[#0082c8] rounded-2xl shadow-2xl hover:scale-110 transition-all duration-300 animate-bounce"
              >
                <div className="absolute right-full mr-4 bg-white px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-100">
                  <span className="text-[12px] font-black uppercase text-[#0082c8] whitespace-nowrap">Gọi ngay</span>
                </div>
                <Phone className="h-7 w-7 text-white" />
              </a>
            </div>
          )}
        </div>
      </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  );
}
