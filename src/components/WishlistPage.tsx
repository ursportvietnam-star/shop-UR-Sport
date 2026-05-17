import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductCard } from './ProductCard';
import { useProducts } from '../ProductsContext';
import { useWishlist } from '../WishlistContext';
import { Button } from '@/components/ui/button';
import { useSEO } from '../hooks/useSEO';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const { wishlistIds, clearWishlist } = useWishlist();

  const savedProducts = React.useMemo(() => {
    const ids = new Set(wishlistIds);
    return products.filter((product) => ids.has(product.id));
  }, [products, wishlistIds]);

  useSEO({
    title: 'Sản phẩm yêu thích | UR Sport',
    description: 'Danh sách sản phẩm UR Sport bạn đã lưu để xem lại và mua nhanh.',
    canonical: '/yeu-thich',
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="container-custom py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-4 border-b border-zinc-100 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-red-500">
              <Heart className="h-3.5 w-3.5 fill-current" />
              Đã lưu {wishlistIds.length} sản phẩm
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              Sản phẩm yêu thích
            </h1>
          </div>

          {wishlistIds.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={clearWishlist}
              className="h-11 rounded-full border-zinc-200 px-5 text-[12px] font-black uppercase tracking-widest text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa tất cả
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </div>
        ) : savedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {savedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <ProductCard
                  product={product}
                  onClick={() => navigate(`/${product.slug || product.id}`)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
              <Heart className="h-7 w-7" />
            </div>
            <h2 className="mb-2 text-xl font-black text-zinc-950">Chưa có sản phẩm nào</h2>
            <p className="mb-6 text-sm font-medium leading-6 text-zinc-500">
              Bấm biểu tượng trái tim trên sản phẩm để lưu lại những mẫu bạn thích.
            </p>
            <Button
              type="button"
              onClick={() => navigate('/shop')}
              className="h-12 rounded-full bg-[#1e4b64] px-6 text-[12px] font-black uppercase tracking-widest text-white hover:bg-[#153446]"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Mua sắm ngay
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
