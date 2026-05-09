import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useCart } from '../CartContext';
import { toast } from 'sonner';
import { Star, ShoppingCart, ShoppingBag, Heart, Plus, RefreshCcw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { addToCart } = useCart();
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || 'Default');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedSize && product.sizes && product.sizes.length > 0) {
      toast.error('Vui lòng chọn size trước khi thêm vào giỏ hàng', {
        position: 'top-center'
      });
      return;
    }
    
    addToCart(product, selectedColor, selectedSize || 'Free Size', 1);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`, {
      description: `Màu: ${selectedColor} / Size: ${selectedSize || 'Free Size'}`,
      position: 'top-center',
      className: 'font-sans font-medium'
    });
  };

  const discountPercent = product.discountPrice 
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100) 
    : 0;

  const hasOptions = (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0);

  return (
    <div 
      className="group relative w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Base Card for Grid Stability */}
      <div className="flex flex-col h-full bg-white rounded-[20px] border border-transparent">
        <div className="relative aspect-square w-full bg-[#f8f8f8] rounded-[20px] overflow-hidden">
          <img src={product.images?.[0] || ''} className="w-full h-full object-cover" />
        </div>
        <div className="p-3 flex flex-col flex-grow">
          <div className="h-4 mb-2" />
          <div className="min-h-[2.5rem] mb-2" />
          <div className="h-16 mt-auto" />
        </div>
      </div>

      {/* Interactive Overlay Card */}
      <div className={cn(
        "absolute top-0 left-0 right-0 bg-white rounded-[20px] transition-all duration-300 ease-out border border-transparent overflow-hidden",
        isHovered 
          ? "shadow-[0_20px_40px_rgba(0,0,0,0.1)] z-50 border-zinc-100 -translate-y-1 h-auto" 
          : "h-full z-10"
      )}>
        
        {/* Image Section */}
        <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-[#f8f8f8]">
          <AnimatePresence mode="wait">
            <motion.img
              key={isHovered && product.images?.[1] ? product.images[1] : product.images?.[0]}
              initial={{ opacity: 0.9 }} animate={{ opacity: 1 }} exit={{ opacity: 0.9 }}
              src={(isHovered && product.images?.[1]) ? product.images[1] : (product.images?.[0] || '')}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </AnimatePresence>

          {/* Badges */}
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 bg-[#ffa800] text-white px-3 py-1 rounded-full text-[11px] font-black shadow-sm">
              -{discountPercent}%
            </div>
          )}

          {/* Wishlist */}
          <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-red-500 shadow-sm transition-all">
            <Heart className="h-4.5 w-4.5" />
          </button>

          {/* Page Indicators - Optional visual touch */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
             {[...Array(5)].map((_, i) => (
               <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i === 0 ? "bg-[#00a651] w-3" : "bg-white/60")} />
             ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="flex flex-col p-3 flex-grow">
          <h3 className="text-[14px] font-bold text-zinc-800 leading-snug mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-[#1e4b64] transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center gap-1.5 mb-2">
            <Star className="h-3.5 w-3.5 fill-[#ffa800] text-[#ffa800]" />
            <span className="text-[12px] font-bold text-zinc-500">{product.rating || '4.5'}</span>
            <span className="text-[12px] font-medium text-zinc-400">({product.reviewsCount || 0})</span>
          </div>

          <div className="text-[12px] font-bold text-[#00a651] mb-2">In stock</div>

          <div className="flex items-end justify-between mt-auto">
            <div className="flex flex-col">
              <span className="text-[18px] font-black text-black leading-none mb-1">
                {(product.discountPrice || product.price).toLocaleString('vi-VN')}đ
              </span>
              {product.discountPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-zinc-300 line-through font-bold">
                    {product.price.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="text-[9px] font-black text-zinc-400 border border-zinc-200 rounded px-1">
                    -{discountPercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Quick Add Circle Button */}
            <button 
              onClick={handleQuickAdd}
              className="relative w-11 h-11 rounded-full bg-[#00a651] text-white flex items-center justify-center shadow-lg hover:bg-[#00c05d] transition-all active:scale-95 group/btn"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5" />
                {hasOptions && (
                  <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm">
                    <Settings className="h-3 w-3 text-zinc-900 animate-spin-slow" />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Expansion Section - Hover Only */}
          <div className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out",
            isHovered ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="pt-4 border-t border-zinc-100 space-y-4">
              {/* Colors */}
              <div className="flex flex-wrap gap-2">
                {product.colorImages ? (
                  product.colorImages.map((ci, idx) => (
                    <button key={idx} onClick={(e) => { e.stopPropagation(); setSelectedColor(ci.name); }}
                      className={cn("w-6 h-6 rounded-full border-2 p-0.5 transition-all", selectedColor === ci.name ? "border-[#1e4b64]" : "border-zinc-100")}
                    >
                      <img src={ci.image} alt={ci.name} className="w-full h-full rounded-full object-cover" />
                    </button>
                  ))
                ) : (
                  product.colors?.map((color, idx) => (
                    <button key={idx} onClick={(e) => { e.stopPropagation(); setSelectedColor(color); }}
                      className={cn("w-6 h-6 rounded-full border-2 p-0.5 transition-all", selectedColor === color ? "border-[#1e4b64]" : "border-zinc-100")}
                    >
                      <div className="w-full h-full rounded-full" style={{ backgroundColor: color.toLowerCase() }} />
                    </button>
                  ))
                )}
              </div>

              {/* Sizes */}
              <div className="flex flex-wrap gap-1.5">
                {(product.sizes || ['S', 'M', 'L', 'XL', 'XXL']).map((size) => (
                  <button key={size} onClick={(e) => { e.stopPropagation(); setSelectedSize(size); }}
                    className={cn("min-w-[34px] h-8 px-2 flex items-center justify-center rounded-lg border text-[11px] font-bold transition-all",
                      selectedSize === size ? "bg-[#1e4b64] border-[#1e4b64] text-white" : "bg-zinc-50 border-zinc-100 text-zinc-500"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-tight text-zinc-400">
                <span>Màu: <span className="text-zinc-900">{selectedColor || '--'}</span></span>
                <span>Size: <span className="text-zinc-900">{selectedSize || '--'}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

