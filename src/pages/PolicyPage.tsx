import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { useSEO } from '../hooks/useSEO';
import { absoluteUrl } from '../lib/seo';

export const POLICY_CONTENT = {
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
        body: 'Sản phẩm cần còn tem, nhãn hoặc bao bì đi kèm nếu có. Các trường hợp lỗi sản xuất, giao nhầm mẫu, nhầm size hoặc phát sinh từ quá trình xử lý đơn sẽ được ưu tiên hỗ trợ.'
      },
      {
        heading: 'Cách liên hệ',
        body: 'Bạn có thể liên hệ hotline 0917 722 425 hoặc email support@ursport.vn để được hướng dẫn đổi trả nhanh chóng.'
      }
    ]
  }
};

export default function PolicyPage({ type }: { type?: keyof typeof POLICY_CONTENT }) {
  const { policySlug } = useParams();
  const fallbackPolicy = type
    ? POLICY_CONTENT[type]
    : {
        slug: policySlug || '',
        title: 'Trang chính sách',
        description: 'Thông tin chính sách hỗ trợ tại UR Sport.',
        sections: [] as { heading: string; body: string }[]
      };
  const [policy, setPolicy] = React.useState(fallbackPolicy);

  React.useEffect(() => {
    let isMounted = true;
    if (!db || !isFirebaseConfigured) return;
    getDoc(doc(db, 'settings', 'supportPolicies')).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      const savedPolicy = type
        ? data?.[type]
        : Object.values(data || {}).find((item: any) => item?.slug === policySlug) || data?.[policySlug || ''];
      if (isMounted && savedPolicy?.title) {
        setPolicy({
          ...fallbackPolicy,
          ...savedPolicy,
          sections: Array.isArray(savedPolicy.sections) && savedPolicy.sections.length > 0
            ? savedPolicy.sections
            : fallbackPolicy.sections
        });
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [type, policySlug]);

  useSEO({
    title: `${policy.title} | UR Sport`,
    description: policy.description,
    canonical: absoluteUrl(type === 'shipping'
      ? '/chinh-sach-giao-hang'
      : type === 'returns'
        ? '/chinh-sach-doi-tra'
        : `/chinh-sach/${policy.slug || policySlug || ''}`),
    robots: 'noindex, nofollow',
    type: 'website'
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-400">
        <Link to="/" className="transition-colors hover:text-zinc-900">Trang chủ</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-zinc-700">{policy.title}</span>
      </nav>

      <article className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#1e4b64]">Thông tin hỗ trợ</p>
        <h1 className="mb-4 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">{policy.title}</h1>
        <p className="mb-8 text-sm font-medium leading-7 text-zinc-500 sm:text-base">{policy.description}</p>

        <div className="space-y-6">
          {policy.sections.map(section => (
            <section key={section.heading}>
              <h2 className="mb-2 text-base font-black text-zinc-950">{section.heading}</h2>
              <p className="text-sm leading-7 text-zinc-600">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
