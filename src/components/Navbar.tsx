import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, LogOut, Phone, LogIn, UserPlus, X, UserRound, Heart, Clock, Mic, PackageSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { useRecentlyViewed } from '../RecentlyViewedContext';
import { useProducts } from '../ProductsContext';
import { MobileSidebar } from './MobileSidebar';
import { AuthModal } from './AuthModal';
import { Category, Product } from '../types';
import { getProductPath } from '../lib/productUrls';

interface NavbarProps {
  onCartClick: () => void;
  onPageChange: (page: string) => void;
  onCategorySelect: (category: Category) => void;
  activeCategory: Category;
}

export const Navbar: React.FC<NavbarProps> = ({ onCartClick, onPageChange, onCategorySelect, activeCategory }) => {
  const { user, loading, logout } = useAuth();
  const { cart } = useCart();
  const { wishlistCount } = useWishlist();
  const { recentCount } = useRecentlyViewed();
  const { products } = useProducts();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem('ursport_search_history') || '[]');
    } catch {
      return [];
    }
  });
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileSearchOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const trimmedSearchQuery = searchQuery.trim();

  const normalizeSearchText = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const searchSuggestions = React.useMemo(() => {
    if (trimmedSearchQuery.length < 2) return [];

    const terms = normalizeSearchText(trimmedSearchQuery)
      .split(/\s+/)
      .filter(Boolean);

    return products
      .filter((product) => {
        const haystack = normalizeSearchText([
          product.name,
          product.category,
          product.brand,
          product.material,
          product.keywords,
          ...(product.colors || []),
          ...(product.sizes || []),
        ].filter(Boolean).join(' '));

        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, 6);
  }, [products, trimmedSearchQuery]);

  const goToProduct = (product: Product) => {
    navigate(getProductPath(product));
    setSearchQuery('');
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const nextQuery = searchQuery.trim();
      const nextHistory = [nextQuery, ...searchHistory.filter(item => item !== nextQuery)].slice(0, 5);
      setSearchHistory(nextHistory);
      window.localStorage.setItem('ursport_search_history', JSON.stringify(nextHistory));
      navigate(`/shop?q=${encodeURIComponent(nextQuery)}`);
      setIsMobileSearchOpen(false);
      setIsSearchFocused(false);
      setSearchQuery('');
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setSearchQuery(transcript);
      if (transcript.trim()) navigate(`/shop?q=${encodeURIComponent(transcript.trim())}`);
    };
    recognition.start();
  };

  // Shared icon button style — consistent across all
  const iconBtn = "flex items-center justify-center h-10 w-10 rounded-full transition-all active:scale-90 shrink-0";
  const shouldShowSuggestions = trimmedSearchQuery.length >= 2 && searchSuggestions.length > 0;
  const trendingSearches = ['áo thun cotton', 'áo thun thể thao', 'áo polo nam', 'quần jogger'];

  const renderSearchSuggestions = (isMobile = false) => (
    <AnimatePresence>
      {shouldShowSuggestions && (isMobile || isSearchFocused) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          className={isMobile
            ? "mx-4 mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
            : "absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-2xl"
          }
        >
          <div className="border-b border-zinc-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Gợi ý sản phẩm
          </div>
          <div className="max-h-[360px] overflow-y-auto py-1">
            {searchSuggestions.map((product) => (
              <button
                key={product.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  goToProduct(product);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  <img src={product.images?.[0] || ''} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[13px] font-black leading-5 text-zinc-900">{product.name}</p>
                  <p className="line-clamp-1 text-[11px] font-bold text-zinc-400">{product.category}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-black text-[#1e4b64]">
                    {(product.discountPrice || product.price).toLocaleString('vi-VN')}đ
                  </p>
                  {product.discountPrice && (
                    <p className="text-[10px] font-bold text-zinc-300 line-through">{product.price.toLocaleString('vi-VN')}đ</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              navigate(`/shop?q=${encodeURIComponent(trimmedSearchQuery)}`);
              setSearchQuery('');
              setIsSearchFocused(false);
              setIsMobileSearchOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 border-t border-zinc-100 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[#1e4b64] transition-colors hover:bg-blue-50"
          >
            <Search className="h-3.5 w-3.5" />
            Xem tất cả kết quả
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-sm'
          : 'bg-white border-b border-zinc-100'
      }`}>
        {/* Main Navbar Row */}
        <div className="flex h-16 items-center px-4 gap-0">

          {/* ─── LEFT: Hamburger + Logo ─── */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`${iconBtn} text-zinc-600 hover:bg-zinc-100 shrink-0`}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="flex flex-col items-start active:opacity-70 transition-opacity min-w-fit shrink-0">
              <motion.div
                animate={{ scale: isScrolled ? 0.92 : 1 }}
                className="text-[18px] xs:text-[20px] sm:text-[22px] font-black italic tracking-tighter leading-none flex items-baseline origin-left whitespace-nowrap"
              >
                <span className="text-[#1e4b64]">UR</span>
                <span className="text-zinc-900">SPORT</span>
              </motion.div>
              <motion.span
                animate={{ opacity: isScrolled ? 0 : 1 }}
                className="text-[7px] sm:text-[8px] font-semibold uppercase tracking-widest text-zinc-400 mt-px whitespace-nowrap"
              >
                Phong Cách Thể Thao
              </motion.span>
            </Link>
          </div>

          {/* ─── MIDDLE: Desktop search ─── */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearchSubmit} className="relative w-full group">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-2.5 px-5 pr-12 text-sm focus:bg-white focus:ring-2 focus:ring-[#1e4b64]/15 focus:border-[#1e4b64] placeholder:text-zinc-400 font-medium outline-none transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-zinc-900 rounded-full text-white group-focus-within:bg-[#1e4b64] transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={startVoiceSearch}
                className="absolute right-11 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-blue-50 hover:text-[#1e4b64]"
                aria-label="Tìm kiếm bằng giọng nói"
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
              {renderSearchSuggestions()}
            </form>
          </div>

          {/* ─── RIGHT: Icon group ─── */}
          <div className="flex items-center gap-1">

            {/* Phone — desktop only */}
            <a
              href="tel:+84917722425"
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors text-zinc-600 mr-2"
            >
              <div className="p-1.5 bg-blue-50 text-[#1e4b64] rounded-lg">
                <Phone className="h-3.5 w-3.5" />
              </div>
              <span className="text-[12px] font-bold">+84 917 722 425</span>
            </a>
            <button
              type="button"
              onClick={() => navigate('/tra-cuu-don-hang')}
              className={`${iconBtn} hidden text-zinc-600 hover:bg-blue-50 hover:text-[#1e4b64] md:flex`}
              aria-label="Tra cứu đơn hàng"
              title="Tra cứu đơn hàng"
            >
              <PackageSearch className="h-5 w-5" />
            </button>

            {/* Search icon — mobile only */}
            <button
              onClick={() => setIsMobileSearchOpen(v => !v)}
              className={`${iconBtn} md:hidden ${isMobileSearchOpen ? 'text-[#1e4b64] bg-blue-50' : 'text-zinc-600 hover:bg-zinc-100'}`}
              aria-label="Tìm kiếm"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Auth — desktop shows buttons, mobile shows avatar/login icon */}
            {loading ? (
              <div className="h-10 w-10 bg-zinc-100 animate-pulse rounded-full" />
            ) : !user ? (
              <>
                {/* Mobile: single person icon */}
                <button
                  onClick={() => openAuthModal('login')}
                  className={`${iconBtn} md:hidden text-zinc-600 hover:bg-zinc-100`}
                  aria-label="Đăng nhập"
                >
                  <LogIn className="h-5 w-5" />
                </button>
                {/* Desktop: text buttons */}
                <div className="hidden md:flex items-center gap-2 ml-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="h-9 flex items-center gap-2 px-4 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95 border border-transparent hover:border-zinc-200"
                  >
                    <LogIn className="h-4 w-4" />
                    Đăng nhập
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="h-9 flex items-center gap-2 px-4 rounded-xl bg-[#1e4b64] hover:bg-[#153446] text-sm font-bold text-white shadow-sm transition-all active:scale-95"
                  >
                    <UserPlus className="h-4 w-4" />
                    Đăng ký
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/tai-khoan')}
                  className="hidden h-10 items-center gap-2 rounded-full border border-zinc-100 bg-white px-3 text-sm font-bold text-zinc-700 transition-all hover:border-[#1e4b64]/30 hover:bg-blue-50/50 hover:text-[#1e4b64] md:flex"
                  title="Tài khoản và đơn hàng"
                >
                  <UserRound className="h-4 w-4" />
                  Tài khoản
                </button>
                <button
                  onClick={() => navigate('/tai-khoan')}
                  className={`${iconBtn} bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-bold`}
                  title={user.displayName || user.email || 'Tài khoản'}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User profile'} loading="lazy" className="h-full w-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[13px] font-black">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => logout()}
                  className={`${iconBtn} hidden text-zinc-500 hover:bg-zinc-100 hover:text-red-500 md:flex`}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Wishlist */}
            <button
              type="button"
              onClick={() => navigate('/yeu-thich')}
              className={`${iconBtn} relative hidden text-zinc-600 hover:bg-red-50 hover:text-red-500 sm:flex`}
              aria-label="Sản phẩm yêu thích"
              title="Sản phẩm yêu thích"
            >
              <Heart className="h-5 w-5" />
              <AnimatePresence>
                {wishlistCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[10px] font-black text-white"
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Recently viewed */}
            <button
              type="button"
              onClick={() => navigate('/da-xem')}
              className={`${iconBtn} relative hidden text-zinc-600 hover:bg-blue-50 hover:text-[#1e4b64] lg:flex`}
              aria-label="Sản phẩm đã xem"
              title="Sản phẩm đã xem"
            >
              <Clock className="h-5 w-5" />
              <AnimatePresence>
                {recentCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1e4b64] text-[10px] font-black text-white"
                  >
                    {recentCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Cart */}
            <button
              onClick={onCartClick}
              className={`${iconBtn} relative text-[#1e4b64] hover:bg-zinc-100 ml-1`}
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="h-6 w-6" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-[#1e4b64] text-white text-[10px] font-black rounded-full border-2 border-white"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ─── Mobile Search Dropdown ─── */}
        <AnimatePresence>
          {isMobileSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="md:hidden overflow-hidden bg-zinc-900"
            >
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-4 py-3">
                <div className="flex-1 flex items-center gap-3 bg-white/10 rounded-full px-4 py-2 border border-white/10 focus-within:border-white/30 transition-all">
                  <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                  <input
                    ref={mobileSearchRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Nhập từ khóa tìm kiếm..."
                    className="flex-1 bg-transparent text-white placeholder:text-zinc-400 text-sm font-medium outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={startVoiceSearch}
                  className="h-10 w-10 bg-white/10 hover:bg-white/15 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shrink-0"
                  aria-label="Tìm kiếm bằng giọng nói"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setIsMobileSearchOpen(false); setSearchQuery(''); }}
                  className="h-10 w-10 bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shrink-0"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
              {renderSearchSuggestions(true)}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogin={() => openAuthModal('login')}
        onPageChange={onPageChange}
        onCategorySelect={onCategorySelect}
        activeCategory={activeCategory}
        user={user}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
};
