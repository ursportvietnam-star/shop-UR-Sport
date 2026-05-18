import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clipboard, ClipboardList, Home, PackageSearch, ShieldCheck, Truck } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import { BANK_TRANSFER_INFO, getPaymentLabel, getTransferContent, getVietQrUrl } from '../lib/payment';
import { toast } from 'sonner';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = React.useState(Boolean(orderId));
  const shortOrderId = order?.orderCode || (orderId ? orderId.slice(0, 8).toUpperCase() : '');
  const payableTotal = order?.finalTotal ?? order?.total ?? 0;
  const paymentMethod = order?.paymentMethod;
  const shouldShowQr = Boolean(order && paymentMethod && paymentMethod !== 'cod');
  const transferContent = order?.transferContent || getTransferContent(order?.orderCode, orderId);
  const qrUrl = getVietQrUrl({ amount: payableTotal, transferContent });

  React.useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    setIsLoadingOrder(true);

    getDoc(doc(db, 'orders', orderId)).then(snap => {
      if (!isMounted) return;
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() } as Order);
      }
    }).finally(() => {
      if (isMounted) setIsLoadingOrder(false);
    });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã copy ${label}`);
    } catch {
      toast.error('Không thể copy tự động');
    }
  };

  return (
    <div className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/60">
          <CheckCircle2 className="h-12 w-12" />
        </div>

        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#1e4b64]">
          Đặt hàng thành công
        </p>
        <h1 className="text-4xl font-black uppercase tracking-tight text-zinc-950 sm:text-5xl">
          Cảm ơn bạn đã mua hàng
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-zinc-500">
          UR Sport đã nhận đơn và sẽ xử lý sớm nhất. Nhân viên có thể liên hệ để xác nhận thông tin giao hàng trước khi gửi.
        </p>

        {shortOrderId && (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-dashed border-[#1e4b64]/30 bg-blue-50/40 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mã đơn hàng</p>
            <p className="mt-1 text-2xl font-black tracking-widest text-[#1e4b64]">#{shortOrderId}</p>
          </div>
        )}

        {isLoadingOrder && (
          <div className="mx-auto mt-8 h-40 max-w-2xl animate-pulse rounded-3xl bg-zinc-50" />
        )}

        {shouldShowQr && (
          <div className="mx-auto mt-8 grid max-w-3xl gap-6 rounded-3xl border border-blue-100 bg-blue-50/30 p-5 text-left shadow-sm sm:grid-cols-[220px_1fr] sm:p-6">
            <div className="mx-auto rounded-3xl bg-white p-4 shadow-lg ring-1 ring-blue-100">
              <img
                src={qrUrl}
                alt="Mã QR VietQR thanh toán đơn hàng"
                loading="lazy"
                className="h-48 w-48 object-contain"
              />
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e4b64]">Thanh toán VietQR</p>
              <h2 className="mt-2 text-xl font-black text-zinc-950">Quét mã để thanh toán đơn hàng</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">
                Mã QR đã điền sẵn số tiền và nội dung chuyển khoản. Vui lòng giữ đúng nội dung để shop xác nhận nhanh hơn.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-blue-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Số tiền</p>
                  <p className="mt-1 text-lg font-black text-[#1e4b64]">{payableTotal.toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-blue-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Phương thức</p>
                  <p className="mt-1 text-sm font-black text-zinc-900">{getPaymentLabel(paymentMethod)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(BANK_TRANSFER_INFO.accountNumber, 'số tài khoản')}
                  className="rounded-2xl bg-white p-4 text-left ring-1 ring-blue-100 transition-colors hover:bg-blue-50"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Số tài khoản</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-black text-zinc-900">
                    {BANK_TRANSFER_INFO.accountNumber}
                    <Clipboard className="h-3.5 w-3.5 text-[#1e4b64]" />
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => copyText(transferContent, 'nội dung chuyển khoản')}
                  className="rounded-2xl bg-white p-4 text-left ring-1 ring-blue-100 transition-colors hover:bg-blue-50"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nội dung</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-black text-zinc-900">
                    {transferContent}
                    <Clipboard className="h-3.5 w-3.5 text-[#1e4b64]" />
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
          {[
            { icon: ClipboardList, title: 'Đã ghi nhận', desc: 'Đơn nằm trong tài khoản của bạn.' },
            { icon: ShieldCheck, title: 'Chờ xác nhận', desc: 'Admin kiểm tra tồn kho và thanh toán.' },
            { icon: Truck, title: 'Giao hàng', desc: 'Bạn có thể theo dõi trạng thái đơn.' },
          ].map(item => (
            <div key={item.title} className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5">
              <item.icon className="mb-4 h-5 w-5 text-[#1e4b64]" />
              <h2 className="text-sm font-black uppercase tracking-tight text-zinc-900">{item.title}</h2>
              <p className="mt-2 text-xs font-medium leading-5 text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/tai-khoan" className="inline-flex h-12 items-center justify-center rounded-full bg-[#1e4b64] px-8 text-sm font-black text-white transition-colors hover:bg-[#153446]">
            <PackageSearch className="mr-2 h-4 w-4" />
            Theo dõi đơn hàng
          </Link>
          <Link to="/shop" className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-8 text-sm font-black text-zinc-900 transition-colors hover:bg-zinc-100">
            <Home className="mr-2 h-4 w-4" />
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
};
