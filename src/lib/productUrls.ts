import { slugifyVietnamese } from './categoryConfig';
import { SITE_URL } from './seo';
import type { Product } from '../types';

export const normalizeProductSlug = (value?: string, fallback = '') => {
  const raw = String(value || fallback || '').trim();
  if (!raw) return '';

  let path = raw;
  try {
    path = new URL(raw, `${SITE_URL}/`).pathname;
  } catch {
    path = raw;
  }

  const parts = path
    .split(/[?#]/)[0]
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);

  const lastPart = parts[parts.length - 1] || raw;
  return slugifyVietnamese(lastPart);
};

export const getProductPath = (product: Pick<Product, 'id' | 'slug'>) => {
  const slug = normalizeProductSlug(product.slug, product.id);
  return slug ? `/${slug}` : '/shop';
};

export const getProductAbsoluteUrl = (product: Pick<Product, 'id' | 'slug'>) => {
  return `${SITE_URL}${getProductPath(product)}`;
};
