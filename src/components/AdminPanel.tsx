import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, MessageSquare,
  Image as ImageIcon, Settings, Plus, Trash2, Edit2, LogOut,
  TrendingUp, Eye, DollarSign, BarChart2, Menu, X, Bell,
  Search, ChevronRight, ChevronDown, Megaphone, Upload, Star, AlertCircle, Copy, ExternalLink, Code2, Check as CheckIcon, Bot, Sparkles, Zap, Timer, Clock, Ticket
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PRODUCTS as STATIC_PRODUCTS, STATIC_BLOG_POSTS, STATIC_ORDERS, STATIC_CUSTOMERS, CATEGORY_METADATA, STATIC_VOUCHERS } from '../data';
import { ImageUpload } from './ImageUpload';
import { AddProductModal } from './AddProductModal';
import { AddBlogPostModal } from './AddBlogPostModal';
import { AddVoucherModal } from './AddVoucherModal';
import { OrderDetailModal } from './OrderDetailModal';
import { AIProductAssistant } from './AIProductAssistant';
import { AIBlogAssistant } from './AIBlogAssistant';
import { CategorySeoManager } from './CategorySeoManager';
import { AIProductData, AIBlogData } from '../lib/gemini';
import { useAuth } from '../AuthContext';
import { Product, BlogPost, Order, Voucher } from '../types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  url: string;
  createdAt: any;
}

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'vouchers' | 'blog' | 'media' | 'settings' | 'ai-product' | 'ai-blog' | 'flash-sale' | 'category-seo';

type NavItem = {
  id: string;
  label: string;
  icon: React.FC<any>;
  isGroup?: boolean;
  children?: { id: AdminTab; label: string; icon: React.FC<any> }[];
};

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'products', label: 'Sản phẩm', icon: Package },
  { id: 'ai-product', label: 'AI Sản Phẩm', icon: Bot },
  { id: 'blog', label: 'Blog', icon: MessageSquare },
  { id: 'ai-blog', label: 'AI Blog', icon: Sparkles },
  { id: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
  { id: 'customers', label: 'Khách hàng', icon: Users },
  {
    id: 'marketing-group',
    label: 'Kênh Marketing',
    icon: Megaphone,
    isGroup: true,
    children: [
      { id: 'flash-sale', label: 'Flash Sale', icon: Zap },
      { id: 'vouchers', label: 'Mã giảm giá', icon: Ticket },
      { id: 'category-seo', label: 'SEO Danh mục', icon: Search }
    ]
  },
  { id: 'media', label: 'Thư viện ảnh', icon: ImageIcon },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export const AdminPanel: React.FC = () => {
  const { user, isAdmin, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['marketing-group']);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [customCss, setCustomCss] = useState('');
  const [cssSaved, setCssSaved] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [navigation, setNavigation] = useState<any[]>([]);
  const [floatingMenu, setFloatingMenu] = useState({
    zaloPhone: '0917722425',
    callPhone: '0917722425',
    zaloIcon: 'https://res.cloudinary.com/dcj4qhcfh/image/upload/v1778164803/media/rbkdvi2xgqeg6b79cq1n.webp',
    callIcon: 'https://res.cloudinary.com/dcj4qhcfh/image/upload/v1778166005/media/ximp16qsaxdt7noebddh.jpg'
  });
  const [flashSaleSettings, setFlashSaleSettings] = useState({
    products: [] as { id: string; flashSalePrice: number; sold: number }[],
    startTime: '',
    endTime: '',
    isActive: true
  });

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
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
    const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as BlogPost[];
      setBlogPosts(data.length > 0 ? data : STATIC_BLOG_POSTS);
    }, () => {
      setBlogPosts(STATIC_BLOG_POSTS);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
      setOrders(data.length > 0 ? data : STATIC_ORDERS);
    }, () => {
      setOrders(STATIC_ORDERS);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MediaItem[];
      setMediaItems(data);
    }, () => {
      setMediaItems([]);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'vouchers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Voucher[];
      setVouchers(data.length > 0 ? data : STATIC_VOUCHERS);
    }, () => {
      setVouchers(STATIC_VOUCHERS);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Load settings from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    getDoc(doc(db, 'settings', 'customCss')).then(snap => {
      if (snap.exists()) setCustomCss(snap.data().css || '');
    });
    getDoc(doc(db, 'settings', 'banners')).then(snap => {
      if (snap.exists()) setBanners(snap.data().items || []);
    });
    getDoc(doc(db, 'settings', 'navigation')).then(snap => {
      if (snap.exists()) {
        setNavigation(snap.data().items || []);
      } else {
        // Pre-populate with defaults so user can edit them
        const defaults = [
          { id: 1, label: 'Cửa hàng', link: '/shop', icon: '', group: 'main' },
          { id: 2, label: 'Blog', link: '/blog', icon: '', group: 'main' },
          ...CATEGORY_METADATA.map((cat, i) => ({
            id: 100 + i,
            label: cat.name,
            link: `/apparel/${cat.slug}`,
            icon: cat.icon,
            group: 'category'
          }))
        ];
        setNavigation(defaults);
      }
    });
    getDoc(doc(db, 'settings', 'floatingMenu')).then(snap => {
      if (snap.exists()) setFloatingMenu(prev => ({ ...prev, ...snap.data() }));
    });
    getDoc(doc(db, 'settings', 'flashSale')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setFlashSaleSettings(prev => ({ 
          ...prev, 
          ...data,
          // Migration/Compatibility check
          products: data.products || (data.productIds || []).map((id: string) => ({ id, flashSalePrice: 0 }))
        }));
      }
    });
  }, [isAdmin]);

  const handleSaveCss = async () => {
    try {
      await setDoc(doc(db, 'settings', 'customCss'), { css: customCss });
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

  const handleDeleteCss = async () => {
    if (!window.confirm('Xóa toàn bộ CSS tùy biến?')) return;
    try {
      await setDoc(doc(db, 'settings', 'customCss'), { css: '' });
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
      await deleteDoc(doc(db, 'products', id));
      toast.success('Đã xóa sản phẩm');
    } catch {
      toast.error('Lỗi khi xóa sản phẩm');
    }
  };

  const handleDeleteBlogPost = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await deleteDoc(doc(db, 'blogPosts', id));
      toast.success('Đã xóa bài viết');
    } catch {
      toast.error('Lỗi khi xóa bài viết');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Xóa đơn hàng này?')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
      toast.success('Đã xóa đơn hàng');
    } catch {
      toast.error('Lỗi khi xóa đơn hàng');
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
      await deleteDoc(doc(db, 'vouchers', id));
      toast.success('Đã xóa mã giảm giá');
    } catch {
      toast.error('Lỗi khi xóa mã giảm giá');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await setDoc(doc(db, 'orders', id), { status }, { merge: true });
      toast.success('Đã cập nhật trạng thái đơn hàng');
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleCopy = async (product: Product) => {
    try {
      const { addDoc, collection: col, serverTimestamp } = await import('firebase/firestore');
      const copy = {
        ...product,
        name: product.name + ' (Copy)',
        slug: (product.slug || '') + '-copy-' + Date.now(),
        createdAt: serverTimestamp(),
        rating: 5,
        reviewsCount: 0,
      };
      delete (copy as any).id;
      await addDoc(col(db, 'products'), copy);
      toast.success('Sản phẩm đã được sao chép thành công!');
    } catch {
      toast.error('Lỗi khi sao chép sản phẩm');
    }
  };

  const handleSaveMedia = async (url: string) => {
    try {
      await addDoc(collection(db, 'media'), {
        url,
        createdAt: serverTimestamp()
      });
      toast.success('Đã lưu ảnh vào thư viện!');
    } catch {
      toast.error('Lỗi khi lưu vào thư viện');
    }
  };

  const handleSaveBanners = async (newBanners: any[]) => {
    try {
      await setDoc(doc(db, 'settings', 'banners'), { items: newBanners });
      setBanners(newBanners);
      toast.success('Đã lưu cài đặt Banner');
    } catch (error) {
      toast.error('Lỗi khi lưu Banner');
    }
  };

  const handleSaveNavigation = async (newNav: any[]) => {
    try {
      await setDoc(doc(db, 'settings', 'navigation'), { items: newNav });
      setNavigation(newNav);
      toast.success('Đã lưu Menu Navigation');
    } catch (error) {
      toast.error('Lỗi khi lưu Menu');
    }
  };

  const handleSaveFloatingMenu = async () => {
    try {
      await setDoc(doc(db, 'settings', 'floatingMenu'), floatingMenu);
      toast.success('Đã cập nhật cài đặt Menu nổi!');
    } catch {
      toast.error('Lỗi khi lưu cài đặt');
    }
  };

  const handleSaveFlashSale = async () => {
    try {
      await setDoc(doc(db, 'settings', 'flashSale'), flashSaleSettings);
      toast.success('Đã lưu cài đặt Flash Sale!');
    } catch {
      toast.error('Lỗi khi lưu Flash Sale');
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm('Xóa ảnh này khỏi thư viện?')) return;
    try {
      await deleteDoc(doc(db, 'media', id));
      toast.success('Đã xóa ảnh');
    } catch {
      toast.error('Lỗi khi xóa ảnh');
    }
  };

  const handleView = (product: Product) => {
    const catSlug = product.category
      ? product.category.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      : 'san-pham';
    window.open(`/apparel/${catSlug}/${product.slug}`, '_blank');
  };

  const handleApplyAIProduct = (data: AIProductData) => {
    const newProduct: Partial<Product> = {
      name: data.name,
      slug: data.slug,
      description: data.descriptionHtml,
      seoTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      keywords: data.seoKeywords,
      specifications: data.descriptionHtml,
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
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = products.reduce((sum, p) => sum + p.price, 0);
  const avgRating = products.length > 0 ? (products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length).toFixed(1) : '0';

  const lowStockProducts = products.filter(p => (p.stock || 0) < 10);

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
                {NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Dashboard'}
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
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Search */}
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
                                {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('vi-VN') : order.createdAt}
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
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
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

          {/* ─── AI PRODUCT ASSISTANT ─── */}
          {activeTab === 'ai-product' && (
            <AIProductAssistant onApply={handleApplyAIProduct} />
          )}

          {/* ─── AI BLOG ASSISTANT ─── */}
          {activeTab === 'ai-blog' && (
            <AIBlogAssistant onApply={handleApplyAIBlog} />
          )}

          {/* ─── MEDIA ─── */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <Upload className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-widest">Tải ảnh lên</h3>
                      <p className="text-white/30 text-xs font-medium">Firebase Storage • Miễn phí 5GB</p>
                    </div>
                  </div>
                  <ImageUpload
                    onUploadComplete={handleSaveMedia}
                    folder="media"
                    label="Kéo thả hoặc nhấn để chọn ảnh"
                  />
                </div>
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6">Thông tin lưu trữ</h3>
                  <div className="space-y-4">
                    {[
                      { label: '5GB dung lượng miễn phí', color: 'bg-emerald-500' },
                      { label: 'Tự động tối ưu CDN', color: 'bg-blue-500' },
                      { label: 'Bảo mật Firebase Rules', color: 'bg-purple-500' },
                      { label: 'Hỗ trợ đa định dạng', color: 'bg-orange-500' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", item.color)} />
                        <span className="text-white/60 text-sm font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Media Gallery */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">Ảnh đã tải lên</h3>
                  <p className="text-white/30 text-xs font-medium">{mediaItems.length} ảnh</p>
                </div>
                <div className="p-6">
                  {mediaItems.length === 0 ? (
                    <div className="py-20 text-center">
                      <ImageIcon className="h-12 w-12 text-white/10 mx-auto mb-3" />
                      <p className="text-white/30 font-bold text-sm">Chưa có ảnh nào trong thư viện</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {mediaItems.map((item) => (
                        <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-[#1e4b64]/50 transition-all">
                          <img 
                            src={item.url} 
                            alt="" 
                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.url);
                                toast.success('Đã sao chép link!');
                              }}
                              className="p-2 bg-white/10 hover:bg-[#1e4b64] rounded-lg text-white transition-all"
                              title="Sao chép link"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMedia(item.id)}
                              className="p-2 bg-white/10 hover:bg-red-500 rounded-lg text-white transition-all"
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {/* Info overlay on mobile/hover */}
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[8px] text-white/50 truncate font-mono">{item.url}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── SETTINGS ─── */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Custom CSS */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Code2 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-widest">Tùy biến giao diện (Custom CSS)</h3>
                      <p className="text-white/30 text-xs font-medium mt-0.5">CSS sẽ được chèn vào trang qua thẻ <code className="text-purple-400">#custom-global-css</code></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteCss}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </button>
                    <button
                      onClick={handleSaveCss}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        cssSaved
                          ? "bg-emerald-500 text-white"
                          : "bg-[#1e4b64] hover:bg-[#153446] text-white"
                      )}
                    >
                      {cssSaved ? <CheckIcon className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                      {cssSaved ? 'Đã lưu!' : 'Lưu & Áp dụng'}
                    </button>
                  </div>
                </div>

                {/* Code editor area */}
                <div className="relative">
                  {/* Line numbers */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/[0.02] border-r border-white/5 pointer-events-none flex flex-col items-end pt-4 pb-4 pr-2 select-none overflow-hidden">
                    {Array.from({ length: Math.max(customCss.split('\n').length, 20) }, (_, i) => (
                      <span key={i} className="text-white/15 text-xs font-mono leading-6">{i + 1}</span>
                    ))}
                  </div>
                  <textarea
                    value={customCss}
                    onChange={e => setCustomCss(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const val = customCss;
                        setCustomCss(val.substring(0, start) + '  ' + val.substring(end));
                        setTimeout(() => e.currentTarget.setSelectionRange(start + 2, start + 2), 0);
                      }
                      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        handleSaveCss();
                      }
                    }}
                    spellCheck={false}
                    placeholder={`/* Nhập CSS tùy biến của bạn vào đây... */\n\n/* Ví dụ: */\n.product-card {\n  border-radius: 16px;\n}\n\nbody {\n  font-family: 'Inter', sans-serif;\n}`}
                    className="w-full min-h-[400px] bg-transparent pl-14 pr-6 pt-4 pb-4 text-[13px] font-mono text-green-300 leading-6 resize-y outline-none placeholder:text-white/15 border-none"
                    style={{ caretColor: '#4ade80' }}
                  />
                </div>

                <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                  <p className="text-white/25 text-[11px] font-medium">
                    {customCss.split('\n').length} dòng • {customCss.length} ký tự • Lưu nhanh: <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/40">Ctrl+S</kbd>
                  </p>
                  <p className="text-white/25 text-[11px]">Tab = 2 spaces</p>
                </div>
              </div>

              {/* Banner Management */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Quản lý Hero Banners</h3>
                    <p className="text-white/30 text-xs mt-1">Tùy chỉnh các hình ảnh và tiêu đề chạy ở đầu trang chủ</p>
                  </div>
                  <button 
                    onClick={() => handleSaveBanners([...banners, { id: Date.now(), image: '', title: 'TIÊU ĐỀ MỚI', subtitle: 'Subtitle', link: '' }])}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm Banner
                  </button>
                </div>

                <div className="space-y-4">
                  {banners.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-white/20 text-sm font-medium">Chưa có banner nào. Hãy thêm banner đầu tiên.</p>
                    </div>
                  ) : (
                    banners.map((banner, idx) => (
                      <div key={banner.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-48 shrink-0">
                            <ImageUpload 
                              folder="banners"
                              label=""
                              externalPreview={banner.image}
                              onUploadComplete={(url) => {
                                const updated = [...banners];
                                updated[idx].image = url;
                                setBanners(updated);
                              }}
                            />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Tiêu đề (Dùng \n để xuống dòng)</label>
                              <input 
                                type="text"
                                value={banner.title}
                                onChange={(e) => {
                                  const updated = [...banners];
                                  updated[idx].title = e.target.value;
                                  setBanners(updated);
                                }}
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Phụ đề (Subtitle)</label>
                              <input 
                                type="text"
                                value={banner.subtitle || ''}
                                onChange={(e) => {
                                  const updated = [...banners];
                                  updated[idx].subtitle = e.target.value;
                                  setBanners(updated);
                                }}
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Đường dẫn (Link - Ví dụ: /ao-thun)</label>
                              <input 
                                type="text"
                                value={banner.link || ''}
                                onChange={(e) => {
                                  const updated = [...banners];
                                  updated[idx].link = e.target.value;
                                  setBanners(updated);
                                }}
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if(window.confirm('Xóa banner này?')) {
                                const updated = banners.filter((_, i) => i !== idx);
                                handleSaveBanners(updated);
                              }
                            }}
                            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {banners.length > 0 && (
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={() => handleSaveBanners(banners)}
                        className="px-6 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
                      >
                        Lưu thay đổi Banner
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Menu Settings */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Quản lý Menu Navigation</h3>
                    <p className="text-white/30 text-xs mt-1">Tùy chỉnh các mục menu và danh mục sản phẩm có icon</p>
                  </div>
                  <button 
                    onClick={() => setNavigation([...navigation, { id: Date.now(), label: 'Mục mới', link: '/', icon: '', group: 'main' }])}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm Mục Menu
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {navigation.length === 0 ? (
                    <div className="col-span-full py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-white/20 text-sm font-medium">Chưa có mục menu nào. Hãy thêm mục đầu tiên.</p>
                    </div>
                  ) : (
                    navigation.map((nav, idx) => (
                      <div key={nav.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-4">
                        <div className="w-20 shrink-0">
                          <ImageUpload 
                            folder="nav"
                            label=""
                            compact={true}
                            externalPreview={nav.icon}
                            onUploadComplete={(url) => {
                              const updated = [...navigation];
                              updated[idx].icon = url;
                              setNavigation(updated);
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
                                  const updated = [...navigation];
                                  updated[idx].label = e.target.value;
                                  setNavigation(updated);
                                }}
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Nhóm</label>
                              <select 
                                value={nav.group}
                                onChange={(e) => {
                                  const updated = [...navigation];
                                  updated[idx].group = e.target.value;
                                  setNavigation(updated);
                                }}
                                className="w-full bg-[#1c1f26] border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                              >
                                <option value="main">Danh mục chính</option>
                                <option value="category">Danh mục sản phẩm</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Đường dẫn (Link)</label>
                            <input 
                              type="text"
                              value={nav.link}
                              onChange={(e) => {
                                const updated = [...navigation];
                                updated[idx].link = e.target.value;
                                setNavigation(updated);
                              }}
                              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if(window.confirm('Xóa mục này?')) {
                              const updated = navigation.filter((_, i) => i !== idx);
                              handleSaveNavigation(updated);
                            }
                          }}
                          className="h-8 w-8 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                  {navigation.length > 0 && (
                    <div className="col-span-full flex justify-end pt-2">
                      <button 
                        onClick={() => handleSaveNavigation(navigation)}
                        className="px-6 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
                      >
                        Lưu Menu Navigation
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating Contact Settings */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6">Cài đặt Menu Liên hệ (Nút nổi)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Số điện thoại Zalo</label>
                      <input 
                        type="text"
                        value={floatingMenu.zaloPhone}
                        onChange={(e) => setFloatingMenu({...floatingMenu, zaloPhone: e.target.value})}
                        placeholder="0917722425"
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Số điện thoại Hotline</label>
                      <input 
                        type="text"
                        value={floatingMenu.callPhone}
                        onChange={(e) => setFloatingMenu({...floatingMenu, callPhone: e.target.value})}
                        placeholder="0917722425"
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                      />
                    </div>
                    <button 
                      onClick={handleSaveFloatingMenu}
                      className="px-6 py-2.5 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
                    >
                      Lưu thông tin liên hệ
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/30 block">Ảnh Icon Zalo</label>
                      <ImageUpload 
                        folder="settings"
                        label=""
                        externalPreview={floatingMenu.zaloIcon}
                        onUploadComplete={(url) => {
                          const updated = {...floatingMenu, zaloIcon: url};
                          setFloatingMenu(updated);
                          setDoc(doc(db, 'settings', 'floatingMenu'), updated);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/30 block">Ảnh Icon Tổng (Nút chính)</label>
                      <ImageUpload 
                        folder="settings"
                        label=""
                        externalPreview={floatingMenu.callIcon}
                        onUploadComplete={(url) => {
                          const updated = {...floatingMenu, callIcon: url};
                          setFloatingMenu(updated);
                          setDoc(doc(db, 'settings', 'floatingMenu'), updated);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick snippets */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4">Snippets gợi ý</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: 'Bo góc card', css: '.product-card { border-radius: 20px; }' },
                    { label: 'Ẩn footer', css: 'footer { display: none; }' },
                    { label: 'Font hệ thống', css: 'body { font-family: \'Inter\', sans-serif; }' },
                    { label: 'Responsive Video', css: '.video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; }\n.video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }' },
                    { label: 'Scrollbar tùy biến', css: '::-webkit-scrollbar { width: 6px; }\n::-webkit-scrollbar-thumb { background: #1e4b64; border-radius: 3px; }' },
                    { label: 'Nút CTA nổi bật', css: '.btn-primary { background: linear-gradient(135deg, #1e4b64, #153446); box-shadow: 0 4px 15px rgba(30,75,100,0.4); }' },
                  ].map((snippet, i) => (
                    <button
                      key={i}
                      onClick={() => setCustomCss(prev => prev + (prev ? '\n\n' : '') + '/* ' + snippet.label + ' */\n' + snippet.css)}
                      className="text-left p-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/30 rounded-xl transition-all group"
                    >
                      <p className="text-white/80 text-xs font-bold group-hover:text-purple-400 transition-colors">{snippet.label}</p>
                      <p className="text-white/25 text-[10px] font-mono mt-1 truncate">{snippet.css.split('\n')[0]}</p>
                    </button>
                  ))}
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
        </main>
      </div>

      <AddProductModal
        key={isAddModalOpen ? (editingProduct?.id || editingProduct?.slug || 'new') : 'closed'}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {}}
        product={editingProduct}
      />

      <AddBlogPostModal
        key={isBlogModalOpen ? (editingBlogPost?.id || editingBlogPost?.slug || 'new') : 'closed'}
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
        key={isVoucherModalOpen ? (editingVoucher?.id || 'new') : 'closed'}
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
