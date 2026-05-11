import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, LogOut, Phone, LogIn, UserPlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { Badge } from '@/components/ui/badge';
import { MobileSidebar } from './MobileSidebar';
import { AuthModal } from './AuthModal';
import { Category } from '../types';

interface NavbarProps {
  onCartClick: () => void;
  onPageChange: (page: string) => void;
  onCategorySelect: (category: Category) => void;
  activeCategory: Category;
}

export const Navbar: React.FC<NavbarProps> = ({ onCartClick, onPageChange, onCategorySelect, activeCategory }) => {
  const { user, loading, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Shared icon button style — consistent across all
  const iconBtn = "flex items-center justify-center h-10 w-10 rounded-full transition-all active:scale-90 shrink-0";

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

            <Link to="/" className="flex flex-col items-start active:opacity-70 transition-opacity min-w-0 shrink">
              <motion.div
                animate={{ scale: isScrolled ? 0.92 : 1 }}
                className="text-[18px] xs:text-[20px] sm:text-[22px] font-black italic tracking-tighter leading-none flex items-baseline origin-left truncate"
              >
                <span className="text-[#1e4b64]">UR</span>
                <span className="text-zinc-900">SPORT</span>
              </motion.div>
              <motion.span
                animate={{ opacity: isScrolled ? 0 : 1 }}
                className="text-[7px] sm:text-[8px] font-semibold uppercase tracking-widest text-zinc-400 mt-px truncate"
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
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-2.5 px-5 pr-12 text-sm focus:bg-white focus:ring-2 focus:ring-[#1e4b64]/15 focus:border-[#1e4b64] placeholder:text-zinc-400 font-medium outline-none transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-zinc-900 rounded-full text-white group-focus-within:bg-[#1e4b64] transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
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
                {/* Avatar — mobile: tròn nhỏ gọn */}
                <button
                  onClick={() => logout()}
                  className={`${iconBtn} bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-bold`}
                  title={`${user.displayName || user.email} — Nhấn để đăng xuất`}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User profile'} loading="lazy" className="h-full w-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[13px] font-black">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
              </>
            )}

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
                  onClick={() => { setIsMobileSearchOpen(false); setSearchQuery(''); }}
                  className="h-10 w-10 bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shrink-0"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
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
