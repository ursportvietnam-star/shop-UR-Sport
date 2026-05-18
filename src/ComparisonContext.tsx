import React, { createContext, useContext, useMemo, useState } from 'react';
import { Product } from './types';

type ComparisonContextValue = {
  compareIds: string[];
  toggleCompare: (product: Product) => boolean;
  removeCompare: (productId: string) => void;
  clearCompare: () => void;
  isCompared: (productId: string) => boolean;
};

const STORAGE_KEY = 'ursport_compare_product_ids';
const ComparisonContext = createContext<ComparisonContextValue | undefined>(undefined);

const readStoredCompare = () => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
};

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compareIds, setCompareIds] = useState<string[]>(readStoredCompare);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
  }, [compareIds]);

  const value = useMemo<ComparisonContextValue>(() => ({
    compareIds,
    toggleCompare: (product) => {
      const exists = compareIds.includes(product.id);
      const nextIds = exists
        ? compareIds.filter(id => id !== product.id)
        : [product.id, ...compareIds].slice(0, 3);
      setCompareIds(nextIds);
      return !exists;
    },
    removeCompare: (productId) => setCompareIds(prev => prev.filter(id => id !== productId)),
    clearCompare: () => setCompareIds([]),
    isCompared: (productId) => compareIds.includes(productId),
  }), [compareIds]);

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
};

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) throw new Error('useComparison must be used within ComparisonProvider');
  return context;
};
