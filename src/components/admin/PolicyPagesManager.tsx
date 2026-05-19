import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { slugifyVietnamese } from '@/lib/categoryConfig';
import { getAdminSetting, saveAdminSetting } from '@/services/adminData';

const DEFAULT_POLICY_PAGES = {
  shipping: {
    slug: 'chinh-sach-giao-hang',
    title: 'Chính sách giao hàng',
    description: 'Thông tin giao hàng, phí vận chuyển và thời gian nhận hàng tại UR Sport.',
    sections: [
      {
        heading: 'Miễn phí vận chuyển',
        body: 'UR Sport hỗ trợ miễn phí vận chuyển cho đơn hàng từ 500k. Với đơn hàng dưới mức này, phí vận chuyển sẽ được thông báo rõ ở bước thanh toán.'
      },
      {
        heading: 'Thời gian giao hàng',
        body: 'Đơn hàng thường được xử lý trong ngày làm việc và giao theo thời gian của đơn vị vận chuyển. Khu vực nội thành có thể nhận nhanh hơn tùy địa chỉ.'
      },
      {
        heading: 'Theo dõi đơn hàng',
        body: 'Sau khi đơn được xác nhận, UR Sport sẽ hỗ trợ cập nhật tình trạng đơn hàng qua số điện thoại hoặc kênh liên hệ bạn đã cung cấp.'
      }
    ]
  },
  returns: {
    slug: 'chinh-sach-doi-tra',
    title: 'Chính sách đổi trả',
    description: 'Thông tin đổi trả sản phẩm, điều kiện áp dụng và thời gian hỗ trợ tại UR Sport.',
    sections: [
      {
        heading: 'Đổi trả trong 30 ngày',
        body: 'UR Sport hỗ trợ đổi trả trong vòng 30 ngày với sản phẩm còn nguyên tình trạng phù hợp, chưa qua sử dụng sai cách và còn đủ thông tin đơn hàng.'
      },
      {
        heading: 'Điều kiện đổi trả',
        body: 'Sản phẩm cần còn tem, nhãn hoặc bao bì đi kèm nếu có. Các trường hợp lỗi sản xuất, giao nhầm màu, nhầm size hoặc phát sinh từ quá trình xử lý đơn sẽ được ưu tiên hỗ trợ.'
      },
      {
        heading: 'Cách liên hệ',
        body: 'Bạn có thể liên hệ hotline 0917 722 425 hoặc email support@ursport.vn để được hướng dẫn đổi trả nhanh chóng.'
      }
    ]
  }
};

type PolicyPageKey = string;
type PolicyPageItem = typeof DEFAULT_POLICY_PAGES.shipping;
type PolicyPagesState = Record<string, PolicyPageItem>;

export function PolicyPagesManager() {
  const [pages, setPages] = useState<PolicyPagesState>(DEFAULT_POLICY_PAGES);
  const [selected, setSelected] = useState<PolicyPageKey>('shipping');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getAdminSetting<PolicyPagesState>('supportPolicies').then(data => {
      if (!data) return;
      setPages({
        shipping: { ...DEFAULT_POLICY_PAGES.shipping, ...(data.shipping || {}) },
        returns: { ...DEFAULT_POLICY_PAGES.returns, ...(data.returns || {}) },
        ...Object.fromEntries(
          Object.entries(data).filter(([key]) => key !== 'shipping' && key !== 'returns')
        ) as PolicyPagesState
      });
    }).catch(() => {
      toast.error('Không thể tải trang chính sách');
    });
  }, []);

  const current = pages[selected] || pages.shipping;

  const updateCurrent = (updater: (page: PolicyPageItem) => PolicyPageItem) => {
    setPages(prev => ({
      ...prev,
      [selected]: updater(prev[selected] || prev.shipping)
    }));
  };

  const getPolicyPath = (key: string, page: PolicyPageItem) => {
    if (key === 'shipping') return '/chinh-sach-giao-hang';
    if (key === 'returns') return '/chinh-sach-doi-tra';
    return `/chinh-sach/${page.slug || key}`;
  };

  const addPolicyPage = () => {
    const baseSlug = 'trang-chinh-sach-moi';
    const usedSlugs = new Set(Object.values(pages).map(page => page.slug));
    let slug = baseSlug;
    let counter = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const key = `custom-${Date.now()}`;
    setPages(prev => ({
      ...prev,
      [key]: {
        slug,
        title: 'Trang chính sách mới',
        description: 'Mô tả ngắn cho trang chính sách mới.',
        sections: [
          {
            heading: 'Nội dung chính',
            body: 'Nhập nội dung chi tiết cho trang chính sách tại đây.'
          }
        ]
      }
    }));
    setSelected(key);
  };

  const savePages = async () => {
    setIsSaving(true);
    try {
      await saveAdminSetting('supportPolicies', pages);
      toast.success('Đã lưu trang chính sách');
    } catch {
      toast.error('Không thể lưu trang chính sách');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Trang chính sách</h2>
          <p className="mt-1 text-sm font-medium text-white/35">Quản lý nội dung trang giao hàng và đổi trả. Các trang này đang được đặt noindex.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={addPolicyPage}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition-all hover:bg-white/10"
          >
            Thêm trang mới
          </button>
          <button
            onClick={savePages}
            disabled={isSaving}
            className="rounded-xl bg-[#1e4b64] px-5 py-3 text-sm font-black text-white transition-all hover:bg-[#256580] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          {Object.entries(pages).map(([key, page]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={cn(
                "mb-2 w-full rounded-xl px-4 py-3 text-left transition-all",
                selected === key ? "bg-[#1e4b64] text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="block text-sm font-black">{page.title}</span>
              <span className="mt-1 block text-xs font-medium opacity-60">{getPolicyPath(key, page)}</span>
            </button>
          ))}
        </div>

        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Tiêu đề</label>
            <input
              value={current.title}
              onChange={event => updateCurrent(page => ({ ...page, title: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Slug URL</label>
            <input
              value={current.slug}
              onChange={event => updateCurrent(page => ({
                ...page,
                slug: slugifyVietnamese(event.target.value) || page.slug
              }))}
              disabled={selected === 'shipping' || selected === 'returns'}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="mt-2 text-xs font-medium text-white/25">
              URL: {getPolicyPath(selected, current)}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Mô tả ngắn</label>
            <textarea
              value={current.description}
              onChange={event => updateCurrent(page => ({ ...page, description: event.target.value }))}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium leading-6 text-white outline-none transition-colors focus:border-[#1e4b64]"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Các mục nội dung</h3>
              <span className="text-xs font-bold text-white/25">noindex, nofollow</span>
            </div>

            {current.sections.map((section, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <input
                  value={section.heading}
                  onChange={event => updateCurrent(page => ({
                    ...page,
                    sections: page.sections.map((item, itemIndex) => itemIndex === index ? { ...item, heading: event.target.value } : item)
                  }))}
                  className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white outline-none transition-colors focus:border-[#1e4b64]"
                />
                <textarea
                  value={section.body}
                  onChange={event => updateCurrent(page => ({
                    ...page,
                    sections: page.sections.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item)
                  }))}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium leading-6 text-white outline-none transition-colors focus:border-[#1e4b64]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
