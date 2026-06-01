import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { Voucher } from '../types';
import { STATIC_VOUCHERS } from '../data';
import { useCart } from '../CartContext';
import { Ticket, Clock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const StorefrontVoucherBanner = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const { savedVouchers, saveVoucher } = useCart();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setVouchers(STATIC_VOUCHERS.filter(v => v.isActive));
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, 'vouchers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Voucher[];
      const activeVouchers = (data.length > 0 ? data : STATIC_VOUCHERS).filter(v => v.isActive);
      setVouchers(activeVouchers);
      setIsLoading(false);
    }, () => {
      setVouchers(STATIC_VOUCHERS.filter(v => v.isActive));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading || vouchers.length === 0) return null;

  return (
    <section className="bg-zinc-50/50 py-8 border-y border-zinc-100">
      <div className="container-custom">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#ee4d2d]/10 p-2.5 rounded-xl">
            <Ticket className="h-6 w-6 text-[#ee4d2d]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 uppercase tracking-tight">Siêu Ưu Đãi</h2>
            <p className="text-sm font-medium text-zinc-500">Thu thập mã giảm giá ngay</p>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x snap-mandatory">
          {vouchers.map(voucher => {
            const isSaved = savedVouchers.includes(voucher.code);
            const isPercent = voucher.discountType === 'percent';
            const discountText = isPercent 
              ? `Giảm ${voucher.discountValue}%` 
              : `Giảm ${(voucher.discountValue / 1000)}K`;

            return (
              <div 
                key={voucher.id || voucher.code}
                className="shrink-0 w-[280px] sm:w-[320px] snap-center rounded-2xl bg-white border border-[#ee4d2d]/20 shadow-sm overflow-hidden flex"
              >
                {/* Left Side: Ticket info */}
                <div className="w-1/3 bg-linear-to-b from-[#ee4d2d] to-[#ff7337] p-4 flex flex-col items-center justify-center text-white relative">
                  <div className="text-3xl font-black leading-none text-center">
                    {isPercent ? `${voucher.discountValue}%` : `${voucher.discountValue / 1000}K`}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-90 text-center">
                    {voucher.type === 'hoan_xu' ? 'Hoàn Xu' : 'Giảm Giá'}
                  </div>
                  {/* Decorative cutouts */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-2 h-4 w-4 rounded-full bg-white" />
                </div>

                {/* Right Side: Details & Action */}
                <div className="w-2/3 p-4 flex flex-col justify-between border-l border-dashed border-[#ee4d2d]/30 relative">
                  <div className="absolute top-1/2 -translate-y-1/2 -left-2 h-4 w-4 rounded-full bg-white" />
                  
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 line-clamp-1">{voucher.name}</h3>
                    <p className="text-[11px] font-medium text-zinc-500 mt-1">Đơn tối thiểu {voucher.minOrderValue.toLocaleString('vi-VN')}đ</p>
                    {isPercent && voucher.maxDiscountValue ? (
                      <p className="text-[10px] font-medium text-[#ee4d2d] mt-0.5">Giảm tối đa {voucher.maxDiscountValue.toLocaleString('vi-VN')}đ</p>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-400" />
                      <span className="text-[10px] font-medium text-zinc-400">
                        HSD: {new Date(voucher.endTime).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (!isSaved) {
                          saveVoucher(voucher.code);
                          toast.success(`Đã lưu mã ${voucher.code}`);
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shadow-sm flex items-center gap-1",
                        isSaved 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default" 
                          : "bg-[#ee4d2d] hover:bg-[#d73211] text-white active:scale-95"
                      )}
                    >
                      {isSaved ? (
                        <>
                          <Check className="h-3 w-3" /> Đã lưu
                        </>
                      ) : (
                        'Lưu mã'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </section>
  );
};
