import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { useComparison } from '../ComparisonContext';
import { toast } from 'sonner';
import { Star, ShoppingBag, Heart, Plus, Settings, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showAddToCartToast } from './AddToCartToast';
import { ProductQuickViewModal } from './ProductQuickViewModal';
import { ProductVariantPicker } from './ProductVariantPicker';
import { getProductPath } from '../lib/productUrls';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { isCompared, toggleCompare } = useComparison();
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || 'Default');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewImage, setQuickViewImage] = useState(product.images?.[0] || '');
  const liked = isWishlisted(product.id);
  const compared = isCompared(product.id);

  const addSelectedToCart = (closeQuickView = false) => {
    if (!selectedSize && product.sizes && product.sizes.length > 0) {
      toast.error('Vui lòng chọn size trước khi thêm vào giỏ hàng', {
        position: 'top-center'
      });
      return;
    }

    addToCart(product, selectedColor, selectedSize || 'Free Size', 1);
    showAddToCartToast({
      productName: product.name,
      image: product.images?.[0],
      meta: `Màu: ${selectedColor} / Size: ${selectedSize || 'Free Size'}`,
      onCheckout: () => navigate('/checkout'),
    });

    if (closeQuickView) setIsQuickViewOpen(false);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewImage(product.images?.[0] || '');
    setIsQuickViewOpen(true);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = toggleWishlist(product.id);
    toast.success(saved ? 'Đã lưu vào yêu thích' : 'Đã bỏ khỏi yêu thích', {
      position: 'top-center'
    });
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = toggleCompare(product);
    toast.success(added ? 'Đã thêm vào bảng so sánh' : 'Đã bỏ khỏi bảng so sánh', {
      position: 'top-center'
    });
  };

  const discountPercent = product.discountPrice 
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100) 
    : 0;

  const hasOptions = (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0);
  const productUrl = getProductPath(product);

  return (
    <div 
      className={cn(
        "group relative z-0 h-full w-full hover:z-30",
        isHovered && "z-30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className={cn(
        "flex h-full flex-col bg-white rounded-2xl transition-all duration-300 ease-out border border-zinc-100 overflow-hidden",
        isHovered 
          ? "shadow-[0_18px_36px_rgba(0,0,0,0.10)] -translate-y-1" 
          : "shadow-none"
      )}>
        
        {/* Image Section */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl bg-[#f8f8f8]">
          <AnimatePresence mode="wait">
            <motion.img
              key={product.images?.[0]}
              initial={{ opacity: 0.9 }} animate={{ opacity: 1 }} exit={{ opacity: 0.9 }}
              src={product.images?.[0] || ''}
              alt={product.name}
              loading="lazy"
              className="h-full w-full scale-[1.06] object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.09]"
            />
          </AnimatePresence>
          <Link
            to={productUrl}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-[1]"
            aria-label={`Xem chi tiết ${product.name}`}
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10 sm:top-2.5 sm:left-2.5">
            {product.isNew && (
              <div className="bg-[#00a651] text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm uppercase tracking-wider">Mới</div>
            )}
            {discountPercent > 0 && (
              <div className="bg-[#ff3b30] text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">-{discountPercent}%</div>
            )}
          </div>

          <button
            type="button"
            onClick={handleWishlistClick}
            className={cn(
              "absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-400 shadow-sm backdrop-blur-md transition-all hover:text-red-500 active:scale-90 sm:top-2.5 sm:right-2.5",
              liked && "bg-red-50 text-red-500"
            )}
            aria-label={liked ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewImage(product.images?.[0] || '');
              setIsQuickViewOpen(true);
            }}
            className="absolute right-2 top-12 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-500 opacity-100 shadow-sm backdrop-blur-md transition-all hover:bg-[#1e4b64] hover:text-white active:scale-90 sm:right-2.5 sm:top-12 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Xem nhanh sản phẩm"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleCompareClick}
            className={cn(
              "absolute right-2 top-[5.5rem] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-500 shadow-sm backdrop-blur-md transition-all hover:bg-[#1e4b64] hover:text-white active:scale-90 sm:right-2.5 sm:top-[5.5rem]",
              compared && "bg-[#1e4b64] text-white"
            )}
            aria-label="So sánh sản phẩm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Info Section */}
        <div className="flex flex-col p-3 sm:p-4 flex-grow">
          <div className="flex items-center gap-1 mb-1.5">
            <Star className="h-3 w-3 fill-[#ffa800] text-[#ffa800]" />
            <span className="text-[11px] font-bold text-zinc-500">{product.rating || '5.0'}</span>
          </div>

          <h3 className="mb-2 h-[2.7em] overflow-hidden text-[12px] font-bold leading-[1.35] sm:text-[14px]">
            <Link
              to={productUrl}
              onClick={(e) => e.stopPropagation()}
              className="line-clamp-2 text-zinc-800 transition-colors group-hover:text-[#1e4b64]"
            >
              {product.name}
            </Link>
          </h3>

          {/* Price Area and Quick Add */}
          <div className="flex items-end justify-between mt-auto mb-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] sm:text-[18px] font-black text-black leading-tight whitespace-nowrap">
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
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1e4b64] text-white flex items-center justify-center shadow-lg hover:bg-[#153a4d] transition-all active:scale-90 group/btn"
              title="Thêm vào giỏ"
            >
              <div className="relative">
                <ShoppingBag className="h-4.5 w-4.5" />
                {hasOptions && (
                  <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm border border-zinc-50">
                    {selectedSize ? (
                      <Plus className="h-2.5 w-2.5 text-zinc-900" />
                    ) : (
                      <Settings className="h-2.5 w-2.5 text-zinc-900 animate-spin-slow" />
                    )}
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Expansion Section */}
          <div className={cn(
            "pointer-events-none absolute left-0 right-0 top-full z-20 max-h-0 translate-y-2 overflow-hidden rounded-b-2xl border-x border-b border-zinc-100 bg-white px-3 pb-4 opacity-0 shadow-[0_22px_40px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:max-h-80 group-hover:translate-y-0 group-hover:opacity-100 sm:px-4",
            isHovered && "pointer-events-auto max-h-80 translate-y-0 opacity-100"
          )}>
            <div className="border-t border-zinc-100 pt-3">
              <ProductVariantPicker
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorChange={setSelectedColor}
                onSizeChange={setSelectedSize}
                colorStyle="swatch"
                sizeStyle="compact"
                showSummary
              />
            </div>
          </div>
        </div>
      </div>
      <ProductQuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        quickViewImage={quickViewImage}
        onClose={() => setIsQuickViewOpen(false)}
        onImageChange={setQuickViewImage}
        onColorChange={setSelectedColor}
        onSizeChange={setSelectedSize}
        onAddToCart={() => addSelectedToCart(true)}
        onViewDetails={() => {
          setIsQuickViewOpen(false);
          onClick();
        }}
      />
    </div>
  );
};

