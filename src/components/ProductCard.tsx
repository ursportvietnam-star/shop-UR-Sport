import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { addToCart } = useCart();
  const [showQuickAdd, setShowQuickAdd] = React.useState(false);

  const handleQuickAdd = (e: React.MouseEvent, size: string) => {
    e.stopPropagation();
    addToCart(product, product.colors[0] || 'Default', size, 1);
    toast.success(`Đã thêm ${product.name} (Size ${size}) vào giỏ hàng`);
  };

  // Extract a few sizes to show in quick add, or default ones
  const displaySizes = product.sizes && product.sizes.length > 0 
    ? product.sizes.slice(0, 5) 
    : ['S', 'M', 'L', 'XL', '2XL'];

  return (
    <motion.div
      transition={{ duration: 0.2 }}
      className="group cursor-pointer flex flex-col w-full"
      onClick={onClick}
      onMouseEnter={() => setShowQuickAdd(true)}
      onMouseLeave={() => setShowQuickAdd(false)}
      onTouchStart={() => setShowQuickAdd(true)} // Basic mobile tap support
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f0f0f0] rounded-xl sm:rounded-2xl">
        {product.images && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-full w-full bg-zinc-200" />
        )}
        
        {/* Top Left: Badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col items-start gap-1 sm:gap-1.5 z-10">
          {product.discountPrice && (
            <div className="bg-[#ffb800] text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold shadow-sm">
              -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
            </div>
          )}
          {product.isNew && (
            <div className="bg-[#00a651] text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold shadow-sm">
              New
            </div>
          )}
        </div>

        {/* Bottom Banner: VOUCHER */}
        {product.discountPrice && (
          <div className="absolute bottom-0 left-0 right-0 h-8 sm:h-10 bg-[#2953a6] flex items-center px-2 sm:px-3 z-10 justify-between transition-transform duration-300">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-3 h-4 sm:w-4 sm:h-5 bg-yellow-400 rounded-sm flex items-center justify-center">
                <span className="text-[#2953a6] text-[8px] sm:text-[10px] font-black">%</span>
              </div>
              <span className="text-white text-[10px] sm:text-[11px] font-bold tracking-wide">
                GIẢM {Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
              </span>
            </div>
            <div className="bg-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full">
              <span className="text-[#2953a6] text-[10px] sm:text-[12px] font-bold whitespace-nowrap">GIẢM {Math.round((product.price - product.discountPrice)/1000)}K</span>
            </div>
          </div>
        )}

        {/* Quick Add Overlay (Desktop Hover / Mobile Tap) */}
        <AnimatePresence>
          {showQuickAdd && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-2 sm:inset-x-3 bottom-10 sm:bottom-12 bg-white/95 backdrop-blur-md rounded-xl p-2 sm:p-3 shadow-lg z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-2">
                <span className="text-[11px] sm:text-xs font-semibold text-zinc-800">Thêm nhanh vào giỏ hàng +</span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                {displaySizes.map((size) => (
                  <button
                    key={size}
                    onClick={(e) => handleQuickAdd(e, size)}
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-zinc-200 rounded text-[11px] sm:text-sm font-medium hover:bg-black hover:text-white hover:border-black transition-colors"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Section */}
      <div className="pt-3 px-1 flex flex-col flex-grow">
        {/* Color Swatches */}
        <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
          {product.colorImages ? (
            product.colorImages.slice(0, 3).map((ci, idx) => (
              <div key={idx} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-zinc-200 p-0.5 cursor-pointer hover:border-black transition-colors">
                <img src={ci.image} alt={ci.name} className="w-full h-full rounded-full object-cover" />
              </div>
            ))
          ) : (
            product.colors && product.colors.slice(0, 3).map((color, idx) => (
              <div key={idx} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-zinc-200 p-0.5 cursor-pointer hover:border-black transition-colors">
                {/* Try to interpret color or just use a generic background if we can't */}
                <div className="w-full h-full rounded-full bg-zinc-800" style={{ backgroundColor: color.toLowerCase() }} />
              </div>
            ))
          )}
        </div>

        <h3 className="text-[13px] sm:text-[14px] font-medium text-zinc-800 leading-snug mb-1.5 line-clamp-2 transition-colors group-hover:text-[#1e4b64]">
          {product.name}
        </h3>

        <div className="mt-auto flex items-end gap-2 sm:gap-3 flex-wrap">
          <span className="text-[14px] sm:text-[16px] font-bold text-black whitespace-nowrap">
            {(product.discountPrice || product.price).toLocaleString('vi-VN')}
            <span className="text-[11px] sm:text-[12px] ml-0.5 font-semibold">đ</span>
          </span>
          
          {product.discountPrice && (
            <span className="text-[12px] sm:text-[13px] text-zinc-400 line-through font-medium whitespace-nowrap">
              {product.price.toLocaleString('vi-VN')}
              <span className="text-[9px] sm:text-[10px] ml-0.5">đ</span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

