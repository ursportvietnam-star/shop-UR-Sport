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
  | 'blog-categories'
  | 'policy-pages'
  | 'ai-product'
  | 'ai-blog'
  | 'ai-seo-report'
  | 'flash-sale'
  | 'cheap-champion'
  | 'category-seo'
  | 'content-map';

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
