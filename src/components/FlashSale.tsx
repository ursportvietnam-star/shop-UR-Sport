import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Zap, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FlashSaleProps {
  products: Product[];
}

export function FlashSale({ products }: FlashSaleProps) {
  const navigate = useNavigate();
  // Filter products that have discountPrice
  const flashSaleProducts = products.filter(p => p.discountPrice).slice(0, 6);
  
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 45,
    seconds: 30
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 2, minutes: 59, seconds: 59 }; // Reset
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (flashSaleProducts.length === 0) return null;

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 bg-white">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-2.5 rounded-xl shadow-lg shadow-red-500/20">
            <Zap className="h-6 w-6 text-white fill-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-red-600 uppercase">
              Flash Sale
            </h2>
            <p className="text-sm font-bold text-red-500/80">Giá sốc chớp nhoáng - Đừng bỏ lỡ!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-red-100 shadow-sm">
          <Timer className="h-5 w-5 text-red-500" />
          <div className="flex items-center gap-1.5 font-mono text-xl font-black text-red-600">
            <span className="bg-red-100/80 px-2.5 py-1 rounded-lg w-10 text-center">{formatNumber(timeLeft.hours)}</span>
            <span className="text-red-300">:</span>
            <span className="bg-red-100/80 px-2.5 py-1 rounded-lg w-10 text-center">{formatNumber(timeLeft.minutes)}</span>
            <span className="text-red-300">:</span>
            <span className="bg-red-100/80 px-2.5 py-1 rounded-lg w-10 text-center">{formatNumber(timeLeft.seconds)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {flashSaleProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onClick={() => navigate(`/${product.slug || product.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
