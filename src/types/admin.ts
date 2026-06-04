import type { ReactNode } from 'react';
import type { Product, BlogPost } from '../types';
import type { FirestoreTimestamp } from './firestore';
import type {
  BannerItem,
  BlogCategoryItem,
  CheapChampionSettings,
  FlashSaleSettings,
  FloatingMenuSettings,
  NavigationSetting,
  NewsletterSubscriber,
} from './settings';
import type { AdminNavItem, NavigationItem } from './navigation';

export type AdminTab =
  | 'dashboard'
  | 'strategy'
  | 'products'
  | 'orders'
  | 'reviews'
  | 'customers'
  | 'newsletter'
  | 'vouchers'
  | 'blog'
  | 'homepage'
  | 'media'
  | 'settings'
  | 'menu-navigation'
  | 'blog-categories'
  | 'policy-pages'
  | 'ai-workflow'
  | 'ai-product-factory'
  | 'ai-blog'
  | 'ai-seo-report'
  | 'flash-sale'
  | 'cheap-champion'
  | 'category-seo'
  | 'content-map'
  | 'users-roles'
  | 'orders-all'
  | 'orders-pending'
  | 'orders-shipped'
  | 'orders-delivered'
  | 'products-all'
  | 'products-cat-thun'
  | 'products-cat-thethao'
  | 'products-cat-polo'
  | 'products-cat-quan'
  | 'products-cat-phukien'
  | 'settings-logo'
  | 'settings-footer'
  | 'settings-css'
  | 'settings-contact'
  | 'seo-sitemap'
  | 'seo-schema'
  | 'seo-robots'
  | 'seo-redirects';

export type AdminNavigationItem = AdminNavItem<AdminTab>;

export interface MediaItem {
  id: string;
  url: string;
  createdAt: FirestoreTimestamp;
}

export type {
  BannerItem,
  BlogCategoryItem,
  CheapChampionSettings,
  FlashSaleSettings,
  FloatingMenuSettings,
  NavigationItem,
  NavigationSetting,
  NewsletterSubscriber,
};

export type AdminRenderable = ReactNode;

export type AdminProduct = Product;
export type AdminBlogPost = BlogPost;
export type AdminOrderStatus = import('../types').Order['status'];

export interface NewsletterSendResult {
  sent?: number;
  failed?: number;
  error?: string;
}

export type { FirestoreTimestamp };
