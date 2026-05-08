import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Star, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BestSellerProps {
  products: Product[];
}

export function BestSeller({ products }: BestSellerProps) {
  const navigate = useNavigate();
  const bestSellers = products.filter(p => p.isBestSeller).slice(0, 8);

  if (bestSellers.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 bg-zinc-50 sm:rounded-[3rem] my-12 border border-zinc-100">
      <div className="flex flex-col items-center mb-12 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-100 rounded-2xl mb-5 shadow-sm">
          <Star className="h-7 w-7 text-yellow-500 fill-yellow-500" />
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-zinc-900 leading-none mb-4">
          Sản phẩm <span className="text-[#0082c8]">Bán chạy</span>
        </h2>
        <p className="text-zinc-500 font-medium max-w-lg text-sm sm:text-base">
          Những sản phẩm được khách hàng yêu thích và lựa chọn nhiều nhất tại UR Sport.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {bestSellers.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onClick={() => navigate(`/${product.slug || product.id}`)}
          />
        ))}
      </div>

      <div className="flex justify-center mt-12">
        <button 
          onClick={() => navigate('/shop')}
          className="group inline-flex items-center gap-2 px-8 py-3.5 bg-zinc-900 text-white text-sm font-bold rounded-full transition-all hover:bg-[#0082c8] hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
        >
          Xem tất cả sản phẩm
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  );
}
