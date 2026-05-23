import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Zap, Timer, ChevronRight, ChevronLeft, TrendingUp } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '@/lib/utils';
import { LazyImage } from './LazyImage';
import { getProductPath } from '../lib/productUrls';

interface FlashSaleProps {
  products: Product[];
}

interface FlashSaleSettings {
  products: { id: string; flashSalePrice: number; sold?: number }[];
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
    <section className="mx-auto max-w-[1440px] px-2 sm:px-4 py-4 sm:py-10 bg-white overflow-hidden">
      <div className="flex items-center justify-between mb-4 sm:mb-8 border-b border-zinc-100 pb-3 sm:pb-5 gap-1 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-6 overflow-hidden">
          <div className="flex-shrink-0">
            <h2 className="text-sm sm:text-2xl font-black tracking-tighter text-[#ee4d2d] uppercase italic flex items-center gap-0.5 sm:gap-1">
              F<Zap className="h-3.5 w-3.5 sm:h-6 sm:w-6 fill-current animate-pulse" />ASH SALE
            </h2>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-2 font-mono flex-shrink-0">
            {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((val, i) => (
              <React.Fragment key={i}>
                <span className="bg-zinc-900 text-white text-[10px] sm:text-[13px] font-black px-1 sm:px-2 py-0.5 sm:py-1 rounded shadow-lg min-w-[20px] sm:min-w-[32px] text-center border border-white/10">
                  {formatNumber(val)}
                </span>
                {i < 2 && <span className="text-zinc-900 font-bold text-[10px] sm:text-sm">:</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Link to="/shop" className="text-[#ee4d2d] text-[11px] sm:text-[14px] font-bold flex items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap">
          <span>Xem tất cả</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="relative group/slider">
        {/* Navigation Buttons - Hidden on Mobile */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-[35%] -translate-y-1/2 -translate-x-5 z-20 w-11 h-11 bg-white border border-zinc-100 rounded-full shadow-2xl items-center justify-center hover:bg-zinc-50 transition-all text-zinc-400 opacity-0 group-hover/slider:opacity-100 hidden lg:flex active:scale-90"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory no-scrollbar pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {flashSaleProducts.map((product) => {
            // Use actual sold data from settings or default to 0
            const flashProductSettings = settings.products.find(p => p.id === product.id);
            const soldCount = flashProductSettings?.sold || 0;
            
            const totalStock = product.stock || 50;
            const percent = Math.min(100, Math.round((soldCount / totalStock) * 100));
            
            let statusText = `ĐÃ BÁN ${soldCount}`;
            if (soldCount === 0) statusText = "ĐANG MỞ BÁN";
            else if (percent > 95) statusText = `VỪA CHÁY HÀNG`;
            else if (percent > 80) statusText = "SẮP CHÁY HÀNG";
            else if (percent > 60) statusText = "ĐANG BÁN CHẠY";

            return (
              <div 
                key={product.id} 
                className="min-w-[155px] sm:min-w-[200px] lg:min-w-[220px] snap-start group flex flex-col bg-white hover:shadow-xl transition-all duration-500 rounded-lg overflow-hidden border border-zinc-50"
              >
                <div 
                  onClick={() => navigate(getProductPath(product))}
                  className="relative aspect-square cursor-pointer overflow-hidden"
                >
                  <LazyImage 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  
                  {/* Premium Labels */}
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-[#ee4d2d] to-[#ff7337] text-white text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-br-lg shadow-md uppercase tracking-tighter italic">
                    Mall
                  </div>

                  <div className="absolute top-0 right-0">
                    <div className="bg-[#ffda24] text-[#ee4d2d] text-[10px] sm:text-[12px] font-black px-2 py-1 flex items-center gap-1 shadow-md rounded-bl-lg">
                      <Zap className="h-3 w-3 fill-current" />
                      -{Math.round((1 - (product.discountPrice! / product.price)) * 100)}%
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                    <div className="bg-zinc-900/80 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm border border-white/20 w-fit">VOUCHER XTRA</div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 flex flex-col items-center">
                  <div className="text-center mb-3">
                    <div className="text-[#ee4d2d] text-lg sm:text-xl font-black tracking-tight leading-none">
                      {product.discountPrice?.toLocaleString('vi-VN')}
                      <span className="text-[10px] sm:text-xs ml-0.5 underline font-bold uppercase">đ</span>
                    </div>
                  </div>
                  
                  {/* Realistic Progress Bar */}
                  <div className="w-full relative h-4 bg-[#ffbd9d] rounded-full overflow-hidden border border-orange-100 shadow-inner">
                    <div 
                      className={cn(
                        "absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff7337] to-[#ee4d2d] rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(238,77,45,0.4)]",
                        percent > 80 && "animate-pulse"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center px-2">
                      <span className="text-[9px] font-black text-white uppercase tracking-tighter drop-shadow-sm truncate">
                        {statusText}
                      </span>
                    </div>
                    
                    {/* Floating Hot Icon */}
                    {percent > 50 && (
                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-md animate-bounce">
                        <Zap className="h-2 w-2 text-[#ee4d2d] fill-current" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Next Button */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-[35%] -translate-y-1/2 translate-x-5 z-20 w-11 h-11 bg-white border border-zinc-100 rounded-full shadow-2xl items-center justify-center hover:bg-zinc-50 transition-all text-zinc-400 opacity-0 group-hover/slider:opacity-100 hidden lg:flex active:scale-90"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
