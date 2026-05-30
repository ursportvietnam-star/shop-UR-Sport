import React from 'react';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import { cn } from '@/lib/utils';

export default function OrderLookupPage() {
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [order, setOrder] = React.useState<Order | null>(null);
  const [message, setMessage] = React.useState('');

  const statusSteps = [
    { key: 'pending', label: 'Chờ xác nhận' },
    { key: 'processing', label: 'Đang chuẩn bị' },
    { key: 'shipped', label: 'Đang giao' },
    { key: 'delivered', label: 'Đã giao' }
  ];
  const stepIndex = order ? Math.max(0, statusSteps.findIndex(step => step.key === order.status)) : -1;

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setOrder(null);
    setMessage('');
    try {
      const normalizedCode = code.trim();
      const normalizedPhone = phone.trim();
      if (!normalizedCode || !normalizedPhone) {
        setMessage('Vui lòng nhập số điện thoại và mã đơn hàng.');
        return;
      }

      const byCode = normalizedCode.startsWith('UR')
        ? query(collection(db, 'orders'), where('orderCode', '==', normalizedCode))
        : query(collection(db, 'orders'), where(documentId(), '==', normalizedCode));
      const snapshot = await getDocs(byCode);
      const found = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }) as Order)
        .find(item => {
          const matchesPhone = item.shippingAddress?.phone?.replace(/\s+/g, '') === normalizedPhone.replace(/\s+/g, '');
          const matchesCode = item.orderCode === normalizedCode || item.id === normalizedCode;
          return matchesPhone && matchesCode;
        });

      if (!found) {
        setMessage('Không tìm thấy đơn hàng. Bạn kiểm tra lại số điện thoại và mã đơn nhé.');
        return;
      }
      setOrder(found);
    } catch {
      setMessage('Chưa thể tra cứu đơn lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1e4b64]">Order Lookup</p>
            <h1 className="mt-2 text-2xl font-black text-zinc-950 sm:text-3xl">Tra cứu đơn hàng</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">Nhập số điện thoại và mã đơn để xem trạng thái xử lý, vận đơn và thông tin giao hàng.</p>
          </div>

          <form onSubmit={handleLookup} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="Số điện thoại" className="h-12 rounded-2xl border border-zinc-200 px-4 text-sm font-bold outline-none focus:border-[#1e4b64]" />
            <input value={code} onChange={event => setCode(event.target.value)} placeholder="Mã đơn, ví dụ UR12345678" className="h-12 rounded-2xl border border-zinc-200 px-4 text-sm font-bold outline-none focus:border-[#1e4b64]" />
            <button disabled={isLoading} className="h-12 rounded-2xl bg-[#1e4b64] px-6 text-sm font-black text-white hover:bg-[#153446] disabled:opacity-60">
              {isLoading ? 'Đang tìm...' : 'Tra cứu'}
            </button>
          </form>

          {message && <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">{message}</p>}

          {order && (
            <div className="mt-6 rounded-3xl border border-zinc-100 bg-zinc-50/70 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-zinc-950">Đơn #{order.orderCode || order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="mt-1 text-xs font-bold text-zinc-400">{order.shippingAddress.fullName} · {order.shippingAddress.phone}</p>
                </div>
                <p className="text-xl font-black text-[#1e4b64]">{(order.finalTotal ?? order.total).toLocaleString('vi-VN')}đ</p>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-2">
                {statusSteps.map((step, index) => {
                  const active = order.status !== 'cancelled' && stepIndex >= index;
                  return (
                    <div key={step.key}>
                      <div className={cn('mb-2 h-1.5 rounded-full', active ? 'bg-[#1e4b64]' : 'bg-zinc-200')} />
                      <p className={cn('text-[10px] font-black uppercase', active ? 'text-[#1e4b64]' : 'text-zinc-300')}>{step.label}</p>
                    </div>
                  );
                })}
              </div>

              {(order.trackingNumber || order.trackingUrl) && (
                <div className="mt-5 rounded-2xl bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#1e4b64]">Vận chuyển</p>
                  <p className="mt-2 text-sm font-bold text-zinc-700">{order.trackingNumber || 'Đã có thông tin vận chuyển'}</p>
                  {order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-black text-[#1e4b64] underline">Xem chi tiết vận đơn</a>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
