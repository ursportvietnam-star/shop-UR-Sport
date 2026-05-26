import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { PRODUCTS as STATIC_PRODUCTS } from './data';
import { Product } from './types';
import { normalizeProductSlug } from './lib/productUrls';

const LOCAL_PRODUCT_COPIES_STORAGE_KEY = 'ursport_local_product_copies_v1';
const LOCAL_PRODUCTS_UPDATED_EVENT = 'ursport:local-products-updated';

interface ProductsContextType {
  products: Product[];
  loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

const normalizeProduct = (product: Product): Product => ({
  ...product,
  slug: normalizeProductSlug(product.slug, product.id) || product.id
});

const loadLocalProducts = (): Product[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = window.localStorage.getItem(LOCAL_PRODUCT_COPIES_STORAGE_KEY);
    const parsed = cached ? JSON.parse(cached) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeProduct) : [];
  } catch {
    return [];
  }
};

const mergeLocalProducts = (baseProducts: Product[]) => {
  const localProducts = loadLocalProducts();
  if (localProducts.length === 0) return baseProducts;

  const localIds = new Set(localProducts.map(product => product.id));
  return [
    ...localProducts,
    ...baseProducts.filter(product => !localIds.has(product.id)),
  ];
};

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Luôn lắng nghe dữ liệu từ Firestore
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data() 
        } as Product)).map(normalizeProduct);
        setProducts(mergeLocalProducts(data));
      } else {
        // Nếu Firestore trống, dùng dữ liệu mẫu
        setProducts(mergeLocalProducts(STATIC_PRODUCTS.map(normalizeProduct)));
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setProducts(mergeLocalProducts(STATIC_PRODUCTS.map(normalizeProduct)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const syncLocalProducts = () => {
      setProducts(prev => mergeLocalProducts(prev.map(normalizeProduct)));
    };

    window.addEventListener(LOCAL_PRODUCTS_UPDATED_EVENT, syncLocalProducts);
    window.addEventListener('storage', syncLocalProducts);
    window.addEventListener('focus', syncLocalProducts);
    return () => {
      window.removeEventListener(LOCAL_PRODUCTS_UPDATED_EVENT, syncLocalProducts);
      window.removeEventListener('storage', syncLocalProducts);
      window.removeEventListener('focus', syncLocalProducts);
    };
  }, []);

  return (
    <ProductsContext.Provider value={{ products, loading }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProducts must be used within a ProductsProvider');
  return context;
};
