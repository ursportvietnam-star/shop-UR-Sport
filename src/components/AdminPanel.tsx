import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, MessageSquare,
  Image as ImageIcon, Settings, Plus, Trash2, Edit2, LogOut,
  TrendingUp, Eye, DollarSign, BarChart2, Menu, X, Bell,
  Search, ChevronRight, Upload, Star, AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { PRODUCTS as STATIC_PRODUCTS } from '../data';
import { ImageUpload } from './ImageUpload';
import { AddProductModal } from './AddProductModal';
import { useAuth } from '../AuthContext';
import { Product } from '../types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'media' | 'settings';

const NAV_ITEMS: { id: AdminTab; label: string; icon: React.FC<any> }[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'products', label: 'Sản phẩm', icon: Package },
  { id: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
  { id: 'customers', label: 'Khách hàng', icon: Users },
  { id: 'media', label: 'Thư viện ảnh', icon: ImageIcon },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export const AdminPanel: React.FC = () => {
  const { user, isAdmin, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Đã xóa sản phẩm');
    } catch {
      toast.error('Lỗi khi xóa sản phẩm');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-[#0082c8] border-t-transparent animate-spin" />
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
            className="px-8 py-3 bg-[#0082c8] hover:bg-[#0071ae] text-white font-bold rounded-xl transition-all"
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
            <div className="h-8 w-8 bg-[#0082c8] rounded-lg flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-white font-black text-base italic tracking-tight">UR<span className="text-[#0082c8]">SPORT</span></span>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest -mt-0.5">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200",
                activeTab === item.id
                  ? "bg-[#0082c8] text-white shadow-lg shadow-blue-500/20"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {activeTab === item.id && <ChevronRight className="h-3 w-3 ml-auto" />}
            </button>
          ))}
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
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#0082c8] rounded-full" />
            </button>
            {activeTab === 'products' && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0082c8] hover:bg-[#0071ae] text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Thêm sản phẩm</span>
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
                  { label: 'Đơn hàng', value: '0', icon: ShoppingBag, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-500/10', text: 'text-orange-400' },
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
                  <button onClick={() => setActiveTab('products')} className="text-[#0082c8] text-xs font-bold hover:underline">Xem tất cả →</button>
                </div>
                <div className="divide-y divide-white/5">
                  {products.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all">
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-full w-full p-2.5 text-white/20" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{p.name}</p>
                        <p className="text-white/30 text-xs font-medium">{p.category}</p>
                      </div>
                      <p className="text-[#0082c8] font-black text-sm shrink-0">{p.price.toLocaleString('vi-VN')}₫</p>
                    </div>
                  ))}
                </div>
              </div>
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
                  className="w-full bg-[#13161f] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#0082c8]/50 transition-all"
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
                    <div className="h-8 w-8 rounded-full border-4 border-[#0082c8] border-t-transparent animate-spin" />
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
                                    <img src={product.images[0]} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
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
                              <p className="text-[#0082c8] font-black text-sm">{product.price.toLocaleString('vi-VN')}₫</p>
                              {product.discountPrice && (
                                <p className="text-white/25 text-xs font-medium line-through">{product.discountPrice.toLocaleString('vi-VN')}₫</p>
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
                                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-white/60 text-sm font-bold">{product.rating || 0}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id)}
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
            <div className="bg-[#13161f] border border-white/5 rounded-2xl p-16 flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-5">
                <ShoppingBag className="h-10 w-10 text-orange-400" />
              </div>
              <h3 className="text-white font-black text-xl uppercase tracking-tight mb-2">Chưa có đơn hàng</h3>
              <p className="text-white/30 font-medium max-w-xs">Khi khách hàng đặt mua, danh sách đơn hàng sẽ xuất hiện tại đây.</p>
            </div>
          )}

          {/* ─── CUSTOMERS ─── */}
          {activeTab === 'customers' && (
            <div className="bg-[#13161f] border border-white/5 rounded-2xl p-16 flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-5">
                <Users className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="text-white font-black text-xl uppercase tracking-tight mb-2">Danh sách khách hàng</h3>
              <p className="text-white/30 font-medium max-w-xs">Thông tin khách hàng sẽ được hiển thị ở đây.</p>
            </div>
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
                    onUploadComplete={(url) => { toast.success('Upload thành công!'); console.log(url); }}
                    folder="products"
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
            </div>
          )}

          {/* ─── SETTINGS ─── */}
          {activeTab === 'settings' && (
            <div className="bg-[#13161f] border border-white/5 rounded-2xl p-16 flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mb-5">
                <Settings className="h-10 w-10 text-white/20" />
              </div>
              <h3 className="text-white font-black text-xl uppercase tracking-tight mb-2">Cài đặt hệ thống</h3>
              <p className="text-white/30 font-medium max-w-xs">Tính năng cài đặt đang được phát triển.</p>
            </div>
          )}
        </main>
      </div>

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};
