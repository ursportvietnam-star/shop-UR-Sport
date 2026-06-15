import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { PRODUCTS as STATIC_PRODUCTS } from './data';
import { Product } from './types';
import { normalizeProductSlug } from './lib/productUrls';
import { LOCAL_PRODUCTS_UPDATED_EVENT, mergeLocalProducts } from './lib/localProducts';
import { assignProductPublishTimes } from './lib/productSorting';

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
  const productSourceRef = React.useRef<Product[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      if (!db) {
        productSourceRef.current = assignProductPublishTimes(STATIC_PRODUCTS.map(normalizeProduct));
        setProducts(assignProductPublishTimes(mergeLocalProducts(productSourceRef.current)));
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, 'products'));
        if (!mounted) return;

        if (!snapshot.empty) {
          const firebaseData = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Product)).map(normalizeProduct);

          const combined = [...STATIC_PRODUCTS.map(normalizeProduct)];
          firebaseData.forEach(fp => {
            const index = combined.findIndex(p => p.id === fp.id);
            if (index >= 0) {
              combined[index] = fp;
            } else {
              combined.push(fp);
            }
          });

          productSourceRef.current = assignProductPublishTimes(combined);
          setProducts(assignProductPublishTimes(mergeLocalProducts(productSourceRef.current)));
        } else {
          productSourceRef.current = assignProductPublishTimes(STATIC_PRODUCTS.map(normalizeProduct));
          setProducts(assignProductPublishTimes(mergeLocalProducts(productSourceRef.current)));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        if (mounted) {
          productSourceRef.current = assignProductPublishTimes(STATIC_PRODUCTS.map(normalizeProduct));
          setProducts(assignProductPublishTimes(mergeLocalProducts(productSourceRef.current)));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProducts();
    const refreshLocalProducts = () => {
      if (!mounted) return;
      const sourceProducts = productSourceRef.current.length > 0
        ? productSourceRef.current
        : STATIC_PRODUCTS.map(normalizeProduct);
      setProducts(assignProductPublishTimes(mergeLocalProducts(sourceProducts)));
    };
    window.addEventListener(LOCAL_PRODUCTS_UPDATED_EVENT, refreshLocalProducts);

    return () => {
      mounted = false;
      window.removeEventListener(LOCAL_PRODUCTS_UPDATED_EVENT, refreshLocalProducts);
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
