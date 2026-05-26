import React, { useState } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProductPath } from '../lib/productUrls';

interface BestSellerProps {
  products: Product[];
}

export function BestSeller({ products }: BestSellerProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'new' | 'best_seller'>('new');
  const [visibleCounts, setVisibleCounts] = useState<Record<'new' | 'best_seller', number>>({
    new: 8,
    best_seller: 8
  });

  const newProducts = products.filter(p => p.isNew);
  const bestSellers = products.filter(p => p.isBestSeller);
  
  // Fallback if no specific new/bestseller
  const displayNew = newProducts.length > 0 ? newProducts : products;
  const displayBest = bestSellers.length > 0 ? bestSellers : products;

  const sourceProducts = activeTab === 'new' ? displayNew : displayBest;
  const displayProducts = sourceProducts.slice(0, visibleCounts[activeTab]);
  const hasMore = visibleCounts[activeTab] < sourceProducts.length;

  const handleShowMore = () => {
    setVisibleCounts(prev => ({
      ...prev,
      [activeTab]: prev[activeTab] + 4
    }));
  };

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
          className="text-[#1e4b64] text-[11px] sm:text-[14px] font-bold flex items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap"
        >
          <span>Xem tất cả</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 sm:gap-x-4 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-12">
        {displayProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onClick={() => navigate(getProductPath(product))}
          />
        ))}
      </div>

      {hasMore && (
      <div className="flex justify-center mt-8">
        <button 
          type="button"
          onClick={handleShowMore}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-bold text-zinc-900 shadow-sm transition-colors hover:border-[#1e4b64] hover:text-[#1e4b64] active:scale-[0.98]"
        >
          Xem thêm
        </button>
      </div>
      )}
    </section>
  );
}


