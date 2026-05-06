import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Star, Heart, Plus, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = React.useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, product.colors[0], product.sizes[0], 1);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <Card className="overflow-hidden border-none shadow-none bg-white rounded-2xl h-full transition-all duration-300 group-hover:shadow-xl relative">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="relative aspect-square overflow-hidden bg-zinc-50 rounded-2xl">
            {product.images && product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full bg-zinc-100" />
            )}
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
              {product.isBestSeller && (
                <Badge className="bg-[#7c3aed] hover:bg-[#7c3aed] text-white font-bold border-none rounded-full px-4 py-1 text-[11px] h-6 shadow-sm">
                  Phổ biến nhất
                </Badge>
              )}
              {product.discountPrice && (
                <Badge className="bg-[#f97316] hover:bg-[#f97316] text-white font-bold border-none rounded-full px-4 py-1 text-[11px] h-6 shadow-sm">
                  -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                </Badge>
              )}
              <Badge className="bg-black hover:bg-black text-white font-bold border-none rounded-full px-2 py-1 text-[11px] h-6 w-14 flex items-center justify-center shadow-sm">
                <span className="leading-none flex items-center gap-1">
                  <span className="text-[10px] scale-75 origin-left">BLACK</span>
                  <span className="text-[10px] scale-75 origin-left">FRIDAY</span>
                </span>
              </Badge>
            </div>

            {/* Floating Actions on Hover */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
              <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-white shadow-md hover:bg-zinc-100">
                <Heart className="h-4 w-4 text-zinc-600" />
              </Button>
              <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-white shadow-md hover:bg-zinc-100">
                <ShoppingBag className="h-4 w-4 text-zinc-600" />
              </Button>
            </div>

            {/* Quick View Hover State - matching screenshot attributes */}
            <AnimatePresence>
              {isHovered && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-x-0 bottom-0 p-4 pt-20 bg-gradient-to-t from-white to-transparent pointer-events-none"
                >
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl space-y-3 pointer-events-auto">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mb-1.5 italic">Màu sắc</p>
                      <div className="flex gap-2">
                        <div className="h-4 w-4 rounded-full bg-[#0082c8] ring-2 ring-offset-2 ring-[#0082c8]" />
                        <div className="h-4 w-4 rounded-full bg-zinc-800" />
                        <div className="h-4 w-4 rounded-full bg-blue-300" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mb-1.5 italic">Kích cỡ</p>
                      <div className="flex gap-1.5">
                        {['M', 'L', 'XXL', 'XL', 'S'].map(size => (
                          <div key={size} className={cn(
                            "h-6 min-w-6 flex items-center justify-center rounded border text-[10px] font-bold",
                            size === 'M' ? "border-black bg-black text-white" : "border-zinc-200 text-zinc-400"
                          )}>
                            {size}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 pt-5 flex flex-col flex-grow">
            <h3 className="text-[15px] font-medium text-zinc-900 leading-tight mb-1 line-clamp-2">
              {product.name}
            </h3>
            
            <p className="text-[11px] font-medium text-zinc-400 tracking-tight mb-2">
              CODE: {product.id.split('-')[0].toUpperCase()}
            </p>

            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex items-center">
                <Star 
                  className={cn(
                    "h-3 w-3",
                    (product.reviewsCount || 0) > 0 ? "fill-[#fbbf24] text-[#fbbf24]" : "text-zinc-300"
                  )} 
                />
                <span className="text-xs font-bold ml-1">{product.rating || 0}</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">(Đánh giá: {product.reviewsCount || 0})</span>
              <div className="h-3 w-3 rounded-full bg-[#0082c8]/20 flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-[#0082c8]" />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold text-[#0082c8]">Còn hàng</span>
            </div>
            
            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[19px] font-bold text-black">
                  {(product.discountPrice || product.price).toLocaleString('vi-VN')}₫
                </span>
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
