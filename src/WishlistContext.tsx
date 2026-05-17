import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistCount: number;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

const STORAGE_KEY = 'ursport_wishlist_ids';

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const readStoredWishlist = () => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>(readStoredWishlist);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  const value = useMemo<WishlistContextType>(() => ({
    wishlistIds,
    wishlistCount: wishlistIds.length,
    isWishlisted: (productId) => wishlistIds.includes(productId),
    toggleWishlist: (productId) => {
      const isCurrentlySaved = wishlistIds.includes(productId);
      setWishlistIds((current) => (
        current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [productId, ...current]
      ));
      return !isCurrentlySaved;
    },
    clearWishlist: () => setWishlistIds([]),
  }), [wishlistIds]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
};
