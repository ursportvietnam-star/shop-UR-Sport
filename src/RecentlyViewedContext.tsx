import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface RecentlyViewedContextType {
  recentProductIds: string[];
  recentCount: number;
  recordProductView: (productId: string) => void;
  clearRecentlyViewed: () => void;
}

const STORAGE_KEY = 'ursport_recent_product_ids';
const MAX_RECENT_PRODUCTS = 12;

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

const readStoredRecentProducts = () => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const RecentlyViewedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recentProductIds, setRecentProductIds] = useState<string[]>(readStoredRecentProducts);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recentProductIds));
  }, [recentProductIds]);

  const recordProductView = React.useCallback((productId: string) => {
    setRecentProductIds((current) => {
      const next = [
        productId,
        ...current.filter((id) => id !== productId),
      ].slice(0, MAX_RECENT_PRODUCTS);

      return next.join('|') === current.join('|') ? current : next;
    });
  }, []);

  const clearRecentlyViewed = React.useCallback(() => setRecentProductIds([]), []);

  const value = useMemo<RecentlyViewedContextType>(() => ({
    recentProductIds,
    recentCount: recentProductIds.length,
    recordProductView,
    clearRecentlyViewed,
  }), [recentProductIds, recordProductView, clearRecentlyViewed]);

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  );
};

export const useRecentlyViewed = () => {
  const context = useContext(RecentlyViewedContext);
  if (!context) throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  return context;
};
