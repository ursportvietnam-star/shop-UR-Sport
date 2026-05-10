import React, { useState } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BestSellerProps {
  products: Product[];
}

export function BestSeller({ products }: BestSellerProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'new' | 'best_seller'>('new');

  const newProducts = products.filter(p => p.isNew).slice(0, 8);
  const bestSellers = products.filter(p => p.isBestSeller).slice(0, 8);
  
  // Fallback if no specific new/bestseller
  const displayNew = newProducts.length > 0 ? newProducts : products.slice(0, 8);
  const displayBest = bestSellers.length > 0 ? bestSellers : products.slice(0, 8);

  const displayProducts = activeTab === 'new' ? displayNew : displayBest;

  return (
    <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 my-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'new' 
                ? 'bg-[#1e4b64] text-white shadow-md' 
                : 'bg-white text-zinc-600 border border-zinc-200 hover:border-[#1e4b64] hover:text-[#1e4b64]'
            }`}
          >
            Sản phẩm mới {activeTab === 'new' && <Star className="w-3.5 h-3.5 fill-white" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('best_seller')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'best_seller' 
                ? 'bg-[#1e4b64] text-white shadow-md' 
                : 'bg-white text-zinc-600 border border-zinc-200 hover:border-[#1e4b64] hover:text-[#1e4b64]'
            }`}
          >
            Bán chạy nhất {activeTab === 'best_seller' && <Star className="w-3.5 h-3.5 fill-white" />}
          </button>
        </div>

        <button 
          onClick={() => navigate('/shop')}
          className="hidden sm:inline-flex text-sm font-bold text-zinc-900 underline underline-offset-4 hover:text-[#1e4b64] transition-colors"
        >
          Xem thêm
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10 lg:grid-cols-4">
        {displayProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onClick={() => navigate(`/${product.slug || product.id}`)}
          />
        ))}
      </div>

      <div className="flex justify-center mt-8 sm:hidden">
        <button 
          onClick={() => navigate('/shop')}
          className="inline-flex items-center justify-center w-full py-3.5 border border-zinc-200 rounded-full text-sm font-bold text-zinc-900 active:bg-zinc-50"
        >
          Xem thêm sản phẩm
        </button>
      </div>
    </section>
  );
}
