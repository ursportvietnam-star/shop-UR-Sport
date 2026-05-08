import React from 'react';
import { X, User, Phone, MapPin, Package, Clock, CreditCard, StickyNote, Tag } from 'lucide-react';
import { Order } from '../types';
import { cn } from '@/lib/utils';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending': return { label: 'Chờ xử lý', color: 'text-yellow-400 bg-yellow-400/10' };
      case 'processing': return { label: 'Đang chuẩn bị', color: 'text-blue-400 bg-blue-400/10' };
      case 'shipped': return { label: 'Đang giao', color: 'text-purple-400 bg-purple-400/10' };
      case 'delivered': return { label: 'Đã giao', color: 'text-emerald-400 bg-emerald-400/10' };
      case 'cancelled': return { label: 'Đã hủy', color: 'text-red-400 bg-red-400/10' };
      default: return { label: status, color: 'text-white/40 bg-white/5' };
    }
  };

  const status = getStatusInfo(order.status);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#13161f] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-[#1e4b64]/10 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-[#1e4b64]" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg uppercase tracking-tight">Chi tiết đơn hàng #{order.id.substring(0, 8)}</h3>
              <p className="text-white/30 text-xs font-medium">
                Ngày đặt: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('vi-VN') : order.createdAt}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider", status.color)}>
              {status.label}
            </span>
            <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recipient Info */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-[#1e4b64]">
                <User className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Người nhận</span>
              </div>
              <div className="space-y-1">
                <p className="text-white font-bold text-sm">{order.shippingAddress.fullName}</p>
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <Phone className="h-3 w-3" />
                  <span>{order.shippingAddress.phone}</span>
                </div>
              </div>
            </div>

            {/* Address Info */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 md:col-span-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <MapPin className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Địa chỉ giao hàng</span>
              </div>
              <p className="text-white font-medium text-sm leading-relaxed">{order.shippingAddress.address}</p>
            </div>
          </div>

          {/* Products Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Package className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Danh sách sản phẩm</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/20">Sản phẩm</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/20">Phân loại</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/20">Giá</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/20">SL</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Tổng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-white/[0.01]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/5">
                            {item.images?.[0] ? (
                              <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-white/10">
                                <Package className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold line-clamp-1">{item.name}</p>
                            <p className="text-white/20 text-[10px]">ID: {item.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded border border-blue-500/20">
                            {item.selectedColor}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase rounded border border-emerald-500/20">
                            {item.selectedSize}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white/60 text-sm font-medium">{(item.discountPrice || item.price).toLocaleString('vi-VN')}₫</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-bold text-sm">x{item.quantity}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-[#1e4b64] font-black text-sm">
                          {((item.discountPrice || item.price) * item.quantity).toLocaleString('vi-VN')}₫
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Grid: Note & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Note */}
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-orange-400">
                <StickyNote className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Ghi chú từ khách hàng</span>
              </div>
              <p className={cn(
                "text-sm italic leading-relaxed",
                order.note ? "text-white/70" : "text-white/20"
              )}>
                {order.note || 'Không có ghi chú nào cho đơn hàng này.'}
              </p>
            </div>

            {/* Summary */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Tạm tính ({order.items.length} món)</span>
                  <span className="text-white font-medium">{order.total.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Phí vận chuyển</span>
                  <span className="text-emerald-400 font-bold uppercase text-[10px]">Miễn phí</span>
                </div>
                <div className="h-px bg-white/5 my-2" />
                <div className="flex justify-between items-baseline">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[#1e4b64]" />
                    <span className="text-white font-black uppercase text-sm italic tracking-tight">Tổng cộng</span>
                  </div>
                  <span className="text-2xl font-black text-[#1e4b64] italic tracking-tighter">
                    {order.total.toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>
              
              <div className="pt-2">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border",
                  order.paymentMethod === 'bank_transfer' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                  order.paymentMethod === 'e_wallet' ? "bg-pink-500/10 border-pink-500/20 text-pink-400" :
                  "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                )}>
                  <CreditCard className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản ngân hàng' :
                     order.paymentMethod === 'e_wallet' ? 'Ví điện tử (Momo/ZaloPay)' : 'Thanh toán khi nhận hàng (COD)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
          <div className="flex items-center gap-2 text-white/20 text-[10px] font-bold uppercase">
            <Clock className="h-3 w-3" />
            <span>Cập nhật cuối: {new Date().toLocaleTimeString('vi-VN')}</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
