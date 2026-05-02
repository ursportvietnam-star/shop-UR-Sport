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
          ? 'bg-white border-zinc-200 shadow-sm py-1' 
          : 'bg-white border-zinc-100 py-2'
      } text-zinc-900`}>
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          
          {/* Logo Section */}
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center justify-center text-zinc-900 hover:text-[#0082c8] transition-colors p-2 shrink-0"
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link to="/" className="flex flex-col items-start hover:opacity-80 transition-opacity">
              <div className="text-2xl font-black italic tracking-tighter leading-none text-zinc-900 flex items-baseline">
                <span className="text-[#0082c8]">UR</span>
                <span>SPORT</span>
              </div>
              <span className="text-[9px] font-bold italic uppercase tracking-tight text-zinc-400 mt-[1px]">
                Phong Cách Thể Thao
              </span>
            </Link>
          </div>

          {/* Middle Navigation */}
          <div className="flex-1 flex items-center justify-center max-w-4xl gap-4 xl:gap-8">
            <div className="relative flex-1 group min-w-[150px] max-w-[400px]">
              <input 
                type="text" 
                placeholder="Search products"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-md py-2 px-4 pr-10 text-sm transition-all focus:bg-white focus:ring-1 focus:ring-[#0082c8] focus:border-transparent placeholder:text-zinc-400"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-[#0082c8] transition-colors" />
            </div>
          </div>

          {/* Right Tools */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-black border-r border-zinc-100 pr-4 mr-2 text-zinc-400">
              <Phone className="h-4 w-4 text-[#0082c8]" />
              <span>+84 917 722 425</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <button className="hidden sm:flex p-2 text-zinc-400 hover:text-black transition-colors">
                <Heart className="h-5 w-5" />
              </button>

              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-[42px] w-[100px] bg-zinc-100 animate-pulse rounded-xl" />
                    <div className="h-[42px] w-[100px] bg-zinc-100 animate-pulse rounded-xl hidden md:block" />
                  </motion.div>
                ) : !user ? (
                  <motion.div 
                    key="logged-out"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-2"
                  >
                    <button
                      onClick={() => openAuthModal('login')}
                      className="h-[42px] flex items-center gap-2 px-4 rounded-xl border border-zinc-200 bg-white/50 backdrop-blur-sm text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all duration-250 active:scale-95"
                    >
                      <LogIn className="h-4 w-4" />
                      <span className="hidden md:inline">Đăng nhập</span>
                    </button>
                    <button
                      onClick={() => openAuthModal('register')}
                      className="h-[42px] flex items-center gap-2 px-4 rounded-xl bg-[#0082c8] hover:bg-[#0071ae] text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,130,200,0.2)] hover:shadow-[0_6px_20px_rgba(0,130,200,0.35)] hover:-translate-y-0.5 transition-all duration-250 active:scale-95"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden md:inline">Đăng ký</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="logged-in"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-3"
                  >
                    {/* User Avatar */}
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>

                    {isAdmin && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/admin')}
                        className="h-[42px] flex items-center gap-2 px-5 rounded-2xl bg-zinc-900 text-sm font-bold text-white shadow-lg hover:bg-zinc-800 transition-all duration-250"
                      >
                        <BarChart2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Quản trị</span>
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ 
                        scale: 1.02,
                        x: [0, -1, 1, -1, 1, 0],
                        transition: { duration: 0.25 }
                      }}
                      onClick={() => logout()}
                      className="h-[42px] flex items-center gap-2 px-5 rounded-2xl bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-sm font-bold text-white shadow-[0_4px_12px_rgba(239,68,68,0.2)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.3)] hover:brightness-110 transition-all duration-250 active:scale-95"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden sm:inline">Thoát</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button onClick={onCartClick} className="relative p-2 ml-1 text-zinc-400 hover:text-black transition-colors">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-[#1e4b64] hover:bg-[#153a4d] text-white text-[9px] font-black h-4 w-4 flex items-center justify-center p-0 min-w-0">
                    {cartCount}
                  </Badge>
                )}
              </button>
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
