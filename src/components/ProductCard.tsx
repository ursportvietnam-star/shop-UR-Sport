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
      <Card className="overflow-hidden border-none ring-0 shadow-none bg-white rounded-2xl h-full transition-all duration-500 group-hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] relative">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="relative aspect-[4/5] overflow-hidden bg-zinc-50 rounded-2xl">
            {product.images && product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full bg-zinc-100" />
            )}
            
            {/* Minimalist Overlay on Hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
            
            {/* Floating Actions - Streamlined */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-500">
              <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-white shadow-xl hover:bg-zinc-50 hover:scale-110 active:scale-95 transition-all">
                <Heart className="h-4 w-4 text-zinc-600" />
              </Button>
            </div>
          </div>

          <div className="p-4 pt-5 flex flex-col flex-grow">
            <h3 className="text-[15px] font-medium text-zinc-900 leading-tight mb-3 line-clamp-2 transition-colors group-hover:text-[#0082c8]">
              {product.name}
            </h3>

            <div className="flex items-center gap-0.5 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  className={cn(
                    "h-3.5 w-3.5",
                    star <= (product.rating || 0) 
                      ? "fill-[#fbbf24] text-[#fbbf24]" 
                      : "text-zinc-200"
                  )} 
                />
              ))}
            </div>
            
            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[19px] font-bold text-[#ff4d4f]">
                  {(product.discountPrice || product.price).toLocaleString('vi-VN')}
                  <span className="text-[14px] ml-0.5 underline">đ</span>
                </span>
                
                {product.discountPrice && (
                  <>
                    <span className="text-[13px] text-zinc-400 line-through font-medium">
                      {product.price.toLocaleString('vi-VN')}
                      <span className="text-[11px] ml-0.5 underline">đ</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded">
                      -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                    </span>
                  </>
                )}
              </div>
              
              <button 
                onClick={handleAddToCart}
                className="h-10 w-10 rounded-full bg-[#0082c8] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 hover:scale-110 active:scale-95 transition-all"
              >
                <div className="flex items-center">
                  <ShoppingBag className="h-5 w-5" />
                  <Plus className="h-2.5 w-2.5 -ml-0.5 mt-2" />
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
