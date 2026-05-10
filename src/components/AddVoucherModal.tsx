import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Voucher } from '../types';

interface AddVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  voucher?: Voucher | null;
}

export const AddVoucherModal: React.FC<AddVoucherModalProps> = ({ isOpen, onClose, onSuccess, voucher }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<'khuyen_mai' | 'hoan_xu'>('khuyen_mai');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [maxDiscountValue, setMaxDiscountValue] = useState<number>(0);
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [maxUsage, setMaxUsage] = useState<number>(0);
  const [maxUsagePerUser, setMaxUsagePerUser] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      // Reset form
      setName('');
      setCode('');
      setStartTime('');
      setEndTime('');
      setType('khuyen_mai');
      setDiscountType('fixed');
      setDiscountValue(0);
      setMaxDiscountValue(0);
      setMinOrderValue(0);
      setMaxUsage(0);
      setMaxUsagePerUser(1);
      setIsActive(true);
      return;
    }

    if (voucher) {
      setName(voucher.name || '');
      setCode(voucher.code || '');
      setStartTime(voucher.startTime ? new Date(voucher.startTime).toISOString().slice(0, 16) : '');
      setEndTime(voucher.endTime ? new Date(voucher.endTime).toISOString().slice(0, 16) : '');
      setType(voucher.type || 'khuyen_mai');
      setDiscountType(voucher.discountType || 'fixed');
      setDiscountValue(voucher.discountValue || 0);
      setMaxDiscountValue(voucher.maxDiscountValue || 0);
      setMinOrderValue(voucher.minOrderValue || 0);
      setMaxUsage(voucher.maxUsage || 0);
      setMaxUsagePerUser(voucher.maxUsagePerUser || 1);
      setIsActive(voucher.isActive !== undefined ? voucher.isActive : true);
    } else {
      // Set default start/end times
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setStartTime(now.toISOString().slice(0, 16));
      
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setEndTime(nextMonth.toISOString().slice(0, 16));
    }
  }, [isOpen, voucher]);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    
    if (!name.trim() || !code.trim() || !startTime || !endTime) {
      toast.error('Vui lòng điền đủ Tên chương trình, Mã voucher và Thời gian sử dụng.');
      return;
    }

    if (discountValue <= 0) {
      toast.error('Mức giảm phải lớn hơn 0.');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const voucherData: any = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        type,
        discountType,
        discountValue,
        minOrderValue,
        maxUsage,
        maxUsagePerUser,
        usedCount: voucher?.usedCount || 0,
        isActive,
        applicableProducts: ['all'], // Default to all products for now
        createdAt: serverTimestamp(),
      };

      if (discountType === 'percent') {
        voucherData.maxDiscountValue = maxDiscountValue;
      }

      if (voucher && voucher.id) {
        await setDoc(doc(db, 'vouchers', voucher.id), voucherData as any, { merge: true });
        toast.success('Mã giảm giá đã được cập nhật.');
      } else {
        await addDoc(collection(db, 'vouchers'), voucherData as any);
        toast.success('Mã giảm giá mới đã được tạo.');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi lưu mã giảm giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-black inline">{voucher ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#ee4d2d] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#d73211] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 py-6 lg:px-8" onSubmit={handleSubmit}>
          
          {/* Thông tin cơ bản */}
          <div className="space-y-6 mb-8">
            <h3 className="text-lg font-bold text-zinc-800 border-b pb-2">Thông tin cơ bản</h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Tên chương trình giảm giá
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                  placeholder="Tên Voucher sẽ không được hiển thị cho Người mua"
                  maxLength={100}
                />
                <p className="text-xs text-zinc-500 text-right">{name.length}/100</p>
              </label>

              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Mã voucher
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 text-zinc-500 text-sm">
                    URSP
                  </span>
                  <input
                    value={code.replace(/^URSP/, '')}
                    onChange={(e) => setCode('URSP' + e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className="w-full rounded-r-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                    placeholder="Mã tối đa 5 kí tự"
                    maxLength={5}
                  />
                </div>
                <p className="text-xs text-zinc-500">Mã giảm giá đầy đủ là: {code}</p>
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Thời gian bắt đầu
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Thời gian kết thúc
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                />
              </label>
            </div>
          </div>

          {/* Thiết lập mã giảm giá */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-zinc-800 border-b pb-2">Thiết lập mã giảm giá</h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Loại Voucher
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="voucherType" 
                      checked={type === 'khuyen_mai'} 
                      onChange={() => setType('khuyen_mai')}
                      className="text-[#ee4d2d] focus:ring-[#ee4d2d]" 
                    />
                    Khuyến Mãi
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="voucherType" 
                      checked={type === 'hoan_xu'} 
                      onChange={() => setType('hoan_xu')}
                      className="text-[#ee4d2d] focus:ring-[#ee4d2d]" 
                    />
                    Hoàn Xu
                  </label>
                </div>
              </label>
              
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-sm font-semibold text-zinc-700">Trạng thái (Kích hoạt)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ee4d2d]"></div>
                </label>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Loại giảm giá
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                >
                  <option value="fixed">Theo số tiền</option>
                  <option value="percent">Theo phần trăm</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Mức giảm
                <div className="relative">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                    placeholder="Nhập mức giảm"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-normal">
                    {discountType === 'fixed' ? '₫' : '%'}
                  </span>
                </div>
              </label>
            </div>

            {discountType === 'percent' && (
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-zinc-700">
                  Mức giảm tối đa (Tùy chọn)
                  <div className="relative">
                    <input
                      type="number"
                      value={maxDiscountValue}
                      onChange={(e) => setMaxDiscountValue(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                      placeholder="Không giới hạn nếu để trống hoặc 0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-normal">₫</span>
                  </div>
                </label>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-1">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Giá trị đơn hàng tối thiểu
                <div className="relative">
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                    placeholder="Nhập giá trị đơn tối thiểu"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-normal">₫</span>
                </div>
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Tổng lượt sử dụng tối đa
                <input
                  type="number"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                  placeholder="Tổng số Mã giảm giá có thể sử dụng"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Lượt sử dụng tối đa/Người mua
                <input
                  type="number"
                  value={maxUsagePerUser}
                  onChange={(e) => setMaxUsagePerUser(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#ee4d2d]"
                />
              </label>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};
