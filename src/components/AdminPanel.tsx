import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, MessageSquare,
  Image as ImageIcon, Settings, Plus, Trash2, Edit2, LogOut,
  TrendingUp, Eye, DollarSign, BarChart2, Menu, X, Bell,
  Search, ChevronRight, ChevronDown, Megaphone, Upload, Star, AlertCircle, Copy, ExternalLink, Code2, Check as CheckIcon, Bot, Sparkles, Zap, Timer, Clock, Ticket, Download, Filter, MailCheck, Send, UserPlus, ShieldCheck, Network
} from 'lucide-react';
import { PRODUCTS as STATIC_PRODUCTS, STATIC_BLOG_POSTS, STATIC_ORDERS, STATIC_CUSTOMERS, CATEGORY_METADATA, STATIC_VOUCHERS } from '../data';
import { ImageUpload } from './ImageUpload';
import { AddProductModal } from './AddProductModal';
import { AddBlogPostModal } from './AddBlogPostModal';
import { AddVoucherModal } from './AddVoucherModal';
import { OrderDetailModal } from './OrderDetailModal';
import { CategorySeoManager } from './CategorySeoManager';
import { ContentMapSeoPanel } from './ContentMapSeoPanel';
import { ProductSeoAutomationPanel, ProductSeoScoreBadge } from './ProductSeoAutomationPanel';
import { AIProductData, AIBlogData, AIProductSeoFix } from '../lib/gemini';
import { useAuth } from '../AuthContext';
import { Product, BlogPost, Order, Voucher, Review } from '../types';
import type {
  AdminNavigationItem,
  AdminOrderStatus,
  AdminTab,
  BannerItem,
  BlogCategoryItem,
  FirestoreTimestamp,
  FlashSaleSettings,
  FloatingMenuSettings,
  MediaItem,
  NavigationItem,
  NewsletterSendResult,
  NewsletterSubscriber,
} from '../types/admin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SEO_SUBCATEGORIES,
  belongsToCategory,
  defaultNavigationItems,
  getProductCategoryOptions,
  linkForCategoryLabel,
  linkForSubcategoryLabel,
  normalizeMenuLabel,
  normalizeNavigationItem,
  ProductCategoryOption,
  slugifyVietnamese
} from '../lib/categoryConfig';
import {
  addAdminDocument,
  adminTimestamp,
  deleteAdminDocument,
  getAdminSetting,
  mergeAdminDocument,
  saveAdminSetting,
  subscribeAdminCollection,
  updateAdminDocument,
} from '../services/adminData';

const AIProductAssistant = React.lazy(() =>
  import('./AIProductAssistant').then(module => ({ default: module.AIProductAssistant }))
);
const AIBlogAssistant = React.lazy(() =>
  import('./AIBlogAssistant').then(module => ({ default: module.AIBlogAssistant }))
);
const AdminSettingsTab = React.lazy(() =>
  import('./admin/AdminSettingsTab').then(module => ({ default: module.AdminSettingsTab }))
);
const MediaLibraryTab = React.lazy(() =>
  import('./admin/MediaLibraryTab').then(module => ({ default: module.MediaLibraryTab }))
);
const PolicyPagesManager = React.lazy(() =>
  import('./admin/PolicyPagesManager').then(module => ({ default: module.PolicyPagesManager }))
);

const AdminTabFallback = () => (
  <div className="rounded-2xl border border-white/5 bg-[#13161f] p-10 text-center">
    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#1e4b64]" />
    <p className="text-sm font-bold text-white/40">Đang tải công cụ...</p>
  </div>
);

const BLOG_CATEGORIES_STORAGE_KEY = 'ursport_blog_categories_final_v1';

const NAV_ITEMS: AdminNavigationItem[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'strategy', label: 'Chiến lược', icon: BarChart2 },
  {
    id: 'sales-group',
    label: 'Quản lý Bán hàng',
    icon: ShoppingBag,
    isGroup: true,
    children: [
      { id: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
      { id: 'customers', label: 'Khách hàng', icon: Users },
      { id: 'reviews', label: 'Quản lý đánh giá', icon: ShieldCheck },
    ]
  },
  {
    id: 'catalog-group',
    label: 'Nội dung & Sản phẩm',
    icon: Package,
    isGroup: true,
    children: [
      { id: 'products', label: 'Sản phẩm', icon: Package },
      { id: 'blog', label: 'Bài viết (Blog)', icon: MessageSquare },
      { id: 'blog-categories', label: 'Danh mục Blog', icon: MessageSquare },
    ]
  },
  {
    id: 'marketing-group',
    label: 'Marketing & Khuyến mãi',
    icon: Megaphone,
    isGroup: true,
    children: [
      { id: 'flash-sale', label: 'Flash Sale', icon: Zap },
      { id: 'vouchers', label: 'Mã giảm giá', icon: Ticket },
      { id: 'newsletter', label: 'Email đăng ký', icon: MailCheck },
    ]
  },
  {
    id: 'seo-ai-group',
    label: 'SEO & Công cụ AI',
    icon: Bot,
    isGroup: true,
    children: [
      { id: 'ai-product', label: 'AI Sản Phẩm', icon: Bot },
      { id: 'ai-blog', label: 'AI Tạo Blog', icon: Sparkles },
      { id: 'category-seo', label: 'SEO Danh mục', icon: Search },
      { id: 'content-map', label: 'Content Map SEO', icon: Network },
    ]
  },
  {
    id: 'system-group',
    label: 'Hệ thống',
    icon: Settings,
    isGroup: true,
    children: [
      { id: 'media', label: 'Thư viện ảnh', icon: ImageIcon },
      { id: 'policy-pages', label: 'Trang chính sách', icon: Code2 },
      { id: 'settings', label: 'Cài đặt chung', icon: Settings },
    ]
  },
];

const slugifyBlogCategory = (label: string) =>
  `/${slugifyVietnamese(label) || 'blog-category'}`;

const normalizeBlogCategoryItem = (item: string | Partial<BlogCategoryItem>, index = 0): BlogCategoryItem => {
  const source = typeof item === 'string' ? { label: item } : item;
  const label = source.label?.trim() || 'Danh mục Blog';
  const group = source.group === 'category' || source.group === 'subcategory' ? source.group : 'main';
  const savedH1 = source.h1?.trim();
  const hasMainBlogH1 = group !== 'main' && savedH1 && normalizeMenuLabel(savedH1) === normalizeMenuLabel('Tin tức & Bài viết');
  const h1 = savedH1 && !hasMainBlogH1 ? savedH1 : label;

  return {
    id: source.id || Date.now() + index,
    label,
    link: source.link || slugifyBlogCategory(label),
    icon: source.icon || '',
    group,
    parentLabel: source.parentLabel || '',
    h1,
    description: source.description || '',
    seoTitle: source.seoTitle || `${label} | Blog UR Sport`,
    metaDescription: source.metaDescription || source.description || ''
  };
};

const DEFAULT_BLOG_CATEGORIES: BlogCategoryItem[] = [
  {
    id: 1,
    label: 'Tất cả',
    link: '/blog',
    icon: '',
    group: 'main',
    h1: 'Tin tức & Bài viết',
    description: 'Cập nhật kiến thức chọn áo thun nam, chất liệu, dáng người, áo thun thể thao và hướng dẫn mua áo từ UR Sport.',
    seoTitle: 'Tin tức áo thun nam & thời trang thể thao | UR Sport',
    metaDescription: 'Blog UR Sport chia sẻ kiến thức áo thun nam, chất liệu áo thun, cách chọn áo theo dáng người, áo thun thể thao và hướng dẫn mua áo.'
  },
  {
    id: 2,
    label: 'Áo thun nam',
    link: '/blog/ao-thun-nam',
    icon: '',
    group: 'category',
    h1: 'Kiến thức áo thun nam',
    description: 'Tổng hợp kiến thức chọn áo thun nam đẹp, dễ mặc, đúng form và phù hợp phong cách hằng ngày.',
    seoTitle: 'Kiến thức áo thun nam | Blog UR Sport',
    metaDescription: 'Tìm hiểu cách chọn áo thun nam theo form, phong cách, hoàn cảnh sử dụng và các tiêu chí giúp áo mặc đẹp hơn.'
  },
  {
    id: 3,
    label: 'Chất liệu áo thun',
    link: '/blog/chat-lieu-ao-thun',
    icon: '',
    group: 'category',
    h1: 'Chất liệu áo thun nam',
    description: 'Phân tích các chất liệu áo thun phổ biến, độ thoáng mát, co giãn, thấm hút và độ bền khi sử dụng.',
    seoTitle: 'Chất liệu áo thun nam | Blog UR Sport',
    metaDescription: 'So sánh cotton, thun lạnh, polyester và các chất liệu áo thun nam để chọn áo thoáng mát, bền đẹp và dễ chăm sóc.'
  },
  {
    id: 4,
    label: 'Chọn áo theo dáng',
    link: '/blog/chon-ao-theo-dang',
    icon: '',
    group: 'category',
    h1: 'Chọn áo thun theo dáng người',
    description: 'Gợi ý chọn form áo thun nam theo dáng người để mặc vừa vặn, tôn dáng và tự tin hơn.',
    seoTitle: 'Chọn áo thun theo dáng người | Blog UR Sport',
    metaDescription: 'Hướng dẫn chọn áo thun nam theo dáng người, từ dáng gầy, đầy đặn đến vai rộng để tối ưu form mặc.'
  },
  {
    id: 5,
    label: 'Áo thun thể thao',
    link: '/blog/ao-thun-the-thao',
    icon: '',
    group: 'category',
    h1: 'Áo thun thể thao nam',
    description: 'Kinh nghiệm chọn áo thun thể thao nam thoáng khí, co giãn tốt và phù hợp tập luyện hoặc mặc thường ngày.',
    seoTitle: 'Áo thun thể thao nam | Blog UR Sport',
    metaDescription: 'Cập nhật kiến thức về áo thun thể thao nam, chất liệu thấm hút, form áo tập luyện và cách phối đồ năng động.'
  },
  {
    id: 6,
    label: 'Hướng dẫn mua áo',
    link: '/blog/huong-dan-mua-ao',
    icon: '',
    group: 'category',
    h1: 'Hướng dẫn mua áo thun nam',
    description: 'Các hướng dẫn chọn size, kiểm tra chất liệu, chọn form và mua áo thun nam phù hợp nhu cầu.',
    seoTitle: 'Hướng dẫn mua áo thun nam | Blog UR Sport',
    metaDescription: 'Xem hướng dẫn mua áo thun nam: chọn size, chọn chất liệu, chọn form áo và các lưu ý trước khi đặt hàng.'
  }
];

const loadCachedBlogCategories = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = window.localStorage.getItem(BLOG_CATEGORIES_STORAGE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map((item, index) => normalizeBlogCategoryItem(item, index))
      : null;
  } catch {
    return null;
  }
};

const cacheBlogCategories = (items: BlogCategoryItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BLOG_CATEGORIES_STORAGE_KEY, JSON.stringify(items));
};

export const AdminPanel: React.FC = () => {
  const { user, isAdmin, loading: authLoading, logout, devLogin } = useAuth();
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['sales-group', 'catalog-group']);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewReplies, setReviewReplies] = useState<Record<string, string>>({});
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [manualNewsletterEmail, setManualNewsletterEmail] = useState('');
  const [selectedNewsletterIds, setSelectedNewsletterIds] = useState<string[]>([]);
  const [newsletterSubject, setNewsletterSubject] = useState('Ưu đãi mới từ UR Sport');
  const [newsletterMessage, setNewsletterMessage] = useState('Cám ơn quý khách đã đăng ký nhận tin từ UR Sport. Chúng tôi gửi đến quý khách chương trình ưu đãi mới nhất.');
  const [selectedNewsletterVoucherId, setSelectedNewsletterVoucherId] = useState('');
  const [newsletterSendToken, setNewsletterSendToken] = useState('');
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [customCss, setCustomCss] = useState('');
  const [blogCategories, setBlogCategories] = useState<BlogCategoryItem[]>(() => loadCachedBlogCategories() || DEFAULT_BLOG_CATEGORIES);
  const blogCategoriesDirtyRef = useRef(false);
  const [expandedBlogCategoryIds, setExpandedBlogCategoryIds] = useState<Array<string | number>>([]);
  const [newBlogCategory, setNewBlogCategory] = useState('');
  const [cssSaved, setCssSaved] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuSettings>({
    zaloPhone: '0917722425',
    callPhone: '0917722425',
    zaloIcon: 'https://res.cloudinary.com/dcj4qhcfh/image/upload/v1778164803/media/rbkdvi2xgqeg6b79cq1n.webp',
    callIcon: 'https://res.cloudinary.com/dcj4qhcfh/image/upload/v1778166005/media/ximp16qsaxdt7noebddh.jpg'
  });
  const [flashSaleSettings, setFlashSaleSettings] = useState<FlashSaleSettings>({
    isActive: false,
    products: [] as { id: string; flashSalePrice: number; sold: number }[],
    startTime: '',
    endTime: '',
  });
  const [showSitemapPreview, setShowSitemapPreview] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeAdminCollection<Product>('products', (data) => {
      setProducts(data.length > 0 ? data : STATIC_PRODUCTS);
      setLoading(false);
    }, () => {
      setProducts(STATIC_PRODUCTS);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeAdminCollection<BlogPost>('blogPosts', (data) => {
      setBlogPosts(data.length > 0 ? data : STATIC_BLOG_POSTS);
    }, () => {
      setBlogPosts(STATIC_BLOG_POSTS);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeAdminCollection<Order>('orders', (data) => {
      setOrders(data.length > 0 ? data : STATIC_ORDERS);
    }, () => {
      setOrders(STATIC_ORDERS);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeAdminCollection<Review>('reviews', (data) => {
      setReviews(data);
      setReviewReplies(Object.fromEntries(data.map(review => [review.id, review.adminReply || ''])));
    }, () => {
      setReviews([]);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeAdminCollection<MediaItem>('media', (data) => {
      setMediaItems(data);
    }, () => {
      setMediaItems([]);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeAdminCollection<NewsletterSubscriber>('newsletterSubscribers', (data) => {
      setNewsletterSubscribers(data);
    }, () => {
      setNewsletterSubscribers([]);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeAdminCollection<Voucher>('vouchers', (data) => {
      setVouchers(data.length > 0 ? data : STATIC_VOUCHERS);
    }, () => {
      setVouchers(STATIC_VOUCHERS);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Load settings from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    getAdminSetting<{ css?: string }>('customCss').then(data => {
      if (data) setCustomCss(data.css || '');
    });
    getAdminSetting<{ items?: BlogCategoryItem[] }>('blogCategories').then(data => {
      const cached = loadCachedBlogCategories();
      if (isLocalhost) {
        cacheBlogCategories(cached || DEFAULT_BLOG_CATEGORIES);
        if (!cached && !blogCategoriesDirtyRef.current) {
          setBlogCategories(DEFAULT_BLOG_CATEGORIES);
        }
        return;
      }

      if (data) {
        const categories = data.items;
        if (Array.isArray(categories) && categories.length > 0) {
          const normalized = categories.map((item, index) => normalizeBlogCategoryItem(item, index));
          cacheBlogCategories(normalized);
          if (!blogCategoriesDirtyRef.current) {
            setBlogCategories(normalized);
          }
        }
      }
    });
    getAdminSetting<{ items?: BannerItem[] }>('banners').then(data => {
      if (data) setBanners(data.items || []);
    });
    getAdminSetting<{ items?: NavigationItem[] }>('navigation').then(data => {
      if (data) {
        setNavigation((data.items || []).map(normalizeNavigationItem));
      } else {
        setNavigation(defaultNavigationItems());
      }
    });
    getAdminSetting<Partial<FloatingMenuSettings>>('floatingMenu').then(data => {
      if (data) setFloatingMenu(prev => ({ ...prev, ...data }));
    });
    getAdminSetting<Partial<FlashSaleSettings> & { productIds?: string[] }>('flashSale').then(data => {
      if (data) {
        setFlashSaleSettings(prev => ({ 
          ...prev, 
          ...data,
          // Migration/Compatibility check
          products: data.products || (data.productIds || []).map((id: string) => ({ id, flashSalePrice: 0, sold: 0 }))
        }));
      }
    });
  }, [isAdmin]);

  const handleSaveCss = async () => {
    try {
      await saveAdminSetting('customCss', { css: customCss });
      // Inject immediately into current page
      let styleEl = document.getElementById('custom-global-css') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-global-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = customCss;
      setCssSaved(true);
      toast.success('CSS đã được lưu và áp dụng!');
      setTimeout(() => setCssSaved(false), 2000);
    } catch {
      toast.error('Lỗi khi lưu CSS');
    }
  };

  const handleSaveBlogCategories = async (categories: BlogCategoryItem[]) => {
    const seenLabels = new Set<string>();
    const normalized = categories
      .map((item, index) => normalizeBlogCategoryItem(item, index))
      .filter(item => {
        const key = normalizeMenuLabel(item.label);
        if (!key || seenLabels.has(key)) return false;
        seenLabels.add(key);
        return true;
      });

    if (normalized.length === 0) {
      toast.error('Cần ít nhất 1 danh mục blog');
      return;
    }

    try {
      cacheBlogCategories(normalized);
      setBlogCategories(normalized);
      await saveAdminSetting('blogCategories', { items: normalized });
      blogCategoriesDirtyRef.current = false;
      toast.success('Đã lưu danh mục Blog');
    } catch {
      blogCategoriesDirtyRef.current = false;
      toast.warning('Đã lưu danh mục Blog trên trình duyệt local. Firestore chưa cho phép ghi dữ liệu.');
    }
  };

  const handleAddBlogCategory = () => {
    const categoryName = newBlogCategory.trim();
    if (!categoryName) return;
    if (blogCategories.some(item => normalizeMenuLabel(item.label) === normalizeMenuLabel(categoryName))) {
      toast.error('Danh mục này đã tồn tại');
      return;
    }

    const nextCategories = [
      ...blogCategories,
      normalizeBlogCategoryItem({
        id: Date.now(),
        label: categoryName,
        link: `/blog/category/${slugifyBlogCategory(categoryName).replace(/^\//, '')}`,
        icon: '',
        group: 'category'
      })
    ];
    setNewBlogCategory('');
    handleSaveBlogCategories(nextCategories);
  };

  const handleDeleteCss = async () => {
    if (!window.confirm('Xóa toàn bộ CSS tùy biến?')) return;
    try {
      await saveAdminSetting('customCss', { css: '' });
      setCustomCss('');
      const styleEl = document.getElementById('custom-global-css');
      if (styleEl) styleEl.textContent = '';
      toast.success('Đã xóa CSS tùy biến');
    } catch {
      toast.error('Lỗi khi xóa CSS');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await deleteAdminDocument('products', id);
      toast.success('Đã xóa sản phẩm');
    } catch {
      toast.error('Lỗi khi xóa sản phẩm');
    }
  };

  const handleDeleteBlogPost = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await deleteAdminDocument('blogPosts', id);
      toast.success('Đã xóa bài viết');
    } catch {
      toast.error('Lỗi khi xóa bài viết');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Xóa đơn hàng này?')) return;
    try {
      await deleteAdminDocument('orders', id);
      toast.success('Đã xóa đơn hàng');
    } catch {
      toast.error('Lỗi khi xóa đơn hàng');
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
      await deleteAdminDocument('vouchers', id);
      toast.success('Đã xóa mã giảm giá');
    } catch {
      toast.error('Lỗi khi xóa mã giảm giá');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await mergeAdminDocument('orders', id, { status });
      toast.success('Đã cập nhật trạng thái đơn hàng');
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleUpdateTracking = async (order: Order, field: 'trackingNumber' | 'trackingUrl', value: string) => {
    try {
      await mergeAdminDocument('orders', order.id, { [field]: value });
      toast.success('Đã cập nhật vận đơn');
    } catch {
      toast.error('Không thể cập nhật vận đơn');
    }
  };

  const handleUpdateReviewStatus = async (review: Review, status: Review['status']) => {
    try {
      await updateAdminDocument('reviews', review.id, { status });
      toast.success(status === 'approved' ? 'Đã duyệt đánh giá' : 'Đã cập nhật đánh giá');
    } catch {
      toast.error('Không thể cập nhật đánh giá');
    }
  };

  const handleSaveReviewReply = async (review: Review) => {
    try {
      await updateAdminDocument('reviews', review.id, {
        adminReply: reviewReplies[review.id] || '',
        repliedAt: adminTimestamp()
      });
      toast.success('Đã lưu phản hồi');
    } catch {
      toast.error('Không thể lưu phản hồi');
    }
  };

  const handleCopy = async (product: Product) => {
    try {
      const { id: _productId, ...productData } = product;
      const copy = {
        ...productData,
        name: product.name + ' (Copy)',
        slug: (product.slug || '') + '-copy-' + Date.now(),
        createdAt: adminTimestamp(),
        rating: 5,
        reviewsCount: 0,
      };
      await addAdminDocument('products', copy);
      toast.success('Sản phẩm đã được sao chép thành công!');
    } catch {
      toast.error('Lỗi khi sao chép sản phẩm');
    }
  };

  const handleSaveMedia = async (url: string) => {
    try {
      await addAdminDocument('media', {
        url,
        createdAt: adminTimestamp()
      });
      toast.success('Đã lưu ảnh vào thư viện!');
    } catch {
      toast.error('Lỗi khi lưu vào thư viện');
    }
  };

  const handleSaveBanners = async (newBanners: BannerItem[]) => {
    try {
      await saveAdminSetting('banners', { items: newBanners });
      setBanners(newBanners);
      toast.success('Đã lưu cài đặt Banner');
    } catch (error) {
      toast.error('Lỗi khi lưu Banner');
    }
  };

  const handleSaveNavigation = async (newNav: NavigationItem[]) => {
    try {
      const normalized = newNav.map(normalizeNavigationItem);
      await saveAdminSetting('navigation', { items: normalized });
      setNavigation(normalized);
      toast.success('Đã lưu Menu Navigation');
    } catch (error) {
      toast.error('Lỗi khi lưu Menu');
    }
  };

  const updateNavigationItem = (itemId: number | string, updater: (item: NavigationItem) => NavigationItem) => {
    setNavigation(prev => prev.map(item => item.id === itemId ? updater({ ...item }) : item));
  };

  const removeNavigationItem = (itemId: number | string) => {
    if (window.confirm('Xóa mục này?')) {
      handleSaveNavigation(navigation.filter(item => item.id !== itemId));
    }
  };

  const addChildNavigationItem = (parent: NavigationItem) => {
    const childLabel = `${parent.label} mục con`;
    const childItem = normalizeNavigationItem({
      id: Date.now(),
      label: childLabel,
      link: linkForSubcategoryLabel(childLabel),
      icon: '',
      group: 'subcategory',
      parentLabel: parent.label
    });
    const parentIndex = navigation.findIndex(item => item.id === parent.id);
    const updated = [...navigation];
    updated.splice(parentIndex + 1, 0, childItem);
    setNavigation(updated);
  };

  const handleSaveFloatingMenu = async () => {
    try {
      await saveAdminSetting('floatingMenu', floatingMenu);
      toast.success('Đã cập nhật cài đặt Menu nổi!');
    } catch {
      toast.error('Lỗi khi lưu cài đặt');
    }
  };

  const handleSaveFlashSale = async () => {
    try {
      await saveAdminSetting('flashSale', flashSaleSettings);
      toast.success('Đã lưu cài đặt Flash Sale!');
    } catch {
      toast.error('Lỗi khi lưu Flash Sale');
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm('Xóa ảnh này khỏi thư viện?')) return;
    try {
      await deleteAdminDocument('media', id);
      toast.success('Đã xóa ảnh');
    } catch {
      toast.error('Lỗi khi xóa ảnh');
    }
  };

  const handleNewsletterStatus = async (subscriber: NewsletterSubscriber, status: 'active' | 'unsubscribed') => {
    try {
      await mergeAdminDocument('newsletterSubscribers', subscriber.id, {
        ...subscriber,
        status,
        updatedAt: adminTimestamp()
      });
      toast.success(status === 'active' ? 'Đã bật nhận tin' : 'Đã hủy nhận tin');
    } catch {
      toast.error('Lỗi khi cập nhật email đăng ký');
    }
  };

  const handleDeleteNewsletterSubscriber = async (subscriber: NewsletterSubscriber) => {
    if (!window.confirm(`Xóa email ${subscriber.email} khỏi danh sách đăng ký?`)) return;
    try {
      await deleteAdminDocument('newsletterSubscribers', subscriber.id);
      setSelectedNewsletterIds(prev => prev.filter(id => id !== subscriber.id));
      toast.success('Đã xóa email đăng ký');
    } catch {
      toast.error('Lỗi khi xóa email đăng ký');
    }
  };

  const handleAddNewsletterSubscriber = async () => {
    const email = manualNewsletterEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email không hợp lệ');
      return;
    }

    try {
      await mergeAdminDocument('newsletterSubscribers', encodeURIComponent(email), {
        email,
        status: 'active',
        source: 'admin',
        updatedAt: adminTimestamp(),
        createdAt: adminTimestamp()
      });
      setManualNewsletterEmail('');
      toast.success('Đã thêm email vào danh sách');
    } catch {
      toast.error('Lỗi khi thêm email');
    }
  };

  const handleSendNewsletter = async () => {
    const selectedSubscribers = newsletterSubscribers.filter(item =>
      selectedNewsletterIds.includes(item.id) && item.status !== 'unsubscribed'
    );
    const recipients = selectedSubscribers.map(item => item.email);
    const selectedVoucher = vouchers.find(item => item.id === selectedNewsletterVoucherId);

    if (recipients.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 email đang nhận tin');
      return;
    }

    if (!newsletterSubject.trim() || !newsletterMessage.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung email');
      return;
    }

    if (!newsletterSendToken.trim()) {
      toast.error('Vui lòng nhập mã gửi email');
      return;
    }

    setIsSendingNewsletter(true);
    try {
      const response = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Newsletter-Token': newsletterSendToken.trim()
        },
        body: JSON.stringify({
          recipients,
          subject: newsletterSubject.trim(),
          message: newsletterMessage.trim(),
          voucher: selectedVoucher ? {
            name: selectedVoucher.name,
            code: selectedVoucher.code,
            description: selectedVoucher.discountType === 'percent'
              ? `Giảm ${selectedVoucher.discountValue}%${selectedVoucher.maxDiscountValue ? `, tối đa ${selectedVoucher.maxDiscountValue.toLocaleString('vi-VN')}₫` : ''}`
              : `Giảm ${selectedVoucher.discountValue.toLocaleString('vi-VN')}₫`
          } : null
        })
      });

      const result = await response.json().catch(() => ({})) as NewsletterSendResult;
      if (!response.ok) {
        throw new Error(result.error || 'Gửi email thất bại');
      }

      toast.success(`Đã gửi ${result.sent || 0} email${result.failed ? `, lỗi ${result.failed}` : ''}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi gửi email');
    } finally {
      setIsSendingNewsletter(false);
    }
  };

  const handleView = (product: Product) => {
    const catSlug = product.category
      ? product.category.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      : 'san-pham';
    window.open(`/apparel/${catSlug}/${product.slug}`, '_blank');
  };

  const generateSitemapString = () => {
    const baseUrl = 'https://ursport.vn';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const staticRoutes = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/shop', priority: '0.9', changefreq: 'daily' },
      { path: '/blog', priority: '0.7', changefreq: 'weekly' }
    ];

    const categoryRoutes = CATEGORY_METADATA.map(cat => ({
      path: `/${cat.slug}`,
      priority: '0.8',
      changefreq: 'weekly'
    }));

    const subcategoryRoutes = DEFAULT_SEO_SUBCATEGORIES
      .filter(item => item.slug !== 'ao-thun-the-thao-nam')
      .map(item => ({
        path: item.link,
        priority: '0.75',
        changefreq: 'weekly'
      }));

    const productRoutes = products.map(p => ({
      path: `/${p.slug}`,
      priority: '0.7',
      changefreq: 'weekly'
    }));

    const blogRoutes = blogPosts.map(b => ({
      path: `/blog/${b.slug}`,
      priority: '0.6',
      changefreq: 'monthly'
    }));

    const allRoutes = [...staticRoutes, ...categoryRoutes, ...subcategoryRoutes, ...productRoutes, ...blogRoutes];

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    allRoutes.forEach(route => {
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${baseUrl}${route.path}</loc>`);
      xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
      xmlLines.push(`    <changefreq>${route.changefreq}</changefreq>`);
      xmlLines.push(`    <priority>${route.priority}</priority>`);
      xmlLines.push('  </url>');
    });

    xmlLines.push('</urlset>');

    return xmlLines.join('\n');
  };

  const handleGenerateSitemap = () => {
    const xmlContent = generateSitemapString();
    
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Đã tạo và tải xuống sitemap.xml thành công!');
  };

  const handleGenerateRobots = () => {
    const content = `User-agent: *
Allow: /
Disallow: /quan-tri
Disallow: /admin
Disallow: /checkout
Disallow: /api/
Disallow: /*.json$

User-agent: GPTBot
Allow: /
Disallow: /quan-tri
Disallow: /checkout

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /
Disallow: /quan-tri
Disallow: /checkout

User-agent: ClaudeBot
Allow: /
Disallow: /quan-tri
Disallow: /checkout

Crawl-delay: 1

Sitemap: https://ursport.vn/sitemap.xml`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Đã tải xuống robots.txt!');
  };

  const handleApplyAIProduct = (data: AIProductData) => {
    const intro = data.shortDescription?.trim() ? `<p><strong>${data.shortDescription.trim()}</strong></p><p><br></p>` : '';
    const fullDescHtml = `${intro}${data.descriptionHtml || ''}`;
    const newProduct: Partial<Product> = {
      id: `ai_${Date.now()}`,
      name: data.name,
      slug: data.slug,
      description: fullDescHtml,
      seoTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      keywords: data.seoKeywords,
      specifications: fullDescHtml,
      brand: 'UR SPORT',
      origin: 'Việt Nam',
      material: 'Cotton Premium',
      style: 'Slim Fit',
      fashionStyle: 'Thể thao, Cơ bản',
      collarType: 'Cổ tròn'
    };
    setEditingProduct(newProduct as Product);
    setIsAddModalOpen(true);
    toast.success('Đã áp dụng nội dung AI vào form sản phẩm!');
  };

  const handleApplyAIBlog = (data: AIBlogData) => {
    const newBlog: Partial<BlogPost> = {
      title: data.title,
      slug: data.slug,
      content: data.contentHtml,
      excerpt: data.metaDescription,
      seoTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      customSchema: data.faqSchema,
      category: 'Xu hướng thời trang',
      author: 'UR SPORT Team',
      date: new Date().toLocaleDateString('vi-VN')
    };
    setEditingBlogPost(newBlog as BlogPost);
    setIsBlogModalOpen(true);
    toast.success('Đã áp dụng nội dung AI vào form bài viết!');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-[#1e4b64] border-t-transparent animate-spin" />
          <p className="text-white/50 font-medium text-sm">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="h-24 w-24 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tight">Từ chối truy cập</h2>
          <p className="text-white/40 font-medium mb-8 max-w-sm mx-auto">
            {!user ? 'Vui lòng đăng nhập để truy cập trang quản trị.' : 'Tài khoản của bạn không có quyền admin.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-[#1e4b64] hover:bg-[#153446] text-white font-bold rounded-xl transition-all"
          >
            Về trang chủ
          </button>
          {isLocalhost && (
            <button
              onClick={devLogin}
              className="ml-0 mt-3 sm:ml-3 sm:mt-0 px-8 py-3 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold rounded-xl transition-all"
            >
              Đăng nhập admin nội bộ
            </button>
          )}
        </div>
      </div>
    );
  }

  const productFilterOptions = getProductCategoryOptions(navigation);
  const categoryMatchesProductFilter = (productCategory: string) => {
    if (productCategoryFilter === 'all') return true;
    const childLabels = productFilterOptions
      .filter(option => option.parent && normalizeMenuLabel(option.parent) === normalizeMenuLabel(productCategoryFilter))
      .map(option => normalizeMenuLabel(option.label));

    return (
      normalizeMenuLabel(productCategory) === normalizeMenuLabel(productCategoryFilter) ||
      childLabels.includes(normalizeMenuLabel(productCategory)) ||
      belongsToCategory(productCategory, productCategoryFilter)
    );
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch && categoryMatchesProductFilter(p.category);
  });
  const openProductEditor = (product: Product) => {
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };
  const applyProductSeoFix = async (product: Product, fix: AIProductSeoFix) => {
    const intro = fix.shortDescription?.trim() ? `<p>${fix.shortDescription.trim()}</p>` : '';
    const body = fix.descriptionHtml?.trim() || product.description;
    const descriptionHtml = intro && !body.includes(fix.shortDescription.trim())
      ? `${intro}${body}`
      : body;
    await mergeAdminDocument('products', product.id, {
      seoTitle: fix.seoTitle,
      metaDescription: fix.metaDescription,
      keywords: fix.keywords,
      description: descriptionHtml,
      specifications: descriptionHtml,
      features: fix.features,
      updatedAt: adminTimestamp()
    });
  };

  const totalRevenue = products.reduce((sum, p) => sum + p.price, 0);
  const avgRating = products.length > 0 ? (products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length).toFixed(1) : '0';

  const lowStockProducts = products.filter(p => (p.stock || 0) < 10);
  const activeNewsletterSubscribers = newsletterSubscribers.filter(item => item.status !== 'unsubscribed');
  const selectedActiveNewsletterCount = newsletterSubscribers.filter(item =>
    selectedNewsletterIds.includes(item.id) && item.status !== 'unsubscribed'
  ).length;
  const allActiveNewsletterSelected = activeNewsletterSubscribers.length > 0 &&
    activeNewsletterSubscribers.every(item => selectedNewsletterIds.includes(item.id));
  const selectableNewsletterVouchers = vouchers.filter(voucher => voucher.isActive !== false);
  const completedOrders = orders.filter(order => order.status !== 'cancelled');
  const cancelledOrders = orders.filter(order => order.status === 'cancelled');
  const orderRevenue = completedOrders.reduce((sum, order) => sum + (order.finalTotal || order.total || 0), 0);
  const averageOrderValue = completedOrders.length > 0 ? orderRevenue / completedOrders.length : 0;
  const cancellationRate = orders.length > 0 ? Math.round((cancelledOrders.length / orders.length) * 100) : 0;
  const productSales = completedOrders.reduce<Record<string, { product: Product; quantity: number; revenue: number }>>((acc, order) => {
    order.items.forEach(item => {
      const current = acc[item.id] || { product: item, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += (item.discountPrice || item.price) * item.quantity;
      acc[item.id] = current;
    });
    return acc;
  }, {});
  const topSellingProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const slowMovingProducts = products
    .filter(product => !productSales[product.id] && (product.stock || 0) > 0)
    .slice(0, 5);
  const expiringVouchers = vouchers
    .filter(voucher => voucher.isActive !== false)
    .map(voucher => ({ voucher, daysLeft: Math.ceil((new Date(voucher.endTime).getTime() - Date.now()) / 86400000) }))
    .filter(item => item.daysLeft >= 0 && item.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 4);
  const strategyActions = [
    ...(lowStockProducts.length > 0 ? [{
      title: 'Bổ sung tồn kho sản phẩm sắp hết',
      description: `${lowStockProducts.length} sản phẩm còn dưới 10 item. Ưu tiên nhập thêm các mẫu đang có đơn hoặc rating tốt.`,
      action: 'Xem kho',
      onClick: () => setActiveTab('products'),
      tone: 'red' as const,
    }] : []),
    ...(cancellationRate >= 20 ? [{
      title: 'Giảm tỉ lệ hủy đơn',
      description: `Tỉ lệ hủy hiện khoảng ${cancellationRate}%. Nên gọi xác nhận đơn COD và nhắc phí/ưu đãi trước khi giao.`,
      action: 'Xem đơn',
      onClick: () => setActiveTab('orders'),
      tone: 'amber' as const,
    }] : []),
    ...(slowMovingProducts.length > 0 ? [{
      title: 'Đẩy hàng bán chậm bằng voucher hoặc flash sale',
      description: `${slowMovingProducts.length} sản phẩm còn tồn nhưng chưa xuất hiện trong đơn. Có thể đưa vào flash sale hoặc gắn voucher theo danh mục.`,
      action: 'Tạo chiến dịch',
      onClick: () => setActiveTab('flash-sale'),
      tone: 'blue' as const,
    }] : []),
    ...(expiringVouchers.length > 0 ? [{
      title: 'Kích hoạt lại voucher sắp hết hạn',
      description: `${expiringVouchers.length} voucher sẽ hết hạn trong 7 ngày. Nên gửi email nhắc khách dùng mã trước khi hết hạn.`,
      action: 'Gửi email',
      onClick: () => setActiveTab('newsletter'),
      tone: 'emerald' as const,
    }] : []),
  ];
  const formatNewsletterDate = (value?: FirestoreTimestamp) => {
    const date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : null);
    return date ? date.toLocaleDateString('vi-VN') : 'Chưa rõ';
  };
  const activeNavLabel = NAV_ITEMS.reduce<{ id: string; label: string }[]>((items, item) => {
    if (item.children) {
      return [...items, ...item.children.map(child => ({ id: child.id, label: child.label }))];
    }
    return [...items, { id: item.id, label: item.label }];
  }, []).find(item => item.id === activeTab)?.label || 'Dashboard';
  const parentNavigationItems = navigation.filter(nav => nav.group !== 'subcategory');
  const getChildNavigationItems = (parent: NavigationItem) => navigation.filter(
    nav => nav.group === 'subcategory' && normalizeMenuLabel(nav.parentLabel) === normalizeMenuLabel(parent.label)
  );
  const parentBlogCategoryItems = blogCategories.filter(item => item.group !== 'subcategory');
  const getChildBlogCategoryItems = (parent: BlogCategoryItem) => blogCategories.filter(
    item => item.group === 'subcategory' && normalizeMenuLabel(item.parentLabel || '') === normalizeMenuLabel(parent.label)
  );
  const isBlogCategoryExpanded = (itemId: number | string) => expandedBlogCategoryIds.includes(itemId);
  const toggleBlogCategoryExpanded = (itemId: number | string) => {
    setExpandedBlogCategoryIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const updateBlogCategoryItem = (itemId: number | string, updater: (item: BlogCategoryItem) => BlogCategoryItem) => {
    blogCategoriesDirtyRef.current = true;
    setBlogCategories(prev => prev.map(item => item.id === itemId ? updater({ ...item }) : item));
  };

  const removeBlogCategoryItem = (itemId: number | string) => {
    const target = blogCategories.find(item => item.id === itemId);
    if (!target) return;

    const usedCount = blogPosts.filter(post => normalizeMenuLabel(post.category) === normalizeMenuLabel(target.label)).length;
    if (blogCategories.length <= 1) {
      toast.error('Cần ít nhất 1 danh mục blog');
      return;
    }
    if (usedCount > 0 && !window.confirm('Danh mục này đang có bài viết. Vẫn xóa?')) return;

    handleSaveBlogCategories(blogCategories.filter(item => item.id !== itemId));
  };

  const addChildBlogCategoryItem = (parent: BlogCategoryItem) => {
    const childLabel = `${parent.label} mục con`;
    const childItem = normalizeBlogCategoryItem({
      id: Date.now(),
      label: childLabel,
      link: `/blog/category/${slugifyBlogCategory(childLabel).replace(/^\//, '')}`,
      icon: '',
      group: 'subcategory',
      parentLabel: parent.label
    });
    const parentIndex = blogCategories.findIndex(item => item.id === parent.id);
    const updated = [...blogCategories];
    updated.splice(parentIndex + 1, 0, childItem);
    blogCategoriesDirtyRef.current = true;
    setBlogCategories(updated);
  };

  const renderNavigationCard = (nav: NavigationItem, isChild = false) => (
    <div key={nav.id} className={cn(
      "bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-4",
      isChild && "ml-8 border-[#1e4b64]/30 bg-[#1e4b64]/5"
    )}>
      <div className={cn("shrink-0", isChild ? "w-16" : "w-20")}>
        <ImageUpload
          folder="nav"
          label=""
          compact={true}
          externalPreview={nav.icon}
          onUploadComplete={(url) => {
            updateNavigationItem(nav.id, item => ({ ...item, icon: url }));
          }}
        />
      </div>
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Nhãn (Label)</label>
            <input
              type="text"
              value={nav.label}
              onChange={(e) => {
                updateNavigationItem(nav.id, item => {
                  item.label = e.target.value;
                  if (item.group === 'category') item.link = linkForCategoryLabel(e.target.value);
                  if (item.group === 'subcategory') item.link = linkForSubcategoryLabel(e.target.value);
                  return item;
                });
              }}
              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Nhóm</label>
            <select
              value={nav.group}
              onChange={(e) => {
                updateNavigationItem(nav.id, item => {
                  item.group = e.target.value;
                  if (e.target.value === 'category') {
                    item.link = linkForCategoryLabel(item.label);
                    item.parentLabel = '';
                  }
                  if (e.target.value === 'subcategory') {
                    item.link = linkForSubcategoryLabel(item.label);
                    item.parentLabel = item.parentLabel || 'Áo thun nam';
                  }
                  return item;
                });
              }}
              className="w-full bg-[#1c1f26] border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
            >
              <option value="main">Danh mục chính</option>
              <option value="category">Danh mục sản phẩm</option>
              <option value="subcategory">Danh mục con SEO</option>
            </select>
          </div>
        </div>
        {nav.group === 'subcategory' && (
          <div>
            <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Danh mục cha</label>
            <input
              type="text"
              value={nav.parentLabel || ''}
              list="navigation-parent-categories"
              placeholder="VD: Áo thun nam"
              onChange={(e) => {
                updateNavigationItem(nav.id, item => ({
                  ...item,
                  parentLabel: e.target.value,
                  link: linkForSubcategoryLabel(item.label)
                }));
              }}
              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
            />
            <p className="text-[10px] text-white/25 mt-1">
              Dùng cho menu con và silo SEO. Ví dụ: Áo thun nam → Áo thun nam cotton.
            </p>
          </div>
        )}
        <div>
          <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Đường dẫn (Link)</label>
          <input
            type="text"
            value={nav.link}
            onChange={(e) => updateNavigationItem(nav.id, item => ({ ...item, link: e.target.value }))}
            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
          />
        </div>
        {nav.group === 'category' && (
          <button
            type="button"
            onClick={() => addChildNavigationItem(nav)}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#1e4b64]/50 bg-[#1e4b64]/15 px-3 py-2 text-xs font-bold text-white hover:bg-[#1e4b64]/25 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Tạo mục con
          </button>
        )}
      </div>
      <button
        onClick={() => removeNavigationItem(nav.id)}
        className="h-8 w-8 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1117] flex" style={{ paddingTop: 0 }}>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-[#13161f] border-r border-white/5 flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[#1e4b64] rounded-lg flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-white font-black text-base italic tracking-tight">UR<span className="text-[#1e4b64]">SPORT</span></span>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest -mt-0.5">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            if (item.isGroup && item.children) {
              const isExpanded = expandedGroups.includes(item.id);
              const hasActiveChild = item.children.some(child => child.id === activeTab);
              
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setExpandedGroups(prev => 
                        prev.includes(item.id) 
                          ? prev.filter(id => id !== item.id)
                          : [...prev, item.id]
                      );
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 relative",
                      hasActiveChild ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform duration-200", isExpanded && "rotate-180")} />
                  </button>
                  
                  {isExpanded && (
                    <div className="pl-4 space-y-1 mt-1">
                      {item.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => { setActiveTab(child.id as AdminTab); setSidebarOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 relative",
                            activeTab === child.id
                              ? "bg-[#1e4b64] text-white shadow-lg shadow-[#1e4b64]/20"
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0" />
                          {child.label}
                          {activeTab === child.id && <ChevronRight className="h-3 w-3 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as AdminTab); setSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 relative",
                  activeTab === item.id
                    ? "bg-[#1e4b64] text-white shadow-lg shadow-[#1e4b64]/20"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {item.id === 'products' && lowStockProducts.length > 0 && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white animate-pulse">
                    {lowStockProducts.length}
                  </span>
                )}
                {activeTab === item.id && <ChevronRight className="h-3 w-3 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shrink-0">
              {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{user.displayName || 'Admin'}</p>
              <p className="text-white/30 text-[11px] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-all"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 bg-[#13161f]/80 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-white font-black text-lg capitalize">
                {activeNavLabel}
              </h1>
              <p className="text-white/30 text-xs font-medium hidden sm:block">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#1e4b64] rounded-full" />
            </button>
            {activeTab === 'products' && (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#1e4b64]/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Thêm sản phẩm</span>
              </button>
            )}
            {activeTab === 'blog' && (
              <button
                onClick={() => {
                  setEditingBlogPost(null);
                  setIsBlogModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#1e4b64]/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Thêm bài viết</span>
              </button>
            )}
            {activeTab === 'vouchers' && (
              <button
                onClick={() => {
                  setEditingVoucher(null);
                  setIsVoucherModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#ee4d2d] hover:bg-[#d73211] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#ee4d2d]/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tạo mã giảm giá mới</span>
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">

          {/* ─── DASHBOARD ─── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Tổng sản phẩm', value: products.length, icon: Package, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-500/10', text: 'text-blue-400' },
                  { label: 'Doanh thu ước tính', value: totalRevenue.toLocaleString('vi-VN') + '₫', icon: DollarSign, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
                  { label: 'Đơn hàng', value: orders.length.toString(), icon: ShoppingBag, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-500/10', text: 'text-orange-400' },
                  { label: 'Đánh giá TB', value: avgRating + ' ★', icon: Star, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-500/10', text: 'text-purple-400' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#13161f] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                        <stat.icon className={cn("h-5 w-5", stat.text)} />
                      </div>
                      <TrendingUp className="h-4 w-4 text-white/20 group-hover:text-white/40 transition-all" />
                    </div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-white font-black text-xl leading-none">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent products */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                  <h2 className="text-white font-black text-sm uppercase tracking-widest">Sản phẩm mới nhất</h2>
                  <button onClick={() => setActiveTab('products')} className="text-[#1e4b64] text-xs font-bold hover:underline">Xem tất cả →</button>
                </div>
                <div className="divide-y divide-white/5">
                  {products.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all">
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon className="h-full w-full p-2.5 text-white/20" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{p.name}</p>
                        <p className="text-white/30 text-xs font-medium">{p.category}</p>
                      </div>
                      <p className="text-[#1e4b64] font-black text-sm shrink-0">{p.price.toLocaleString('vi-VN')}₫</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock Alerts */}
              {lowStockProducts.length > 0 && (
                <div className="bg-[#13161f] border border-red-500/20 rounded-2xl overflow-hidden shadow-xl shadow-red-500/5">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/10 bg-red-500/5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <h2 className="text-red-500 font-black text-sm uppercase tracking-widest">Sản phẩm sắp hết hàng (&lt; 10)</h2>
                    </div>
                    <button onClick={() => setActiveTab('products')} className="text-red-500/60 text-xs font-bold hover:text-red-500 transition-colors">Xem kho →</button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {lowStockProducts.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                        <div className="h-10 w-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                          {p.images?.[0] && <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-bold truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded uppercase">Chỉ còn {p.stock || 0} sản phẩm</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => { setEditingProduct(p); setIsAddModalOpen(true); }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-xs font-bold transition-all"
                        >
                          Nhập thêm
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── PRODUCTS ─── */}
          {activeTab === 'strategy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Doanh thu đơn hàng', value: orderRevenue.toLocaleString('vi-VN') + '₫', icon: DollarSign, text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Giá trị đơn TB', value: averageOrderValue.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + '₫', icon: BarChart2, text: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Tỉ lệ hủy đơn', value: cancellationRate + '%', icon: AlertCircle, text: cancellationRate >= 20 ? 'text-red-400' : 'text-amber-400', bg: cancellationRate >= 20 ? 'bg-red-500/10' : 'bg-amber-500/10' },
                  { label: 'Sản phẩm đã bán', value: topSellingProducts.length.toString(), icon: TrendingUp, text: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
                    <div className={cn("mb-4 h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                      <stat.icon className={cn("h-5 w-5", stat.text)} />
                    </div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-white font-black text-xl leading-none">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-white font-black text-sm uppercase tracking-widest">Sản phẩm tạo doanh thu</h2>
                  </div>
                  <div className="divide-y divide-white/5">
                    {topSellingProducts.length === 0 ? (
                      <div className="px-6 py-12 text-center text-white/30 text-sm font-bold">Chưa đủ dữ liệu đơn hàng</div>
                    ) : topSellingProducts.map((item, index) => (
                      <div key={item.product.id} className="flex items-center gap-4 px-6 py-4">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-black">#{index + 1}</div>
                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                          {item.product.images?.[0] && <img src={item.product.images[0]} alt={item.product.name} loading="lazy" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-bold truncate">{item.product.name}</p>
                          <p className="text-white/35 text-xs font-bold">Đã bán {item.quantity} item</p>
                        </div>
                        <p className="text-emerald-400 font-black text-sm">{item.revenue.toLocaleString('vi-VN')}₫</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-white font-black text-sm uppercase tracking-widest">Hàng cần đẩy</h2>
                  </div>
                  <div className="divide-y divide-white/5">
                    {slowMovingProducts.length === 0 ? (
                      <div className="px-6 py-12 text-center text-white/30 text-sm font-bold">Chưa có sản phẩm bán chậm rõ ràng</div>
                    ) : slowMovingProducts.map(product => (
                      <div key={product.id} className="flex items-center gap-4 px-6 py-4">
                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                          {product.images?.[0] && <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-bold truncate">{product.name}</p>
                          <p className="text-white/35 text-xs font-bold">Tồn kho {product.stock || 0} item</p>
                        </div>
                        <button
                          onClick={() => { setEditingProduct(product); setIsAddModalOpen(true); }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-xs font-bold transition-all"
                        >
                          Tối ưu
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles className="h-5 w-5 text-[#1e4b64]" />
                    <h2 className="text-white font-black text-sm uppercase tracking-widest">Đề xuất hành động thông minh</h2>
                  </div>
                  <div className="grid gap-3">
                    {strategyActions.length === 0 ? (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-emerald-400 font-black text-sm">Hệ thống đang ổn định</p>
                        <p className="text-white/40 text-xs mt-1">Chưa phát hiện rủi ro lớn từ tồn kho, đơn hủy hoặc voucher.</p>
                      </div>
                    ) : strategyActions.map((item) => {
                      const toneClass = item.tone === 'red'
                        ? 'border-red-500/20 bg-red-500/5 text-red-400'
                        : item.tone === 'amber'
                          ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                          : item.tone === 'emerald'
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                            : 'border-blue-500/20 bg-blue-500/5 text-blue-400';

                      return (
                        <div key={item.title} className={cn("rounded-xl border p-4", toneClass)}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-black text-sm">{item.title}</p>
                              <p className="text-white/45 text-xs mt-1 leading-5">{item.description}</p>
                            </div>
                            <button onClick={item.onClick} className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-black text-white/70 hover:bg-white/10">
                              {item.action}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                  <h2 className="text-white font-black text-sm uppercase tracking-widest mb-5">Voucher sắp hết hạn</h2>
                  <div className="space-y-3">
                    {expiringVouchers.length === 0 ? (
                      <p className="text-white/35 text-sm font-bold">Không có voucher hết hạn trong 7 ngày.</p>
                    ) : expiringVouchers.map(({ voucher, daysLeft }) => (
                      <div key={voucher.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[#ee4d2d] text-sm font-black tracking-widest">{voucher.code}</p>
                            <p className="text-white/50 text-xs mt-1">{voucher.name}</p>
                          </div>
                          <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-400">
                            {daysLeft === 0 ? 'Hôm nay' : `${daysLeft} ngày`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <ProductSeoAutomationPanel
                products={products}
                onOptimizeProduct={openProductEditor}
                onApplySeoFix={applyProductSeoFix}
              />

              {/* Search */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#13161f] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                />
              </div>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <select
                    value={productCategoryFilter}
                    onChange={e => setProductCategoryFilter(e.target.value)}
                    className="w-full appearance-none bg-[#13161f] border border-white/5 rounded-xl pl-11 pr-10 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                  >
                    <option value="all">Tất cả danh mục</option>
                    {productFilterOptions.filter(option => !option.parent).map(option => (
                      <React.Fragment key={option.label}>
                        <option value={option.label}>{option.label}</option>
                        {productFilterOptions
                          .filter(child => child.parent && normalizeMenuLabel(child.parent) === normalizeMenuLabel(option.label))
                          .map(child => (
                            <option key={child.label} value={child.label}>
                              {'-- '}{child.label}
                            </option>
                          ))}
                      </React.Fragment>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                </div>
              </div>

              {/* Info bar */}
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-sm font-medium">
                  Hiển thị <span className="text-white font-bold">{filteredProducts.length}</span> sản phẩm
                </p>
              </div>

              {/* Table */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="py-20 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full border-4 border-[#1e4b64] border-t-transparent animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-20 text-center">
                    <Package className="h-12 w-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 font-bold text-sm">Không tìm thấy sản phẩm</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Sản phẩm</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 hidden md:table-cell">Danh mục</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Giá</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 hidden lg:table-cell">Kho</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 hidden xl:table-cell">SEO</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 hidden lg:table-cell">Đánh giá</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredProducts.map(product => (
                          <tr key={product.id} className="hover:bg-white/[0.02] transition-all group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-xl overflow-hidden bg-white/5 border border-white/5 shrink-0">
                                  {product.images?.[0] ? (
                                    <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                  ) : (
                                    <ImageIcon className="h-full w-full p-3 text-white/20" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white text-sm font-bold line-clamp-1">{product.name}</p>
                                  <p className="text-white/30 text-[11px] font-medium">#{product.id.substring(0, 8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell">
                              <span className="px-3 py-1 bg-white/5 border border-white/5 text-white/50 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                {product.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[#10b981] font-black text-sm">{(product.discountPrice || product.price).toLocaleString('vi-VN')}₫</p>
                              {product.discountPrice && (
                                <p className="text-white/25 text-xs font-medium line-through">{product.price.toLocaleString('vi-VN')}₫</p>
                              )}
                            </td>
                            <td className="px-6 py-4 hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full", (product.stock || 0) < 10 ? 'bg-red-500' : 'bg-emerald-500')}
                                    style={{ width: `${Math.min(product.stock || 0, 100)}%` }}
                                  />
                                </div>
                                <span className={cn("text-xs font-bold", (product.stock || 0) < 10 ? 'text-red-400' : 'text-white/50')}>
                                  {product.stock || 0}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 hidden xl:table-cell">
                              <ProductSeoScoreBadge product={product} />
                            </td>
                            <td className="px-6 py-4 hidden lg:table-cell">
                              <div className="flex items-center gap-1">
                                <Star 
                                  className={cn(
                                    "h-3 w-3",
                                    (product.reviewsCount || 0) > 0 ? "text-yellow-400 fill-yellow-400" : "text-white/20"
                                  )} 
                                />
                                <span className="text-white/60 text-sm font-bold">
                                  {product.rating || 0} 
                                  <span className="text-white/20 font-normal ml-1">({product.reviewsCount || 0})</span>
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleView(product)}
                                  title="Xem sản phẩm"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleCopy(product)}
                                  title="Sao chép sản phẩm"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setIsAddModalOpen(true);
                                  }}
                                  title="Chỉnh sửa"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  title="Xóa"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'blog' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài viết..."
                  value={blogSearchQuery}
                  onChange={e => setBlogSearchQuery(e.target.value)}
                  className="w-full bg-[#13161f] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-white/40 text-sm font-medium">
                  Hiển thị <span className="text-white font-bold">{blogPosts.filter(post => post.title.toLowerCase().includes(blogSearchQuery.toLowerCase()) || post.category.toLowerCase().includes(blogSearchQuery.toLowerCase()) || post.author.toLowerCase().includes(blogSearchQuery.toLowerCase())).length}</span> bài viết
                </p>
              </div>

              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                {blogPosts.filter(post => post.title.toLowerCase().includes(blogSearchQuery.toLowerCase()) || post.category.toLowerCase().includes(blogSearchQuery.toLowerCase()) || post.author.toLowerCase().includes(blogSearchQuery.toLowerCase())).length === 0 ? (
                  <div className="py-20 flex items-center justify-center">
                    <MessageSquare className="h-12 w-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 font-bold text-sm">Không tìm thấy bài viết</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Tiêu đề</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 hidden md:table-cell">Chuyên mục</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Tác giả</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 hidden lg:table-cell">Ngày</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {blogPosts.filter(post => post.title.toLowerCase().includes(blogSearchQuery.toLowerCase()) || post.category.toLowerCase().includes(blogSearchQuery.toLowerCase()) || post.author.toLowerCase().includes(blogSearchQuery.toLowerCase())).map(post => (
                          <tr key={post.id} className="hover:bg-white/[0.02] transition-all group">
                            <td className="px-6 py-4 w-[40%]">
                              <p className="text-white text-sm font-bold line-clamp-1">{post.title}</p>
                              <p className="text-white/30 text-[11px] mt-1">{post.excerpt.slice(0, 80)}...</p>
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell">
                              <span className="px-3 py-1 bg-white/5 border border-white/5 text-white/50 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                {post.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm font-bold">{post.author}</p>
                            </td>
                            <td className="px-6 py-4 hidden lg:table-cell">
                              <p className="text-white/40 text-sm">{post.date}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => window.open(`/blog/${post.slug || post.id}`, '_blank')}
                                  title="Xem trên web"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingBlogPost(post);
                                    setIsBlogModalOpen(true);
                                  }}
                                  title="Sửa"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBlogPost(post.id)}
                                  title="Xóa"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-white/40 text-sm font-medium">
                  Hiển thị <span className="text-white font-bold">{vouchers.length}</span> mã giảm giá
                </p>
              </div>

              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                {vouchers.length === 0 ? (
                  <div className="py-20 flex items-center justify-center">
                    <Ticket className="h-12 w-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 font-bold text-sm">Chưa có mã giảm giá nào</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Mã / Tên</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Mức giảm</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Thời gian</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Đã dùng</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Trạng thái</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {vouchers.map(voucher => (
                          <tr key={voucher.id} className="hover:bg-white/[0.02] transition-all group">
                            <td className="px-6 py-4">
                              <p className="text-[#ee4d2d] text-sm font-bold tracking-widest">{voucher.code}</p>
                              <p className="text-white/60 text-xs mt-1">{voucher.name}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm font-bold">
                                {voucher.discountType === 'fixed' 
                                  ? `${voucher.discountValue.toLocaleString('vi-VN')}₫` 
                                  : `${voucher.discountValue}%`}
                              </p>
                              <p className="text-white/40 text-[10px] mt-0.5">Đơn tối thiểu {voucher.minOrderValue.toLocaleString('vi-VN')}₫</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white/80 text-xs">{new Date(voucher.startTime).toLocaleDateString('vi-VN')} - {new Date(voucher.endTime).toLocaleDateString('vi-VN')}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm font-bold">{voucher.usedCount || 0} / {voucher.maxUsage}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                voucher.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              )}>
                                {voucher.isActive ? 'Kích hoạt' : 'Đã tắt'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingVoucher(voucher);
                                    setIsVoucherModalOpen(true);
                                  }}
                                  title="Sửa"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const duplicatedVoucher = {
                                      ...voucher,
                                      id: '', // Empty ID ensures it's treated as a new voucher
                                      code: `${voucher.code}_COPY`,
                                      name: `${voucher.name} (Bản sao)`,
                                      usedCount: 0, // Reset usage count
                                    };
                                    setEditingVoucher(duplicatedVoucher);
                                    setIsVoucherModalOpen(true);
                                  }}
                                  title="Nhân bản"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-green-400 hover:bg-green-500/10 transition-all"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteVoucher(voucher.id)}
                                  title="Xóa"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── ORDERS ─── */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Mã đơn / Ngày</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Khách hàng</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Thanh toán</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Tổng cộng</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Trạng thái</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center">
                            <ShoppingBag className="h-12 w-12 text-white/10 mx-auto mb-3" />
                            <p className="text-white/30 font-bold text-sm">Chưa có đơn hàng nào</p>
                          </td>
                        </tr>
                      ) : (
                        orders.map(order => (
                          <tr key={order.id} className="hover:bg-white/[0.02] transition-all group">
                            <td className="px-6 py-4">
                              <p className="text-white text-sm font-bold">#{order.id.substring(0, 8)}</p>
                              <p className="text-white/30 text-[11px] font-medium">
                                {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('vi-VN') : String(order.createdAt || '')}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm font-bold">{order.shippingAddress.fullName}</p>
                              <p className="text-white/30 text-[11px] font-medium">{order.shippingAddress.phone}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border",
                                order.paymentMethod === 'bank_transfer' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                order.paymentMethod === 'e_wallet' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              )}>
                                {order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' :
                                 order.paymentMethod === 'e_wallet' ? 'Ví điện tử' : 'COD'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[#1e4b64] font-black text-sm">{order.total.toLocaleString('vi-VN')}₫</p>
                              <div className="mt-2 space-y-1">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-[10px] bg-white/[0.03] border border-white/5 rounded px-2 py-1">
                                    <span className="text-white font-bold truncate max-w-[120px]">{item.name}</span>
                                    <span className="text-white/40">|</span>
                                    <span className="text-blue-400 font-bold uppercase">{item.selectedColor}</span>
                                    <span className="text-white/40">/</span>
                                    <span className="text-emerald-400 font-bold">{item.selectedSize}</span>
                                    <span className="text-white/40 ml-auto">x{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as AdminOrderStatus)}
                                className={cn(
                                  "bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider focus:outline-none transition-all",
                                  order.status === 'delivered' ? "text-emerald-400" :
                                  order.status === 'cancelled' ? "text-red-400" :
                                  order.status === 'shipped' ? "text-blue-400" : "text-yellow-400"
                                )}
                              >
                                <option value="pending" className="bg-[#13161f]">Chờ xử lý</option>
                                <option value="processing" className="bg-[#13161f]">Đang chuẩn bị</option>
                                <option value="shipped" className="bg-[#13161f]">Đang giao</option>
                                <option value="delivered" className="bg-[#13161f]">Đã giao</option>
                                <option value="cancelled" className="bg-[#13161f]">Đã hủy</option>
                              </select>
                              <div className="mt-2 grid gap-1">
                                <input
                                  defaultValue={order.trackingNumber || ''}
                                  onBlur={event => handleUpdateTracking(order, 'trackingNumber', event.target.value)}
                                  placeholder="Mã vận đơn"
                                  className="w-36 rounded-lg border border-white/5 bg-white/5 px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-[#1e4b64]"
                                />
                                <input
                                  defaultValue={order.trackingUrl || ''}
                                  onBlur={event => handleUpdateTracking(order, 'trackingUrl', event.target.value)}
                                  placeholder="Link tra cứu"
                                  className="w-36 rounded-lg border border-white/5 bg-white/5 px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-[#1e4b64]"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setIsOrderDetailModalOpen(true);
                                  }}
                                  title="Xem chi tiết"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  title="Xóa"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── CUSTOMERS ─── */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1e4b64]">Review Management</p>
                    <h2 className="mt-2 text-xl font-black text-white">Quản lý đánh giá khách hàng</h2>
                  </div>
                  <div className="flex gap-2 text-xs font-black uppercase">
                    <span className="rounded-full bg-amber-400/10 px-3 py-1 text-amber-300">{reviews.filter(r => (r.status || 'pending') === 'pending').length} chờ duyệt</span>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">{reviews.filter(r => !r.status || r.status === 'approved').length} hiển thị</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {reviews.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-[#13161f] p-12 text-center">
                    <Star className="mx-auto mb-3 h-10 w-10 text-white/10" />
                    <p className="text-sm font-bold text-white/35">Chưa có đánh giá nào</p>
                  </div>
                ) : reviews.map(review => (
                  <article key={review.id} className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={cn(
                            'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                            (!review.status || review.status === 'approved') ? 'bg-emerald-400/10 text-emerald-300' :
                            review.status === 'hidden' ? 'bg-red-400/10 text-red-300' : 'bg-amber-400/10 text-amber-300'
                          )}>
                            {!review.status || review.status === 'approved' ? 'Đã duyệt' : review.status === 'hidden' ? 'Đã ẩn' : 'Chờ duyệt'}
                          </span>
                          <span className="text-xs font-bold text-white/30">{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleString('vi-VN') : 'Mới đây'}</span>
                        </div>
                        <h3 className="text-base font-black text-white">{review.productName || review.productId}</h3>
                        <p className="mt-1 text-sm font-bold text-white/45">{review.userName} · {review.variant || 'Không có phân loại'}</p>
                        <div className="mt-3 flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={cn('h-4 w-4', star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10')} />
                          ))}
                        </div>
                        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/70">{review.comment}</p>
                      </div>

                      <div className="w-full space-y-3 lg:w-80">
                        <textarea
                          value={reviewReplies[review.id] || ''}
                          onChange={event => setReviewReplies(prev => ({ ...prev, [review.id]: event.target.value }))}
                          rows={3}
                          placeholder="Phản hồi của shop..."
                          className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-white outline-none focus:border-[#1e4b64]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleUpdateReviewStatus(review, 'approved')} className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/20">Duyệt</button>
                          <button onClick={() => handleUpdateReviewStatus(review, 'hidden')} className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/20">Ẩn</button>
                          <button onClick={() => handleUpdateReviewStatus(review, 'pending')} className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300 hover:bg-amber-500/20">Chờ</button>
                          <button onClick={() => handleSaveReviewReply(review)} className="rounded-xl bg-[#1e4b64] px-3 py-2 text-xs font-black text-white hover:bg-[#256580]">Lưu trả lời</button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Khách hàng</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Email</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Số điện thoại</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Đơn hàng</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Tổng chi tiêu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {STATIC_CUSTOMERS.map(customer => (
                        <tr key={customer.id} className="hover:bg-white/[0.02] transition-all">
                          <td className="px-6 py-4">
                            <p className="text-white text-sm font-bold">{customer.name}</p>
                            <p className="text-white/30 text-[11px] font-medium">#{customer.id}</p>
                          </td>
                          <td className="px-6 py-4 text-white/70 text-sm font-medium">{customer.email}</td>
                          <td className="px-6 py-4 text-white/70 text-sm font-medium">{customer.phone}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-black rounded-lg">
                              {customer.ordersCount} đơn
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[#1e4b64] font-black text-sm">{customer.totalSpent.toLocaleString('vi-VN')}₫</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── NEWSLETTER SUBSCRIBERS ─── */}
          {activeTab === 'newsletter' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Tổng email</p>
                  <p className="text-white font-black text-2xl">{newsletterSubscribers.length}</p>
                </div>
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Đang nhận tin</p>
                  <p className="text-emerald-400 font-black text-2xl">{activeNewsletterSubscribers.length}</p>
                </div>
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Dùng cho</p>
                  <p className="text-white font-black text-sm">Gửi voucher / khuyến mãi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-widest">Thêm email</h3>
                      <p className="text-white/30 text-xs font-medium">Bổ sung thủ công khách nhận ưu đãi.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={manualNewsletterEmail}
                      onChange={e => setManualNewsletterEmail(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewsletterSubscriber();
                        }
                      }}
                      placeholder="email@example.com"
                      className="min-w-0 flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewsletterSubscriber}
                      className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-[#1e4b64]/20 rounded-xl flex items-center justify-center">
                        <Send className="h-5 w-5 text-[#5fb3d4]" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Gửi email khuyến mãi</h3>
                        <p className="text-white/30 text-xs font-medium">Đang chọn {selectedActiveNewsletterCount} email.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendNewsletter}
                      disabled={isSendingNewsletter}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1e4b64] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#153446] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="h-4 w-4" />
                      {isSendingNewsletter ? 'Đang gửi...' : 'Gửi email'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newsletterSubject}
                      onChange={e => setNewsletterSubject(e.target.value)}
                      placeholder="Tiêu đề email"
                      className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                    />
                    <input
                      type="password"
                      value={newsletterSendToken}
                      onChange={e => setNewsletterSendToken(e.target.value)}
                      placeholder="Mã gửi email"
                      className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                    />
                    <select
                      value={selectedNewsletterVoucherId}
                      onChange={e => setSelectedNewsletterVoucherId(e.target.value)}
                      className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                    >
                      <option value="">Không kèm voucher</option>
                      {selectableNewsletterVouchers.length === 0 ? (
                        <option value="" disabled>Chưa có mã giảm giá khả dụng</option>
                      ) : selectableNewsletterVouchers.map(voucher => {
                        const isExpired = voucher.endTime ? new Date(voucher.endTime) < new Date() : false;
                        return (
                          <option key={voucher.id} value={voucher.id}>
                            {voucher.code} - {voucher.name}{isExpired ? ' (hết hạn)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVoucher(null);
                        setIsVoucherModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Ticket className="h-4 w-4" />
                      Thêm voucher mới
                    </button>
                  </div>

                  <textarea
                    value={newsletterMessage}
                    onChange={e => setNewsletterMessage(e.target.value)}
                    rows={4}
                    placeholder="Nội dung email gửi cho khách..."
                    className="mt-3 w-full resize-none bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                  />
                </div>
              </div>

              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Email khách đăng ký</h3>
                    <p className="text-white/30 text-xs font-medium mt-1">Danh sách này lấy từ form đăng ký ở footer website.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNewsletterIds(allActiveNewsletterSelected ? [] : activeNewsletterSubscribers.map(item => item.id));
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      {allActiveNewsletterSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const emails = activeNewsletterSubscribers.map(item => item.email).join('\n');
                        navigator.clipboard.writeText(emails);
                        toast.success('Đã sao chép danh sách email đang nhận tin');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Sao chép email
                    </button>
                  </div>
                </div>

                {newsletterSubscribers.length === 0 ? (
                  <div className="py-20 text-center">
                    <MailCheck className="h-12 w-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 font-bold text-sm">Chưa có email đăng ký nhận tin</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">
                            <input
                              type="checkbox"
                              checked={allActiveNewsletterSelected}
                              onChange={() => setSelectedNewsletterIds(allActiveNewsletterSelected ? [] : activeNewsletterSubscribers.map(item => item.id))}
                              className="h-4 w-4 accent-[#1e4b64]"
                            />
                          </th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Email</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Nguồn</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Ngày đăng ký</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Trạng thái</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {newsletterSubscribers.map(subscriber => {
                          const isActive = subscriber.status !== 'unsubscribed';
                          return (
                            <tr key={subscriber.id} className="hover:bg-white/[0.02] transition-all">
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  disabled={!isActive}
                                  checked={selectedNewsletterIds.includes(subscriber.id)}
                                  onChange={() => {
                                    setSelectedNewsletterIds(prev =>
                                      prev.includes(subscriber.id)
                                        ? prev.filter(id => id !== subscriber.id)
                                        : [...prev, subscriber.id]
                                    );
                                  }}
                                  className="h-4 w-4 accent-[#1e4b64] disabled:opacity-30"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-white text-sm font-bold">{subscriber.email}</p>
                                <p className="text-white/30 text-[11px] font-medium">#{subscriber.id.substring(0, 18)}</p>
                              </td>
                              <td className="px-6 py-4 text-white/60 text-sm font-medium">{subscriber.source || 'footer'}</td>
                              <td className="px-6 py-4 text-white/60 text-sm font-medium">{formatNewsletterDate(subscriber.createdAt)}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-3 py-1 text-xs font-black rounded-lg",
                                  isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"
                                )}>
                                  {isActive ? 'Đang nhận tin' : 'Đã hủy'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(subscriber.email);
                                      toast.success('Đã sao chép email');
                                    }}
                                    title="Sao chép email"
                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleNewsletterStatus(subscriber, isActive ? 'unsubscribed' : 'active')}
                                    title={isActive ? 'Hủy nhận tin' : 'Bật nhận tin'}
                                    className="h-8 px-3 flex items-center justify-center rounded-lg text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs font-bold"
                                  >
                                    {isActive ? 'Hủy' : 'Bật'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNewsletterSubscriber(subscriber)}
                                    title="Xóa email"
                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── AI PRODUCT ASSISTANT ─── */}
          {activeTab === 'ai-product' && (
            <React.Suspense fallback={<AdminTabFallback />}>
              <AIProductAssistant onApply={handleApplyAIProduct} />
            </React.Suspense>
          )}

          {/* ─── AI BLOG ASSISTANT ─── */}
          {activeTab === 'ai-blog' && (
            <React.Suspense fallback={<AdminTabFallback />}>
              <AIBlogAssistant onApply={handleApplyAIBlog} blogPosts={blogPosts} />
            </React.Suspense>
          )}

          {/* ─── MEDIA ─── */}
          {activeTab === 'media' && (
            <React.Suspense fallback={<AdminTabFallback />}>
              <MediaLibraryTab
                mediaItems={mediaItems}
                onDeleteMedia={handleDeleteMedia}
                onSaveMedia={handleSaveMedia}
              />
            </React.Suspense>
          )}
          {/* ─── SETTINGS ─── */}
          {activeTab === 'settings' && (
            <React.Suspense fallback={<AdminTabFallback />}>
              <AdminSettingsTab
                addChildNavigationItem={addChildNavigationItem}
                banners={banners}
                blogPosts={blogPosts}
                cssSaved={cssSaved}
                customCss={customCss}
                floatingMenu={floatingMenu}
                generateSitemapString={generateSitemapString}
                getChildNavigationItems={getChildNavigationItems}
                handleDeleteCss={handleDeleteCss}
                handleGenerateRobots={handleGenerateRobots}
                handleGenerateSitemap={handleGenerateSitemap}
                handleSaveBanners={handleSaveBanners}
                handleSaveCss={handleSaveCss}
                handleSaveFloatingMenu={handleSaveFloatingMenu}
                handleSaveNavigation={handleSaveNavigation}
                navigation={navigation}
                parentNavigationItems={parentNavigationItems}
                products={products}
                renderNavigationCard={renderNavigationCard}
                setBanners={setBanners}
                setCustomCss={setCustomCss}
                setFloatingMenu={setFloatingMenu}
                setNavigation={setNavigation}
                setShowSitemapPreview={setShowSitemapPreview}
                showSitemapPreview={showSitemapPreview}
              />
            </React.Suspense>
          )}

          {activeTab === 'blog-categories' && (
            <div className="space-y-6">
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Danh mục Blog</h3>
                    <p className="text-white/30 text-xs mt-1">Quản lý danh mục blog giống danh mục sản phẩm: icon, link SEO và mục con.</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        blogCategoriesDirtyRef.current = true;
                        setBlogCategories([...blogCategories, normalizeBlogCategoryItem({
                          id: Date.now(),
                          label: 'Danh mục mới',
                          link: '/blog/category/danh-muc-moi',
                          icon: '',
                          group: 'category'
                        })]);
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" /> Thêm danh mục
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBlogCategories(blogCategories)}
                      className="px-5 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                    >
                      Lưu danh mục
                    </button>
                  </div>
                </div>

                <datalist id="blog-parent-categories">
                  {blogCategories.filter(item => item.group !== 'subcategory').map(item => (
                    <option key={item.id} value={item.label} />
                  ))}
                </datalist>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blogCategories.length === 0 ? (
                    <div className="col-span-full py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-white/20 text-sm font-medium">Chưa có danh mục Blog nào. Hãy thêm danh mục đầu tiên.</p>
                    </div>
                  ) : (
                    parentBlogCategoryItems.map(category => {
                      const childItems = getChildBlogCategoryItems(category);
                      const usedCount = blogPosts.filter(post => normalizeMenuLabel(post.category) === normalizeMenuLabel(category.label)).length;
                      const expanded = isBlogCategoryExpanded(category.id);
                      return (
                        <div key={category.id} className="space-y-3">
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-4">
                            <div className="w-20 shrink-0">
                              <ImageUpload
                                folder="blog-categories"
                                label=""
                                compact={true}
                                externalPreview={category.icon}
                                onUploadComplete={(url) => updateBlogCategoryItem(category.id, item => ({ ...item, icon: url }))}
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Nhãn (Label)</label>
                                  <input
                                    type="text"
                                    value={category.label}
                                    onChange={(e) => updateBlogCategoryItem(category.id, item => ({
                                      ...item,
                                      label: e.target.value,
                                      link: item.group === 'main' ? '/blog' : `/blog/category/${slugifyBlogCategory(e.target.value).replace(/^\//, '')}`
                                    }))}
                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Nhóm</label>
                                  <select
                                    value={category.group}
                                    onChange={(e) => updateBlogCategoryItem(category.id, item => ({
                                      ...item,
                                      group: e.target.value as BlogCategoryItem['group'],
                                      link: e.target.value === 'main' ? '/blog' : `/blog/category/${slugifyBlogCategory(item.label).replace(/^\//, '')}`,
                                      parentLabel: e.target.value === 'subcategory' ? item.parentLabel || 'Kiến thức' : ''
                                    }))}
                                    className="w-full bg-[#1c1f26] border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  >
                                    <option value="main">Danh mục chính</option>
                                    <option value="category">Danh mục Blog</option>
                                    <option value="subcategory">Danh mục con Blog</option>
                                  </select>
                                </div>
                              </div>
                              {category.group === 'subcategory' && (
                                <div>
                                  <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Danh mục cha</label>
                                  <input
                                    type="text"
                                    value={category.parentLabel || ''}
                                    list="blog-parent-categories"
                                    placeholder="VD: Kiến thức"
                                    onChange={(e) => updateBlogCategoryItem(category.id, item => ({ ...item, parentLabel: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                </div>
                              )}
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Đường dẫn (Link)</label>
                                <input
                                  type="text"
                                  value={category.link}
                                  onChange={(e) => updateBlogCategoryItem(category.id, item => ({ ...item, link: e.target.value }))}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleBlogCategoryExpanded(category.id)}
                                className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all"
                              >
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                                {expanded ? 'Thu gọn' : 'Mở rộng SEO'}
                              </button>
                              {expanded && (
                              <div className="grid grid-cols-1 gap-2">
                                <div>
                                  <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">H1 SEO</label>
                                  <input
                                    type="text"
                                    value={category.h1 || ''}
                                    placeholder={category.label}
                                    onChange={(e) => updateBlogCategoryItem(category.id, item => ({ ...item, h1: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Mô tả ngắn</label>
                                  <textarea
                                    value={category.description || ''}
                                    rows={2}
                                    placeholder="Mô tả hiển thị dưới H1 và dùng làm meta description nếu chưa nhập riêng."
                                    onChange={(e) => updateBlogCategoryItem(category.id, item => ({ ...item, description: e.target.value, metaDescription: item.metaDescription || e.target.value }))}
                                    className="w-full resize-none bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                </div>
                                <div>
                                  <div className="mb-1 flex items-center justify-between gap-3">
                                    <label className="text-[10px] font-black uppercase text-white/30 block">Title (Tiêu đề trang)</label>
                                    <span className="text-[10px] font-bold text-white/25">{(category.seoTitle || '').length}/60</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={category.seoTitle || ''}
                                    placeholder={`${category.label} | Blog UR Sport`}
                                    maxLength={80}
                                    onChange={(e) => updateBlogCategoryItem(category.id, item => ({ ...item, seoTitle: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                </div>
                                <div>
                                  <div className="mb-1 flex items-center justify-between gap-3">
                                    <label className="text-[10px] font-black uppercase text-white/30 block">Meta Description (Mô tả)</label>
                                    <span className="text-[10px] font-bold text-white/25">{(category.metaDescription || '').length}/160</span>
                                  </div>
                                  <textarea
                                    value={category.metaDescription || ''}
                                    rows={2}
                                    placeholder="Mô tả dùng cho thẻ meta description trên Google."
                                    maxLength={220}
                                    onChange={(e) => updateBlogCategoryItem(category.id, item => ({ ...item, metaDescription: e.target.value }))}
                                    className="w-full resize-none bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                </div>
                              </div>
                              )}
                              {category.group === 'category' && (
                                <button
                                  type="button"
                                  onClick={() => addChildBlogCategoryItem(category)}
                                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#1e4b64]/50 bg-[#1e4b64]/15 px-3 py-2 text-xs font-bold text-white hover:bg-[#1e4b64]/25 transition-all"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Tạo mục con
                                </button>
                              )}
                              <p className="text-[10px] text-white/30">{usedCount} bài viết</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeBlogCategoryItem(category.id)}
                              className="h-8 w-8 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {childItems.map(child => {
                            const childUsedCount = blogPosts.filter(post => normalizeMenuLabel(post.category) === normalizeMenuLabel(child.label)).length;
                            const childExpanded = isBlogCategoryExpanded(child.id);
                            return (
                              <div key={child.id} className="ml-8 bg-[#1e4b64]/5 border border-[#1e4b64]/30 rounded-2xl p-4 flex gap-4">
                                <div className="w-16 shrink-0">
                                  <ImageUpload
                                    folder="blog-categories"
                                    label=""
                                    compact={true}
                                    externalPreview={child.icon}
                                    onUploadComplete={(url) => updateBlogCategoryItem(child.id, item => ({ ...item, icon: url }))}
                                  />
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={child.label}
                                      onChange={(e) => updateBlogCategoryItem(child.id, item => ({
                                        ...item,
                                        label: e.target.value,
                                        link: `/blog/category/${slugifyBlogCategory(e.target.value).replace(/^\//, '')}`
                                      }))}
                                      className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                    />
                                    <input
                                      type="text"
                                      value={child.parentLabel || ''}
                                      list="blog-parent-categories"
                                      onChange={(e) => updateBlogCategoryItem(child.id, item => ({ ...item, parentLabel: e.target.value }))}
                                      className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={child.link}
                                    onChange={(e) => updateBlogCategoryItem(child.id, item => ({ ...item, link: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleBlogCategoryExpanded(child.id)}
                                    className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all"
                                  >
                                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", childExpanded && "rotate-180")} />
                                    {childExpanded ? 'Thu gọn' : 'Mở rộng SEO'}
                                  </button>
                                  {childExpanded && (
                                  <>
                                  <input
                                    type="text"
                                    value={child.h1 || ''}
                                    placeholder="H1 SEO"
                                    onChange={(e) => updateBlogCategoryItem(child.id, item => ({ ...item, h1: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                  <textarea
                                    value={child.description || ''}
                                    rows={2}
                                    placeholder="Mô tả ngắn"
                                    onChange={(e) => updateBlogCategoryItem(child.id, item => ({ ...item, description: e.target.value, metaDescription: item.metaDescription || e.target.value }))}
                                    className="w-full resize-none bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                  />
                                  <div>
                                    <div className="mb-1 flex items-center justify-between gap-3">
                                      <label className="text-[10px] font-black uppercase text-white/30 block">Title (Tiêu đề trang)</label>
                                      <span className="text-[10px] font-bold text-white/25">{(child.seoTitle || '').length}/60</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={child.seoTitle || ''}
                                      placeholder={`${child.label} | Blog UR Sport`}
                                      maxLength={80}
                                      onChange={(e) => updateBlogCategoryItem(child.id, item => ({ ...item, seoTitle: e.target.value }))}
                                      className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                    />
                                  </div>
                                  <div>
                                    <div className="mb-1 flex items-center justify-between gap-3">
                                      <label className="text-[10px] font-black uppercase text-white/30 block">Meta Description (Mô tả)</label>
                                      <span className="text-[10px] font-bold text-white/25">{(child.metaDescription || '').length}/160</span>
                                    </div>
                                    <textarea
                                      value={child.metaDescription || ''}
                                      rows={2}
                                      placeholder="Mô tả dùng cho thẻ meta description trên Google."
                                      maxLength={220}
                                      onChange={(e) => updateBlogCategoryItem(child.id, item => ({ ...item, metaDescription: e.target.value }))}
                                      className="w-full resize-none bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                    />
                                  </div>
                                  </>
                                  )}
                                  <p className="text-[10px] text-white/30">{childUsedCount} bài viết</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeBlogCategoryItem(child.id)}
                                  className="h-8 w-8 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                  {blogCategories.length > 0 && (
                    <div className="col-span-full flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveBlogCategories(blogCategories)}
                        className="px-6 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
                      >
                        Lưu danh mục Blog
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'flash-sale' && (
            <div className="space-y-6">
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-white font-black text-lg uppercase tracking-tight">Cấu hình Flash Sale</h3>
                    <p className="text-white/30 text-sm mt-1">Chọn sản phẩm và thời gian chạy chương trình giảm giá chớp nhoáng</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Trạng thái:</span>
                      <button 
                        onClick={() => setFlashSaleSettings(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                          flashSaleSettings.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        )}
                      >
                        {flashSaleSettings.isActive ? 'Đang bật' : 'Đang tắt'}
                      </button>
                    </div>
                    <button 
                      onClick={handleSaveFlashSale}
                      className="px-6 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#1e4b64]/20 transition-all flex items-center gap-2"
                    >
                      Lưu cấu hình
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Timer className="h-5 w-5 text-[#1e4b64]" />
                      <h4 className="text-white font-bold text-sm uppercase tracking-wider">Thời gian diễn ra</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-white/30 mb-1.5 block">Thời gian bắt đầu</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                          <input 
                            type="datetime-local"
                            value={flashSaleSettings.startTime}
                            onChange={(e) => setFlashSaleSettings(prev => ({ ...prev, startTime: e.target.value }))}
                            className="w-full bg-[#0f1117] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-white/30 mb-1.5 block">Thời gian kết thúc</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                          <input 
                            type="datetime-local"
                            value={flashSaleSettings.endTime}
                            onChange={(e) => setFlashSaleSettings(prev => ({ ...prev, endTime: e.target.value }))}
                            className="w-full bg-[#0f1117] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <Package className="h-5 w-5 text-[#1e4b64]" />
                      <h4 className="text-white font-bold text-sm uppercase tracking-wider">Tóm tắt</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">Sản phẩm đã chọn:</span>
                        <span className="text-white font-bold">{flashSaleSettings.products.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">Thời lượng:</span>
                        <span className="text-white font-bold">
                          {flashSaleSettings.startTime && flashSaleSettings.endTime ? (
                            Math.max(0, Math.round((new Date(flashSaleSettings.endTime).getTime() - new Date(flashSaleSettings.startTime).getTime()) / (1000 * 60 * 60))) + ' giờ'
                          ) : 'Chưa thiết lập'}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            flashSaleSettings.isActive && flashSaleSettings.startTime && new Date() >= new Date(flashSaleSettings.startTime) && new Date() <= new Date(flashSaleSettings.endTime)
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-white/10"
                          )} />
                          <span className="text-[11px] font-black uppercase text-white/40">
                            {flashSaleSettings.isActive && flashSaleSettings.startTime && new Date() >= new Date(flashSaleSettings.startTime) && new Date() <= new Date(flashSaleSettings.endTime)
                              ? "Đang diễn ra"
                              : "Đang chờ"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="text-white font-bold text-sm uppercase tracking-wider">Chọn sản phẩm tham gia</h4>
                      <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-bold text-white/30 uppercase">Chỉ hiện sản phẩm có giá khuyến mãi</span>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
                      <input 
                        type="text"
                        placeholder="Tìm sản phẩm..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#1e4b64]/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {products
                      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .sort((a, b) => {
                        const isSelectedA = flashSaleSettings.products.some(p => p.id === a.id);
                        const isSelectedB = flashSaleSettings.products.some(p => p.id === b.id);
                        if (isSelectedA === isSelectedB) return 0;
                        return isSelectedA ? -1 : 1;
                      })
                      .map(product => {
                        const flashSaleProduct = flashSaleSettings.products.find(p => p.id === product.id);
                        const isSelected = !!flashSaleProduct;

                      return (
                        <div 
                          key={product.id}
                          className={cn(
                            "relative bg-[#0f1117] border rounded-xl p-3 transition-all group",
                            isSelected 
                              ? "border-[#1e4b64] bg-[#1e4b64]/5 shadow-lg shadow-[#1e4b64]/10" 
                              : "border-white/5 hover:border-white/10"
                          )}
                        >
                          <div 
                            onClick={() => {
                              setFlashSaleSettings(prev => ({
                                ...prev,
                                products: isSelected 
                                  ? prev.products.filter(p => p.id !== product.id)
                                  : [...prev.products, { id: product.id, flashSalePrice: product.discountPrice || product.price * 0.9, sold: 0 }]
                              }));
                            }}
                            className="aspect-square rounded-lg overflow-hidden mb-3 bg-white/5 relative cursor-pointer"
                          >
                            <img src={product.images[0]} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#1e4b64]/20 flex items-center justify-center">
                                <div className="h-8 w-8 bg-[#1e4b64] rounded-full flex items-center justify-center shadow-xl">
                                  <CheckIcon className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-white text-[11px] font-bold line-clamp-2 leading-relaxed h-8">{product.name}</p>
                          
                          <div className="mt-3 space-y-2">
                             {isSelected ? (
                               <div className="grid grid-cols-2 gap-2">
                                 <div>
                                   <label className="text-[9px] font-black uppercase text-[#1e4b64] block mb-1">Giá Flash Sale</label>
                                   <div className="relative">
                                     <input 
                                       type="number"
                                       value={flashSaleProduct.flashSalePrice}
                                       onChange={(e) => {
                                         const val = parseInt(e.target.value) || 0;
                                         setFlashSaleSettings(prev => ({
                                           ...prev,
                                           products: prev.products.map(p => p.id === product.id ? { ...p, flashSalePrice: val } : p)
                                         }));
                                       }}
                                       className="w-full bg-white/5 border border-[#1e4b64]/30 rounded-lg pl-2 pr-6 py-1.5 text-xs text-white font-bold outline-none focus:border-[#1e4b64]"
                                     />
                                     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 italic">₫</span>
                                   </div>
                                 </div>
                                 <div>
                                   <label className="text-[9px] font-black uppercase text-[#1e4b64] block mb-1">Đã bán</label>
                                   <div className="relative">
                                     <input 
                                       type="number"
                                       value={flashSaleProduct.sold || 0}
                                       onChange={(e) => {
                                         const val = parseInt(e.target.value) || 0;
                                         setFlashSaleSettings(prev => ({
                                           ...prev,
                                           products: prev.products.map(p => p.id === product.id ? { ...p, sold: val } : p)
                                         }));
                                       }}
                                       className="w-full bg-white/5 border border-[#1e4b64]/30 rounded-lg px-2 py-1.5 text-xs text-white font-bold outline-none focus:border-[#1e4b64]"
                                     />
                                   </div>
                                 </div>
                               </div>
                             ) : (
                               <div className="flex items-center justify-between">
                                 <p className="text-white/50 text-xs font-black">{product.price.toLocaleString('vi-VN')}₫</p>
                                 <button 
                                   onClick={() => {
                                     setFlashSaleSettings(prev => ({
                                       ...prev,
                                       products: [...prev.products, { id: product.id, flashSalePrice: product.discountPrice || product.price * 0.9, sold: 0 }]
                                     }));
                                   }}
                                   className="p-1.5 bg-white/5 hover:bg-[#1e4b64]/20 text-white/40 hover:text-[#1e4b64] rounded-lg transition-all"
                                 >
                                   <Plus className="h-3.5 w-3.5" />
                                 </button>
                               </div>
                             )}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'category-seo' && (
            <CategorySeoManager />
          )}

          {activeTab === 'content-map' && (
            <ContentMapSeoPanel
              products={products}
              blogPosts={blogPosts}
              navigation={navigation}
              blogCategories={blogCategories}
            />
          )}

          {activeTab === 'policy-pages' && (
            <React.Suspense fallback={<AdminTabFallback />}>
              <PolicyPagesManager />
            </React.Suspense>
          )}
        </main>
      </div>

      <AddProductModal
        key={isAddModalOpen ? `product-${editingProduct?.id || editingProduct?.slug || 'new'}` : 'product-closed'}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {}}
        product={editingProduct}
      />

      <AddBlogPostModal
        key={isBlogModalOpen ? `blog-${editingBlogPost?.id || editingBlogPost?.slug || 'new'}` : 'blog-closed'}
        isOpen={isBlogModalOpen}
        onClose={() => {
          setIsBlogModalOpen(false);
          setEditingBlogPost(null);
        }}
        onSuccess={() => {
          setIsBlogModalOpen(false);
          setEditingBlogPost(null);
        }}
        post={editingBlogPost}
        blogCategories={blogCategories.filter(item => item.group !== 'main').map(item => item.label)}
      />

      <OrderDetailModal
        isOpen={isOrderDetailModalOpen}
        onClose={() => {
          setIsOrderDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />

      <AddVoucherModal
        key={isVoucherModalOpen ? `voucher-${editingVoucher?.id || 'new'}` : 'voucher-closed'}
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setEditingVoucher(null);
        }}
        onSuccess={() => {
          setIsVoucherModalOpen(false);
          setEditingVoucher(null);
        }}
        voucher={editingVoucher}
      />
    </div>
  );
};




