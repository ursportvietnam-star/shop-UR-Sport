import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CartItem, Product } from './types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, color: string, size: string, quantity?: number) => void;
  removeFromCart: (id: string, color: string, size: string) => void;
  updateQuantity: (id: string, color: string, size: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  savedVouchers: string[];
  saveVoucher: (code: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse cart from localStorage:', e);
      return [];
    }
  });

  const [savedVouchers, setSavedVouchers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('savedVouchers');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse saved vouchers from localStorage:', e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('savedVouchers', JSON.stringify(savedVouchers));
  }, [savedVouchers]);

  const saveVoucher = (code: string) => {
    setSavedVouchers(prev => {
      if (!prev.includes(code)) {
        return [...prev, code];
      }
      return prev;
    });
  };

  const addToCart = (product: Product, color: string, size: string, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.selectedColor === color && item.selectedSize === size);
      if (existing) {
        return prev.map(item => 
          item.id === product.id && item.selectedColor === color && item.selectedSize === size 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      return [...prev, { ...product, selectedColor: color, selectedSize: size, quantity }];
    });
  };

  const removeFromCart = (id: string, color: string, size: string) => {
    setCart(prev => prev.filter(item => !(item.id === id && item.selectedColor === color && item.selectedSize === size)));
  };

  const updateQuantity = (id: string, color: string, size: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => 
      item.id === id && item.selectedColor === color && item.selectedSize === size 
        ? { ...item, quantity } 
        : item
    ));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + (item.discountPrice || item.price) * item.quantity, 0);

  const contextValue = useMemo(() => ({
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
    savedVouchers,
    saveVoucher
  }), [cart, savedVouchers, total]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
