import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, RefreshCcw, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TRUST_BADGES = [
  { icon: Truck, title: 'Miễn phí vận chuyển', desc: 'Cho đơn hàng từ 500k', detailHref: '/chinh-sach-giao-hang' },
  { icon: ShieldCheck, title: 'Thanh toán an toàn', desc: 'Bảo mật thông tin 100%' },
  { icon: RefreshCcw, title: 'Đổi trả 30 ngày', desc: 'Dễ dàng và nhanh chóng', detailHref: '/chinh-sach-doi-tra' },
  { icon: Phone, title: 'Hỗ trợ tận tâm', desc: 'Hotline: 0917 722 425' },
];

export function TrustBadgesSection({ className = '' }: { className?: string }) {
  return (
    <section className={cn("bg-zinc-50/50 border-y border-zinc-100", className)}>
      <div className="container-custom py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-4 lg:gap-8">
          {TRUST_BADGES.map((badge, idx) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group flex items-center gap-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all duration-500 group-hover:border-[#1e4b64] group-hover:bg-[#1e4b64] sm:h-14 sm:w-14">
                <badge.icon className="h-5 w-5 text-[#1e4b64] transition-colors duration-500 group-hover:text-white sm:h-6 sm:w-6" />
              </div>
              <div>
                <h4 className="mb-1 text-[11px] font-black uppercase tracking-widest text-zinc-900 sm:text-[12px]">{badge.title}</h4>
                <p className="text-[10px] font-medium text-zinc-400 sm:text-[11px]">{badge.desc}</p>
                {'detailHref' in badge && badge.detailHref && (
                  <Link
                    to={badge.detailHref}
                    className="mt-1 inline-block text-[11px] font-medium text-[#1e4b64] transition-colors hover:text-[#153446] hover:underline"
                  >
                    Xem chi tiết
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
