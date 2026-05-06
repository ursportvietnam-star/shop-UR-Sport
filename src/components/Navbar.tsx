import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, LogOut, Heart, Phone, BarChart2, User, ChevronDown, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileSidebar } from './MobileSidebar';
import { AuthModal } from './AuthModal';
import { Category } from '../types';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onCartClick: () => void;
  onPageChange: (page: string) => void;
  onCategorySelect: (category: Category) => void;
  activeCategory: Category;
}

export const Navbar: React.FC<NavbarProps> = ({ onCartClick, onPageChange, onCategorySelect, activeCategory }) => {
  const { user, isAdmin, loading, loginWithGoogle, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleUserClick = () => {
    if (!user) {
      openAuthModal('login');
    } else {
      setIsUserMenuOpen(!isUserMenuOpen);
    }
  };

  return (
    <>
      <nav className={`fixed top-0 z-50 w-full border-b transition-all duration-300 ${
        isScrolled 
          ? 'bg-white border-zinc-200 shadow-md py-0' 
          : 'bg-white border-zinc-100 py-1'
      } text-zinc-900`}>
        <div className="mx-auto flex h-20 max-w-[1440px] items-center px-4 sm:px-6 lg:px-8 gap-4">
          
          {/* LEFT: Menu & Logo */}
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center justify-center text-zinc-900 hover:text-[#0082c8] transition-all p-2 bg-zinc-50 hover:bg-zinc-100 rounded-full"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="flex flex-col items-start hover:opacity-80 transition-opacity">
              <div className="text-2xl font-black italic tracking-tighter leading-none text-zinc-900 flex items-baseline">
                <span className="text-[#0082c8]">UR</span>
                <span>SPORT</span>
              </div>
              <span className="text-[9px] font-bold italic uppercase tracking-tight text-zinc-400 mt-[0.5px]">
                Phong Cách Thể Thao
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden xl:flex items-center gap-6 ml-6 border-l border-zinc-100 pl-6">
              <button 
                onClick={() => onPageChange('shop')}
                className="text-[13px] font-black uppercase tracking-widest text-zinc-600 hover:text-[#0082c8] transition-colors"
              >
                Cửa hàng
              </button>
              <button 
                onClick={() => onPageChange('blog')}
                className="text-[13px] font-black uppercase tracking-widest text-zinc-600 hover:text-[#0082c8] transition-colors"
              >
                Blog
              </button>
            </div>
          </div>

          {/* MIDDLE: Search */}
          <div className="flex-1 flex items-center justify-center px-4 lg:px-12">
            <div className="relative w-full max-w-[500px] group">
              <input 
                type="text" 
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-5 pr-12 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-[#0082c8]/10 focus:border-[#0082c8] placeholder:text-zinc-400 font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-900 rounded-lg text-white group-focus-within:bg-[#0082c8] transition-colors cursor-pointer">
                <Search className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* RIGHT: Tools & Auth */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Phone (Hidden on small mobile) */}
            <a 
              href="tel:+84917722425"
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors text-zinc-600 group"
            >
              <div className="p-1.5 bg-blue-50 text-[#0082c8] rounded-lg group-hover:bg-[#0082c8] group-hover:text-white transition-colors">
                <Phone className="h-3.5 w-3.5" />
              </div>
              <span className="text-[12px] font-bold">+84 917 722 425</span>
            </a>

            <div className="h-6 w-px bg-zinc-100 hidden lg:block mx-1" />

            <div className="flex items-center gap-1 sm:gap-2">
              <button className="hidden sm:flex p-2.5 text-zinc-400 hover:text-[#ef4444] hover:bg-red-50 rounded-xl transition-all">
                <Heart className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <div className="h-10 w-24 bg-zinc-100 animate-pulse rounded-xl" />
                  ) : !user ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAuthModal('login')}
                        className="h-11 flex items-center gap-2 px-4 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95 border border-transparent hover:border-zinc-200"
                      >
                        <LogIn className="h-4 w-4" />
                        <span className="hidden lg:inline">Đăng nhập</span>
                      </button>
                      <button
                        onClick={() => openAuthModal('register')}
                        className="h-11 flex items-center gap-2 px-5 rounded-xl bg-[#0082c8] hover:bg-[#0071ae] text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden lg:inline">Đăng ký</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <button
                        onClick={() => logout()}
                        className="h-11 flex items-center gap-2 px-4 rounded-xl text-zinc-400 hover:text-[#ef4444] hover:bg-red-50 transition-all"
                        title="Đăng xuất"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={onCartClick} 
                  className="relative p-2.5 bg-zinc-950 text-white rounded-xl hover:bg-zinc-800 transition-all shadow-lg active:scale-95 ml-1"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-1.5 -right-1.5 bg-[#0082c8] text-white text-[10px] font-black h-5 w-5 flex items-center justify-center p-0 border-2 border-white rounded-full">
                      {cartCount}
                    </Badge>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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
