import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../CartContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, onCheckout }) => {
  const { cart, removeFromCart, updateQuantity, total } = useCart();

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
