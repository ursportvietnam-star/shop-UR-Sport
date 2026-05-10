import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Zap, Timer, ChevronRight, ChevronLeft, TrendingUp } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '@/lib/utils';

interface FlashSaleProps {
  products: Product[];
}

interface FlashSaleSettings {
  products: { id: string; flashSalePrice: number }[];
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export function FlashSale({ products }: FlashSaleProps) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<FlashSaleSettings | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false,
    isNotStarted: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'flashSale'));
      if (snap.exists()) {
        setSettings(snap.data() as FlashSaleSettings);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!settings || !settings.isActive) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(settings.startTime).getTime();
      const end = new Date(settings.endTime).getTime();

      if (now < start) {
        const diff = start - now;
        setTimeLeft({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
          isEnded: false,
          isNotStarted: true
        });
      } else if (now > end) {
        setTimeLeft(prev => ({ ...prev, isEnded: true }));
        clearInterval(timer);
      } else {
        const diff = end - now;
        setTimeLeft({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
          isEnded: false,
          isNotStarted: false
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [settings]);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!settings || !settings.isActive || timeLeft.isEnded) return null;

  // Filter products based on selected IDs and map their flash sale prices
  const flashSaleProducts = settings.products
    .map(sp => {
      const p = products.find(prod => prod.id === sp.id);
      if (!p) return null;
      return {
        ...p,
        discountPrice: sp.flashSalePrice || p.discountPrice // Use flash sale price
      };
    })
    .filter((p): p is any => p !== null);
  
  if (flashSaleProducts.length === 0) return null;

  const formatNumber = (num: number) => Math.max(0, num).toString().padStart(2, '0');

  return (
    <section className="mx-auto max-w-[1440px] px-2 sm:px-4 py-4 sm:py-8 bg-white overflow-hidden">
      <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-zinc-100 pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center">
            <h2 className="text-lg sm:text-2xl font-black tracking-tighter text-[#ee4d2d] uppercase italic flex items-center">
              F<Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />ASH SALE
            </h2>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-1.5 font-mono">
            <span className="bg-zinc-900 text-white text-xs sm:text-sm font-black px-1 sm:px-1.5 py-0.5 sm:py-1 rounded shadow-sm min-w-[24px] sm:min-w-[28px] text-center">
              {formatNumber(timeLeft.hours)}
            </span>
            <span className="text-zinc-900 font-bold text-xs sm:text-sm">:</span>
            <span className="bg-zinc-900 text-white text-xs sm:text-sm font-black px-1 sm:px-1.5 py-0.5 sm:py-1 rounded shadow-sm min-w-[24px] sm:min-w-[28px] text-center">
              {formatNumber(timeLeft.minutes)}
            </span>
            <span className="text-zinc-900 font-bold text-xs sm:text-sm">:</span>
            <span className="bg-zinc-900 text-white text-xs sm:text-sm font-black px-1 sm:px-1.5 py-0.5 sm:py-1 rounded shadow-sm min-w-[24px] sm:min-w-[28px] text-center">
              {formatNumber(timeLeft.seconds)}
            </span>
          </div>
        </div>

        <Link to="/shop" className="text-[#ee4d2d] text-xs sm:text-sm font-medium flex items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-opacity whitespace-nowrap">
          <span className="hidden xs:inline">Xem tất cả</span>
          <span className="xs:hidden">Tất cả</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Link>
      </div>

      <div className="relative group">
        {/* Prev Button */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 z-20 w-8 h-8 sm:w-10 sm:h-10 bg-white border border-zinc-200 rounded-full shadow-xl items-center justify-center hover:bg-zinc-50 transition-all text-zinc-400 opacity-0 group-hover:opacity-100 hidden lg:flex"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {flashSaleProducts.map((product) => {
            // Robust sold count calculation to avoid NaN
            const idPrefix = product.id?.substring(0, 2) || '00';
            const parsedId = parseInt(idPrefix, 16);
            const soldCount = (isNaN(parsedId) ? 0 : parsedId % 20) + 5;
            
            const totalStock = soldCount + (product.stock || 10);
            const percent = Math.min(100, Math.round((soldCount / totalStock) * 100));
            
            let statusText = `ĐÃ BÁN ${soldCount}`;
            if (percent > 90) statusText = `CHỈ CÒN ${totalStock - soldCount}`;
            else if (percent > 70) statusText = "ĐANG BÁN CHẠY";

            return (
              <div 
                key={product.id} 
                className="min-w-[170px] sm:min-w-[200px] lg:min-w-[220px] snap-start group flex flex-col bg-white hover:shadow-xl transition-all duration-300 rounded-sm overflow-hidden border border-transparent hover:border-zinc-100"
              >
                <div 
                  onClick={() => navigate(`/${product.slug || product.id}`)}
                  className="relative aspect-square cursor-pointer overflow-hidden"
                >
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  <div className="absolute top-0 left-0 bg-[#ee4d2d] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-sm shadow-sm">
                    Yêu thích
                  </div>

                  <div className="absolute top-0 right-0">
                    <div className="bg-[#ffda24] text-[#ee4d2d] text-[11px] font-black px-1.5 py-1 flex items-center gap-0.5 shadow-sm">
                      <Zap className="h-2.5 w-2.5 fill-current" />
                      -{Math.round((1 - (product.discountPrice! / product.price)) * 100)}%
                    </div>
                  </div>

                  <div className="absolute bottom-1 left-1 flex gap-1">
                    <div className="bg-[#ffda24] text-[#ee4d2d] text-[8px] font-black px-1 py-0.5 rounded-sm border border-[#ee4d2d]/20">VOUCHER XTRA</div>
                    <div className="bg-blue-600 text-white text-[8px] font-black px-1 py-0.5 rounded-sm">SIÊU RẺ</div>
                  </div>
                </div>

                <div className="p-3 flex flex-col items-center">
                  <div className="text-center mb-3">
                    <span className="text-[#ee4d2d] text-lg font-bold">
                      {product.discountPrice?.toLocaleString('vi-VN')}
                      <span className="text-xs ml-0.5">₫</span>
                    </span>
                  </div>
                  
                  <div className="w-full relative h-4 bg-[#ffbd9d] rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff7337] to-[#ee4d2d] rounded-full transition-all duration-1000"
                      style={{ width: `${percent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                      {percent > 50 && <TrendingUp className="h-3 w-3 text-white fill-white animate-bounce" />}
                      <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                        {statusText}
                      </span>
                    </div>
                    <div className="absolute left-1 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 flex items-center justify-center bg-white rounded-full shadow-sm">
                        <Zap className="h-2.5 w-2.5 text-[#ee4d2d] fill-current" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Next Button */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 bg-white border border-zinc-200 rounded-full shadow-xl items-center justify-center hover:bg-zinc-50 transition-all text-zinc-400 opacity-0 group-hover:opacity-100 hidden lg:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}

