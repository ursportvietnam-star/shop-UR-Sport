import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { useComparison } from '../ComparisonContext';
import { toast } from 'sonner';
import { Star, ShoppingBag, Heart, Plus, Settings, Eye, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showAddToCartToast } from './AddToCartToast';
import { ProductQuickViewModal } from './ProductQuickViewModal';
import { ProductVariantPicker } from './ProductVariantPicker';
import { getProductPath } from '../lib/productUrls';
import { usePromotionBadges } from '../PromotionContext';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const PROMO_FRAME_IMAGE_PATTERNS = [
  '22-1779891967421-99983947',
  'qs-adi01'
];

const hasPromoFrame = (image: string) => {
  const normalized = image.toLowerCase();
  return PROMO_FRAME_IMAGE_PATTERNS.some(pattern => normalized.includes(pattern));
};

const getPrimaryProductImage = (images?: string[]) => {
  const validImages = images?.filter(image => image?.trim()) || [];
  return validImages.find(image => !hasPromoFrame(image)) || validImages[0] || null;
};

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onClick }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { isCompared, toggleCompare } = useComparison();
  const { isCheapChampionProduct, isActiveFlashSaleProduct, getCheapChampionPrice } = usePromotionBadges();
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || 'Default');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const primaryImage = getPrimaryProductImage(product.images);
  const [quickViewImage, setQuickViewImage] = useState(primaryImage || '');
  const liked = isWishlisted(product.id);
  const compared = isCompared(product.id);
  const showCheapChampionBadge = isCheapChampionProduct(product.id);
  const showFlashSaleBadge = isActiveFlashSaleProduct(product.id);
  const cheapChampionPrice = getCheapChampionPrice(product);
  const currentBasePrice = product.discountPrice || product.price;
  const displayPrice = cheapChampionPrice ?? currentBasePrice;
  const compareAtPrice = cheapChampionPrice !== null ? currentBasePrice : product.discountPrice ? product.price : null;
  const effectiveProduct = cheapChampionPrice !== null ? { ...product, discountPrice: cheapChampionPrice } : product;
  const selectedVariant = product.variants?.find(variant => variant.color === selectedColor && variant.size === selectedSize);
  const selectedVariantOutOfStock = Boolean(product.variants?.length && selectedSize && (!selectedVariant || Number(selectedVariant.stock || 0) <= 0));

  const addSelectedToCart = (closeQuickView = false) => {
    if (!selectedSize && product.sizes && product.sizes.length > 0) {
      toast.error('Vui lòng chọn size trước khi thêm vào giỏ hàng', {
        position: 'top-center'
      });
      return;
    }

    if (selectedVariantOutOfStock) {
      toast.error('Phân loại này đang hết hàng, vui lòng chọn màu hoặc size khác', {
        position: 'top-center'
      });
      return;
    }

    addToCart(effectiveProduct, selectedColor, selectedSize || 'Free Size', 1);
    showAddToCartToast({
      productName: product.name,
      image: primaryImage || undefined,
      meta: `Màu: ${selectedColor} / Size: ${selectedSize || 'Free Size'}`,
      onCheckout: () => navigate('/checkout'),
    });

    if (closeQuickView) setIsQuickViewOpen(false);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewImage(primaryImage || '');
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
    const added = toggleCompare(effectiveProduct);
    toast.success(added ? 'Đã thêm vào bảng so sánh' : 'Đã bỏ khỏi bảng so sánh', {
      position: 'top-center'
    });
  };

  const discountPercent = displayPrice < product.price
    ? Math.round(((product.price - displayPrice) / product.price) * 100)
    : 0;

  const hasOptions = (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0);
  const productUrl = getProductPath(product);

  return (
    <div 
      className={cn(
        "product-card group relative z-0 h-full w-full min-w-0 hover:z-30",
        isHovered && "z-30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className={cn(
        "flex h-full min-w-0 flex-col bg-white rounded-2xl transition-all duration-300 ease-out border border-zinc-100 overflow-hidden",
        isHovered 
          ? "shadow-[0_18px_36px_rgba(0,0,0,0.10)] -translate-y-1" 
          : "shadow-none"
      )}>
        
        {/* Image Section */}
        <div className="product-card-media relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl bg-[#f8f8f8]">
          <AnimatePresence mode="wait">
            <motion.img
              key={primaryImage || product.id}
              initial={{ opacity: 0.9 }} animate={{ opacity: 1 }} exit={{ opacity: 0.9 }}
              src={primaryImage || '/images/og-ursport.jpg'}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className={cn(
                "h-full w-full object-cover object-center transition-transform duration-700 ease-out",
                primaryImage && hasPromoFrame(primaryImage)
                  ? "origin-top scale-[1.24] object-top group-hover:scale-[1.28]"
                  : "scale-[1.06] group-hover:scale-[1.09]"
              )}
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
              setQuickViewImage(primaryImage || '');
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
        <div className="flex min-w-0 flex-grow flex-col p-3 sm:p-4">
          <div className="flex items-center gap-1 mb-1.5">
            <Star className="h-3 w-3 fill-[#ffa800] text-[#ffa800]" />
            <span className="text-[11px] font-bold text-zinc-500">{product.rating || '5.0'}</span>
          </div>

          <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-zinc-400 line-clamp-1">
            {product.category}
          </p>

          <h3 className="mb-2 h-[2.7em] overflow-hidden text-[12px] font-bold leading-[1.35] sm:text-[14px]">
            <Link
              to={productUrl}
              onClick={(e) => e.stopPropagation()}
              className="line-clamp-2 text-zinc-800 transition-colors group-hover:text-[#1e4b64]"
            >
              {product.name}
            </Link>
          </h3>

          {(showCheapChampionBadge || showFlashSaleBadge) && (
            <div className="mb-2 flex min-h-[20px] flex-wrap items-center gap-1.5">
              {showCheapChampionBadge && (
                <span className="inline-flex h-5 items-center rounded border border-[#ff4d2d] bg-white px-1.5 text-[10px] font-semibold leading-none text-[#ff4d2d]">
                  Rẻ Vô Địch
                </span>
              )}
              {showFlashSaleBadge && (
                <span className="inline-flex h-5 items-center gap-0.5 rounded border border-[#ff4d2d] bg-[#ffd8c9] px-1.5 text-[10px] font-bold leading-none text-white">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-[#ff3b30]">
                    <Zap className="h-2.5 w-2.5 fill-white text-white" />
                  </span>
                  Đang bán chạy
                </span>
              )}
            </div>
          )}

          {/* Price Area and Quick Add */}
          <div className="flex items-end justify-between mt-auto mb-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] sm:text-[18px] font-black text-black leading-tight whitespace-nowrap">
                {displayPrice.toLocaleString('vi-VN')}đ
              </span>
              {compareAtPrice && compareAtPrice > displayPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-300 line-through font-bold whitespace-nowrap">
                    {compareAtPrice.toLocaleString('vi-VN')}đ
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
                product={effectiveProduct}
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
        product={effectiveProduct}
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
});
