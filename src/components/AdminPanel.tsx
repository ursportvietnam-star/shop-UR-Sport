import React from 'react';
import { useAuth } from '../AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Users, Settings, Trash2, Edit2, LayoutDashboard } from 'lucide-react';
import { PRODUCTS } from '../data';

export const AdminPanel: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
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
           <Badge className="mb-4 bg-black text-white font-bold px-3 py-1 rounded-none border-none uppercase tracking-widest text-[10px]">
             Administrator
           </Badge>
           <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
             ADMIN <span className="text-zinc-300">HUB</span>
           </h1>
        </div>
        <Button className="bg-black text-white hover:bg-zinc-800 font-black px-8 py-6 rounded-none h-14 flex items-center gap-2">
           <Plus className="h-5 w-5" /> ADD PRODUCT
        </Button>
      </div>

      <Tabs defaultValue="inventory" className="space-y-8">
        <TabsList className="bg-zinc-100 p-1 rounded-none h-14 w-full md:w-auto overflow-x-auto">
          <TabsTrigger value="inventory" className="rounded-none h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-none">INVENTORY</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-none h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-none">ORDERS</TabsTrigger>
          <TabsTrigger value="customers" className="rounded-none h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-none">CUSTOMERS</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-none h-full px-8 font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:shadow-none">SETTINGS</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="rounded-none border-2 border-zinc-100 shadow-none p-6">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-zinc-900 flex items-center justify-center text-white">
                       <Package className="h-6 w-6" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Products</p>
                       <p className="text-2xl font-black">{PRODUCTS.length}</p>
                    </div>
                 </div>
              </Card>
              <Card className="rounded-none border-2 border-zinc-100 shadow-none p-6">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-zinc-900 flex items-center justify-center text-white">
                       <LayoutDashboard className="h-6 w-6" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Low Stock</p>
                       <p className="text-2xl font-black text-red-600">3</p>
                    </div>
                 </div>
              </Card>
           </div>

           <div className="bg-white border-2 border-zinc-100 overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-zinc-50 border-b-2">
                    <tr>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">PRODUCT</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">CATEGORY</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">PRICE</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">STOCK</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">ACTIONS</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {PRODUCTS.map(product => (
                       <tr key={product.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-4">
                                 {product.images && product.images[0] ? (
                                   <img src={product.images[0]} alt="" className="h-10 w-10 object-cover bg-zinc-100" referrerPolicy="no-referrer" />
                                 ) : (
                                   <div className="h-10 w-10 bg-zinc-100" />
                                 )}
                                <span className="text-sm font-bold uppercase">{product.name}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <Badge variant="outline" className="rounded-none font-bold text-[10px] uppercase border-zinc-200">{product.category}</Badge>
                          </td>
                          <td className="px-6 py-4 font-black text-sm">{product.price.toLocaleString('vi-VN')}₫</td>
                          <td className="px-6 py-4">
                             <span className={`text-sm font-bold ${product.stock < 10 ? 'text-red-600' : 'text-zinc-900'}`}>{product.stock} units</span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="hover:bg-zinc-100 h-8 w-8 p-0">
                                   <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="hover:bg-red-50 text-red-500 h-8 w-8 p-0">
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
           <div className="h-64 flex flex-col items-center justify-center bg-zinc-50 border-2 border-dashed border-zinc-200">
              <Package className="h-12 w-12 text-zinc-300 mb-4" />
              <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">No orders found yet.</p>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
