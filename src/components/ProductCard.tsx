import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useCart } from '../CartContext';
import { toast } from 'sonner';
import { Star, ShoppingCart, Heart, Plus, RefreshCcw, Settings } from 'lucide-react';
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
      {/* 
        This is the Base Card that stays in the flow to reserve space in the grid.
        It must look exactly like the non-hovered card but with visibility hidden on absolute expansion.
      */}
      <div className="flex flex-col h-full bg-white rounded-[24px] border border-transparent">
        <div className="relative aspect-[3/4] w-full bg-[#f8f8f8] rounded-t-[24px] overflow-hidden">
          <img src={product.images?.[0] || ''} className="w-full h-full object-cover" />
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <div className="h-4 mb-1.5" /> {/* Stars space */}
          <div className="min-h-[2.5rem] mb-2" /> {/* Title space */}
          <div className="h-10 mb-3" /> {/* Metadata space */}
          <div className="h-7 mb-3 mt-auto" /> {/* Price space */}
        </div>
      </div>

      {/* 
        The Hover Card that actually performs the animation and overlaps.
      */}
      <div className={cn(
        "absolute top-0 left-0 right-0 bg-white rounded-[24px] transition-all duration-300 ease-out border border-transparent overflow-hidden",
        isHovered 
          ? "shadow-[0_30px_60px_rgba(0,0,0,0.15)] z-50 border-zinc-100 -translate-y-1 h-auto" 
          : "h-full z-10"
      )}>
        
        {/* Image Section */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-[24px] bg-[#f8f8f8]">
          <AnimatePresence mode="wait">
            <motion.img
              key={isHovered && product.images?.[1] ? product.images[1] : product.images?.[0]}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.8 }}
              transition={{ duration: 0.3 }}
              src={(isHovered && product.images?.[1]) ? product.images[1] : (product.images?.[0] || '')}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.isNew && (
              <div className="bg-[#00a651] text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm uppercase tracking-wider">
                New
              </div>
            )}
            {product.isBestSeller && (
              <div className="bg-[#ffa800] text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm uppercase tracking-wider">
                Hot
              </div>
            )}
            {discountPercent > 0 && (
              <div className="bg-[#ff3b30] text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                -{discountPercent}%
              </div>
            )}
          </div>

          {/* Floating Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
            <button className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-white shadow-sm transition-all" title="Yêu thích">
              <Heart className="h-4.5 w-4.5" />
            </button>
            <button className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-[#1e4b64] hover:bg-white shadow-sm transition-all" title="So sánh">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Add to Cart Floating Button */}
          <button 
            onClick={handleQuickAdd}
            className={cn(
              "absolute bottom-4 right-4 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 z-20 overflow-hidden",
              "bg-[#00a651] text-white hover:bg-[#008c44] hover:scale-105 active:scale-95 px-3.5 gap-2",
              "translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
            )}
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            {hasOptions && <Settings className="h-3.5 w-3.5 animate-spin-slow" />}
          </button>
        </div>

        {/* Info Section */}
        <div className="flex flex-col p-4 flex-grow">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("h-3 w-3", i < Math.floor(product.rating || 0) ? "fill-[#ffa800] text-[#ffa800]" : "text-zinc-200")} />
              ))}
            </div>
            <span className="text-[10px] font-medium text-zinc-400">({product.reviewsCount || 0})</span>
          </div>

          <h3 className="text-[14px] font-bold text-zinc-800 leading-tight mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-[#1e4b64] transition-colors">
            {product.name}
          </h3>

          <div className="flex flex-col gap-1 mb-3">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Code: <span className="text-zinc-900">{product.slug.substring(0, 8).toUpperCase()}</span>
            </p>
            <p className="text-[10px] font-bold text-[#00a651] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a651]" /> In stock
            </p>
          </div>

          {/* Price Area */}
          <div className="flex items-center gap-2 mb-3 mt-auto">
            <span className="text-[17px] font-black text-black">
              {(product.discountPrice || product.price).toLocaleString('vi-VN')}đ
            </span>
            {product.discountPrice && (
              <span className="text-[12px] text-zinc-300 line-through font-bold">
                {product.price.toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>

          {/* Expansion Section - Hover Only */}
          <div className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out",
            isHovered ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className={cn(
              "pt-3 border-t border-zinc-100 space-y-4 transform transition-transform duration-500",
              isHovered ? "translate-y-0" : "translate-y-4"
            )}>
              {/* Colors */}
              <div className="flex flex-wrap gap-2">
                {product.colorImages ? (
                  product.colorImages.map((ci, idx) => (
                    <button 
                      key={idx} 
                      onClick={(e) => { e.stopPropagation(); setSelectedColor(ci.name); }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 p-0.5 transition-all hover:scale-110",
                        selectedColor === ci.name ? "border-[#1e4b64]" : "border-zinc-100"
                      )}
                    >
                      <img src={ci.image} alt={ci.name} className="w-full h-full rounded-full object-cover" />
                    </button>
                  ))
                ) : (
                  product.colors?.map((color, idx) => (
                    <button 
                      key={idx} 
                      onClick={(e) => { e.stopPropagation(); setSelectedColor(color); }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 p-0.5 transition-all hover:scale-110",
                        selectedColor === color ? "border-[#1e4b64]" : "border-zinc-100"
                      )}
                    >
                      <div className="w-full h-full rounded-full" style={{ backgroundColor: color.toLowerCase() }} />
                    </button>
                  ))
                )}
              </div>

              {/* Sizes */}
              <div className="flex flex-wrap gap-1.5">
                {(product.sizes || ['S', 'M', 'L', 'XL', 'XXL']).map((size) => (
                  <button
                    key={size}
                    onClick={(e) => { e.stopPropagation(); setSelectedSize(size); }}
                    className={cn(
                      "min-w-[34px] h-8 px-2 flex items-center justify-center rounded-lg border text-[11px] font-bold transition-all",
                      selectedSize === size 
                        ? "bg-[#1e4b64] border-[#1e4b64] text-white shadow-md shadow-blue-900/20" 
                        : "bg-zinc-50 border-zinc-100 text-zinc-500 hover:border-zinc-300"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Selection Summary */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                  Màu: <span className="text-zinc-900">{selectedColor}</span>
                  <span className="mx-2 text-zinc-200">|</span>
                  Size: <span className="text-zinc-900 font-black">{selectedSize || '--'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

