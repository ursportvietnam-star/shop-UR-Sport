import type { FirestoreTimestamp } from './types/firestore';

export type Category =
  | 'Áo thun nam'
  | 'Áo thun thể thao nam'
  | 'Áo thun nam thể thao'
  | 'Áo thun nam cotton'
  | 'Áo thun nam form rộng'
  | 'Áo polo nam'
  | 'Quần thể thao nam'
  | 'Phụ kiện thể thao'
  | 'All';

export interface CategoryInfo {
  name: Category;
  slug: string;
  icon: string;
}

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  sku?: string;
}

export interface Product {
  id: string;
  productCode?: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  videos?: string[];
  category: Category;
  colors: string[];
  sizes: string[];
  variants?: ProductVariant[];
  stock: number;
  rating: number;
  reviewsCount: number;
  features: string[];
  isNew?: boolean;
  isBestSeller?: boolean;
  sizeGuideUrl?: string;
  colorImages?: { name: string; image: string }[];
  seoTitle?: string;
  metaDescription?: string;
  keywords?: string;
  specifications?: string;
  careInstructions?: string;
  brand?: string;
  origin?: string;
  style?: string;
  material?: string;
  fashionStyle?: string;
  collarType?: string;
  marketplaceLinks?: {
    shopee?: string;
    tiktokShop?: string;
  };
  createdAt?: FirestoreTimestamp;
}

export interface CartItem extends Product {
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  orderId?: string;
  userId?: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: FirestoreTimestamp;
  images?: string[];
  videos?: string[];
  variant?: string;
  status?: 'pending' | 'approved' | 'hidden';
  adminReply?: string;
  repliedAt?: FirestoreTimestamp;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  discountAmount?: number;
  shippingFee?: number;
  finalTotal?: number;
  voucherCode?: string | null;
  orderCode?: string;
  transferContent?: string | null;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  trackingUrl?: string;
  loyaltyPointsEarned?: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
  email?: string;
  paymentMethod?: 'cod' | 'bank_transfer' | 'momo' | 'zalopay' | 'shopeepay' | string;
  note?: string;
  createdAt: FirestoreTimestamp;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  date: string;
  image: string;
  excerpt: string;
  content: string;
  seoTitle?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string;
  customSchema?: string;
  images?: string[];
  videos?: string[];
  createdAt?: FirestoreTimestamp;
}

export interface Voucher {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  type: 'khuyen_mai' | 'hoan_xu';
  discountType: 'fixed' | 'percent';
  discountValue: number;
  maxDiscountValue?: number;
  minOrderValue: number;
  maxUsage: number;
  maxUsagePerUser: number;
  usedCount: number;
  isActive: boolean;
  applicableProducts?: string[]; // array of product ids or 'all'
  createdAt?: FirestoreTimestamp;
}
