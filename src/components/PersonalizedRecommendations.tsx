import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { useRecentlyViewed } from '../RecentlyViewedContext';
import { ProductCard } from './ProductCard';
import { getProductPath } from '../lib/productUrls';
import { Product } from '../types';

const getProductUrl = (product: Product) => {
  return getProductPath(product);
};

export function PersonalizedRecommendations({ products }: { products: Product[] }) {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { wishlistIds } = useWishlist();
  const { recentProductIds } = useRecentlyViewed();

  const recommendations = React.useMemo(() => {
    const sourceIds = [...recentProductIds.slice(0, 5), ...wishlistIds.slice(0, 5), ...cart.map(item => item.id)];
    if (sourceIds.length === 0) return [];

    const productById = new Map(products.map(product => [product.id, product]));
    const sourceProducts = sourceIds
      .map(id => productById.get(id))
      .filter((product): product is Product => Boolean(product));

    const interestedCategories = new Set(sourceProducts.map(product => product.category));
    const excludedIds = new Set([...sourceIds, ...cart.map(item => item.id)]);

    return products
      .filter(product => !excludedIds.has(product.id) && interestedCategories.has(product.category) && product.stock !== 0)
      .map(product => {
        const categoryHits = sourceProducts.filter(source => source.category === product.category).length;
        const saleBoost = product.discountPrice ? 2 : 0;
        const bestsellerBoost = product.isBestSeller ? 2 : 0;
        const ratingBoost = Math.min(product.rating || 0, 5) / 2;
        return { product, score: categoryHits * 4 + saleBoost + bestsellerBoost + ratingBoost };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.product);
  }, [cart, products, recentProductIds, wishlistIds]);

  if (recommendations.length === 0) return null;

  return (
    <section className="container-custom section-padding bg-white">
      <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div className="homepage-heading-copy">
          <span className="section-subtitle">Dựa trên hành vi mua sắm</span>
          <h2 className="section-title">
            Gợi ý <span className="text-[#1e4b64]">dành riêng cho bạn</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/da-xem')}
          className="text-[#1e4b64] text-[11px] sm:text-[14px] font-bold flex items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap"
        >
          <span>Xem lịch sử</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {recommendations.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.06 }}
          >
            <ProductCard
              product={product}
              onClick={() => navigate(getProductUrl(product))}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
