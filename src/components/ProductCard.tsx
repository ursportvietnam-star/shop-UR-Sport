import React from 'react';
import { motion } from 'motion/react';
import { Star, Heart, Plus, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, product.colors[0], product.sizes[0], 1);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  return (
    <motion.div
      transition={{ duration: 0.2 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <Card className="overflow-hidden border border-zinc-50 ring-0 shadow-none bg-white rounded-3xl h-full transition-all duration-700 group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] group-hover:border-[#0082c8]/10 relative">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden bg-zinc-50 rounded-t-3xl">
            {product.images && product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full bg-zinc-100" />
            )}
            
            {/* Minimalist Overlay on Hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
            
            {/* Floating Actions - Streamlined */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.discountPrice && (
                <div className="bg-[#0082c8] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                  -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                </div>
              )}
            </div>

            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-500">
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-xl hover:bg-[#0082c8] hover:text-white transition-all">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-3 sm:p-5 flex flex-col flex-grow">
            <h3 className="text-[13px] sm:text-[16px] font-bold text-zinc-900 leading-tight mb-2 line-clamp-2 transition-colors group-hover:text-[#0082c8]">
              {product.name}
            </h3>

            <div className="flex items-center gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  className={cn(
                    "h-3 w-3 sm:h-3.5 sm:w-3.5",
                    star <= (product.rating || 0) 
                      ? "fill-[#fbbf24] text-[#fbbf24]" 
                      : "text-zinc-200"
                  )} 
                />
              ))}
            </div>
            
            <div className="mt-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-hidden">
                <span className="text-[15px] sm:text-[20px] font-black text-[#0082c8] whitespace-nowrap">
                  {(product.discountPrice || product.price).toLocaleString('vi-VN')}
                  <span className="text-[11px] sm:text-[14px] ml-0.5">₫</span>
                </span>
                
                {product.discountPrice && (
                  <span className="text-[10px] sm:text-[13px] text-zinc-400 line-through font-medium whitespace-nowrap">
                    {product.price.toLocaleString('vi-VN')}
                    <span className="text-[9px] sm:text-[11px] ml-0.5">₫</span>
                  </span>
                )}
              </div>
              
              <button 
                onClick={handleAddToCart}
                className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-zinc-900 flex items-center justify-center text-white shadow-lg hover:bg-[#0082c8] hover:scale-110 active:scale-95 transition-all shrink-0"
              >
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
