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
      {/* 
        This is the Base Card that stays in the flow to reserve space in the grid.
        It must look exactly like the non-hovered card but with visibility hidden on absolute expansion.
      */}
      <div className="flex flex-col h-full bg-white rounded-[24px] border border-transparent">
        <div className="relative aspect-[3/4] w-full bg-[#f8f8f8] rounded-t-[24px] overflow-hidden">
          <img src={product.images?.[0] || ''} className="w-full h-full object-cover" />
        </div>
        <div className="p-3 sm:p-4 flex flex-col flex-grow">
          <div className="h-4 mb-1.5" /> {/* Stars space */}
          <div className="min-h-[2.4rem] mb-2" /> {/* Title space */}
          <div className="h-5 mb-3" /> {/* Metadata space */}
          <div className="h-7 mb-3 mt-auto" /> {/* Price space */}
        </div>
      </div>

      {/* Interactive Overlay Card */}
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
              initial={{ opacity: 0.9 }} animate={{ opacity: 1 }} exit={{ opacity: 0.9 }}
              src={(isHovered && product.images?.[1]) ? product.images[1] : (product.images?.[0] || '')}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </AnimatePresence>

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {product.isNew && (
              <div className="bg-[#00a651] text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm uppercase tracking-wider">New</div>
            )}
            {discountPercent > 0 && (
              <div className="bg-[#ff3b30] text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">-{discountPercent}%</div>
            )}
          </div>

          <button className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-red-500 shadow-sm transition-all">
            <Heart className="h-4 w-4" />
          </button>
        </div>

        {/* Info Section */}
        <div className="flex flex-col p-3 sm:p-4 flex-grow">
          <div className="flex items-center gap-1 mb-1.5">
            <Star className="h-3 w-3 fill-[#ffa800] text-[#ffa800]" />
            <span className="text-[11px] font-bold text-zinc-500">{product.rating || '5.0'}</span>
          </div>

          <h3 className="text-[13px] sm:text-[14px] font-bold text-zinc-800 leading-tight mb-2 line-clamp-2 min-h-[2.4rem] group-hover:text-[#1e4b64] transition-colors">
            {product.name}
          </h3>

          <div className="flex flex-col gap-0.5 mb-3">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
              Code: <span className="text-zinc-900">{product.slug.substring(0, 8).toUpperCase()}</span>
            </p>
          </div>

          {/* Price Area and Quick Add */}
          <div className="flex items-end justify-between mt-auto mb-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[17px] sm:text-[18px] font-black text-black leading-tight whitespace-nowrap">
                {(product.discountPrice || product.price).toLocaleString('vi-VN')}đ
              </span>
              {product.discountPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-300 line-through font-bold whitespace-nowrap">
                    {product.price.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="text-[9px] font-black text-zinc-400 border border-zinc-200 rounded px-1">
                    -{discountPercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Compact Circle Add Button */}
            <button 
              onClick={handleQuickAdd}
              className="relative w-9 h-9 rounded-full bg-[#00a651] text-white flex items-center justify-center shadow-lg hover:bg-[#00c05d] transition-all active:scale-90 group/btn"
              title="Thêm vào giỏ"
            >
              <div className="relative">
                <ShoppingBag className="h-4.5 w-4.5" />
                {hasOptions && (
                  <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm border border-zinc-50">
                    <Settings className="h-2.5 w-2.5 text-zinc-900 animate-spin-slow" />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Expansion Section */}
          <div className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out",
            isHovered ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="pt-3 border-t border-zinc-100 space-y-4">
              {/* Colors */}
              <div className="flex flex-wrap gap-2">
                {(product.colorImages || product.colors)?.map((ci: any, idx: number) => (
                  <button 
                    key={idx} 
                    onClick={(e) => { e.stopPropagation(); setSelectedColor(typeof ci === 'string' ? ci : ci.name); }}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 p-0.5 transition-all hover:scale-110",
                      selectedColor === (typeof ci === 'string' ? ci : ci.name) ? "border-[#1e4b64]" : "border-zinc-100"
                    )}
                  >
                    {typeof ci === 'string' ? (
                      <div className="w-full h-full rounded-full" style={{ backgroundColor: ci.toLowerCase() }} />
                    ) : (
                      <img src={ci.image} alt={ci.name} className="w-full h-full rounded-full object-cover" />
                    )}
                  </button>
                ))}
              </div>

              {/* Sizes */}
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {(product.sizes || ['S', 'M', 'L', 'XL', 'XXL']).map((size) => (
                  <button
                    key={size}
                    onClick={(e) => { e.stopPropagation(); setSelectedSize(size); }}
                    className={cn(
                      "min-w-[28px] sm:min-w-[34px] h-7 sm:h-8 px-1.5 sm:px-2 flex items-center justify-center rounded-lg border text-[10px] sm:text-[11px] font-bold transition-all",
                      selectedSize === size 
                        ? "bg-[#1e4b64] border-[#1e4b64] text-white" 
                        : "bg-zinc-50 border-zinc-100 text-zinc-500 hover:border-zinc-300"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Summary and Buy Button */}
              <div className="pt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                   <div className="flex flex-col">
                     <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Màu sắc</span>
                     <span className="text-[11px] text-zinc-900 font-black italic">{selectedColor || '--'}</span>
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Kích thước</span>
                     <span className="text-[11px] text-zinc-900 font-black italic">{selectedSize || '--'}</span>
                   </div>
                </div>
                
                <button 
                  onClick={handleQuickAdd}
                  className={cn(
                    "w-full h-11 rounded-[14px] flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500",
                    "bg-[#00a651] text-white hover:bg-[#00c05d] shadow-[0_10px_25px_rgba(0,166,81,0.25)] hover:shadow-[0_15px_35px_rgba(0,166,81,0.4)] active:scale-[0.97]"
                  )}
                >
                  <div className="relative">
                    <ShoppingBag className="h-4.5 w-4.5" />
                    {hasOptions && <Settings className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-spin-slow text-white/90" />}
                  </div>
                  Thêm vào giỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

