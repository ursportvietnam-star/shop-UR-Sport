import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { PRODUCTS as STATIC_PRODUCTS } from './data';
import { Product } from './types';
import { normalizeProductSlug } from './lib/productUrls';

interface ProductsContextType {
  products: Product[];
  loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

const normalizeProduct = (product: Product): Product => ({
  ...product,
  slug: normalizeProductSlug(product.slug, product.id) || product.id
});

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      if (!db) {
        setProducts(STATIC_PRODUCTS.map(normalizeProduct));
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        if (!mounted) return;

        if (!snapshot.empty) {
          const data = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Product)).map(normalizeProduct);
          setProducts(data);
        } else {
          setProducts(STATIC_PRODUCTS.map(normalizeProduct));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        if (mounted) setProducts(STATIC_PRODUCTS.map(normalizeProduct));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      mounted = false;
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
