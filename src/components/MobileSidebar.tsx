import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { X, User, ChevronRight, ShoppingBag, CreditCard, Heart, Settings, LogIn, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CATEGORY_METADATA } from '../data';
import { Category } from '../types';

import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getNavigationSubcategories, normalizeMenuLabel } from '../lib/categoryConfig';
import { useWishlist } from '../WishlistContext';
import { useRecentlyViewed } from '../RecentlyViewedContext';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onPageChange: (page: string) => void;
  onCategorySelect: (category: Category) => void;
  activeCategory: Category;
  user: any;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ 
  isOpen, 
  onClose, 
  onLogin, 
  onPageChange,
  onCategorySelect,
  activeCategory,
  user 
}) => {
  const navigate = useNavigate();
  const { wishlistCount } = useWishlist();
  const { recentCount } = useRecentlyViewed();
  const [navItems, setNavItems] = React.useState<any[]>([]);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'navigation')).then(snap => {
      if (snap.exists() && snap.data().items?.length > 0) {
        setNavItems(snap.data().items);
      }
    });
  }, []);

  const mainLinks = navItems.length > 0 
    ? navItems.filter(item => item.group === 'main')
    : [
        { label: 'Cửa hàng', link: '/shop' },
        { label: 'Blog', link: '/blog' }
      ];

  const categoryLinks = navItems.length > 0
    ? navItems.filter(item => item.group === 'category')
    : CATEGORY_METADATA.map(cat => ({ label: cat.name, link: `/${cat.slug}`, icon: cat.icon, isStatic: true }));

  const subcategoryLinks = getNavigationSubcategories(navItems);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setExpandedCategory(null);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 z-[10000] h-screen w-[310px] bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header: Brand Blue Background */}
            <div className="bg-[#1e4b64] px-5 pt-6 pb-8 text-white relative shrink-0">
                <div className="flex justify-between items-start mb-5">
                    <div className="flex flex-col">
                        <Link to="/" onClick={onClose} className="text-xl font-black italic tracking-tighter leading-none flex items-center">
                            <span className="text-white">UR</span>
                            <span className="text-white ml-1">SPORT</span>
                        </Link>
                        <span className="text-[7px] font-bold italic tracking-[0.2em] text-white/70 mt-1 uppercase">
                            Phong Cách Thể Thao
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* User Card */}
                <div 
                    onClick={() => { if(!user) onLogin(); onClose(); }}
                    className="relative overflow-hidden bg-white/10 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/20 cursor-pointer group transition-all active:scale-[0.98] flex items-center gap-3"
                >
                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || 'User profile'} loading="lazy" className="h-full w-full object-cover rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="h-full w-full rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-[#1e4b64]" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-[14px] tracking-tight truncate text-white">
                            {user ? user.displayName : 'Đăng nhập | Đăng ký'}
                        </p>
                        <p className="text-[9px] font-medium text-white/70 mt-0.5 tracking-tight truncate">
                            {user ? 'Chào đón bạn trở lại' : 'Nhận ưu đãi độc quyền ngay'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
                <div className="py-0">
                    {/* Main Menu */}
                    <div className="bg-zinc-50/50 py-3 px-6 border-b border-zinc-100">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                            KHÁM PHÁ UR SPORT
                        </p>
                    </div>

                    <div className="px-6 py-2 space-y-1 mb-4">
                        <Link 
                            to="/yeu-thich"
                            onClick={onClose}
                            className="flex w-full items-center justify-between py-2.5 text-[15px] font-black italic tracking-tight uppercase text-zinc-900 transition-colors hover:text-red-500"
                        >
                            <span className="flex items-center gap-2">
                                <Heart className="h-4 w-4" />
                                Yêu thích
                            </span>
                            {wishlistCount > 0 && (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                                    {wishlistCount}
                                </span>
                            )}
                        </Link>
                        <Link 
                            to="/da-xem"
                            onClick={onClose}
                            className="flex w-full items-center justify-between py-2.5 text-[15px] font-black italic tracking-tight uppercase text-zinc-900 transition-colors hover:text-[#1e4b64]"
                        >
                            <span className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Đã xem
                            </span>
                            {recentCount > 0 && (
                                <span className="rounded-full bg-[#1e4b64] px-2 py-0.5 text-[10px] font-black text-white">
                                    {recentCount}
                                </span>
                            )}
                        </Link>
                        {mainLinks.map((link, idx) => (
                          <Link 
                              key={idx}
                              to={link.link}
                              onClick={onClose}
                              className="block w-full text-left py-2.5 text-[15px] font-black italic tracking-tight uppercase text-zinc-900 hover:text-[#1e4b64] transition-colors"
                          >
                              {link.label}
                          </Link>
                        ))}
                    </div>

                    <div className="bg-zinc-50/50 py-3 px-6 border-b border-zinc-100">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                            DANH MỤC SẢN PHẨM
                        </p>
                    </div>
                    
                    <div className="px-0">
                        <div className="flex flex-col">
                            {categoryLinks.map((cat, i) => {
                                const childLinks = subcategoryLinks.filter(
                                    item => normalizeMenuLabel(item.parentLabel) === normalizeMenuLabel(cat.label)
                                );

                                const categoryKey = normalizeMenuLabel(cat.label);
                                const isExpanded = expandedCategory === categoryKey;

                                return (
                                <React.Fragment key={cat.id || cat.label || i}>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`w-full flex items-center gap-4 py-3 px-6 transition-all group relative border-b border-zinc-50 ${
                                        activeCategory === cat.label 
                                          ? 'bg-[#1e4b64]/5' 
                                          : 'hover:bg-zinc-50 bg-white'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (cat.isStatic) {
                                                onCategorySelect(cat.label as any);
                                            } else if (cat.link?.startsWith('http')) {
                                                window.open(cat.link, '_blank');
                                            } else {
                                                navigate(cat.link || '/shop');
                                            }
                                            onClose();
                                        }}
                                        className="flex min-w-0 flex-1 items-center gap-4 text-left"
                                    >
                                        <div className="h-12 w-12 rounded-full overflow-hidden border border-zinc-100 group-hover:scale-105 transition-transform bg-zinc-50 flex-shrink-0 relative shadow-sm">
                                            {cat.icon ? (
                                              <img src={cat.icon} alt={cat.label} loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                              <div className="h-full w-full bg-zinc-50 flex items-center justify-center">
                                                <Sparkles className="h-5 w-5 text-[#1e4b64]/20" />
                                              </div>
                                            )}
                                        </div>
                                        <span className={`text-[15px] font-bold tracking-tight text-left flex-1 text-zinc-900 group-hover:text-[#1e4b64] transition-colors`}>
                                            {cat.label}
                                        </span>
                                    </button>
                                    {childLinks.length > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-[#1e4b64]"
                                        aria-label={isExpanded ? `Thu gọn ${cat.label}` : `Mở danh mục con ${cat.label}`}
                                      >
                                        <ChevronRight className={`h-4 w-4 transition-all ${isExpanded ? 'rotate-90 text-[#1e4b64]' : ''}`} />
                                      </button>
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-[#1e4b64] transition-colors" />
                                    )}
                                </motion.div>
                                {isExpanded && childLinks.map((child, childIndex) => (
                                    <motion.button
                                        key={child.id || `${cat.label}-${child.label}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: (i + childIndex + 1) * 0.05 }}
                                        onClick={() => {
                                            if (child.link?.startsWith('http')) {
                                                window.open(child.link, '_blank');
                                            } else {
                                                navigate(child.link || '/shop');
                                            }
                                            onClose();
                                        }}
                                        className="w-full flex items-center gap-3 py-2.5 pl-20 pr-6 transition-all group relative border-b border-zinc-50 hover:bg-zinc-50 bg-white"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]/40 shrink-0" />
                                        <span className="text-[13px] font-bold tracking-tight text-left flex-1 text-zinc-600 group-hover:text-[#1e4b64] transition-colors">
                                            {child.label}
                                        </span>
                                        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-[#1e4b64] transition-colors" />
                                    </motion.button>
                                ))}
                                </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 px-5 pb-10">
                        <Button 
                            className="w-full bg-[#1e4b64] text-white font-black h-14 uppercase tracking-widest text-[11px] rounded-xl shadow-xl hover:bg-[#153446] transition-all mb-4"
                            onClick={() => { onCategorySelect('All' as any); onClose(); }}
                        >
                            XEM TẤT CẢ SẢN PHẨM
                        </Button>
                        <p className="text-[10px] text-zinc-400 text-center font-bold tracking-tight uppercase opacity-50">
                            Chất lượng vượt trội • Giao hàng nhanh
                        </p>
                    </div>
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
