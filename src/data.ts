import { Category, Product, CategoryInfo, BlogPost, Order, Voucher } from './types';

export const CATEGORY_METADATA: CategoryInfo[] = [
  { 
    name: 'Áo thun nam', 
    slug: 'ao-thun-nam', 
    icon: '/images/ao-thun-nam.webp' 
  },
  { 
    name: 'Áo thun thể thao nam', 
    slug: 'ao-thun-the-thao-nam', 
    icon: '/images/ao-thun-the-thao-nam.webp' 
  },
  { 
    name: 'Áo polo nam', 
    slug: 'ao-polo-nam', 
    icon: '/images/ao-polo-nam.webp' 
  },
  { 
    name: 'Quần thể thao nam', 
    slug: 'quan-the-thao-nam', 
    icon: '/images/quan-the-thao-nam.webp' 
  },
  { 
    name: 'Phụ kiện thể thao', 
    slug: 'phu-kien-the-thao', 
    icon: '/images/phu-kien-the-thao.webp' 
  },
];

export const CATEGORIES: Category[] = CATEGORY_METADATA.map(c => c.name);

export const PRODUCTS: Product[] = [];

export const BANNERS = [
  { id: 1, image: '/images/ao-thun-nam.webp', title: 'HIỆU SUẤT VƯỢT TRỘI' },
  { id: 2, image: '/images/ao-thun-the-thao-nam.webp', title: 'THỜI TRANG ĐỈNH CAO' },
  { id: 3, image: '/images/ao-polo-nam.webp', title: 'BỘ SƯU TẬP MỚI' },
  { id: 4, image: '/images/quan-the-thao-nam.webp', title: 'PHÁ VỠ GIỚI HẠN' },
  { id: 5, image: '/images/phu-kien-the-thao.webp', title: 'TỰ TIN TỎA SÁNG' }
];

export const STATIC_BLOG_POSTS: BlogPost[] = [];

export const STATIC_ORDERS: Order[] = [
  { id: 'ord-1001', userId: 'usr-1', items: [{ ...PRODUCTS[0], selectedColor: 'Đen', selectedSize: 'L', quantity: 2 }], total: 500000, status: 'pending', shippingAddress: { fullName: 'Nguyễn Văn A', phone: '0901234567', address: '123 Lê Lợi, Q.1, TP.HCM' }, paymentMethod: 'cod', createdAt: new Date(Date.now() - 10000) },
  { id: 'ord-1002', userId: 'usr-2', items: [{ ...PRODUCTS[15], selectedColor: 'Trắng', selectedSize: 'M', quantity: 1 }, { ...PRODUCTS[20], selectedColor: 'Xám', selectedSize: 'L', quantity: 1 }], total: 850000, status: 'processing', shippingAddress: { fullName: 'Trần Thị B', phone: '0912345678', address: '45 Nguyễn Huệ, Q.1, TP.HCM' }, paymentMethod: 'bank_transfer', createdAt: new Date(Date.now() - 86400000) },
  { id: 'ord-1003', userId: 'usr-3', items: [{ ...PRODUCTS[30], selectedColor: 'Xanh Navy', selectedSize: 'XL', quantity: 3 }], total: 1470000, status: 'shipped', shippingAddress: { fullName: 'Lê Hoàng C', phone: '0987654321', address: '89 Trần Hưng Đạo, Q.5, TP.HCM' }, paymentMethod: 'momo', createdAt: new Date(Date.now() - 172800000) },
  { id: 'ord-1004', userId: 'usr-4', items: [{ ...PRODUCTS[5], selectedColor: 'Xanh Mint', selectedSize: 'M', quantity: 1 }], total: 270000, status: 'delivered', shippingAddress: { fullName: 'Phạm Văn D', phone: '0933445566', address: '12 Võ Văn Tần, Q.3, TP.HCM' }, paymentMethod: 'cod', createdAt: new Date(Date.now() - 259200000) },
  { id: 'ord-1005', userId: 'usr-5', items: [{ ...PRODUCTS[8], selectedColor: 'Đỏ', selectedSize: 'S', quantity: 2 }], total: 700000, status: 'cancelled', shippingAddress: { fullName: 'Hoàng Thị E', phone: '0977889900', address: '55 Hai Bà Trưng, Q.1, TP.HCM' }, paymentMethod: 'zalopay', createdAt: new Date(Date.now() - 345600000) }
];

export const STATIC_CUSTOMERS = [
  { id: 'usr-1', name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', phone: '0901234567', ordersCount: 5, totalSpent: 2500000 },
  { id: 'usr-2', name: 'Trần Thị B', email: 'tranthib@gmail.com', phone: '0912345678', ordersCount: 2, totalSpent: 1200000 },
  { id: 'usr-3', name: 'Lê Hoàng C', email: 'lehoangc@gmail.com', phone: '0987654321', ordersCount: 8, totalSpent: 5400000 },
  { id: 'usr-4', name: 'Phạm Văn D', email: 'phamvand@gmail.com', phone: '0933445566', ordersCount: 1, totalSpent: 270000 },
  { id: 'usr-5', name: 'Hoàng Thị E', email: 'hoangthie@gmail.com', phone: '0977889900', ordersCount: 3, totalSpent: 1800000 }
];

export const STATIC_VOUCHERS: Voucher[] = [
  {
    id: 'vc-1',
    name: 'Giảm giá cuối tuần',
    code: 'WEEKEND20',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 86400000 * 7).toISOString(),
    type: 'khuyen_mai',
    discountType: 'percent',
    discountValue: 10,
    maxDiscountValue: 50000,
    minOrderValue: 200000,
    maxUsage: 100,
    maxUsagePerUser: 1,
    usedCount: 15,
    isActive: true,
    applicableProducts: ['all']
  },
  {
    id: 'vc-2',
    name: 'Mã giảm giá Khách mới',
    code: 'NEWBIE',
    startTime: new Date(Date.now() - 86400000 * 30).toISOString(),
    endTime: new Date(Date.now() + 86400000 * 30).toISOString(),
    type: 'khuyen_mai',
    discountType: 'fixed',
    discountValue: 20000,
    minOrderValue: 100000,
    maxUsage: 500,
    maxUsagePerUser: 1,
    usedCount: 450,
    isActive: true,
    applicableProducts: ['all']
  }
];
