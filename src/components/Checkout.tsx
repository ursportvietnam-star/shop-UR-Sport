import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, Truck, ShieldCheck, RefreshCcw, CreditCard, Wallet, MapPin, User, Phone, Mail, FileText, X, Ticket, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Voucher } from '../types';
import { VoucherSelectionModal } from './VoucherSelectionModal';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { STATIC_VOUCHERS } from '../data';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().min(10, 'Số điện thoại không hợp lệ'),
  address: z.string().min(10, 'Địa chỉ chi tiết là bắt buộc'),
  city: z.string().min(2, 'Vui lòng nhập Tỉnh/Thành phố'),
  note: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface CheckoutProps {
  onComplete: (orderId?: string) => void;
}

const getVoucherDiscount = (voucher: Voucher, orderTotal: number) => {
  if (orderTotal < voucher.minOrderValue) return 0;
  if (voucher.maxUsage > 0 && voucher.usedCount >= voucher.maxUsage) return 0;

  if (voucher.discountType === 'percent') {
    const calculatedDiscount = (orderTotal * voucher.discountValue) / 100;
    return voucher.maxDiscountValue
      ? Math.min(calculatedDiscount, voucher.maxDiscountValue)
      : calculatedDiscount;
  }

  return voucher.discountValue;
};

const isVoucherCurrentlyUsable = (voucher: Voucher) => {
  if (!voucher.isActive) return false;
  const now = Date.now();
  const startTime = voucher.startTime ? new Date(voucher.startTime).getTime() : 0;
  const endTime = voucher.endTime ? new Date(voucher.endTime).getTime() : Number.POSITIVE_INFINITY;
  return now >= startTime && now <= endTime;
};

export const Checkout: React.FC<CheckoutProps> = ({ onComplete }) => {
  const { cart, total, clearCart, removeFromCart } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<'cod' | 'bank_transfer' | 'e_wallet'>('cod');
  const [activeWallet, setActiveWallet] = React.useState<'momo' | 'zalopay' | 'shopeepay'>('momo');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = React.useState(false);
  const [appliedVoucher, setAppliedVoucher] = React.useState<Voucher | null>(null);
  const [availableVouchers, setAvailableVouchers] = React.useState<Voucher[]>([]);
  const [autoVoucherCode, setAutoVoucherCode] = React.useState<string | null>(null);

  const discountAmount = React.useMemo(() => {
    if (!appliedVoucher) return 0;
    return getVoucherDiscount(appliedVoucher, total);
  }, [appliedVoucher, total]);

  const finalTotal = total - discountAmount;

  const nextVoucherOpportunity = React.useMemo(() => {
    if (appliedVoucher && discountAmount > 0) return null;
    return availableVouchers
      .filter(voucher => total < voucher.minOrderValue)
      .sort((a, b) => a.minOrderValue - b.minOrderValue)[0] || null;
  }, [appliedVoucher, availableVouchers, discountAmount, total]);

  React.useEffect(() => {
    const vouchersQuery = query(collection(db, 'vouchers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(vouchersQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Voucher[];
      setAvailableVouchers((data.length > 0 ? data : STATIC_VOUCHERS).filter(isVoucherCurrentlyUsable));
    }, () => {
      setAvailableVouchers(STATIC_VOUCHERS.filter(isVoucherCurrentlyUsable));
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (total <= 0 || availableVouchers.length === 0) return;

    const bestVoucher = availableVouchers
      .map(voucher => ({ voucher, discount: getVoucherDiscount(voucher, total) }))
      .filter(item => item.discount > 0)
      .sort((a, b) => b.discount - a.discount)[0]?.voucher || null;

    if (!bestVoucher) {
      if (autoVoucherCode && appliedVoucher?.code === autoVoucherCode) {
        setAppliedVoucher(null);
        setAutoVoucherCode(null);
      }
      return;
    }

    const currentDiscount = appliedVoucher ? getVoucherDiscount(appliedVoucher, total) : 0;
    const bestDiscount = getVoucherDiscount(bestVoucher, total);
    const canImproveCurrent = !appliedVoucher || appliedVoucher.code === autoVoucherCode || bestDiscount > currentDiscount;

    if (canImproveCurrent && appliedVoucher?.code !== bestVoucher.code) {
      setAppliedVoucher(bestVoucher);
      setAutoVoucherCode(bestVoucher.code);
    }
  }, [availableVouchers, total, appliedVoucher, autoVoucherCode]);

  const handleVoucherApply = (voucher: Voucher | null) => {
    setAppliedVoucher(voucher);
    setAutoVoucherCode(null);
  };

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
        discountAmount: discountAmount,
        finalTotal: finalTotal,
        voucherCode: appliedVoucher?.code || null,
        status: 'pending',
        shippingAddress: {
          fullName: data.fullName,
          phone: data.phone,
          address: `${data.address}, ${data.city}`,
        },
        email: data.email,
        note: data.note || '',
        paymentMethod: paymentMethod,
        createdAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      toast.success('ĐẶT HÀNG THÀNH CÔNG!', {
        description: 'Đơn hàng của bạn đang được xử lý.',
        position: 'top-center'
      });
      
      clearCart();
      setIsProcessing(false);
      onComplete(orderRef.id);
    } catch (error) {
      console.error('Lỗi khi đặt hàng:', error);
      toast.error('Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.');
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
     return (
        <div className="mx-auto max-w-7xl px-4 py-24 flex flex-col items-center justify-center text-center">
            <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
               <Truck className="h-12 w-12 text-[#1e4b64]" />
            </div>
            <h2 className="text-3xl font-black mb-6 uppercase tracking-tight text-zinc-900">GIỎ HÀNG CỦA BẠN ĐANG TRỐNG</h2>
            <Button onClick={() => onComplete()} className="bg-[#1e4b64] hover:bg-[#153446] text-white px-10 py-7 rounded-2xl font-bold text-lg shadow-xl shadow-[#1e4b64]/20 transition-all active:scale-95">
               QUAY LẠI CỬA HÀNG
            </Button>
        </div>
     );
  }

  return (
    <div className="bg-slate-50/50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-baseline gap-4 mb-12">
           <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-[#1e4b64]">THANH TOÁN</h1>
           <div className="flex items-center gap-2 px-3 py-1 bg-white border border-blue-100 rounded-full shadow-sm">
             <Lock className="h-3 w-3 text-green-500" /> 
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Hệ thống bảo mật 256-bit</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-8 space-y-8">
            {/* Step 1: Shipping Info */}
            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-zinc-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-blue-50 text-[#1e4b64] font-black text-lg">1</div>
                <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900">THÔNG TIN GIAO HÀNG</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    <User className="h-3 w-3" /> Họ và tên
                  </label>
                  <Input {...register('fullName')} className="rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-[#1e4b64] h-14 font-semibold text-zinc-900 placeholder:text-zinc-300 transition-all focus:bg-white" placeholder="Nguyễn Văn A" />
                  {errors.fullName && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.fullName.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    <Mail className="h-3 w-3" /> Địa chỉ Email
                  </label>
                  <Input {...register('email')} className="rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-[#1e4b64] h-14 font-semibold text-zinc-900 transition-all focus:bg-white" placeholder="email@example.com" />
                  {errors.email && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    <Phone className="h-3 w-3" /> Số điện thoại
                  </label>
                  <Input {...register('phone')} className="rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-[#1e4b64] h-14 font-semibold text-zinc-900 transition-all focus:bg-white" placeholder="09xx xxx xxx" />
                  {errors.phone && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    <MapPin className="h-3 w-3" /> Tỉnh / Thành phố
                  </label>
                  <Input {...register('city')} className="rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-[#1e4b64] h-14 font-semibold text-zinc-900 transition-all focus:bg-white" placeholder="Hà Nội, TP.HCM..." />
                  {errors.city && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.city.message}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    <MapPin className="h-3 w-3" /> Địa chỉ giao hàng chi tiết
                  </label>
                  <Input {...register('address')} className="rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-[#1e4b64] h-14 font-semibold text-zinc-900 transition-all focus:bg-white" placeholder="Số nhà, tên đường, phường/xã..." />
                  {errors.address && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.address.message}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    <FileText className="h-3 w-3" /> Ghi chú đơn hàng (Tùy chọn)
                  </label>
                  <textarea 
                    {...register('note')} 
                    className="w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 focus:ring-2 focus:ring-[#1e4b64]/20 p-4 font-semibold text-sm text-zinc-900 min-h-[100px] outline-none focus:border-[#1e4b64] focus:bg-white transition-all resize-none"
                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..."
                  />
                </div>
              </div>
            </section>

            {/* Step 2: Payment Method */}
            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-zinc-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-blue-50 text-[#1e4b64] font-black text-lg">2</div>
                <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900">PHƯƠNG THỨC THANH TOÁN</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'cod', title: 'Thanh toán khi nhận hàng', desc: 'Giao hàng và thu tiền tận nơi (COD)', icon: Truck },
                  { id: 'bank_transfer', title: 'Chuyển khoản ngân hàng', desc: 'Chuyển khoản qua App/QR Ngân hàng', icon: CreditCard },
                  { id: 'e_wallet', title: 'Ví điện tử', desc: 'Thanh toán qua Momo, ZaloPay', icon: Wallet },
                ].map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={cn(
                      "group relative border-2 p-6 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300",
                      paymentMethod === method.id 
                        ? "border-[#1e4b64] bg-blue-50/30 ring-4 ring-[#1e4b64]/5 shadow-md" 
                        : "border-zinc-50 hover:border-blue-100 hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm",
                        paymentMethod === method.id 
                          ? "bg-[#1e4b64] text-white scale-110" 
                          : "bg-white text-zinc-400 group-hover:text-[#1e4b64]"
                      )}>
                        <method.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className={cn("font-black text-sm uppercase tracking-tight", paymentMethod === method.id ? "text-[#1e4b64]" : "text-zinc-900")}>
                          {method.title}
                        </p>
                        <p className="text-[12px] text-zinc-500 font-medium">{method.desc}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                      paymentMethod === method.id ? "border-[#1e4b64] bg-[#1e4b64]" : "border-zinc-200"
                    )}>
                      {paymentMethod === method.id && <div className="h-2 w-2 rounded-full bg-white shadow-sm" />}
                    </div>
                  </div>
                ))}

                {/* E-Wallet Details (Visual Upgrade) */}
                {paymentMethod === 'e_wallet' && (
                  <div className="mt-4 p-8 rounded-3xl bg-gradient-to-br from-white to-pink-50/20 border border-pink-100 shadow-xl shadow-pink-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col gap-8">
                      {/* Wallet Selector Tabs */}
                      <div className="flex flex-wrap gap-3">
                        {[
                          { id: 'momo', name: 'Momo', color: 'bg-[#ae2070]' },
                          { id: 'zalopay', name: 'ZaloPay', color: 'bg-[#0068ff]' },
                          { id: 'shopeepay', name: 'ShopeePay', color: 'bg-[#ee4d2d]' }
                        ].map((wallet) => (
                          <button
                            key={wallet.id}
                            type="button"
                            onClick={() => setActiveWallet(wallet.id as any)}
                            className={cn(
                              "px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                              activeWallet === wallet.id 
                                ? `${wallet.color} text-white shadow-lg scale-105` 
                                : "bg-white text-zinc-400 border border-zinc-100 hover:bg-zinc-50"
                            )}
                          >
                            {wallet.name}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col md:flex-row gap-8 items-center">
                        {/* QR Code Container */}
                        <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-pink-200/20 ring-1 ring-zinc-100 shrink-0 relative overflow-hidden group">
                          <img 
                            src={
                              activeWallet === 'momo' 
                                ? `https://img.vietqr.io/image/970415-0917722425-compact2.jpg?amount=${finalTotal}&addInfo=UR%20MOMO`
                                : activeWallet === 'zalopay'
                                  ? `https://img.vietqr.io/image/970436-0917722425-compact2.jpg?amount=${finalTotal}&addInfo=UR%20ZALO`
                                  : `https://img.vietqr.io/image/970422-0917722425-compact2.jpg?amount=${finalTotal}&addInfo=UR%20SHOPEE`
                            } 
                            alt="Mã QR thanh toán ví điện tử" 
                            loading="lazy"
                            className="w-44 h-44 object-contain"
                          />
                          <div className={cn(
                            "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/90",
                          )}>
                             <p className="text-[10px] font-black uppercase text-zinc-900 text-center px-4">Quét mã để thanh toán ngay</p>
                          </div>
                        </div>

                        <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-3 w-3 rounded-full animate-pulse",
                              activeWallet === 'momo' ? "bg-[#ae2070]" : activeWallet === 'zalopay' ? "bg-[#0068ff]" : "bg-[#ee4d2d]"
                            )} />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Thanh toán qua ví {activeWallet}</span>
                          </div>
                          
                          <div className="space-y-4">
                             <p className="text-sm font-black text-zinc-900 leading-tight">
                               Vui lòng mở ứng dụng <span className="uppercase text-[#1e4b64]">{activeWallet}</span> và quét mã QR để hoàn tất thanh toán.
                             </p>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-50 rounded-2xl">
                                   <p className="text-[10px] text-zinc-400 font-black uppercase mb-1">Người nhận</p>
                                   <p className="font-black text-sm text-zinc-900 uppercase">NGUYỄN BẢO</p>
                                </div>
                                <div className="p-4 bg-zinc-50 rounded-2xl">
                                   <p className="text-[10px] text-zinc-400 font-black uppercase mb-1">Số tiền</p>
                                   <p className="font-black text-sm text-[#1e4b64]">{finalTotal.toLocaleString('vi-VN')}₫</p>
                                </div>
                             </div>
                          </div>
                          
                          <div className="pt-4 border-t border-zinc-100">
                             <p className="text-[11px] text-zinc-400 font-medium italic">
                               * Sau khi chuyển khoản, đơn hàng sẽ được tự động kích hoạt.
                             </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Transfer Details (Visual Upgrade) */}
                {paymentMethod === 'bank_transfer' && (
                  <div className="mt-4 p-8 rounded-3xl bg-gradient-to-br from-white to-blue-50/50 border border-blue-100 shadow-xl shadow-blue-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-blue-200/20 ring-1 ring-blue-100 shrink-0">
                        <img 
                          src={`https://img.vietqr.io/image/MB-0917722425-compact2.jpg?amount=${finalTotal}&addInfo=UR%20ORDER`} 
                          alt="Mã QR chuyển khoản ngân hàng" 
                          loading="lazy"
                          className="w-44 h-44 object-contain"
                        />
                      </div>

                      <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e4b64]">Xác thực bởi VietQR</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                          <div className="col-span-2">
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Ngân hàng</p>
                            <p className="font-black text-base text-zinc-900">MB BANK (Ngân Hàng Quân Đội)</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Số tài khoản</p>
                            <p className="font-black text-2xl text-[#1e4b64] tracking-tight">0917722425</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Tên tài khoản</p>
                            <p className="font-black text-base text-zinc-900 uppercase">NGUYEN BAO</p>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-blue-100 flex items-center gap-3">
                           <RefreshCcw className="h-4 w-4 text-[#1e4b64] animate-spin-slow" />
                           <p className="text-[11px] text-blue-600/70 font-semibold italic">
                             Hệ thống sẽ tự động xác nhận sau khi nhận được tiền.
                           </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Button 
              type="submit" 
              disabled={isProcessing}
              className="w-full bg-[#1e4b64] hover:bg-[#153446] text-white font-black py-10 rounded-[28px] text-xl tracking-tight uppercase shadow-2xl shadow-[#1e4b64]/20 transition-all hover:scale-[1.01] active:scale-[0.98] mt-4"
            >
              {isProcessing ? (
                 <div className="flex items-center gap-3">
                    <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ĐANG XỬ LÝ...
                 </div>
              ) : `HOÀN TẤT ĐẶT HÀNG - ${finalTotal.toLocaleString('vi-VN')}₫`}
            </Button>
          </form>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
             <Card className="rounded-[32px] border-none shadow-xl shadow-zinc-200/50 overflow-hidden">
               <CardHeader className="bg-[#1e4b64] p-6">
                  <CardTitle className="text-white text-base font-black uppercase tracking-widest flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> ĐƠN HÀNG CỦA BẠN
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-8 bg-white">
                  <ScrollArea className="h-72 -mr-4 pr-4">
                     {cart.map(item => (
                        <div key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-4 mb-6 last:mb-0 group relative">
                           <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-zinc-50 shrink-0 border border-zinc-100">
                              {item.images && item.images[0] && (
                                 <img src={item.images[0]} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                              )}
                              <div className="absolute top-1 right-1 h-5 w-5 bg-[#1e4b64] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
                                 {item.quantity}
                              </div>
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-[13px] font-black text-zinc-900 uppercase line-clamp-1 group-hover:text-[#1e4b64] transition-colors">{item.name}</p>
                                <button 
                                  type="button"
                                  onClick={() => removeFromCart(item.id, item.selectedColor, item.selectedSize)}
                                  className="text-zinc-300 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 flex items-center gap-2">
                                 {item.selectedColor} <span className="h-1 w-1 bg-zinc-200 rounded-full" /> Size {item.selectedSize}
                              </p>
                              <p className="text-sm font-black text-[#1e4b64] mt-2">
                                 {((item.discountPrice || item.price) * item.quantity).toLocaleString('vi-VN')}₫
                              </p>
                           </div>
                        </div>
                     ))}
                  </ScrollArea>
                  
                  <Separator className="bg-zinc-50" />

                  <div className="py-2 flex items-center justify-between group cursor-pointer transition-opacity hover:opacity-80" onClick={() => setIsVoucherModalOpen(true)}>
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-[#ee4d2d]" />
                      <span className="text-sm font-black text-zinc-900">Voucher của Shop</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {appliedVoucher ? (
                        <div className="flex flex-col items-end leading-none">
                          <span className="text-[13px] font-black text-[#ee4d2d] border border-[#ee4d2d] border-dashed px-2 py-1 rounded bg-red-50">
                            {appliedVoucher.code} -{discountAmount.toLocaleString('vi-VN')}₫
                          </span>
                          {autoVoucherCode === appliedVoucher.code && (
                            <span className="mt-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                              Tự động chọn tốt nhất
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] font-bold text-zinc-400 group-hover:text-[#ee4d2d] transition-colors">Chọn Voucher</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-[#ee4d2d] transition-colors" />
                    </div>
                  </div>

                  {nextVoucherOpportunity && (
                    <button
                      type="button"
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="w-full rounded-2xl border border-dashed border-[#ee4d2d]/30 bg-red-50/60 px-4 py-3 text-left transition-colors hover:bg-red-50"
                    >
                      <p className="text-[11px] font-black uppercase tracking-widest text-[#ee4d2d]">
                        Gợi ý tối ưu đơn hàng
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-zinc-600">
                        Mua thêm {(nextVoucherOpportunity.minOrderValue - total).toLocaleString('vi-VN')}₫ để dùng mã {nextVoucherOpportunity.code}
                      </p>
                    </button>
                  )}
                  
                  <Separator className="bg-zinc-50" />
                  
                  <div className="space-y-4 pt-2">
                     <div className="flex justify-between text-zinc-400 text-xs font-black uppercase tracking-wider">
                        <span>Tạm tính</span>
                        <span className="text-zinc-900">{total.toLocaleString('vi-VN')}₫</span>
                     </div>
                     <div className="flex justify-between text-zinc-400 text-xs font-black uppercase tracking-wider">
                        <span>Vận chuyển</span>
                        <span className="text-green-500 font-black">MIỄN PHÍ</span>
                     </div>
                     {discountAmount > 0 && (
                       <div className="flex justify-between text-zinc-400 text-xs font-black uppercase tracking-wider">
                          <span>Giảm giá Voucher</span>
                          <span className="text-[#ee4d2d] font-black">-{discountAmount.toLocaleString('vi-VN')}₫</span>
                       </div>
                     )}
                     
                     <div className="pt-6 border-t border-zinc-100 mt-6">
                        <div className="flex justify-between items-baseline">
                           <span className="text-zinc-400 text-xs font-black uppercase tracking-widest">Tổng cộng</span>
                           <div className="text-right">
                              <p className="text-3xl font-black text-zinc-900 italic tracking-tighter leading-none">
                                 {finalTotal.toLocaleString('vi-VN')}₫
                              </p>
                              <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 italic">Đã bao gồm phí VAT</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </CardContent>
             </Card>
             
             <VoucherSelectionModal 
               isOpen={isVoucherModalOpen}
               onClose={() => setIsVoucherModalOpen(false)}
               onApply={handleVoucherApply}
               currentTotal={total}
               selectedVoucher={appliedVoucher}
             />
             {/* Simple Trust Banner */}
             <div className="mt-6 flex items-center justify-center gap-8 text-zinc-300">
                <div className="flex flex-col items-center gap-1">
                   <ShieldCheck className="h-6 w-6" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Bảo mật</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <Truck className="h-6 w-6" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Tốc độ</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <RefreshCcw className="h-6 w-6" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Chính hãng</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add missing icon for Sidebar
const ShoppingCart = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  </svg>
);
