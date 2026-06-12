import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, MessageCircle } from 'lucide-react';
import { useCart } from '../CartContext';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

interface MobileBottomNavProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  onCartClick: () => void;
  onAccountClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onMenuClick,
  onSearchClick,
  onCartClick,
  onAccountClick,
}) => {
  const { cart } = useCart();
  const { t } = useLanguage();
  const location = useLocation();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const [zaloPhone, setZaloPhone] = useState('0917722425');

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return;
    getDoc(doc(db, 'settings', 'floatingMenu')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setZaloPhone(data.zaloPhone || '0917722425');
      }
    }).catch(err => console.error(err));
  }, []);

  const isProductDetailPage = (pathname: string) => {
    const staticPaths = [
      '/',
      '/shop',
      '/checkout',
      '/dat-hang-thanh-cong',
      '/tra-cuu-don-hang',
      '/so-sanh',
      '/tai-khoan',
      '/yeu-thich',
      '/da-xem',
      '/chinh-sach-giao-hang',
      '/chinh-sach-doi-tra',
      '/lien-he',
      '/contact',
      '/blog',
      '/quan-tri',
      '/quantri',
      '/admin'
    ];
    
    if (staticPaths.includes(pathname)) return false;
    if (pathname.startsWith('/blog/') || pathname.startsWith('/admin/') || pathname.startsWith('/chinh-sach/')) {
      return false;
    }
    return true;
  };

  // Hide on product detail page because it has its own custom bottom action bar
  if (isProductDetailPage(location.pathname)) {
    return null;
  }

  const handleContactClick = () => {
    window.open(`https://zalo.me/${zaloPhone}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-zinc-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:hidden pt-2 pb-2 pb-safe-area bottom-nav-container">
      {/* Menu Tab */}
      <button
        onClick={onMenuClick}
        className="flex flex-1 min-w-0 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors cursor-pointer px-1 bottom-nav-btn"
      >
        <Menu className="bottom-nav-icon text-[#0068FF]" />
        <span className="bottom-nav-text font-semibold mt-0.5 text-zinc-500 whitespace-nowrap tracking-tight">{t('menu')}</span>
      </button>

      {/* Search Tab */}
      <button
        onClick={onSearchClick}
        className="flex flex-1 min-w-0 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors cursor-pointer px-1 bottom-nav-btn"
      >
        <Search className="bottom-nav-icon text-[#0068FF]" />
        <span className="bottom-nav-text font-semibold mt-0.5 text-zinc-500 whitespace-nowrap tracking-tight">{t('search')}</span>
      </button>

      {/* Cart Tab */}
      <button
        onClick={onCartClick}
        className="flex flex-1 min-w-0 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors relative cursor-pointer px-1 bottom-nav-btn"
      >
        <div className="relative flex flex-col items-center">
          <ShoppingCart className="bottom-nav-icon text-[#0068FF]" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 h-4 w-4 bg-[#1E4B64] text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
              {cartCount}
            </span>
          )}
        </div>
        <span className="bottom-nav-text font-semibold mt-0.5 text-zinc-500 whitespace-nowrap tracking-tight">{t('cart')}</span>
      </button>

      {/* Account Tab */}
      <button
        onClick={onAccountClick}
        className="flex flex-1 min-w-0 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors cursor-pointer px-1 bottom-nav-btn"
      >
        <User className={`bottom-nav-icon text-[#0068FF] ${location.pathname === '/tai-khoan' ? 'stroke-[2.5px]' : ''}`} />
        <span className={`bottom-nav-text font-semibold mt-0.5 whitespace-nowrap tracking-tight ${location.pathname === '/tai-khoan' ? 'text-[#0068FF] font-bold' : 'text-zinc-500'}`}>
          {t('account')}
        </span>
      </button>

      {/* Zalo Tab */}
      <button
        onClick={handleContactClick}
        className="flex flex-1 min-w-0 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors cursor-pointer px-1 bottom-nav-btn"
      >
        <MessageCircle className="bottom-nav-icon text-[#0068FF]" />
        <span className="bottom-nav-text font-semibold mt-0.5 text-zinc-500 whitespace-nowrap tracking-tight">{t('zalo')}</span>
      </button>
    </div>
  );
};
