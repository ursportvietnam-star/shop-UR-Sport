import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Zap,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  productName: string;
  price: number;
  discountPrice?: number;
  selectedVariantOutOfStock?: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  onChangeIndex,
  productName,
  price,
  discountPrice,
  selectedVariantOutOfStock = false,
  onAddToCart,
  onBuyNow
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Reset zoom on index change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling behind modal
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, currentIndex, images.length]);

  // Handle Fullscreen Change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle wheel zoom (attaching manually to make it non-passive)
  useEffect(() => {
    const viewerElement = viewerRef.current;
    if (!viewerElement || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.15;
      const direction = e.deltaY < 0 ? 1 : -1;
      
      setScale(prevScale => {
        const newScale = Math.min(Math.max(1, prevScale + direction * zoomSpeed), 4);
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 });
        }
        return newScale;
      });
    };

    viewerElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewerElement.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrev = () => {
    if (images.length <= 1) return;
    onChangeIndex((currentIndex - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    if (images.length <= 1) return;
    onChangeIndex((currentIndex + 1) % images.length);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (scale > 1) {
      handleZoomReset();
    } else {
      setScale(2.5);
      // Center zoom around click position if possible
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left - rect.width / 2;
      const clickY = e.clientY - rect.top - rect.height / 2;
      setPosition({ x: -clickX * 1.5, y: -clickY * 1.5 });
    }
  };

  // Panning/Dragging Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch controls for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Lỗi khi bật chế độ toàn màn hình:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const displayPrice = discountPrice || price;
  const currentImageUrl = images[currentIndex];

  const lightboxContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex flex-col bg-zinc-950/98 backdrop-blur-xl select-none"
      >
        {/* Top Header Row */}
        <div className="absolute top-0 left-0 right-0 h-18 px-4 md:px-8 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
          <div className="min-w-0 pr-4">
            <h3 className="text-white text-sm md:text-lg font-bold truncate max-w-[250px] sm:max-w-md md:max-w-xl">
              {productName}
            </h3>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Ảnh {currentIndex + 1} trên {images.length}
            </p>
          </div>

          {/* Top Controls Toolbar */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="p-2 md:p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-all"
              title="Thu nhỏ (Ctrl -)"
              id="btn-lightbox-zoomout"
            >
              <ZoomOut className="h-5 w-5 md:h-5.5 md:w-5.5" />
            </button>
            <div className="text-xs font-bold text-zinc-400 px-2 min-w-[42px] text-center select-none">
              {Math.round(scale * 100)}%
            </div>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-2 md:p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-all"
              title="Phóng to (Ctrl +)"
              id="btn-lightbox-zoomin"
            >
              <ZoomIn className="h-5 w-5 md:h-5.5 md:w-5.5" />
            </button>
            {scale > 1 && (
              <button
                onClick={handleZoomReset}
                className="p-2 md:p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                title="Khôi phục"
                id="btn-lightbox-zoomreset"
              >
                <RotateCcw className="h-5 w-5 md:h-5.5 md:w-5.5" />
              </button>
            )}
            <div className="h-5 w-px bg-zinc-800 mx-1 md:mx-2" />
            <button
              onClick={toggleFullscreen}
              className="p-2 md:p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
              id="btn-lightbox-fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5 md:h-5.5 md:w-5.5" />
              ) : (
                <Maximize2 className="h-5 w-5 md:h-5.5 md:w-5.5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 md:p-2.5 rounded-full bg-white/5 text-zinc-300 hover:text-white hover:bg-red-500 hover:scale-105 transition-all shadow-md ml-1 md:ml-2"
              title="Đóng (Esc)"
              id="btn-lightbox-close"
            >
              <X className="h-5 w-5 md:h-5.5 md:w-5.5" />
            </button>
          </div>
        </div>

        {/* Center Main Image Canvas Viewer */}
        <div
          ref={viewerRef}
          className="relative flex-1 flex items-center justify-center p-2 md:p-12 overflow-hidden cursor-default"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUpOrLeave}
        >
          {/* Left Arrow Navigation Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 md:left-6 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-900/60 text-white hover:bg-white/10 hover:scale-105 active:scale-95 border border-white/10 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-2xl"
              title="Ảnh trước"
              id="btn-lightbox-prev"
            >
              <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
            </button>
          )}

          {/* Active Zoomable Image */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <motion.img
              ref={imageRef}
              key={currentIndex}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22 }}
              src={currentImageUrl}
              alt={`${productName} - Zoom view ${currentIndex + 1}`}
              onDoubleClick={handleDoubleClick}
              className={cn(
                "max-h-[70vh] md:max-h-[76vh] max-w-full object-contain pointer-events-auto select-none rounded-sm shadow-2xl",
                isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-zoom-in"
              )}
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out'
              }}
              draggable={false}
            />
          </div>

          {/* Right Arrow Navigation Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 md:right-6 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-900/60 text-white hover:bg-white/10 hover:scale-105 active:scale-95 border border-white/10 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-2xl"
              title="Ảnh tiếp theo"
              id="btn-lightbox-next"
            >
              <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
            </button>
          )}
        </div>

        {/* Bottom Carousel (Thumbnails) */}
        {images.length > 1 && (
          <div className="absolute bottom-28 md:bottom-26 left-0 right-0 flex justify-center gap-2 md:gap-3 z-20 px-6 select-none overflow-x-auto no-scrollbar scroll-smooth">
            <div className="flex gap-2 mx-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => onChangeIndex(i)}
                  className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shrink-0 transition-all border-2",
                    currentIndex === i
                      ? "border-emerald-500 scale-110 shadow-lg brightness-110"
                      : "border-white/10 opacity-50 hover:opacity-85"
                  )}
                  id={`btn-lightbox-thumb-${i}`}
                >
                  <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Floating Glassmorphic Quick Buy Actions Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-[86%] max-w-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-row items-center justify-between gap-4 text-white shadow-2xl">
          <div className="min-w-0 flex-1 pr-2">
            <h4 className="text-xs sm:text-sm font-semibold truncate text-zinc-100">{productName}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm sm:text-lg font-black text-red-500 whitespace-nowrap">
                {displayPrice.toLocaleString('vi-VN')}₫
              </span>
              {discountPrice && (
                <span className="text-xs text-zinc-400 line-through whitespace-nowrap">
                  {price.toLocaleString('vi-VN')}₫
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={onAddToCart}
              disabled={selectedVariantOutOfStock}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-white/15 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-100 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5"
              id="btn-lightbox-cart"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Thêm giỏ</span>
            </button>
            <button
              onClick={onBuyNow}
              disabled={selectedVariantOutOfStock}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[#00a651] text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-600 hover:scale-[1.02] shadow-md shadow-emerald-950/20 transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
              id="btn-lightbox-buy"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Mua Ngay</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(lightboxContent, document.body);
};
