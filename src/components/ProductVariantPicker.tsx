import React from 'react';
import { Product } from '../types';
import { cn } from '@/lib/utils';

type ColorOption = string | { name: string; image: string };

interface ProductVariantPickerProps {
  product: Product;
  selectedColor: string;
  selectedSize: string | null;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
  colorStyle?: 'swatch' | 'chip';
  sizeStyle?: 'compact' | 'large';
  showSummary?: boolean;
}

export function ProductVariantPicker({
  product,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
  colorStyle = 'chip',
  sizeStyle = 'large',
  showSummary = false,
}: ProductVariantPickerProps) {
  const colorOptions = (product.colorImages || product.colors || []) as ColorOption[];
  const sizeOptions = product.sizes?.length > 0 ? product.sizes : ['S', 'M', 'L', 'XL', 'XXL'];
  const variants = product.variants || [];
  const hasVariantStock = variants.length > 0;

  const findVariant = (color: string, size: string) =>
    variants.find(variant => variant.color === color && variant.size === size);

  const isColorUnavailable = (color: string) => {
    if (!hasVariantStock) return false;
    if (selectedSize) {
      const variant = findVariant(color, selectedSize);
      return !variant || Number(variant.stock || 0) <= 0;
    }
    return !variants.some(variant => variant.color === color && Number(variant.stock || 0) > 0);
  };

  const isSizeUnavailable = (size: string) => {
    if (!hasVariantStock) return false;
    if (selectedColor) {
      const variant = findVariant(selectedColor, size);
      return !variant || Number(variant.stock || 0) <= 0;
    }
    return !variants.some(variant => variant.size === size && Number(variant.stock || 0) > 0);
  };

  return (
    <div className="space-y-4">
      {colorOptions.length > 0 && (
        <div>
          {colorStyle === 'chip' && (
            <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">Màu sắc</p>
          )}
          <div className={cn("flex flex-wrap", colorStyle === 'swatch' ? "gap-2" : "gap-2")}>
            {colorOptions.map((colorOption, idx) => {
              const colorName = typeof colorOption === 'string' ? colorOption : colorOption.name;
              const colorImage = typeof colorOption === 'string' ? '' : colorOption.image?.trim();
              const unavailable = isColorUnavailable(colorName);

              if (colorStyle === 'swatch') {
                return (
                  <button
                    key={`${colorName}-${idx}`}
                    type="button"
                    disabled={unavailable}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (unavailable) return;
                      onColorChange(colorName);
                    }}
                    className={cn(
                      "relative h-6 w-6 rounded-full border-2 p-0.5 transition-all hover:scale-110",
                      selectedColor === colorName ? "border-[#1e4b64]" : "border-zinc-100",
                      unavailable && "cursor-not-allowed opacity-35 grayscale hover:scale-100 after:absolute after:left-1/2 after:top-0 after:h-full after:w-px after:-rotate-45 after:bg-zinc-500 after:content-['']"
                    )}
                    title={unavailable ? `${colorName} hết hàng` : colorName}
                  >
                    {colorImage ? (
                      <img src={colorImage} alt={colorName} loading="lazy" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-100 text-[8px] font-black uppercase text-zinc-500" style={{ backgroundColor: typeof colorOption === 'string' ? colorOption.toLowerCase() : undefined }}>
                        {typeof colorOption === 'string' ? '' : colorName.slice(0, 1)}
                      </div>
                    )}
                  </button>
                );
              }

              return (
                  <button
                    key={`${colorName}-${idx}`}
                    type="button"
                    disabled={unavailable}
                    onClick={() => {
                      if (unavailable) return;
                      onColorChange(colorName);
                    }}
                    className={cn(
                      "relative rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                      selectedColor === colorName
                        ? "border-[#1e4b64] bg-blue-50 text-[#1e4b64]"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-300",
                      unavailable && "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 opacity-60 after:absolute after:left-2 after:right-2 after:top-1/2 after:h-px after:-rotate-12 after:bg-zinc-300 after:content-['']"
                    )}
                    title={unavailable ? `${colorName} hết hàng` : colorName}
                  >
                  {colorName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        {sizeStyle === 'large' && (
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">Kích cỡ</p>
        )}
        <div className={cn("flex flex-wrap", sizeStyle === 'compact' ? "gap-1 sm:gap-1.5" : "gap-2")}>
          {sizeOptions.map((size) => {
            const unavailable = isSizeUnavailable(size);
            return (
              <button
                key={size}
                type="button"
                disabled={unavailable}
                onClick={(e) => {
                  e.stopPropagation();
                  if (unavailable) return;
                  onSizeChange(size);
                }}
                className={cn(
                  "relative flex items-center justify-center overflow-hidden border font-bold transition-all",
                  sizeStyle === 'compact'
                    ? "h-7 min-w-[28px] rounded-lg px-1.5 text-[10px] sm:h-8 sm:min-w-[34px] sm:px-2 sm:text-[11px]"
                    : "h-10 min-w-10 rounded-xl px-3 text-sm font-black",
                  selectedSize === size
                    ? "border-[#1e4b64] bg-[#1e4b64] text-white"
                    : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-300",
                  unavailable && "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 opacity-55 hover:border-zinc-100 after:absolute after:left-1 after:right-1 after:top-1/2 after:h-px after:-rotate-12 after:bg-zinc-300 after:content-['']"
                )}
                title={unavailable ? `Size ${size} hết hàng` : `Size ${size}`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {showSummary && (
        <div className="pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Màu sắc</span>
              <span className="text-[11px] font-black italic text-zinc-900">{selectedColor || '--'}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Kích thước</span>
              <span className="text-[11px] font-black italic text-zinc-900">{selectedSize || '--'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
