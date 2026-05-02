import React from 'react';
import { Plus, Package, Users, Trash2, Edit2, Image as ImageIcon, MessageSquare, ShoppingBag } from 'lucide-react';
import { PRODUCTS as STATIC_PRODUCTS } from '../data';
import { ImageUpload } from './ImageUpload';
import { AddProductModal } from './AddProductModal';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export const AdminPanel: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      setProducts(productData.length > 0 ? productData : STATIC_PRODUCTS);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setProducts(STATIC_PRODUCTS);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Đã xóa sản phẩm');
    } catch (error) {
      toast.error('Lỗi khi xóa sản phẩm');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h2 className="text-4xl font-black uppercase mb-6">RESTRICTED ACCESS</h2>
        <p className="text-zinc-500 font-medium mb-8">
          {!user ? "Please sign in to access the admin panel." : "You do not have permission to access this area."}
        </p>
        {!user && (
           <Button className="bg-black text-white hover:bg-zinc-800 font-black px-10 h-14 uppercase" onClick={() => window.location.href='/'}>
              Back to Home
           </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
           <Badge className="mb-4 bg-[#0082c8] text-white font-bold px-3 py-1 rounded-full border-none uppercase tracking-widest text-[10px]">
             Administrator
           </Badge>
           <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
             ADMIN <span className="text-zinc-300">HUB</span>
           </h1>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#0082c8] hover:bg-[#0071ae] text-white font-black px-8 py-6 rounded-2xl h-14 flex items-center gap-2 shadow-lg shadow-blue-500/20 transform transition hover:scale-105 active:scale-95"
        >
           <Plus className="h-5 w-5" /> ADD PRODUCT
        </Button>
      </div>

      <Tabs defaultValue="inventory" className="space-y-8">
        <TabsList className="bg-zinc-100 p-1 rounded-2xl h-14 w-full md:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="inventory" className="rounded-xl h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">INVENTORY</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">ORDERS</TabsTrigger>
          <TabsTrigger value="customers" className="rounded-xl h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">CUSTOMERS</TabsTrigger>
          <TabsTrigger value="blogs" className="rounded-xl h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">BLOGS</TabsTrigger>
          <TabsTrigger value="media" className="rounded-xl h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">MEDIA</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">SETTINGS</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <Card className="rounded-3xl border-none bg-gradient-to-br from-zinc-900 to-zinc-800 shadow-xl p-6 text-white">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <Package className="h-6 w-6 text-[#0082c8]" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Products</p>
                        <p className="text-2xl font-black">{products.length}</p>
                     </div>
                  </div>
               </Card>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-zinc-50/50">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">PRODUCT</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">CATEGORY</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">PRICE</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">STOCK</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">ACTIONS</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                     {products.map(product => (
                        <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                 <div className="h-12 w-12 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-100 shrink-0">
                                    {product.images && product.images[0] ? (
                                      <img src={product.images[0]} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                      <ImageIcon className="h-full w-full p-3 text-zinc-300" />
                                    )}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-900 line-clamp-1">{product.name}</span>
                                    <span className="text-[10px] text-zinc-400 font-medium">UID: {product.id.substring(0, 8)}...</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <Badge className="rounded-lg font-bold text-[10px] uppercase bg-zinc-100 text-zinc-600 border-none hover:bg-zinc-200">{product.category}</Badge>
                           </td>
                           <td className="px-6 py-4 font-black text-sm text-zinc-900">{product.price.toLocaleString('vi-VN')}₫</td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                 <span className={`text-sm font-bold ${product.stock < 10 ? 'text-red-600' : 'text-zinc-900'}`}>{product.stock} units</span>
                                 <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                                    <div 
                                       className={cn("h-full rounded-full", product.stock < 10 ? 'bg-red-500' : 'bg-green-500')} 
                                       style={{ width: `${Math.min(product.stock, 100)}%` }}
                                    />
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-blue-50 hover:text-blue-600">
                                    <Edit2 className="h-4 w-4" />
                                 </Button>
                                 <Button 
                                    onClick={() => handleDeleteProduct(product.id)}
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-9 w-9 p-0 rounded-xl hover:bg-red-50 hover:text-red-600"
                                 >
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
        </TabsContent>

         <TabsContent value="orders">
            <div className="bg-white rounded-3xl border border-zinc-100 p-12 text-center flex flex-col items-center shadow-sm">
               <div className="h-20 w-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag className="h-10 w-10 text-zinc-300" />
               </div>
               <h3 className="text-xl font-black italic tracking-tighter uppercase mb-2">Chưa có đơn hàng nào</h3>
               <p className="text-zinc-500 font-medium max-w-xs mx-auto">
                  Khi khách hàng đặt mua sản phẩm, danh sách đơn hàng sẽ xuất hiện tại đây.
               </p>
            </div>
         </TabsContent>

         <TabsContent value="blogs">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-black italic tracking-tighter uppercase">Quản lý bài viết</h2>
               <Button className="bg-black text-white hover:bg-zinc-800 rounded-xl font-bold flex items-center gap-2">
                  <Plus className="h-4 w-4" /> VIẾT BÀI MỚI
               </Button>
            </div>
            <div className="bg-white rounded-3xl border border-zinc-100 p-12 text-center flex flex-col items-center shadow-sm">
               <div className="h-20 w-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare className="h-10 w-10 text-zinc-300" />
               </div>
               <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Tính năng Blog đang được hoàn thiện.</p>
            </div>
         </TabsContent>

         <TabsContent value="customers">
            <div className="bg-white rounded-3xl border border-zinc-100 p-12 text-center flex flex-col items-center shadow-sm">
               <div className="h-20 w-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                  <Users className="h-10 w-10 text-zinc-300" />
               </div>
               <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Danh sách khách hàng sẽ hiển thị tại đây.</p>
            </div>
         </TabsContent>

        <TabsContent value="media">
           <Card className="rounded-none border-2 border-zinc-100 shadow-none">
              <CardHeader>
                 <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Media Library & Storage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-4">
                       <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Tải ảnh mới</h3>
                       <ImageUpload 
                          onUploadComplete={(url) => {
                             console.log('File available at:', url);
                          }}
                          folder="products"
                          label="Upload product images to Firebase Storage"
                       />
                    </div>
                    
                    <div className="space-y-4">
                       <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Storage Information</h3>
                       <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                          <p className="text-sm text-zinc-600 mb-4">
                             Đây là nơi bạn có thể lưu trữ hình ảnh sản phẩm, banner và các tài liệu khác miễn phí trên Firebase Storage.
                          </p>
                          <ul className="space-y-3">
                             <li className="flex items-center gap-3 text-xs font-bold text-zinc-700">
                                <div className="h-2 w-2 bg-green-500 rounded-full" />
                                5GB Dung lượng lưu trữ miễn phí
                             </li>
                             <li className="flex items-center gap-3 text-xs font-bold text-zinc-700">
                                <div className="h-2 w-2 bg-green-500 rounded-full" />
                                Tự động tối ưu hóa đường truyền
                             </li>
                             <li className="flex items-center gap-3 text-xs font-bold text-zinc-700">
                                <div className="h-2 w-2 bg-green-500 rounded-full" />
                                Bảo mật với Firebase Security Rules
                             </li>
                          </ul>
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <AddProductModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          // Toast is already handled in the modal
        }}
      />
    </div>
  );
};
