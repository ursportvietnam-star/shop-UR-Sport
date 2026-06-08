import { PRODUCTS as STATIC_PRODUCTS } from '../data';
import { Product } from '../types';
import { normalizeProductSlug } from './productUrls';
import { assignProductPublishTimes } from './productSorting';

export const LOCAL_PRODUCT_COPIES_STORAGE_KEY = 'ursport_local_product_copies_v1';
export const LOCAL_PRODUCTS_UPDATED_EVENT = 'ursport:local-products-updated';

export const normalizeLocalProduct = (product: Product): Product => ({
  ...product,
  slug: normalizeProductSlug(product.slug, product.name || product.id) || product.id,
});

export const loadLocalProducts = (): Product[] => {
  if (typeof window === 'undefined') return [];

  try {
    const cached = window.localStorage.getItem(LOCAL_PRODUCT_COPIES_STORAGE_KEY);
    const parsed = cached ? JSON.parse(cached) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeLocalProduct) : [];
  } catch {
    return [];
  }
};

export const mergeLocalProducts = (products: Product[] = STATIC_PRODUCTS): Product[] => {
  const localProducts = loadLocalProducts();
  if (localProducts.length === 0) return assignProductPublishTimes(products.map(normalizeLocalProduct));

  const localIds = new Set(localProducts.map(product => product.id));
  return assignProductPublishTimes([
    ...localProducts,
    ...products.filter(product => !localIds.has(product.id)).map(normalizeLocalProduct),
  ]);
};

export const saveLocalProduct = (product: Product) => {
  if (typeof window === 'undefined') return;

  const normalizedProduct = normalizeLocalProduct(product);
  const existing = loadLocalProducts().filter(item => item.id !== normalizedProduct.id);
  window.localStorage.setItem(
    LOCAL_PRODUCT_COPIES_STORAGE_KEY,
    JSON.stringify([normalizedProduct, ...existing]),
  );
  window.dispatchEvent(new CustomEvent(LOCAL_PRODUCTS_UPDATED_EVENT));
};

export const removeLocalProduct = (productId: string) => {
  if (typeof window === 'undefined') return false;

  const existing = loadLocalProducts();
  const nextProducts = existing.filter(item => item.id !== productId);
  if (nextProducts.length === existing.length) return false;

  window.localStorage.setItem(LOCAL_PRODUCT_COPIES_STORAGE_KEY, JSON.stringify(nextProducts));
  window.dispatchEvent(new CustomEvent(LOCAL_PRODUCTS_UPDATED_EVENT));
  return true;
};
