import React from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { CalendarDays, Camera, LogIn, Package, PackageCheck, ReceiptText, ShoppingBag, Star, Truck, UserRound, Video, X } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { CartItem, Order } from '../types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusInfo: Record<Order['status'], { label: string; className: string; step: number }> = {
  pending: { label: 'Chờ xử lý', className: 'bg-amber-50 text-amber-700 border-amber-100', step: 1 },
  processing: { label: 'Đang chuẩn bị', className: 'bg-blue-50 text-blue-700 border-blue-100', step: 2 },
  shipped: { label: 'Đang giao', className: 'bg-violet-50 text-violet-700 border-violet-100', step: 3 },
  delivered: { label: 'Đã giao', className: 'bg-emerald-50 text-emerald-700 border-emerald-100', step: 4 },
  cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-red-700 border-red-100', step: 0 },
};

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const formatDate = (createdAt: any) => {
  if (!createdAt) return 'Đang cập nhật';
  if (createdAt.toDate) return createdAt.toDate().toLocaleString('vi-VN');
  if (typeof createdAt === 'string') return createdAt;
  return 'Đang cập nhật';
};

const getLoyaltyTier = (totalSpent: number) => {
  if (totalSpent >= 10000000) return { name: 'Kim Cương', discount: '10%', className: 'bg-cyan-50 text-cyan-700 border-cyan-100' };
  if (totalSpent >= 5000000) return { name: 'Vàng', discount: '5%', className: 'bg-amber-50 text-amber-700 border-amber-100' };
  if (totalSpent >= 2000000) return { name: 'Bạc', discount: '3%', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  return { name: 'Đồng', discount: '0%', className: 'bg-orange-50 text-orange-700 border-orange-100' };
};

export const AccountPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(true);
  const [reviewTarget, setReviewTarget] = React.useState<{ order: Order; item: CartItem } | null>(null);
  const [reviewRating, setReviewRating] = React.useState(5);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewFiles, setReviewFiles] = React.useState<File[]>([]);
  const [reviewPreviews, setReviewPreviews] = React.useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      setOrders([]);
      setIsLoadingOrders(false);
      return;
    }

    setIsLoadingOrders(true);
    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(ordersQuery, snapshot => {
      const customerOrders = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }) as Order)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(customerOrders);
      setIsLoadingOrders(false);
    }, error => {
      console.error('Error loading customer orders:', error);
      setOrders([]);
      setIsLoadingOrders(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e4b64] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-[#1e4b64]">
          <UserRound className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-950">Đăng nhập để xem đơn hàng</h1>
        <p className="mt-4 text-sm font-medium leading-7 text-zinc-500">
          Tài khoản giúp bạn theo dõi trạng thái đơn, xem lịch sử mua và gửi đánh giá sau khi nhận hàng.
        </p>
        <Link to="/" className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#1e4b64] px-8 text-sm font-black text-white transition-colors hover:bg-[#153446]">
          <LogIn className="mr-2 h-4 w-4" />
          Về trang chủ để đăng nhập
        </Link>
      </div>
    );
  }

  const totalSpent = orders
    .filter(order => order.status !== 'cancelled')
    .reduce((sum, order) => sum + (order.finalTotal ?? order.total), 0);
  const deliveredSpent = orders
    .filter(order => order.status === 'delivered')
    .reduce((sum, order) => sum + (order.finalTotal ?? order.total), 0);
  const loyaltyPoints = Math.floor(deliveredSpent / 10000);
  const loyaltyTier = getLoyaltyTier(deliveredSpent);

  const openReviewModal = (order: Order, item: CartItem) => {
    reviewPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    setReviewTarget({ order, item });
    setReviewRating(5);
    setReviewComment('');
    setReviewFiles([]);
    setReviewPreviews([]);
  };

  const closeReviewModal = () => {
    reviewPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    setReviewTarget(null);
    setReviewFiles([]);
    setReviewPreviews([]);
  };

  const handleReviewFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setReviewFiles(prev => [...prev, ...files]);
    setReviewPreviews(prev => [
      ...prev,
      ...files.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' as const : 'image' as const
      }))
    ]);
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !reviewTarget) return;
    if (!reviewComment.trim()) {
      toast.error('Vui lòng nhập cảm nhận sản phẩm');
      return;
    }

    setIsSubmittingReview(true);
    const uploadToast = toast.loading('Đang gửi đánh giá...');
    try {
      const imageUrls: string[] = [];
      const videoUrls: string[] = [];
      const cloudName = 'dcj4qhcfh';
      const uploadPreset = 'ursport_uploads';

      for (const file of reviewFiles) {
        const isVideo = file.type.startsWith('video');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', `reviews/${reviewTarget.item.id}`);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`, {
          method: 'POST',
          body: formData
        });
        if (!response.ok) throw new Error('Upload media thất bại');
        const data = await response.json();
        if (isVideo) videoUrls.push(data.secure_url);
        else imageUrls.push(data.secure_url);
      }

      await addDoc(collection(db, 'reviews'), {
        productId: reviewTarget.item.id,
        productName: reviewTarget.item.name,
        orderId: reviewTarget.order.id,
        userId: user.uid,
        userName: user.displayName || user.email || reviewTarget.order.shippingAddress.fullName,
        rating: reviewRating,
        comment: reviewComment.trim(),
        variant: `${reviewTarget.item.selectedSize} / ${reviewTarget.item.selectedColor}`,
        images: imageUrls,
        videos: videoUrls,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast.success('Đã gửi đánh giá, admin duyệt xong sẽ hiển thị.', { id: uploadToast });
      closeReviewModal();
    } catch (error: any) {
      toast.error(error?.message || 'Không thể gửi đánh giá', { id: uploadToast });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="bg-slate-50/60 min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-[28px] bg-[#102f40] p-6 text-white shadow-xl shadow-[#102f40]/10 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-xl font-black ring-1 ring-white/10">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Tài khoản'} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  (user.displayName || user.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Tài khoản UR Sport</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">{user.displayName || 'Khách hàng'}</h1>
                <p className="mt-1 text-sm font-medium text-white/55">{user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-72">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Số đơn</p>
                <p className="mt-1 text-2xl font-black">{orders.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Đã mua</p>
                <p className="mt-1 text-xl font-black">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">UR Points</p>
                    <p className="mt-1 text-2xl font-black">{loyaltyPoints}</p>
                  </div>
                  <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest', loyaltyTier.className)}>
                    Hạng {loyaltyTier.name} · Ưu đãi {loyaltyTier.discount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1e4b64]">Theo dõi đơn hàng</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-zinc-950">Lịch sử mua hàng</h2>
          </div>
          <Link to="/shop" className="hidden h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-900 transition-colors hover:bg-zinc-100 sm:inline-flex">
            Mua thêm
          </Link>
        </div>

        {isLoadingOrders ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-3xl bg-white" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-[28px] border border-zinc-100 bg-white px-6 py-16 text-center shadow-sm">
            <ShoppingBag className="mx-auto mb-5 h-10 w-10 text-zinc-300" />
            <h3 className="text-xl font-black uppercase tracking-tight text-zinc-950">Bạn chưa có đơn hàng nào</h3>
            <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-7 text-zinc-500">
              Khi bạn đặt hàng, toàn bộ trạng thái xử lý và thông tin giao hàng sẽ xuất hiện tại đây.
            </p>
            <Link to="/shop" className="mt-8 inline-flex h-10 items-center justify-center rounded-full bg-[#1e4b64] px-8 text-sm font-black text-white transition-colors hover:bg-[#153446]">
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const currentStatus = statusInfo[order.status] || statusInfo.pending;
              const orderTotal = order.finalTotal ?? order.total;

              return (
                <article key={order.id} className="overflow-hidden rounded-[28px] border border-zinc-100 bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-zinc-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-black uppercase tracking-tight text-zinc-950">
                          Đơn #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest', currentStatus.className)}>
                          {currentStatus.label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <ReceiptText className="h-3.5 w-3.5" />
                          {order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : order.paymentMethod === 'e_wallet' ? 'Ví điện tử' : 'COD'}
                        </span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tổng thanh toán</p>
                      <p className="mt-1 text-2xl font-black italic tracking-tight text-[#1e4b64]">{formatCurrency(orderTotal)}</p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="mb-5 grid grid-cols-4 gap-2">
                      {[
                        { label: 'Đặt hàng', icon: ReceiptText },
                        { label: 'Chuẩn bị', icon: Package },
                        { label: 'Đang giao', icon: Truck },
                        { label: 'Hoàn tất', icon: PackageCheck },
                      ].map((step, index) => {
                        const active = order.status !== 'cancelled' && currentStatus.step >= index + 1;
                        return (
                          <div key={step.label} className="min-w-0">
                            <div className={cn('mb-2 h-1.5 rounded-full', active ? 'bg-[#1e4b64]' : 'bg-zinc-100')} />
                            <div className={cn('flex items-center gap-1.5 text-[10px] font-black uppercase', active ? 'text-[#1e4b64]' : 'text-zinc-300')}>
                              <step.icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{step.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(order.trackingNumber || order.trackingUrl) && (
                      <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#1e4b64]">Thông tin vận chuyển</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold text-zinc-700">
                          {order.trackingNumber && <span>Mã vận đơn: {order.trackingNumber}</span>}
                          {order.trackingUrl && (
                            <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-[#1e4b64] underline">
                              Tra cứu vận đơn
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {order.items.slice(0, 3).map(item => (
                        <div key={`${order.id}-${item.id}-${item.selectedColor}-${item.selectedSize}`} className="flex items-center gap-3 rounded-2xl bg-zinc-50/70 p-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                            {item.images?.[0] && (
                              <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-zinc-900">{item.name}</p>
                            <p className="mt-1 text-[11px] font-bold uppercase text-zinc-400">
                              {item.selectedColor} / Size {item.selectedSize} / SL {item.quantity}
                            </p>
                            {order.status === 'delivered' && (
                              <button
                                type="button"
                                onClick={() => openReviewModal(order, item)}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1e4b64] px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-[#153446]"
                              >
                                <Star className="h-3 w-3 fill-current" />
                                Viết đánh giá
                              </button>
                            )}
                          </div>
                          <p className="hidden text-sm font-black text-zinc-900 sm:block">
                            {formatCurrency((item.discountPrice || item.price) * item.quantity)}
                          </p>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-center text-xs font-bold text-zinc-400">+{order.items.length - 3} sản phẩm khác</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {reviewTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={submitReview} className="w-full max-w-xl rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1e4b64]">Đánh giá sau mua</p>
                <h3 className="mt-2 text-xl font-black text-zinc-950">{reviewTarget.item.name}</h3>
                <p className="mt-1 text-xs font-bold text-zinc-400">{reviewTarget.item.selectedColor} / Size {reviewTarget.item.selectedSize}</p>
              </div>
              <button type="button" onClick={closeReviewModal} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setReviewRating(star)} className="active:scale-95">
                  <Star className={cn('h-8 w-8', star <= reviewRating ? 'fill-[#ee4d2d] text-[#ee4d2d]' : 'text-zinc-200')} />
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={event => setReviewComment(event.target.value)}
              rows={4}
              placeholder="Sản phẩm mặc thế nào, form có vừa không, chất liệu có thoáng không?"
              className="w-full resize-none rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none focus:border-[#1e4b64] focus:bg-white"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-100">
                <Camera className="h-4 w-4" />
                Ảnh / video
                <input type="file" multiple accept="image/*,video/*" onChange={handleReviewFiles} className="hidden" />
              </label>
              {reviewPreviews.map((preview, index) => (
                <div key={preview.url} className="relative h-16 w-16 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-100">
                  {preview.type === 'image' ? (
                    <img src={preview.url} alt="Preview đánh giá" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white">
                      <Video className="h-5 w-5" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(preview.url);
                      setReviewPreviews(prev => prev.filter((_, itemIndex) => itemIndex !== index));
                      setReviewFiles(prev => prev.filter((_, itemIndex) => itemIndex !== index));
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmittingReview}
              className="mt-6 h-12 w-full rounded-full bg-[#1e4b64] text-sm font-black text-white transition-colors hover:bg-[#153446] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
