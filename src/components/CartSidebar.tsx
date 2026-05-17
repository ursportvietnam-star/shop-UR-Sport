import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Sparkles } from 'lucide-react';
import { useCart } from '../CartContext';
import { useProducts } from '../ProductsContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, onCheckout }) => {
  const { cart, addToCart, removeFromCart, updateQuantity, total } = useCart();
  const { products } = useProducts();
  const freeShippingThreshold = 500000;
  const freeShippingRemaining = Math.max(freeShippingThreshold - total, 0);
  const freeShippingProgress = Math.min((total / freeShippingThreshold) * 100, 100);
  const cartProductIds = React.useMemo(() => new Set(cart.map(item => item.id)), [cart]);

  const recommendedProducts = React.useMemo(() => {
    if (cart.length === 0 || freeShippingRemaining <= 0) return [];

    return products
      .filter(product => !cartProductIds.has(product.id) && product.stock !== 0)
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;
        return Math.abs(priceA - freeShippingRemaining) - Math.abs(priceB - freeShippingRemaining);
      })
      .slice(0, 3);
  }, [cart.length, cartProductIds, freeShippingRemaining, products]);

  const handleAddRecommended = (product: typeof products[number]) => {
    const color = product.colors?.[0] || 'Default';
    const size = product.sizes?.[0] || 'Free Size';
    addToCart(product, color, size, 1);
    toast.success('Đã thêm sản phẩm gợi ý vào giỏ', { position: 'top-center' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-101 h-full w-full max-w-md bg-white shadow-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-6 py-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6 font-bold" />
                  <h2 className="text-xl font-black italic tracking-tighter uppercase">GIỎ HÀNG</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <ScrollArea className="flex-1 px-6">
                {cart.length === 0 ? (
                  <div className="flex h-[60vh] flex-col items-center justify-center text-center">
                    <p className="text-zinc-500 font-medium mb-6">Giỏ hàng của bạn đang trống.</p>
                    <Button onClick={onClose} variant="outline" className="font-bold border-2 border-black rounded-none h-12 px-8">
                      TIẾP TỤC MUA SẮM
                    </Button>
                  </div>
                ) : (
                  <div className="py-6 space-y-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1e4b64] shadow-sm">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-black uppercase tracking-widest text-[#1e4b64]">
                            Miễn phí vận chuyển
                          </p>
                          <p className="mt-0.5 text-[12px] font-bold text-zinc-600">
                            {freeShippingRemaining > 0
                              ? `Mua thêm ${freeShippingRemaining.toLocaleString('vi-VN')}đ để được freeship`
                              : 'Đơn hàng đã đạt ưu đãi freeship'}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${freeShippingProgress}%` }}
                          className="h-full rounded-full bg-[#1e4b64]"
                        />
                      </div>
                    </div>

                    {cart.map((item, idx) => (
                      <motion.div 
                        key={`${item.id}-${item.selectedColor}-${item.selectedSize}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex gap-4"
                      >
                        <div className="h-24 w-20 flex-shrink-0 overflow-hidden bg-zinc-100 rounded-xl">
                          {item.images && item.images[0] ? (
                            <img src={item.images[0]} alt={item.name} loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-full w-full bg-zinc-200" />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="text-[13px] font-bold text-zinc-900 leading-tight line-clamp-2 pr-4">{item.name}</h3>
                              <p className="text-[13px] font-bold text-zinc-900 shrink-0">{((item.discountPrice || item.price) * item.quantity).toLocaleString('vi-VN')}₫</p>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-medium mt-1">
                              {item.selectedColor} / {item.selectedSize}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-zinc-100 rounded-lg overflow-hidden">
                              <button 
                                onClick={() => updateQuantity(item.id, item.selectedColor, item.selectedSize, item.quantity - 1)}
                                className="p-1.5 hover:bg-zinc-50 text-zinc-400"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-zinc-900">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.selectedColor, item.selectedSize, item.quantity + 1)}
                                className="p-1.5 hover:bg-zinc-50 text-zinc-400"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.id, item.selectedColor, item.selectedSize)}
                              className="h-8 w-8 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {recommendedProducts.length > 0 && (
                      <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#1e4b64]" />
                          <h3 className="text-[12px] font-black uppercase tracking-widest text-zinc-900">
                            Gợi ý thêm vào giỏ
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {recommendedProducts.map(product => (
                            <div key={product.id} className="flex items-center gap-3">
                              <div className="h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                                <img src={product.images?.[0] || ''} alt={product.name} loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-[12px] font-bold text-zinc-900">{product.name}</p>
                                <p className="mt-0.5 text-[12px] font-black text-[#1e4b64]">
                                  {(product.discountPrice || product.price).toLocaleString('vi-VN')}đ
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddRecommended(product)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e4b64] text-white transition-all hover:bg-[#153446] active:scale-90"
                                aria-label={`Thêm ${product.name} vào giỏ`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {cart.length > 0 && (
                <div className="border-t bg-zinc-50 p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest">Tạm tính</span>
                    <span className="text-lg font-black">{total.toLocaleString('vi-VN')}₫</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest text-center">
                    Phí vận chuyển & thuế được tính khi thanh toán
                  </p>
                  <Button 
                    onClick={onCheckout}
                    className="w-full bg-[#1e4b64] text-white hover:bg-[#153446] font-bold h-14 rounded-xl text-sm uppercase tracking-widest shadow-lg shadow-[#1e4b64]/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    Tiến hành thanh toán <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
