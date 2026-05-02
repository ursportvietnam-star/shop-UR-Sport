import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { PRODUCTS as STATIC_PRODUCTS } from './data';
import { Product } from './types';

interface ProductsContextType {
  products: Product[];
  loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

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
        })) as Product[];
        setProducts(data);
      } else {
        // Nếu Firestore trống, dùng dữ liệu mẫu
        setProducts(STATIC_PRODUCTS);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setProducts(STATIC_PRODUCTS);
      setLoading(false);
    });

    return () => unsubscribe();
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
