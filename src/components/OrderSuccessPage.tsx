import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Home, PackageSearch, ShieldCheck, Truck } from 'lucide-react';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const shortOrderId = orderId ? orderId.slice(0, 8).toUpperCase() : '';

  return (
    <div className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
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
