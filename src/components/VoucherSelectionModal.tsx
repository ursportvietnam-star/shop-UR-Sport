import React, { useState, useEffect } from 'react';
import { X, Search, Ticket, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { Voucher } from '../types';
import { STATIC_VOUCHERS } from '../data';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoucherSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (voucher: Voucher | null) => void;
  currentTotal: number;
  selectedVoucher: Voucher | null;
}

export const VoucherSelectionModal: React.FC<VoucherSelectionModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentTotal,
  selectedVoucher,
}) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [tempSelected, setTempSelected] = useState<Voucher | null>(selectedVoucher);

  // Sync tempSelected with selectedVoucher when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedVoucher);
      setSearchInput('');
    }
  }, [isOpen, selectedVoucher]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  if (!isOpen) return null;

  const eligibleVouchers = vouchers.filter(v => currentTotal >= v.minOrderValue);
  const ineligibleVouchers = vouchers.filter(v => currentTotal < v.minOrderValue);

  const handleApplyCode = () => {
    if (!searchInput.trim()) return;
    const found = vouchers.find(v => v.code.toUpperCase() === searchInput.trim().toUpperCase());
    if (!found) {
      toast.error('Mã giảm giá không tồn tại hoặc đã hết hạn.');
      return;
    }
    if (currentTotal < found.minOrderValue) {
      toast.error(`Chưa đủ điều kiện. Đơn tối thiểu ${found.minOrderValue.toLocaleString('vi-VN')}đ.`);
      return;
    }
    setTempSelected(found);
    toast.success('Đã áp dụng mã giảm giá!');
    setSearchInput('');
  };

  const handleConfirm = () => {
    onApply(tempSelected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-xl font-black text-zinc-900">UR SPORT - Mã Giảm Giá</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 hide-scrollbar">
          {/* Input Section */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nhập mã voucher của Shop" 
                className="pl-10 h-12 rounded-xl border-zinc-200 bg-white font-medium uppercase placeholder:normal-case focus-visible:ring-[#ee4d2d]"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCode()}
              />
            </div>
            <Button 
              onClick={handleApplyCode}
              disabled={!searchInput.trim()}
              className="h-12 px-6 bg-[#ee4d2d]/10 text-[#ee4d2d] hover:bg-[#ee4d2d] hover:text-white font-bold uppercase tracking-widest rounded-xl transition-all"
            >
              Áp Dụng
            </Button>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-sm font-medium text-zinc-400">Đang tải mã giảm giá...</div>
          ) : (
            <div className="space-y-6">
              {/* Eligible Vouchers */}
              {eligibleVouchers.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Có thể sử dụng
                  </h3>
                  <div className="space-y-3">
                    {eligibleVouchers.map(voucher => {
                      const isSelected = tempSelected?.code === voucher.code;
                      const isPercent = voucher.discountType === 'percent';
                      return (
                        <div 
                          key={voucher.id || voucher.code}
                          onClick={() => setTempSelected(isSelected ? null : voucher)}
                          className={cn(
                            "relative flex rounded-xl border bg-white overflow-hidden cursor-pointer transition-all hover:shadow-md",
                            isSelected ? "border-[#ee4d2d] ring-1 ring-[#ee4d2d]" : "border-zinc-200 hover:border-[#ee4d2d]/50"
                          )}
                        >
                          {/* Badge "Lựa chọn tốt nhất" (Just an example logic, could be highest discount) */}
                          {isSelected && (
                            <div className="absolute top-0 left-0 bg-[#ee4d2d] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-br-lg z-10">
                              Đang Chọn
                            </div>
                          )}

                          <div className="w-[100px] shrink-0 bg-linear-to-br from-[#ee4d2d] to-[#ff7337] flex flex-col items-center justify-center p-3 text-white border-r border-dashed border-white/40">
                            <Ticket className="h-6 w-6 mb-1 opacity-80" />
                            <div className="text-xl font-black text-center leading-none">
                              {isPercent ? `${voucher.discountValue}%` : `${voucher.discountValue / 1000}K`}
                            </div>
                          </div>
                          <div className="flex-1 p-3 pr-10 flex flex-col justify-center">
                            <h4 className="text-[13px] font-bold text-zinc-900 leading-tight">
                              {isPercent ? `Giảm ${voucher.discountValue}%` : `Giảm ${(voucher.discountValue / 1000)}K`}
                              {isPercent && voucher.maxDiscountValue ? ` Giảm tối đa ${(voucher.maxDiscountValue / 1000)}K` : ''}
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Đơn Tối Thiểu {voucher.minOrderValue.toLocaleString('vi-VN')}₫</p>
                            <p className="text-[10px] text-zinc-400 mt-2">HSD: {new Date(voucher.endTime).toLocaleDateString('vi-VN')}</p>
                          </div>
                          
                          {/* Radio Check */}
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected ? "border-[#ee4d2d] bg-[#ee4d2d]" : "border-zinc-300"
                            )}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ineligible Vouchers */}
              {ineligibleVouchers.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3 ml-1 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" /> Chưa đủ điều kiện
                  </h3>
                  <div className="space-y-3 opacity-60 pointer-events-none">
                    {ineligibleVouchers.map(voucher => {
                      const isPercent = voucher.discountType === 'percent';
                      return (
                        <div 
                          key={voucher.id || voucher.code}
                          className="relative flex rounded-xl border border-zinc-200 bg-white overflow-hidden grayscale"
                        >
                          <div className="w-[100px] shrink-0 bg-zinc-400 flex flex-col items-center justify-center p-3 text-white border-r border-dashed border-white/40">
                            <Ticket className="h-6 w-6 mb-1 opacity-80" />
                            <div className="text-xl font-black text-center leading-none">
                              {isPercent ? `${voucher.discountValue}%` : `${voucher.discountValue / 1000}K`}
                            </div>
                          </div>
                          <div className="flex-1 p-3 pr-4 flex flex-col justify-center">
                            <h4 className="text-[13px] font-bold text-zinc-900 leading-tight">
                              {isPercent ? `Giảm ${voucher.discountValue}%` : `Giảm ${(voucher.discountValue / 1000)}K`}
                              {isPercent && voucher.maxDiscountValue ? ` Giảm tối đa ${(voucher.maxDiscountValue / 1000)}K` : ''}
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Đơn Tối Thiểu {voucher.minOrderValue.toLocaleString('vi-VN')}₫</p>
                            <p className="text-[10px] text-red-500 font-medium mt-1">Sản phẩm đã chọn không đáp ứng điều kiện</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {vouchers.length === 0 && (
                <div className="py-10 text-center">
                  <div className="h-12 w-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Ticket className="h-5 w-5 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">Không có mã giảm giá nào</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-zinc-100 flex gap-3 shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 rounded-xl h-12 font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50"
          >
            Trở lại
          </Button>
          <Button 
            onClick={handleConfirm}
            className="flex-1 rounded-xl h-12 bg-[#ee4d2d] hover:bg-[#d73211] text-white font-bold uppercase tracking-widest shadow-md transition-all active:scale-95"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};
