import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(10, 'Detailed address is required'),
  city: z.string().min(2, 'City is required'),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface CheckoutProps {
  onComplete: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({ onComplete }) => {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.displayName || '',
      email: user?.email || '',
    }
  });

  const onSubmit = async (data: CheckoutFormValues) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để đặt hàng');
      return;
    }

    setIsProcessing(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const orderData = {
        userId: user.uid,
        items: cart,
        total: total,
        status: 'pending',
        shippingAddress: {
          fullName: data.fullName,
          phone: data.phone,
          address: `${data.address}, ${data.city}`,
        },
        email: data.email,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      toast.success('ĐẶT HÀNG THÀNH CÔNG!', {
        description: 'Đơn hàng của bạn đang được xử lý.',
        position: 'top-center'
      });
      
      clearCart();
      setIsProcessing(false);
      onComplete();
    } catch (error) {
      console.error('Lỗi khi đặt hàng:', error);
      toast.error('Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.');
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
     return (
        <div className="mx-auto max-w-7xl px-4 py-24 flex flex-col items-center justify-center text-center">
            <h2 className="text-4xl font-black mb-6 uppercase tracking-tighter">GIỎ HÀNG CỦA BẠN ĐANG TRỐNG</h2>
            <Button onClick={onComplete} className="bg-black text-white px-10 py-6 rounded-none font-bold">QUAY LẠI CỬA HÀNG</Button>
        </div>
     );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-12 mb-8">
           <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-4">THANH TOÁN</h1>
           <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
             <Lock className="h-4 w-4" /> THANH TOÁN AN TOÀN
           </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-7 space-y-12">
          <section>
            <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-4">
               <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-sm">1</span>
               THÔNG TIN GIAO HÀNG
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Họ và tên</label>
                <Input {...register('fullName')} className="rounded-none border-2 border-zinc-200 focus-visible:ring-black h-14 font-medium" />
                {errors.fullName && <p className="text-xs text-red-500 font-bold">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Địa chỉ Email</label>
                <Input {...register('email')} className="rounded-none border-2 border-zinc-200 focus-visible:ring-black h-14 font-medium" />
                {errors.email && <p className="text-xs text-red-500 font-bold">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Số điện thoại</label>
                <Input {...register('phone')} className="rounded-none border-2 border-zinc-200 focus-visible:ring-black h-14 font-medium" />
                {errors.phone && <p className="text-xs text-red-500 font-bold">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tỉnh / Thành phố</label>
                <Input {...register('city')} className="rounded-none border-2 border-zinc-200 focus-visible:ring-black h-14 font-medium" />
                {errors.city && <p className="text-xs text-red-500 font-bold">{errors.city.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Địa chỉ giao hàng</label>
                <Input {...register('address')} className="rounded-none border-2 border-zinc-200 focus-visible:ring-black h-14 font-medium" />
                {errors.address && <p className="text-xs text-red-500 font-bold">{errors.address.message}</p>}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-4">
               <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-sm">2</span>
               PHƯƠNG THỨC THANH TOÁN
            </h2>
            <div className="border-2 border-black p-6 flex items-center justify-between">
               <div>
                  <p className="font-black uppercase text-sm">THANH TOÁN KHI NHẬN HÀNG (COD)</p>
                  <p className="text-xs text-zinc-500 font-medium">Thanh toán khi đơn hàng được giao đến bạn</p>
               </div>
               <div className="h-4 w-4 rounded-full border-4 border-black" />
            </div>
          </section>

          <Button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-black text-white hover:bg-zinc-800 font-black py-10 rounded-none text-xl tracking-tight uppercase"
          >
            {isProcessing ? 'ĐANG XỬ LÝ...' : `ĐẶT HÀNG - ${total.toLocaleString('vi-VN')}₫`}
          </Button>
        </form>

        <div className="lg:col-span-5">
           <Card className="rounded-none border-2 border-zinc-100 shadow-none sticky top-24">
             <CardHeader className="bg-zinc-50 border-b">
                <CardTitle className="text-lg font-black uppercase tracking-tight">TỔNG QUAN ĐƠN HÀNG</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
                <ScrollArea className="h-64 pr-4">
                   {cart.map(item => (
                      <div key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-4 mb-4">
                         {item.images && item.images[0] ? (
                            <img src={item.images[0]} alt="" className="h-16 w-16 object-cover bg-zinc-100" referrerPolicy="no-referrer" />
                         ) : (
                            <div className="h-16 w-16 bg-zinc-100" />
                         )}
                         <div className="flex-1">
                            <p className="text-xs font-black uppercase line-clamp-1">{item.name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase">{item.selectedColor} / {item.selectedSize}</p>
                            <div className="flex justify-between items-center mt-1">
                               <p className="text-xs font-medium">Số lượng: {item.quantity}</p>
                               <p className="text-xs font-black">{((item.discountPrice || item.price) * item.quantity).toLocaleString('vi-VN')}₫</p>
                            </div>
                         </div>
                      </div>
                   ))}
                </ScrollArea>
                <Separator />
                <div className="space-y-2">
                   <div className="flex justify-between text-zinc-500 text-sm font-medium">
                      <span>Tạm tính</span>
                      <span>{total.toLocaleString('vi-VN')}₫</span>
                   </div>
                   <div className="flex justify-between text-zinc-500 text-sm font-medium">
                      <span>Vận chuyển</span>
                      <span className="text-[#0082c8] font-bold">MIỄN PHÍ</span>
                   </div>
                   <Separator className="my-4" />
                   <div className="flex justify-between text-zinc-900 font-black text-xl italic uppercase">
                      <span>Tổng cộng</span>
                      <span>{total.toLocaleString('vi-VN')}₫</span>
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
};
