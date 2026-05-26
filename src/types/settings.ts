import type { FirestoreTimestamp } from './firestore';
import type { NavigationItem } from './navigation';

export interface BannerItem {
  id: number | string;
  image: string;
  title: string;
  subtitle?: string;
  link?: string;
}

export interface FloatingMenuSettings {
  zaloPhone: string;
  callPhone: string;
  zaloIcon: string;
  callIcon: string;
}

export interface FlashSaleProductSetting {
  id: string;
  flashSalePrice: number;
  sold: number;
}

export interface FlashSaleSettings {
  isActive: boolean;
  products: FlashSaleProductSetting[];
  startTime: string;
  endTime: string;
}

export interface CheapChampionSettings {
  isActive: boolean;
  productIds: string[];
  startTime: string;
  endTime: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
}

export interface BlogCategoryItem {
  id: number | string;
  label: string;
  link: string;
  icon: string;
  group: 'main' | 'category' | 'subcategory';
  parentLabel?: string;
  h1?: string;
  description?: string;
  seoTitle?: string;
  metaDescription?: string;
}

export interface PolicyPageSection {
  heading: string;
  body: string;
}

export interface PolicyPageItem {
  slug: string;
  title: string;
  description: string;
  sections: PolicyPageSection[];
}

export type PolicyPagesState = Record<string, PolicyPageItem>;

export interface CustomCssSetting {
  css?: string;
}

export interface ListSetting<T> {
  items?: T[];
}

export interface FlashSaleSettingPayload extends Partial<FlashSaleSettings> {
  productIds?: string[];
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status?: 'active' | 'unsubscribed';
  source?: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export type NavigationSetting = ListSetting<NavigationItem>;
