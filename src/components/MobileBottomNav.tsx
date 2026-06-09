import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, MessageCircle } from 'lucide-react';
import { useCart } from '../CartContext';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-14 bg-white border-t border-zinc-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:hidden pb-safe-area">
      {/* Menu Tab */}
      <button
        onClick={onMenuClick}
        className="flex flex-1 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors cursor-pointer"
      >
        <Menu className="h-5.5 w-5.5 text-[#f97316]" />
        <span className="text-[10px] font-semibold mt-0.5 text-zinc-500">Menu</span>
      </button>

      {/* Search Tab */}
      <button
        onClick={onSearchClick}
        className="flex flex-1 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors cursor-pointer"
      >
        <Search className="h-5.5 w-5.5 text-[#f97316]" />
        <span className="text-[10px] font-semibold mt-0.5 text-zinc-500">Tìm kiếm</span>
      </button>

      {/* Cart Tab */}
      <button
        onClick={onCartClick}
        className="flex flex-1 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors relative cursor-pointer"
      >
        <div className="relative">
          <ShoppingCart className="h-5.5 w-5.5 text-[#f97316]" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 h-4 w-4 bg-[#00a651] text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold mt-0.5 text-zinc-500">Giỏ hàng</span>
      </button>

      {/* Account Tab */}
      <button
        onClick={onAccountClick}
        className="flex flex-1 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors cursor-pointer"
      >
        <User className={`h-5.5 w-5.5 text-[#f97316] ${location.pathname === '/tai-khoan' ? 'stroke-[2.5px]' : ''}`} />
        <span className={`text-[10px] font-semibold mt-0.5 ${location.pathname === '/tai-khoan' ? 'text-[#f97316] font-bold' : 'text-zinc-500'}`}>
          Tài khoản
        </span>
      </button>

      {/* Zalo Tab */}
      <button
        onClick={handleContactClick}
        className="flex flex-1 flex-col items-center justify-center text-zinc-500 active:bg-zinc-50 transition-colors cursor-pointer"
      >
        <MessageCircle className="h-5.5 w-5.5 text-[#f97316]" />
        <span className="text-[10px] font-semibold mt-0.5 text-zinc-500">Zalo</span>
      </button>
    </div>
  );
};
