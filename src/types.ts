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

export interface Product {
  id: string;
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
  createdAt?: any;
}

export interface CartItem extends Product {
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
  images?: string[];
  videos?: string[];
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
  paymentMethod?: 'cod' | 'bank_transfer' | 'momo' | 'zalopay' | 'shopeepay' | string;
  note?: string;
  createdAt: any;
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
  customSchema?: string;
  images?: string[];
  videos?: string[];
  createdAt?: any;
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
  createdAt?: any;
}
