import type { Product } from '../types';

const FALLBACK_PUBLISHED_AT = new Date('2026-06-08T09:00:00+07:00').getTime();
const FALLBACK_PUBLISHED_INTERVAL = 60 * 60 * 1000;

export const getProductTimestamp = (value: Product['createdAt']): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.getTime === 'function') return value.getTime();
  if (typeof value.seconds === 'number') {
    return (value.seconds * 1000) + ((value.nanoseconds || 0) / 1e6);
  }
  return 0;
};

export const assignProductPublishTimes = (products: Product[]) => {
  return products.map((product, index) => {
    if (getProductTimestamp(product.createdAt) > 0) return product;

    return {
      ...product,
      createdAt: new Date(FALLBACK_PUBLISHED_AT - (index * FALLBACK_PUBLISHED_INTERVAL))
    };
  });
};

export const sortNewProducts = (a: Product, b: Product) => {
  const diff = getProductTimestamp(b.createdAt) - getProductTimestamp(a.createdAt);
  if (diff !== 0) return diff;
  return (b.reviewsCount - a.reviewsCount) || (b.rating - a.rating) || a.name.localeCompare(b.name);
};

export const sortBestSellers = (a: Product, b: Product) => {
  const popularityA = (a.reviewsCount || 0) * 2 + (a.rating || 0) * 10;
  const popularityB = (b.reviewsCount || 0) * 2 + (b.rating || 0) * 10;
  const diff = popularityB - popularityA;
  if (diff !== 0) return diff;
  return sortNewProducts(a, b);
};
