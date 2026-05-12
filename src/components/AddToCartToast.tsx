import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddToCartToastOptions {
  productName: string;
  image?: string;
  meta: string;
  onCheckout: () => void;
}

export function showAddToCartToast({ productName, image, meta, onCheckout }: AddToCartToastOptions) {
  toast.custom(
    (toastId) => (
      <div className="flex w-[min(92vw,420px)] items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 pr-4 font-sans shadow-xl">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
          {image ? (
            <img
              src={image}
              alt={productName}
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-300">
              UR
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm">
            <CheckCircle2 className="h-4 w-4 fill-[#1e4b64] text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[13px] font-black leading-snug text-zinc-950">Đã thêm vào giỏ hàng</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-800">
            {productName}
          </p>
          <p className="mt-1 text-[12px] font-medium text-zinc-500">{meta}</p>
        </div>

        <button
          onClick={() => {
            toast.dismiss(toastId);
            onCheckout();
          }}
          className="mt-1 shrink-0 rounded-md bg-zinc-950 px-3 py-2 text-[11px] font-black text-white transition-colors hover:bg-[#1e4b64]"
        >
          Thanh toán ngay
        </button>
      </div>
    ),
    {
      position: 'top-center',
      duration: 5000,
    }
  );
}
