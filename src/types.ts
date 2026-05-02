export type Category = 'Áo thun nam' | 'Áo thun thể thao nam' | 'Áo polo nam' | 'Quần thể thao nam' | 'Phụ kiện thể thao' | 'All';

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
  category: Category;
  colors: string[];
  sizes: string[];
  stock: number;
  rating: number;
  reviewsCount: number;
  features: string[];
  isNew?: boolean;
  isBestSeller?: boolean;
}

export interface CartItem extends Product {
  selectedColor: string;
  selectedSize: string;
  quantity: number;
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
  createdAt: string;
}
