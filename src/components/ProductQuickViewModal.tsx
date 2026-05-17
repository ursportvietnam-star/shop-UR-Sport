import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import { Product } from '../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProductVariantPicker } from './ProductVariantPicker';

interface ProductQuickViewModalProps {
  product: Product;
  isOpen: boolean;
  selectedColor: string;
  selectedSize: string | null;
  quickViewImage: string;
  onClose: () => void;
  onImageChange: (image: string) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
  onAddToCart: () => void;
  onViewDetails: () => void;
}

export function ProductQuickViewModal({
  product,
  isOpen,
  selectedColor,
  selectedSize,
  quickViewImage,
  onClose,
  onImageChange,
  onColorChange,
  onSizeChange,
  onAddToCart,
  onViewDetails,
}: ProductQuickViewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="relative grid max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[0.95fr_1.05fr]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-500 shadow-sm transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Dong xem nhanh"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="bg-zinc-50 p-4">
              <div className="aspect-square overflow-hidden rounded-2xl bg-white">
                <img
                  src={quickViewImage || product.images?.[0] || ''}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              {product.images?.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {product.images.slice(0, 5).map((image) => (
                    <button
                      key={image}
                      type="button"
                      onClick={() => onImageChange(image)}
                      className={cn(
                        "h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white",
                        quickViewImage === image ? "border-[#1e4b64]" : "border-transparent"
                      )}
                    >
                      <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col overflow-y-auto p-5 sm:p-7">
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1e4b64]">Xem nhanh</p>
                <h2 className="text-xl font-black leading-tight text-zinc-950 sm:text-2xl">{product.name}</h2>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-2xl font-black text-[#1e4b64]">
                    {(product.discountPrice || product.price).toLocaleString('vi-VN')}đ
                  </span>
                  {product.discountPrice && (
                    <span className="pb-1 text-sm font-bold text-zinc-300 line-through">
                      {product.price.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
              </div>

              <p className="mb-5 line-clamp-3 text-sm font-medium leading-6 text-zinc-500">{product.description}</p>

              <ProductVariantPicker
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorChange={onColorChange}
                onSizeChange={onSizeChange}
                colorStyle="chip"
                sizeStyle="large"
              />
              <div className="mt-auto grid gap-3 pt-6 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={onAddToCart}
                  className="h-12 rounded-xl bg-[#1e4b64] text-[12px] font-black uppercase tracking-widest text-white hover:bg-[#153446]"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Thêm giỏ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onViewDetails}
                  className="h-12 rounded-xl border-zinc-200 text-[12px] font-black uppercase tracking-widest text-zinc-700 hover:border-[#1e4b64] hover:text-[#1e4b64]"
                >
                  Xem chi tiết
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
