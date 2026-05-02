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
                  <h2 className="text-xl font-black italic tracking-tighter uppercase">YOUR BAG</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <ScrollArea className="flex-1 px-6">
                {cart.length === 0 ? (
                  <div className="flex h-[60vh] flex-col items-center justify-center text-center">
                    <p className="text-zinc-500 font-medium mb-6">Your bag is empty.</p>
                    <Button onClick={onClose} variant="outline" className="font-bold border-2 border-black rounded-none h-12 px-8">
                      CONTINUE SHOPPING
                    </Button>
                  </div>
                ) : (
                  <div className="py-6 space-y-6">
                    {cart.map((item) => (
                      <div key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-4">
                        <div className="h-24 w-20 flex-shrink-0 overflow-hidden bg-zinc-100">
                          {item.images && item.images[0] ? (
                            <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-full w-full bg-zinc-200" />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <div className="flex justify-between">
                              <h3 className="text-sm font-black uppercase line-clamp-1">{item.name}</h3>
                              <p className="text-sm font-black">{((item.discountPrice || item.price) * item.quantity).toLocaleString('vi-VN')}₫</p>
                            </div>
                            <p className="text-xs text-zinc-500 font-medium mt-1">
                              {item.selectedColor} / {item.selectedSize}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center border rounded-none">
                              <button 
                                onClick={() => updateQuantity(item.id, item.selectedColor, item.selectedSize, item.quantity - 1)}
                                className="p-1 hover:bg-zinc-50"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.selectedColor, item.selectedSize, item.quantity + 1)}
                                className="p-1 hover:bg-zinc-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.id, item.selectedColor, item.selectedSize)}
                              className="text-zinc-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {cart.length > 0 && (
                <div className="border-t bg-zinc-50 p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest">Subtotal</span>
                    <span className="text-lg font-black">{total.toLocaleString('vi-VN')}₫</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest text-center">
                    Shipping & taxes calculated at checkout
                  </p>
                  <Button 
                    onClick={onCheckout}
                    className="w-full bg-black text-white hover:bg-zinc-800 font-black py-8 rounded-none text-lg tracking-tight flex items-center justify-center gap-2"
                  >
                    CHECKOUT NOW <ArrowRight className="h-5 w-5" />
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
