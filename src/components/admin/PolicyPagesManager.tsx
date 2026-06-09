import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { slugifyVietnamese } from '@/lib/categoryConfig';
import { getAdminSetting, saveAdminSetting } from '@/services/adminData';

const SEO_OPTIMIZED_CONTACT_HTML = `<div class="contact-seo-article py-8 border-t border-zinc-100 mt-10">
  <article class="prose max-w-4xl mx-auto prose-slate">
    <h2 class="text-2xl font-black text-zinc-950 mb-4 uppercase tracking-tight">UR Sport - Hệ Thống Thời Trang Thể Thao Nam Cao Cấp</h2>
    <p class="text-zinc-600 leading-8 mb-6 font-medium">
      Chào mừng bạn đến với <strong>UR Sport</strong>, thương hiệu hàng đầu cung cấp các dòng sản phẩm quần áo thể thao nam chất lượng cao. Chúng tôi luôn mong muốn lắng nghe mọi phản hồi, thắc mắc và đóng góp ý kiến từ khách hàng để cải thiện dịch vụ mỗi ngày. Dù bạn cần tư vấn chọn size áo thun nam, mua sỉ quần áo thể thao hay có thắc mắc về chính sách vận chuyển, đội ngũ UR Sport luôn sẵn sàng phục vụ.
    </p>

    <h3 class="text-lg font-black text-zinc-900 mb-3 uppercase tracking-wide">Quy trình xử lý phản hồi & hỗ trợ khách hàng</h3>
    <p class="text-zinc-500 text-sm leading-relaxed mb-6 font-semibold">
      Chúng tôi tối ưu hóa quy trình để đảm bảo mọi liên hệ gửi về đều được phản hồi nhanh nhất. Dưới đây là sơ đồ quy trình tiếp nhận thông tin hỗ trợ 4 bước của UR Sport:
    </p>

    <!-- Sơ đồ quy trình bằng SVG cực đẹp -->
    <div class="w-full max-w-2xl mx-auto mb-8 bg-zinc-50 p-6 rounded-2xl border border-zinc-200/60 shadow-inner">
      <svg viewBox="0 0 600 120" class="w-full h-auto">
        <!-- Step 1 -->
        <rect x="10" y="25" width="110" height="70" rx="8" fill="#1e4b64" />
        <text x="65" y="55" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">Bước 1</text>
        <text x="65" y="75" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.9">Gửi thông tin</text>
        
        <!-- Arrow 1 -->
        <path d="M 130 60 L 155 60 M 150 55 L 157 60 L 150 65" stroke="#1e4b64" stroke-width="2" fill="none" />
        
        <!-- Step 2 -->
        <rect x="165" y="25" width="110" height="70" rx="8" fill="#1e4b64" />
        <text x="220" y="55" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">Bước 2</text>
        <text x="220" y="75" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.9">Phân loại hỗ trợ</text>
        
        <!-- Arrow 2 -->
        <path d="M 285 60 L 310 60 M 305 55 L 312 60 L 305 65" stroke="#1e4b64" stroke-width="2" fill="none" />
        
        <!-- Step 3 -->
        <rect x="320" y="25" width="110" height="70" rx="8" fill="#1e4b64" />
        <text x="375" y="55" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">Bước 3</text>
        <text x="375" y="75" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.9">Xử lý & Giải đáp</text>
        
        <!-- Arrow 3 -->
        <path d="M 440 60 L 465 60 M 460 55 L 467 60 L 460 65" stroke="#1e4b64" stroke-width="2" fill="none" />
        
        <!-- Step 4 -->
        <rect x="475" y="25" width="110" height="70" rx="8" fill="#10b981" />
        <text x="530" y="55" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">Bước 4</text>
        <text x="530" y="75" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.9">Hoàn tất / Đánh giá</text>
      </svg>
    </div>

    <h2 class="text-xl font-black text-zinc-950 mb-3 uppercase tracking-tight">Các Kênh Tư Vấn Trực Tuyến & Mua Sắm Nhẹ Nhàng</h2>
    <p class="text-zinc-600 leading-8 mb-6 font-medium">
      Ngoài việc điền form liên hệ nhanh và ghé trực tiếp shop đồ thể thao của chúng tôi tại trung tâm Quận 1, TP.HCM, quý khách có thể kết nối ngay với chúng tôi qua các kênh chat trực tuyến tiện lợi:
    </p>
    
    <ul class="list-none pl-0 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <li class="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex items-start gap-3">
        <span class="text-[#1e4b64] font-black text-lg">✓</span>
        <div>
          <strong class="text-zinc-800 block">Zalo Official Account</strong>
          <span class="text-sm text-zinc-500 leading-normal font-semibold">Hỗ trợ trả lời tư vấn trong 5 phút. Giải quyết các thắc mắc về đơn hàng nhanh chóng.</span>
        </div>
      </li>
      <li class="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex items-start gap-3">
        <span class="text-[#1e4b64] font-black text-lg">✓</span>
        <div>
          <strong class="text-zinc-800 block">Facebook Messenger</strong>
          <span class="text-sm text-zinc-500 leading-normal font-semibold">Kênh tư vấn lựa chọn chất liệu vải (Cotton Compact, Polyester) và phối đồ thể thao cực kỳ năng động.</span>
        </div>
      </li>
    </ul>

    <!-- FAQ Accordions using details/summary -->
    <h2 class="text-xl font-black text-zinc-950 mb-4 uppercase tracking-tight">Các Câu Hỏi Thường Gặp (FAQ)</h2>
    <div class="space-y-4 mb-8">
      <details class="group bg-zinc-50 p-5 rounded-2xl border border-zinc-150 outline-none cursor-pointer" open>
        <summary class="flex justify-between items-center font-bold text-zinc-800 text-sm sm:text-base list-none">
          <span>1. Tôi có thể đổi hàng nếu không vừa size hoặc không thích màu không?</span>
          <span class="text-[#1e4b64] font-black group-open:rotate-180 transition-transform duration-300">▼</span>
        </summary>
        <p class="text-sm text-zinc-500 leading-8 mt-3 font-semibold cursor-default">
          Hoàn toàn được! UR Sport áp dụng chính sách đổi trả hàng linh hoạt trong vòng 30 ngày cho tất cả các sản phẩm áo thun, áo polo và quần thể thao. Yêu cầu sản phẩm còn nguyên tem mác, chưa qua giặt tẩy và không có dấu hiệu đã qua sử dụng. Vui lòng liên hệ Hotline hoặc chat Zalo để được nhân viên hỗ trợ giữ size đổi.
        </p>
      </details>

      <details class="group bg-zinc-50 p-5 rounded-2xl border border-zinc-150 outline-none cursor-pointer">
        <summary class="flex justify-between items-center font-bold text-zinc-800 text-sm sm:text-base list-none">
          <span>2. Đơn hàng từ bao nhiêu tiền thì được miễn phí vận chuyển?</span>
          <span class="text-[#1e4b64] font-black group-open:rotate-180 transition-transform duration-300">▼</span>
        </summary>
        <p class="text-sm text-zinc-500 leading-8 mt-3 font-semibold cursor-default">
          UR Sport miễn phí vận chuyển toàn quốc cho tất cả các đơn đặt hàng có tổng giá trị thanh toán từ 500.000₫ trở lên. Đối với đơn hàng dưới 500.000₫, phí ship đồng giá toàn quốc chỉ từ 25.000₫ - 30.000₫ tùy thuộc vào đơn vị giao nhận.
        </p>
      </details>

      <details class="group bg-zinc-50 p-5 rounded-2xl border border-zinc-150 outline-none cursor-pointer">
        <summary class="flex justify-between items-center font-bold text-zinc-800 text-sm sm:text-base list-none">
          <span>3. UR Sport có bán sỉ hoặc sản xuất áo thể thao đồng phục không?</span>
          <span class="text-[#1e4b64] font-black group-open:rotate-180 transition-transform duration-300">▼</span>
        </summary>
        <p class="text-sm text-zinc-500 leading-8 mt-3 font-semibold cursor-default">
          Có, chúng tôi cung cấp chính sách chiết khấu giá sỉ cực tốt cho các phòng gym, đội nhóm, câu lạc bộ hoặc đối tác đại lý. Đồng thời, UR Sport nhận thiết kế và may in áo thun thể thao đồng phục theo yêu cầu với chất liệu cao cấp riêng. Vui lòng gửi email đến support@ursport.vn hoặc liên hệ trực tiếp hotline để thảo luận chi tiết.
        </p>
      </details>
    </div>

    <!-- Stats Section -->
    <div class="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl">
      <h3 class="text-lg font-black text-[#1e4b64] mb-2 uppercase tracking-wider">Thống kê phản hồi tin nhắn trong tuần qua</h3>
      <p class="text-slate-500 mb-6 text-sm font-semibold">Đội ngũ chăm sóc khách hàng luôn hoạt động năng nổ. Dưới đây là thời gian phản hồi trung bình các ngày trong tuần.</p>
      
      <div class="w-full max-w-md mx-auto py-2">
        <svg viewBox="0 0 400 200" class="w-full h-auto">
          <!-- Trục toạ độ -->
          <line x1="40" y1="20" x2="40" y2="170" stroke="#cbd5e1" stroke-width="2" />
          <line x1="40" y1="170" x2="380" y2="170" stroke="#cbd5e1" stroke-width="2" />
          
          <!-- Cột thứ 2 -->
          <rect x="70" y="70" width="30" height="100" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="85" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T2</text>
          <text x="85" y="60" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">15p</text>
          
          <!-- Cột thứ 3 -->
          <rect x="130" y="50" width="30" height="120" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="145" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T3</text>
          <text x="145" y="40" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">10p</text>
          
          <!-- Cột thứ 4 -->
          <rect x="190" y="90" width="30" height="80" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="205" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T4</text>
          <text x="205" y="80" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">20p</text>
          
          <!-- Cột thứ 5 -->
          <rect x="250" y="40" width="30" height="130" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="265" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T5</text>
          <text x="265" y="30" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">8p</text>
          
          <!-- Cột thứ 6 -->
          <rect x="310" y="60" width="30" height="110" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="325" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T6</text>
          <text x="325" y="50" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">12p</text>
        </svg>
      </div>
    </div>
  </article>
</div>`;

const DEFAULT_POLICY_PAGES = {
  shipping: {
    slug: 'chinh-sach-giao-hang',
    title: 'Chính sách giao hàng',
    description: 'Thông tin giao hàng, phí vận chuyển và thời gian nhận hàng tại UR Sport.',
    robots: 'noindex, nofollow',
    isHtmlOnly: false,
    htmlContent: '',
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
    robots: 'noindex, nofollow',
    isHtmlOnly: false,
    htmlContent: '',
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
  },
  contact: {
    slug: 'lien-he',
    title: 'Trang liên hệ',
    description: 'Thông tin liên hệ của UR Sport, biểu đồ hỗ trợ và các kênh gửi tin nhắn nhanh.',
    robots: 'index, follow',
    isHtmlOnly: false,
    htmlContent: SEO_OPTIMIZED_CONTACT_HTML,
    sections: [],
    // SEO Tags
    seoTitle: 'Liên hệ UR Sport | Cửa hàng Đồ Thể Thao Nam Cao Cấp tại TPHCM',
    seoDescription: 'Địa chỉ cửa hàng đồ thể thao nam UR Sport tại TPHCM. Hỗ trợ nhanh chóng qua Hotline, Zalo. Xem vị trí bản đồ chỉ đường Google Maps tại đây.',
    // Info details
    address: '72 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
    phone: '+84 917 722 425',
    phoneSub: 'Miễn phí tư vấn mua hàng',
    email: 'support@ursport.vn',
    workingHours: '8h30 - 22h00',
    workingHoursSub: 'Thứ 2 - Chủ Nhật (Kể cả ngày lễ)',
    formTitle: 'Gửi tin nhắn cho chúng tôi',
    mapTitle: 'Bản đồ vị trí cửa hàng',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.5165147814986!2d106.6908953147489!3d10.771705992324734!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f3e5fa3d623%3A0xc4a19cf7b0f0b4d4!2zNzIgTmd1eeG7hW4gVHLDo2ksIFBoxrDhu51uZyBQaOG6oW0gTmdmathCBMw6NvLCBRdeG6rW4gMSwgVGjDoG5oIHBo4buRIEjhu5MgQ2jDrCBNaW5oLCBWaeG7hHQgTmFt!5e0!3m2!1svi!2s!4v1680000000000!5m2!1svi!2s'
  }
};

type PolicyPageKey = string;
interface PolicyPageItem {
  slug: string;
  title: string;
  description: string;
  robots?: string;
  seoTitle?: string;
  seoDescription?: string;
  isHtmlOnly?: boolean;
  htmlContent?: string;
  sections: { heading: string; body: string }[];
  address?: string;
  phone?: string;
  phoneSub?: string;
  email?: string;
  workingHours?: string;
  workingHoursSub?: string;
  formTitle?: string;
  mapTitle?: string;
  mapUrl?: string;
}
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
        contact: { ...DEFAULT_POLICY_PAGES.contact, ...(data.contact || {}) },
        ...Object.fromEntries(
          Object.entries(data).filter(([key]) => key !== 'shipping' && key !== 'returns' && key !== 'contact')
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
    if (key === 'contact') return '/lien-he';
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
        robots: 'noindex, nofollow',
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
          <h2 className="text-xl font-black text-white">Trang nội dung & Liên hệ</h2>
          <p className="mt-1 text-sm font-medium text-white/35">Quản lý nội dung trang giao hàng, đổi trả và trang liên hệ. Trang liên hệ được tối ưu index SEO.</p>
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
          {selected === 'contact' && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Tải bài viết mẫu chuẩn SEO sẽ ghi đè lên nội dung hiển thị hiện tại. Bạn có chắc chắn muốn tải?')) {
                    setPages(prev => ({
                      ...prev,
                      contact: {
                        ...prev.contact,
                        htmlContent: DEFAULT_POLICY_PAGES.contact.htmlContent,
                        seoTitle: DEFAULT_POLICY_PAGES.contact.seoTitle,
                        seoDescription: DEFAULT_POLICY_PAGES.contact.seoDescription,
                        description: DEFAULT_POLICY_PAGES.contact.description,
                        robots: DEFAULT_POLICY_PAGES.contact.robots,
                        address: DEFAULT_POLICY_PAGES.contact.address,
                        phone: DEFAULT_POLICY_PAGES.contact.phone,
                        phoneSub: DEFAULT_POLICY_PAGES.contact.phoneSub,
                        email: DEFAULT_POLICY_PAGES.contact.email,
                        workingHours: DEFAULT_POLICY_PAGES.contact.workingHours,
                        workingHoursSub: DEFAULT_POLICY_PAGES.contact.workingHoursSub,
                        formTitle: DEFAULT_POLICY_PAGES.contact.formTitle,
                        mapTitle: DEFAULT_POLICY_PAGES.contact.mapTitle,
                        mapUrl: DEFAULT_POLICY_PAGES.contact.mapUrl,
                      }
                    }));
                    toast.success('Đã tải mẫu bài viết SEO. Nhấp "Lưu thay đổi" để lưu vào cơ sở dữ liệu.');
                  }
                }}
                className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold rounded-xl transition-all"
              >
                Tải bài viết mẫu chuẩn SEO
              </button>
            </div>
          )}

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
              disabled={selected === 'shipping' || selected === 'returns' || selected === 'contact'}
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

          {/* SEO Optimizations Panel */}
          <div className="border-t border-white/5 pt-5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Cấu hình thẻ SEO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Tiêu đề SEO (Nếu để trống sẽ dùng Tiêu đề chính)</label>
                <input
                  value={current.seoTitle || ''}
                  placeholder={current.title}
                  onChange={event => updateCurrent(page => ({ ...page, seoTitle: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Chỉ mục tìm kiếm (Robots SEO)</label>
                <select
                  value={current.robots || (selected === 'contact' ? 'index, follow' : 'noindex, nofollow')}
                  onChange={event => updateCurrent(page => ({ ...page, robots: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#1c1f26] px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                >
                  <option value="index, follow">index, follow (Cho phép Google tìm thấy trang - Dành cho Liên hệ)</option>
                  <option value="noindex, nofollow">noindex, nofollow (Ẩn khỏi Google - Dành cho trang Chính sách)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Mô tả SEO (Meta Description - Nếu để trống sẽ dùng Mô tả ngắn)</label>
              <textarea
                value={current.seoDescription || ''}
                placeholder={current.description}
                onChange={event => updateCurrent(page => ({ ...page, seoDescription: event.target.value }))}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium leading-6 text-white outline-none transition-colors focus:border-[#1e4b64]"
              />
            </div>
          </div>

          {/* Contact Details Settings (Only for contact page) */}
          {selected === 'contact' && (
            <div className="border-t border-white/5 pt-5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Cấu hình thông tin liên hệ hiển thị</h3>
              
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Địa chỉ cửa hàng</label>
                <input
                  value={current.address || ''}
                  onChange={event => updateCurrent(page => ({ ...page, address: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Số điện thoại Hotline</label>
                  <input
                    value={current.phone || ''}
                    onChange={event => updateCurrent(page => ({ ...page, phone: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Hotline Subtitle (VD: Miễn phí tư vấn mua hàng)</label>
                  <input
                    value={current.phoneSub || ''}
                    onChange={event => updateCurrent(page => ({ ...page, phoneSub: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Địa chỉ Email</label>
                  <input
                    value={current.email || ''}
                    onChange={event => updateCurrent(page => ({ ...page, email: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Giờ làm việc</label>
                  <input
                    value={current.workingHours || ''}
                    onChange={event => updateCurrent(page => ({ ...page, workingHours: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Giờ làm việc Subtitle (VD: Thứ 2 - Chủ Nhật kể cả lễ)</label>
                <input
                  value={current.workingHoursSub || ''}
                  onChange={event => updateCurrent(page => ({ ...page, workingHoursSub: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Tiêu đề Form (Mặc định: Gửi tin nhắn cho chúng tôi)</label>
                  <input
                    value={current.formTitle || ''}
                    onChange={event => updateCurrent(page => ({ ...page, formTitle: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Tiêu đề Bản đồ (Mặc định: Bản đồ vị trí cửa hàng)</label>
                  <input
                    value={current.mapTitle || ''}
                    onChange={event => updateCurrent(page => ({ ...page, mapTitle: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">Đường dẫn Google Map Embed (src trong iframe)</label>
                <input
                  value={current.mapUrl || ''}
                  onChange={event => updateCurrent(page => ({ ...page, mapUrl: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-[#1e4b64]"
                />
              </div>
            </div>
          )}

          {/* HTML Content Editor */}
          <div className="border-t border-white/5 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Bài viết hoặc Biểu đồ (Mã HTML)</h3>
                <p className="text-xs text-white/30 mt-1">Dán code biểu đồ SVG, iframe hoặc viết bài viết định dạng HTML tùy chỉnh.</p>
              </div>
              {selected === 'contact' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/45 font-bold uppercase tracking-wider">Chỉ hiển thị HTML:</span>
                  <button
                    type="button"
                    onClick={() => updateCurrent(page => ({ ...page, isHtmlOnly: !page.isHtmlOnly }))}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                      current.isHtmlOnly ? "bg-[#1e4b64] text-white" : "bg-white/5 text-white/40 border border-white/5"
                    )}
                  >
                    {current.isHtmlOnly ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>
              )}
            </div>
            <div>
              <textarea
                value={current.htmlContent || ''}
                onChange={event => updateCurrent(page => ({ ...page, htmlContent: event.target.value }))}
                rows={10}
                placeholder="Nhập mã HTML tại đây... (VD: <div class='card'>...</div>)"
                className="w-full font-mono rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs leading-5 text-emerald-400 outline-none transition-colors focus:border-[#1e4b64]"
              />
            </div>
          </div>

          {/* Render Sections (Only if not isHtmlOnly) */}
          {!current.isHtmlOnly && (
            <div className="space-y-4 border-t border-white/5 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Các mục nội dung</h3>
                <span className="text-xs font-bold text-white/25">
                  {current.robots || (selected === 'contact' ? 'index, follow' : 'noindex, nofollow')}
                </span>
              </div>

              {current.sections && current.sections.map((section, index) => (
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
              
              {selected !== 'shipping' && selected !== 'returns' && selected !== 'contact' && (
                <button
                  type="button"
                  onClick={() => updateCurrent(page => ({
                    ...page,
                    sections: [...(page.sections || []), { heading: 'Mục mới', body: 'Nội dung mục mới' }]
                  }))}
                  className="w-full py-3 border border-dashed border-white/10 rounded-xl text-white/40 hover:text-white hover:border-[#1e4b64] text-xs font-bold transition-all"
                >
                  + Thêm mục nội dung mới
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
