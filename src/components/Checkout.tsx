import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Truck, ShieldCheck, RefreshCcw, CreditCard, Wallet, MapPin, User, Phone, Mail, FileText, X, Ticket, ChevronRight, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Voucher } from '../types';
import { VoucherSelectionModal } from './VoucherSelectionModal';
import { collection, doc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { STATIC_VOUCHERS } from '../data';
import { BANK_TRANSFER_INFO, createOrderCode, getTransferContent, getVietQrUrl } from '../lib/payment';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { composeVietnamAddress, fetchVietnamProvinces, fetchVietnamWards, ProvinceOption, WardOption } from '@/lib/vietnamRegions';
import { calculateShippingFee, DEFAULT_SHIPPING_SETTINGS, normalizeShippingSettings, ShippingSettings } from '@/lib/shippingSettings';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().min(10, 'Số điện thoại không hợp lệ'),
  provinceCode: z.string().min(1, 'Vui lòng chọn Tỉnh/Thành phố'),
  provinceName: z.string().min(1, 'Vui lòng chọn Tỉnh/Thành phố'),
  wardCode: z.string().optional(),
  wardName: z.string().min(1, 'Vui lòng chọn Phường/Xã'),
  addressDetail: z.string().min(5, 'Vui lòng nhập số nhà, tên đường hoặc địa chỉ chi tiết'),
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
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = React.useState(false);
  const [appliedVoucher, setAppliedVoucher] = React.useState<Voucher | null>(null);
  const [availableVouchers, setAvailableVouchers] = React.useState<Voucher[]>([]);
  const [autoVoucherCode, setAutoVoucherCode] = React.useState<string | null>(null);
  const [provinces, setProvinces] = React.useState<ProvinceOption[]>([]);
  const [wards, setWards] = React.useState<WardOption[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = React.useState(false);
  const [isLoadingWards, setIsLoadingWards] = React.useState(false);
  const [shippingSettings, setShippingSettings] = React.useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);

  // Clipboard copies
  const [copiedAccount, setCopiedAccount] = React.useState(false);
  const [copiedContent, setCopiedContent] = React.useState(false);

  const discountAmount = React.useMemo(() => {
    if (!appliedVoucher) return 0;
    return getVoucherDiscount(appliedVoucher, total);
  }, [appliedVoucher, total]);

  const subtotalAfterDiscount = Math.max(total - discountAmount, 0);
  const selectedPaymentMethodForShipping = paymentMethod === 'e_wallet' ? activeWallet : paymentMethod;
  const shippingFee = calculateShippingFee(shippingSettings, selectedPaymentMethodForShipping, subtotalAfterDiscount);
  const finalTotal = subtotalAfterDiscount + shippingFee;
  const isShippingFree = shippingFee === 0;

  const nextVoucherOpportunity = React.useMemo(() => {
    if (appliedVoucher && discountAmount > 0) return null;
    return availableVouchers
      .filter(voucher => total < voucher.minOrderValue)
      .sort((a, b) => a.minOrderValue - b.minOrderValue)[0] || null;
  }, [appliedVoucher, availableVouchers, discountAmount, total]);

  React.useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setAvailableVouchers(STATIC_VOUCHERS.filter(isVoucherCurrentlyUsable));
      return;
    }
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
    if (!db || !isFirebaseConfigured) {
      setShippingSettings(DEFAULT_SHIPPING_SETTINGS);
      return;
    }

    getDoc(doc(db, 'settings', 'shippingSettings'))
      .then(snapshot => {
        setShippingSettings(normalizeShippingSettings(snapshot.exists() ? snapshot.data() : null));
      })
      .catch(error => {
        console.error('Error loading shipping settings:', error);
        setShippingSettings(DEFAULT_SHIPPING_SETTINGS);
      });
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

  const handleCopy = (text: string, type: 'account' | 'content') => {
    navigator.clipboard.writeText(text);
    if (type === 'account') {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
    toast.success('Đã sao chép thành công vào bộ nhớ tạm!');
  };
  const [isAddressConfirmed, setIsAddressConfirmed] = React.useState(false);

  const { register, handleSubmit, reset, watch, setValue, trigger, formState: { errors } } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.displayName || '',
      email: user?.email || '',
      phone: '',
      provinceCode: '',
      provinceName: '',
      wardCode: '',
      wardName: '',
      addressDetail: '',
      note: ''
    }
  });

  const selectedProvinceCode = watch('provinceCode');
  const selectedWardCode = watch('wardCode');

  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingProvinces(true);
    fetchVietnamProvinces()
      .then(data => {
        if (isMounted) setProvinces(data);
      })
      .catch(error => {
        console.error('Error loading Vietnam provinces:', error);
        toast.error('Không tải được danh sách tỉnh/thành Việt Nam.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingProvinces(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!selectedProvinceCode) {
      setWards([]);
      return;
    }

    let isMounted = true;
    setIsLoadingWards(true);
    fetchVietnamWards(selectedProvinceCode)
      .then(data => {
        if (isMounted) setWards(data);
      })
      .catch(error => {
        console.error('Error loading Vietnam wards:', error);
        if (isMounted) setWards([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingWards(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProvinceCode]);

  React.useEffect(() => {
    // 1. First check if we have a saved address in localStorage
    const saved = localStorage.getItem('ursport_saved_address');
    if (saved) {
      try {
        const addr = JSON.parse(saved);
        if (addr.fullName && addr.phone && addr.provinceCode && addr.wardName && addr.addressDetail) {
          reset({
            fullName: addr.fullName,
            email: addr.email || user?.email || '',
            phone: addr.phone,
            provinceCode: addr.provinceCode,
            provinceName: addr.provinceName || '',
            wardCode: addr.wardCode || '',
            wardName: addr.wardName,
            addressDetail: addr.addressDetail,
            note: addr.note || ''
          });
          setIsAddressConfirmed(true);
          return;
        }
      } catch (e) {
        console.error('Error loading saved address:', e);
      }
    }

    // 2. If no saved address in localStorage and no user, do nothing
    if (!user) return;

    const fallbackValues: Partial<CheckoutFormValues> = {
      fullName: user.displayName || '',
      email: user.email || '',
      phone: '',
      provinceCode: '',
      provinceName: '',
      wardCode: '',
      wardName: '',
      addressDetail: '',
      note: ''
    };

    if (!db || !isFirebaseConfigured) {
      reset(fallbackValues);
      return;
    }

    getDoc(doc(db, 'users', user.uid))
      .then(snapshot => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const profileAddress = {
          fullName: (data.displayName as string) || fallbackValues.fullName || '',
          email: (data.email as string) || fallbackValues.email || '',
          phone: (data.phone as string) || '',
          provinceCode: (data.provinceCode as string) || '',
          provinceName: (data.provinceName as string) || '',
          wardCode: (data.wardCode as string) || '',
          wardName: (data.wardName as string) || '',
          addressDetail: (data.addressDetail as string) || '',
          note: ''
        };
        reset(profileAddress);
        
        // Auto-confirm if they have a complete profile address
        if (profileAddress.fullName && profileAddress.phone && profileAddress.provinceCode && profileAddress.wardName && profileAddress.addressDetail) {
          setIsAddressConfirmed(true);
        }
      })
      .catch(error => {
        console.error('Error loading checkout profile:', error);
        reset(fallbackValues);
      });
  }, [reset, user]);

  const onSubmit = async (data: CheckoutFormValues) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để đặt hàng');
      return;
    }

    setIsProcessing(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db, isFirebaseConfigured } = await import('../firebase');
      
      if (!db || !isFirebaseConfigured) {
        toast.error('Chức năng đặt hàng tạm thời không khả dụng do hệ thống chưa cấu hình Firebase.');
        setIsProcessing(false);
        return;
      }
      
      const orderCode = createOrderCode();
      const savedPaymentMethod = paymentMethod === 'e_wallet' ? activeWallet : paymentMethod;
      const transferContent = getTransferContent(orderCode);
      const fullShippingAddress = composeVietnamAddress(data.addressDetail, data.wardName, data.provinceName);

      const orderData = {
        orderCode,
        userId: user.uid,
        items: cart,
        total: total,
        discountAmount: discountAmount,
        shippingFee,
        finalTotal: finalTotal,
        voucherCode: appliedVoucher?.code || null,
        status: 'pending',
        shippingAddress: {
          fullName: data.fullName,
          phone: data.phone,
          address: fullShippingAddress,
        },
        shippingProvinceCode: data.provinceCode,
        shippingProvinceName: data.provinceName,
        shippingWardCode: data.wardCode,
        shippingWardName: data.wardName,
        shippingAddressDetail: data.addressDetail,
        email: data.email,
        note: data.note || '',
        paymentMethod: savedPaymentMethod,
        transferContent: savedPaymentMethod === 'cod' ? null : transferContent,
        createdAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);

      // Save address to localStorage on successful order
      const addressToSave = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        provinceCode: data.provinceCode,
        provinceName: data.provinceName,
        wardCode: data.wardCode || '',
        wardName: data.wardName,
        addressDetail: data.addressDetail,
        note: data.note || ''
      };
      localStorage.setItem('ursport_saved_address', JSON.stringify(addressToSave));
      
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
            <div className="h-28 w-28 bg-[#f0f9ff] rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
               <Truck className="h-14 w-14 text-[#1e4b64]" />
            </div>
            <h2 className="text-3xl font-black mb-6 uppercase tracking-tight text-zinc-900">GIỎ HÀNG CỦA BẠN ĐANG TRỐNG</h2>
            <Button onClick={() => onComplete()} className="bg-[#1e4b64] hover:bg-[#153446] text-white px-10 py-7 rounded-2xl font-bold text-lg shadow-xl shadow-[#1e4b64]/20 transition-all active:scale-95">
               QUAY LẠI CỬA HÀNG
            </Button>
        </div>
     );
  }

  const generatedOrderCode = 'UR' + Math.floor(100000 + Math.random() * 900000);
  const transferMsg = getTransferContent(generatedOrderCode);

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-28 md:pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Breadcrumb & Status */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10 border-b border-slate-200/60 pb-6">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Link to="/" className="hover:text-black transition-colors">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to="/shop" className="hover:text-black transition-colors">Giỏ Hàng</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-[#1e4b64] font-black">Thanh Toán</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-[#1e4b64] leading-none">
              THANH TOÁN ĐƠN HÀNG
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">
            <Lock className="h-3.5 w-3.5 text-emerald-500" /> 
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Hệ thống bảo mật 256-bit SSL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="lg:col-span-8 space-y-8">
            
            {/* Step 1: Shipping Info */}
            <motion.section 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_24px_50px_rgba(0,0,0,0.02)] border border-slate-100/80"
            >
              {/* Compact Address Display */}
              {isAddressConfirmed && (
                <div 
                  onClick={() => setIsAddressConfirmed(false)}
                  className="cursor-pointer hover:opacity-95 transition-all flex items-start gap-4 select-none relative py-2"
                >
                  <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-5 w-5 text-[#ee4d2d]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-black text-sm uppercase text-zinc-900 tracking-tight">
                        {watch('fullName')}
                      </span>
                      <span className="text-xs font-bold text-zinc-400 font-mono">
                        ({watch('phone')})
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
                      {watch('addressDetail')}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                      {watch('wardName')}, {watch('provinceName')}
                    </p>
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              )}

              {/* Full Form Container - hidden when confirmed but still in the DOM */}
              <div className={cn("space-y-6", isAddressConfirmed && "hidden")}>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100/50 pb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-[#f0f9ff] text-[#1e4b64] font-black text-sm md:text-lg shadow-sm shrink-0">1</div>
                    <div className="min-w-0">
                      <h2 className="text-xs sm:text-sm md:text-lg font-black uppercase tracking-tight text-zinc-900 truncate whitespace-nowrap">THÔNG TIN GIAO HÀNG</h2>
                      <p className="text-[10px] sm:text-xs text-zinc-400 font-medium truncate hidden sm:block">Nhập thông tin người nhận hàng</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <User className="h-3.5 w-3.5 text-[#1e4b64]" /> Họ và tên người nhận
                    </label>
                    <Input 
                      {...register('fullName')} 
                      className="rounded-2xl border-slate-200/80 bg-slate-50/50 focus-visible:ring-[#1e4b64]/10 focus-visible:border-[#1e4b64] h-13 font-semibold text-zinc-900 placeholder:text-zinc-300 transition-all focus:bg-white" 
                      placeholder="Nguyễn Văn A" 
                    />
                    {errors.fullName && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.fullName.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <Mail className="h-3.5 w-3.5 text-[#1e4b64]" /> Địa chỉ Email
                    </label>
                    <Input 
                      {...register('email')} 
                      className="rounded-2xl border-slate-200/80 bg-slate-50/50 focus-visible:ring-[#1e4b64]/10 focus-visible:border-[#1e4b64] h-13 font-semibold text-zinc-900 placeholder:text-zinc-300 transition-all focus:bg-white" 
                      placeholder="email@example.com" 
                    />
                    {errors.email && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <Phone className="h-3.5 w-3.5 text-[#1e4b64]" /> Số điện thoại nhận hàng
                    </label>
                    <Input 
                      {...register('phone')} 
                      className="rounded-2xl border-slate-200/80 bg-slate-50/50 focus-visible:ring-[#1e4b64]/10 focus-visible:border-[#1e4b64] h-13 font-semibold text-zinc-900 placeholder:text-zinc-300 transition-all focus:bg-white" 
                      placeholder="09xx xxx xxx" 
                    />
                    {errors.phone && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.phone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 text-[#1e4b64]" /> Tỉnh / Thành phố
                    </label>
                    <select
                      value={selectedProvinceCode || ''}
                      onChange={event => {
                        const province = provinces.find(item => item.code === event.target.value);
                        setValue('provinceCode', province?.code || '', { shouldValidate: true });
                        setValue('provinceName', province?.name || '', { shouldValidate: true });
                        setValue('wardCode', '', { shouldValidate: true });
                        setValue('wardName', '', { shouldValidate: true });
                      }}
                      disabled={isLoadingProvinces}
                      className="h-13 w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 text-sm font-semibold text-zinc-900 outline-none transition-all focus:border-[#1e4b64] focus:bg-white focus:ring-4 focus:ring-[#1e4b64]/10 disabled:text-zinc-400"
                    >
                      <option value="">{isLoadingProvinces ? 'Đang tải tỉnh/thành...' : 'Chọn tỉnh/thành phố'}</option>
                      {provinces.map(province => (
                        <option key={province.code} value={province.code}>{province.name}</option>
                      ))}
                    </select>
                    <input type="hidden" {...register('provinceCode')} />
                    <input type="hidden" {...register('provinceName')} />
                    {(errors.provinceCode || errors.provinceName) && (
                      <p className="text-[11px] text-red-500 font-bold ml-2">{errors.provinceCode?.message || errors.provinceName?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 text-[#1e4b64]" /> Phường / Xã / Đặc khu
                    </label>
                    {wards.length > 1 ? (
                      <select
                        value={selectedWardCode || ''}
                        onChange={event => {
                          const ward = wards.find(item => item.code === event.target.value);
                          setValue('wardCode', ward?.code || '', { shouldValidate: true });
                          setValue('wardName', ward?.name || '', { shouldValidate: true });
                        }}
                        disabled={!selectedProvinceCode || isLoadingWards}
                        className="h-13 w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 text-sm font-semibold text-zinc-900 outline-none transition-all focus:border-[#1e4b64] focus:bg-white focus:ring-4 focus:ring-[#1e4b64]/10 disabled:text-zinc-400"
                      >
                        <option value="">
                          {!selectedProvinceCode ? 'Chọn tỉnh/thành trước' : isLoadingWards ? 'Đang tải phường/xã...' : 'Chọn phường/xã'}
                        </option>
                        {wards.map(ward => (
                          <option key={ward.code} value={ward.code}>{ward.name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={watch('wardName') || ''}
                        onChange={event => {
                          setValue('wardCode', '', { shouldValidate: true });
                          setValue('wardName', event.target.value, { shouldValidate: true });
                        }}
                        disabled={!selectedProvinceCode || isLoadingWards}
                        className="rounded-2xl border-slate-200/80 bg-slate-50/50 focus-visible:ring-[#1e4b64]/10 focus-visible:border-[#1e4b64] h-13 font-semibold text-zinc-900 placeholder:text-zinc-300 transition-all focus:bg-white"
                        placeholder={!selectedProvinceCode ? 'Chọn tỉnh/thành trước' : isLoadingWards ? 'Đang tải phường/xã...' : 'Nhập phường/xã'}
                        list="checkout-vietnam-wards"
                      />
                    )}
                    <datalist id="checkout-vietnam-wards">
                      {wards.map(ward => (
                        <option key={ward.code} value={ward.name} />
                      ))}
                    </datalist>
                    <input type="hidden" {...register('wardCode')} />
                    <input type="hidden" {...register('wardName')} />
                    {(errors.wardCode || errors.wardName) && (
                      <p className="text-[11px] text-red-500 font-bold ml-2">{errors.wardCode?.message || errors.wardName?.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 text-[#1e4b64]" /> Địa chỉ chi tiết
                    </label>
                    <Input 
                      {...register('addressDetail')} 
                      className="rounded-2xl border-slate-200/80 bg-slate-50/50 focus-visible:ring-[#1e4b64]/10 focus-visible:border-[#1e4b64] h-13 font-semibold text-zinc-900 placeholder:text-zinc-300 transition-all focus:bg-white" 
                      placeholder="Số nhà, tên đường, tòa nhà..." 
                    />
                    {errors.addressDetail && <p className="text-[11px] text-red-500 font-bold ml-2">{errors.addressDetail.message}</p>}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <FileText className="h-3.5 w-3.5 text-[#1e4b64]" /> Ghi chú đơn hàng (Tùy chọn)
                    </label>
                    <textarea 
                      {...register('note')} 
                      className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 focus:ring-2 focus:ring-[#1e4b64]/10 p-4 font-semibold text-sm text-zinc-950 min-h-[100px] outline-none focus:border-[#1e4b64] focus:bg-white transition-all resize-none placeholder:text-zinc-300"
                      placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..."
                    />
                  </div>

                  {/* Confirmation Action Button */}
                  <div className="md:col-span-2 flex justify-end pt-4 border-t border-slate-100/40">
                    <Button
                      type="button"
                      onClick={async () => {
                        const isValid = await trigger([
                          'fullName',
                          'email',
                          'phone',
                          'provinceCode',
                          'provinceName',
                          'wardCode',
                          'wardName',
                          'addressDetail'
                        ]);
                        if (isValid) {
                          setIsAddressConfirmed(true);
                          const currentAddress = {
                            fullName: watch('fullName'),
                            email: watch('email'),
                            phone: watch('phone'),
                            provinceCode: watch('provinceCode'),
                            provinceName: watch('provinceName'),
                            wardCode: watch('wardCode') || '',
                            wardName: watch('wardName'),
                            addressDetail: watch('addressDetail'),
                            note: watch('note') || ''
                          };
                          localStorage.setItem('ursport_saved_address', JSON.stringify(currentAddress));
                        } else {
                          toast.error('Vui lòng điền đầy đủ các thông tin giao hàng bắt buộc');
                        }
                      }}
                      className="bg-[#1e4b64] hover:bg-[#153446] text-white font-bold h-11 px-8 rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      Xác nhận địa chỉ
                    </Button>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Step 2: Payment Method */}
            <motion.section 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_24px_50px_rgba(0,0,0,0.02)] border border-slate-100/80"
            >
              <div className="flex items-center justify-between gap-2 mb-6 border-b border-slate-100/50 pb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-[#f0f9ff] text-[#1e4b64] font-black text-sm md:text-lg shadow-sm shrink-0">2</div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm md:text-lg font-black uppercase tracking-tight text-zinc-900 truncate whitespace-nowrap">PHƯƠNG THỨC THANH TOÁN</h2>
                    <p className="text-[10px] sm:text-xs text-zinc-400 font-medium truncate hidden sm:block">Lựa chọn cách thanh toán phù hợp</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPaymentDrawerOpen(true)}
                  className="text-[10px] sm:text-xs md:text-sm font-black text-[#ee4d2d] uppercase tracking-wider hover:opacity-80 transition-opacity whitespace-nowrap shrink-0"
                >
                  Xem tất cả &gt;
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Unified View: Compact row displaying only active payment method */}
                <div 
                  onClick={() => setIsPaymentDrawerOpen(true)}
                  className="group relative border border-slate-100 p-4 rounded-2xl cursor-pointer bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white border border-slate-100/60 flex items-center justify-center shadow-sm text-[#ee4d2d] shrink-0">
                        {paymentMethod === 'cod' && <Truck className="h-5 w-5 text-emerald-500" />}
                        {paymentMethod === 'bank_transfer' && <CreditCard className="h-5 w-5 text-[#1e4b64]" />}
                        {paymentMethod === 'e_wallet' && activeWallet === 'momo' && <div className="text-[9px] font-black text-[#ae2070]">MoMo</div>}
                        {paymentMethod === 'e_wallet' && activeWallet === 'zalopay' && <div className="text-[9px] font-black text-[#0068ff]">Zalo</div>}
                        {paymentMethod === 'e_wallet' && activeWallet === 'shopeepay' && <div className="text-[9px] font-black text-[#ee4d2d]">SPay</div>}
                      </div>
                      <div>
                        <p className="font-black text-xs md:text-sm uppercase tracking-tight text-[#1e4b64]">
                          {paymentMethod === 'cod' && 'Thanh toán khi nhận hàng (COD)'}
                          {paymentMethod === 'bank_transfer' && 'Chuyển khoản VietQR'}
                          {paymentMethod === 'e_wallet' && activeWallet === 'momo' && 'Ví điện tử MoMo'}
                          {paymentMethod === 'e_wallet' && activeWallet === 'zalopay' && 'Ví điện tử ZaloPay'}
                          {paymentMethod === 'e_wallet' && activeWallet === 'shopeepay' && 'Ví điện tử ShopeePay'}
                        </p>
                        <p className="text-[9px] md:text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                          {paymentMethod === 'cod' && 'Thu tiền mặt khi nhận hàng'}
                          {paymentMethod === 'bank_transfer' && 'Quét mã VietQR chuyển khoản tự động'}
                          {paymentMethod === 'e_wallet' && 'Quét QR thanh toán bằng app ví'}
                        </p>
                      </div>
                    </div>
                    <div className="h-5 w-5 rounded-full bg-[#ee4d2d] flex items-center justify-center text-white shrink-0">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>

                {/* Bank Transfer Details (Visual Upgrade) */}
                <AnimatePresence>
                  {paymentMethod === 'bank_transfer' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white to-blue-50/40 border border-blue-100 shadow-xl shadow-blue-500/5 flex flex-col md:flex-row gap-8 items-center">
                        {/* QR Code Container with scanning effect */}
                        <div className="bg-white p-4 rounded-3xl shadow-xl shadow-blue-200/20 border border-blue-50 shrink-0 relative group overflow-hidden">
                          <img 
                            src={getVietQrUrl({ amount: finalTotal, transferContent: transferMsg })} 
                            alt="Mã QR chuyển khoản ngân hàng" 
                            loading="lazy"
                            className="w-44 h-44 object-contain"
                          />
                          {/* Animated Scan Line Overlay */}
                          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#ff3b30] to-transparent top-0 animate-[scan_2.5s_linear_infinite]" />
                        </div>

                        <div className="flex-1 space-y-6 w-full">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center">
                              <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1e4b64]">Tự động xác nhận VietQR</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                            <div className="sm:col-span-2 bg-white/70 p-3 rounded-xl border border-slate-100">
                              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-0.5">Ngân hàng</p>
                              <p className="font-black text-sm text-zinc-950">{BANK_TRANSFER_INFO.bankName}</p>
                            </div>
                            
                            <div className="bg-white/70 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-0.5">Số tài khoản</p>
                                <p className="font-black text-lg text-[#1e4b64] tracking-tight">{BANK_TRANSFER_INFO.accountNumber}</p>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleCopy(BANK_TRANSFER_INFO.accountNumber, 'account')}
                                className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-[#1e4b64] hover:text-white transition-all flex items-center justify-center text-zinc-500"
                              >
                                {copiedAccount ? <Check className="h-4 w-4 text-emerald-500 group-hover:text-white" /> : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                            
                            <div className="bg-white/70 p-3 rounded-xl border border-slate-100">
                              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-0.5">Tên tài khoản</p>
                              <p className="font-black text-sm text-zinc-950 uppercase">{BANK_TRANSFER_INFO.accountName}</p>
                            </div>

                            <div className="sm:col-span-2 bg-white/70 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-0.5">Nội dung chuyển khoản</p>
                                <p className="font-black text-sm text-[#ff3b30] tracking-tight">{transferMsg}</p>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleCopy(transferMsg, 'content')}
                                className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-[#1e4b64] hover:text-white transition-all flex items-center justify-center text-zinc-500"
                              >
                                {copiedContent ? <Check className="h-4 w-4 text-emerald-500 group-hover:text-white" /> : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-200/50 flex items-center gap-2.5">
                             <RefreshCcw className="h-4 w-4 text-[#1e4b64] animate-spin-slow" />
                             <p className="text-[11px] text-blue-600/70 font-semibold italic">
                               Hệ thống sẽ duyệt đơn ngay lập tức khi nhận được khoản thanh toán.
                             </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* E-Wallet Details (Visual Upgrade) */}
                <AnimatePresence>
                  {paymentMethod === 'e_wallet' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white to-pink-50/20 border border-pink-100 shadow-xl shadow-pink-500/5 flex flex-col gap-6">
                        {/* Wallet Selector Tabs */}
                        <div className="flex gap-2">
                          {[
                            { id: 'momo', name: 'Momo', color: 'bg-[#ae2070] text-white border-transparent', inactive: 'text-zinc-500 bg-slate-50 border-slate-200 hover:bg-slate-100' },
                            { id: 'zalopay', name: 'ZaloPay', color: 'bg-[#0068ff] text-white border-transparent', inactive: 'text-zinc-500 bg-slate-50 border-slate-200 hover:bg-slate-100' },
                            { id: 'shopeepay', name: 'ShopeePay', color: 'bg-[#ee4d2d] text-white border-transparent', inactive: 'text-zinc-500 bg-slate-50 border-slate-200 hover:bg-slate-100' }
                          ].map((wallet) => (
                            <button
                              key={wallet.id}
                              type="button"
                              onClick={() => setActiveWallet(wallet.id as any)}
                              className={cn(
                                "px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border shrink-0",
                                activeWallet === wallet.id ? wallet.color : wallet.inactive
                              )}
                            >
                              {wallet.name}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-center">
                          {/* QR Code Container */}
                          <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 shrink-0 relative overflow-hidden group">
                            <img 
                              src={
                                activeWallet === 'momo' 
                                  ? getVietQrUrl({ amount: finalTotal, transferContent: 'UR MOMO' })
                                  : activeWallet === 'zalopay'
                                    ? getVietQrUrl({ amount: finalTotal, transferContent: 'UR ZALO' })
                                    : getVietQrUrl({ amount: finalTotal, transferContent: 'UR SHOPEE' })
                              } 
                              alt="Mã QR thanh toán ví điện tử" 
                              className="w-44 h-44 object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/95">
                               <p className="text-[10px] font-black uppercase text-zinc-900 text-center px-4">Quét mã bằng app {activeWallet}</p>
                            </div>
                          </div>

                          <div className="flex-1 space-y-4 w-full">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-3 w-3 rounded-full animate-pulse",
                                activeWallet === 'momo' ? "bg-[#ae2070]" : activeWallet === 'zalopay' ? "bg-[#0068ff]" : "bg-[#ee4d2d]"
                              )} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Thanh toán qua ví {activeWallet}</span>
                            </div>
                            
                            <div className="space-y-4">
                               <p className="text-sm font-black text-zinc-900 leading-snug">
                                 Vui lòng mở ứng dụng <span className="uppercase text-[#1e4b64] font-black">{activeWallet}</span> và quét mã QR để thanh toán đơn hàng.
                               </p>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60">
                                     <p className="text-[9px] text-zinc-400 font-black uppercase mb-0.5">Người nhận</p>
                                     <p className="font-black text-xs text-zinc-900 uppercase">{BANK_TRANSFER_INFO.accountName}</p>
                                  </div>
                                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60">
                                     <p className="text-[9px] text-zinc-400 font-black uppercase mb-0.5">Số tiền</p>
                                     <p className="font-black text-xs text-[#1e4b64]">{finalTotal.toLocaleString('vi-VN')}₫</p>
                                  </div>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </motion.section>

            <Button 
              type="submit" 
              disabled={isProcessing}
              className="w-full bg-[#1e4b64] hover:bg-[#153446] text-white font-black py-8 rounded-[24px] text-base tracking-wide uppercase shadow-xl shadow-[#1e4b64]/10 transition-all hover:scale-[1.005] active:scale-[0.99]"
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
             <motion.div
               initial={{ opacity: 0, x: 15 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.4, delay: 0.2 }}
             >
               <Card className="rounded-[32px] border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                 <CardHeader className="bg-[#1e4b64] p-5">
                    <CardTitle className="text-white text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <ShoppingCart className="h-4.5 w-4.5" /> ĐƠN HÀNG CỦA BẠN
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 sm:p-8 space-y-6 bg-white">
                    <ScrollArea className="h-64 -mr-4 pr-4">
                       {cart.map(item => (
                          <div key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-3 mb-5 last:mb-0 group relative">
                             <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                                {item.images && item.images[0] && (
                                   <img src={item.images[0]} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                                )}
                                <div className="absolute top-0.5 right-0.5 h-4.5 w-4.5 bg-[#1e4b64] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow">
                                   {item.quantity}
                                </div>
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-1">
                                  <p className="text-[12px] font-bold text-zinc-900 uppercase line-clamp-1 group-hover:text-[#ff3b30] transition-colors">{item.name}</p>
                                  <button 
                                    type="button"
                                    onClick={() => removeFromCart(item.id, item.selectedColor, item.selectedSize)}
                                    className="text-zinc-300 hover:text-red-500 transition-colors p-0.5 -mt-0.5 -mr-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                                <p className="text-[9px] text-zinc-400 font-black uppercase mt-0.5 flex items-center gap-1.5">
                                   {item.selectedColor} <span className="h-1 w-1 bg-zinc-200 rounded-full" /> Size {item.selectedSize}
                                </p>
                                <p className="text-xs font-black text-[#1e4b64] mt-1.5">
                                   {((item.discountPrice || item.price) * item.quantity).toLocaleString('vi-VN')}₫
                                </p>
                             </div>
                          </div>
                       ))}
                    </ScrollArea>
                    
                    <Separator className="bg-slate-100" />
  
                    {/* Voucher Ticket Component */}
                    <div 
                      className="py-1 px-3 border border-dashed border-[#ee4d2d]/30 bg-red-50/30 rounded-xl flex items-center justify-between group cursor-pointer transition-all hover:bg-red-50/50" 
                      onClick={() => setIsVoucherModalOpen(true)}
                    >
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4.5 w-4.5 text-[#ee4d2d]" />
                        <span className="text-xs font-black text-zinc-900">Voucher của Shop</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {appliedVoucher ? (
                          <div className="flex flex-col items-end leading-none">
                            <span className="text-[11px] font-black text-[#ee4d2d] border border-dashed border-[#ee4d2d] px-1.5 py-0.5 rounded bg-white">
                              {appliedVoucher.code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-zinc-400 group-hover:text-[#ee4d2d] transition-colors">Chọn Voucher</span>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-[#ee4d2d] transition-colors" />
                      </div>
                    </div>
  
                    {nextVoucherOpportunity && (
                      <button
                        type="button"
                        onClick={() => setIsVoucherModalOpen(true)}
                        className="w-full rounded-2xl border border-dashed border-[#ee4d2d]/20 bg-red-50/40 px-3.5 py-2.5 text-left transition-colors hover:bg-red-50/60"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#ee4d2d]">
                          Ưu đãi thêm cho bạn
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-zinc-500">
                          Mua thêm {(nextVoucherOpportunity.minOrderValue - total).toLocaleString('vi-VN')}₫ để giảm sâu với mã {nextVoucherOpportunity.code}
                        </p>
                      </button>
                    )}
                    
                    <Separator className="bg-slate-100" />
                    
                    <div className="space-y-3">
                       <div className="flex justify-between text-zinc-400 text-[10px] font-black uppercase tracking-wider">
                          <span>Tạm tính</span>
                          <span className="text-zinc-950 font-bold">{total.toLocaleString('vi-VN')}₫</span>
                       </div>
                       <div className="flex justify-between text-zinc-400 text-[10px] font-black uppercase tracking-wider">
                          <span>Phí vận chuyển</span>
                          <span className={cn('font-bold', isShippingFree ? 'text-emerald-500' : 'text-zinc-950')}>
                            {isShippingFree ? 'MIỄN PHÍ' : `${shippingFee.toLocaleString('vi-VN')}₫`}
                          </span>
                       </div>
                       {discountAmount > 0 && (
                         <div className="flex justify-between text-zinc-400 text-[10px] font-black uppercase tracking-wider">
                            <span>Voucher đã giảm</span>
                            <span className="text-[#ee4d2d] font-bold">-{discountAmount.toLocaleString('vi-VN')}₫</span>
                         </div>
                       )}
<div className="pt-4 border-t border-slate-100 mt-4">
                          <div className="flex justify-between items-baseline">
                             <span className="text-zinc-400 text-[10px] font-black uppercase tracking-wider">Tổng số tiền</span>
                             <div className="text-right">
                                <p className="text-2xl font-black text-zinc-950 italic tracking-tighter leading-none">
                                   {finalTotal.toLocaleString('vi-VN')}₫
                                </p>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1 italic">Đã bao gồm VAT</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </CardContent>
               </Card>
             </motion.div>
             
             <VoucherSelectionModal 
               isOpen={isVoucherModalOpen}
               onClose={() => setIsVoucherModalOpen(false)}
               onApply={handleVoucherApply}
               currentTotal={total}
               selectedVoucher={appliedVoucher}
             />

             {/* Payment Method Bottom Sheet Drawer (Mobile) */}
             <AnimatePresence>
               {isPaymentDrawerOpen && (
                 <>
                   {/* Backdrop */}
                   <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 0.5 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setIsPaymentDrawerOpen(false)}
                     className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
                   />
                   {/* Drawer container */}
                   <motion.div
                     initial={{ y: '100%' }}
                     animate={{ y: 0 }}
                     exit={{ y: '100%' }}
                     transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                     className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-[32px] z-50 max-h-[80vh] bg-white rounded-t-[32px] px-6 pb-10 md:pb-6 pt-6 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-y-auto"
                   >
                     {/* Pull tab handle */}
                     <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-5 md:hidden" />

                     <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                       <div>
                         <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight">Chọn phương thức</h3>
                         <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Vui lòng chọn cách thanh toán</p>
                       </div>
                       <button 
                         type="button" 
                         onClick={() => setIsPaymentDrawerOpen(false)}
                         className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-zinc-500 hover:bg-slate-200 transition-colors"
                       >
                         <X className="h-4 w-4" />
                       </button>
                     </div>
                     
                     <div className="space-y-3.5">
                       {[
                         { id: 'cod', title: 'Thanh toán khi nhận hàng (COD)', desc: 'Giao hàng và thu tiền tận nơi', icon: Truck },
                         { id: 'bank_transfer', title: 'Chuyển khoản VietQR (ACB)', desc: 'Quét mã QR tự động xác nhận cực nhanh', icon: CreditCard },
                         { id: 'momo', title: 'Ví điện tử MoMo', desc: 'Thanh toán nhanh qua ví MoMo', icon: Wallet, color: '#ae2070' },
                         { id: 'zalopay', title: 'Ví điện tử ZaloPay', desc: 'Thanh toán an toàn qua ví ZaloPay', icon: Wallet, color: '#0068ff' },
                         { id: 'shopeepay', title: 'Ví điện tử ShopeePay', desc: 'Thanh toán bằng ví ShopeePay', icon: Wallet, color: '#ee4d2d' }
                       ].map((method) => {
                         const isSelected = 
                           (method.id === 'cod' && paymentMethod === 'cod') ||
                           (method.id === 'bank_transfer' && paymentMethod === 'bank_transfer') ||
                           (['momo', 'zalopay', 'shopeepay'].includes(method.id) && paymentMethod === 'e_wallet' && activeWallet === method.id);

                         const handleSelect = () => {
                           if (method.id === 'cod' || method.id === 'bank_transfer') {
                             setPaymentMethod(method.id as any);
                           } else {
                             setPaymentMethod('e_wallet');
                             setActiveWallet(method.id as any);
                           }
                           setIsPaymentDrawerOpen(false);
                           toast.success(`Đã chọn: ${method.title}`);
                         };

                         return (
                           <div 
                             key={method.id}
                             onClick={handleSelect}
                             className={cn(
                               "p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-200",
                               isSelected 
                                 ? "border-[#ff3b30] bg-red-50/5 shadow-xs" 
                                 : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                             )}
                           >
                             <div className="flex items-center gap-3">
                               <div className={cn(
                                 "h-10 w-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0",
                                 isSelected ? "bg-[#ff3b30] text-white" : "bg-slate-50 border border-slate-100 text-zinc-400"
                               )}>
                                 {method.id === 'cod' && <Truck className="h-5 w-5" />}
                                 {method.id === 'bank_transfer' && <CreditCard className="h-5 w-5" />}
                                 {method.id === 'momo' && <div className="text-[9px] font-black leading-none">MoMo</div>}
                                 {method.id === 'zalopay' && <div className="text-[9px] font-black leading-none">Zalo</div>}
                                 {method.id === 'shopeepay' && <div className="text-[9px] font-black leading-none">SPay</div>}
                               </div>
                               <div>
                                 <p className={cn("font-black text-xs uppercase tracking-tight", isSelected ? "text-[#ff3b30]" : "text-zinc-900")}>
                                   {method.title}
                                 </p>
                                 <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">{method.desc}</p>
                               </div>
                             </div>
                             <div className={cn(
                               "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                               isSelected ? "border-[#ff3b30] bg-[#ff3b30]" : "border-slate-200"
                             )}>
                               {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   </motion.div>
                 </>
               )}
             </AnimatePresence>
             
             {/* Trust Badges Bar */}
             <div className="mt-6 flex items-center justify-center gap-8 text-zinc-400/80">
                <div className="flex flex-col items-center gap-1">
                   <ShieldCheck className="h-5 w-5" />
                   <span className="text-[8px] font-black uppercase tracking-widest">Bảo mật</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <Truck className="h-5 w-5" />
                   <span className="text-[8px] font-black uppercase tracking-widest">Tốc độ</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <RefreshCcw className="h-5 w-5" />
                   <span className="text-[8px] font-black uppercase tracking-widest">Chính hãng</span>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Sticky Bottom Bar (Shopee Style) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-6 py-2.5 flex items-center justify-end md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col text-right mr-3 justify-center">
          <div className="text-zinc-500 text-xs font-bold leading-none">
            Tổng cộng <span className="text-base font-black text-[#ee4d2d] ml-1 tracking-tight">{finalTotal.toLocaleString('vi-VN')}đ</span>
          </div>
          {discountAmount > 0 && (
            <div className="text-[10px] font-bold text-[#ee4d2d] mt-1 uppercase tracking-tight leading-none">
              Tiết kiệm {discountAmount.toLocaleString('vi-VN')}đ
            </div>
          )}
        </div>
        <Button 
          type="submit" 
          form="checkout-form"
          disabled={isProcessing}
          className="bg-[#ee4d2d] hover:bg-[#d73a1e] text-white font-bold h-11 px-8 rounded-sm text-sm tracking-wide transition-all active:scale-95 shrink-0"
        >
          {isProcessing ? 'ĐANG XỬ LÝ...' : 'Đặt hàng'}
        </Button>
      </div>
    </div>
  );
};

const ShoppingCart = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  </svg>
);
