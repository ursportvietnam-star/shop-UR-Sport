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

              if (colorStyle === 'swatch') {
                return (
                  <button
                    key={`${colorName}-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorChange(colorName);
                    }}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 p-0.5 transition-all hover:scale-110",
                      selectedColor === colorName ? "border-[#1e4b64]" : "border-zinc-100"
                    )}
                    title={colorName}
                  >
                    {typeof colorOption === 'string' ? (
                      <div className="h-full w-full rounded-full" style={{ backgroundColor: colorOption.toLowerCase() }} />
                    ) : (
                      <img src={colorOption.image} alt={colorOption.name} loading="lazy" className="h-full w-full rounded-full object-cover" />
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={`${colorName}-${idx}`}
                  type="button"
                  onClick={() => onColorChange(colorName)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                    selectedColor === colorName
                      ? "border-[#1e4b64] bg-blue-50 text-[#1e4b64]"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  )}
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
          {sizeOptions.map((size) => (
            <button
              key={size}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSizeChange(size);
              }}
              className={cn(
                "flex items-center justify-center border font-bold transition-all",
                sizeStyle === 'compact'
                  ? "h-7 min-w-[28px] rounded-lg px-1.5 text-[10px] sm:h-8 sm:min-w-[34px] sm:px-2 sm:text-[11px]"
                  : "h-10 min-w-10 rounded-xl px-3 text-sm font-black",
                selectedSize === size
                  ? "border-[#1e4b64] bg-[#1e4b64] text-white"
                  : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-300"
              )}
            >
              {size}
            </button>
          ))}
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
