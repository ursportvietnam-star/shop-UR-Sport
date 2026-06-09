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
        body: 'Sản phẩm cần còn tem, nhãn hoặc bao bì đi kèm nếu có. Các trường hợp lỗi sản xuất, giao nhầm mẫu, nhầm size hoặc phát sinh từ quá trình xử lý đơn sẽ được ưu tiên hỗ trợ.'
      },
      {
        heading: 'Cách liên hệ',
        body: 'Bạn có thể liên hệ hotline 0917 722 425 hoặc email support@ursport.vn để được hướng dẫn đổi trả nhanh chóng.'
      }
    ]
  }
};

interface PolicyItem {
  slug: string;
  title: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  robots?: string;
  isHtmlOnly?: boolean;
  htmlContent?: string;
  sections: { heading: string; body: string }[];
}

export default function PolicyPage({ type }: { type?: keyof typeof POLICY_CONTENT }) {
  const { policySlug } = useParams();
  const fallbackPolicy: PolicyItem = React.useMemo(() => (
    type
      ? POLICY_CONTENT[type]
      : {
          slug: policySlug || '',
          title: 'Trang chính sách',
          description: 'Thông tin chính sách hỗ trợ tại UR Sport.',
          robots: 'noindex, nofollow',
          sections: [] as { heading: string; body: string }[]
        }
  ), [type, policySlug]);
  const [policy, setPolicy] = React.useState<PolicyItem>(fallbackPolicy);

  React.useEffect(() => {
    let isMounted = true;
    setPolicy(fallbackPolicy);

    if (!db || !isFirebaseConfigured) {
      return () => {
        isMounted = false;
      };
    }

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
  }, [type, policySlug, fallbackPolicy]);

  useSEO({
    title: policy.seoTitle || `${policy.title} | UR Sport`,
    description: policy.seoDescription || policy.description,
    canonical: absoluteUrl(type === 'shipping'
      ? '/chinh-sach-giao-hang'
      : type === 'returns'
        ? '/chinh-sach-doi-tra'
        : `/chinh-sach/${policy.slug || policySlug || ''}`),
    robots: policy.robots || 'noindex, nofollow',
    type: 'website'
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-2 border-b border-zinc-200 pb-4 text-sm font-medium text-zinc-400">
        <Link to="/" className="transition-colors hover:text-zinc-900">Trang chủ</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-zinc-700">{policy.title}</span>
      </nav>

      <article className="bg-white">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#1e4b64]">Thông tin hỗ trợ</p>
        <h1 className="mb-4 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">{policy.title}</h1>
        <p className="mb-10 max-w-4xl text-base font-medium leading-8 text-zinc-500 sm:text-lg">{policy.description}</p>

        {!policy.isHtmlOnly && policy.sections && (
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2 xl:grid-cols-3 mb-10">
            {policy.sections.map(section => (
              <section key={section.heading} className="border-t border-zinc-200 pt-5">
                <h2 className="mb-3 text-xl font-black tracking-tight text-zinc-950">{section.heading}</h2>
                <p className="text-sm font-medium leading-7 text-zinc-600 sm:text-base">{section.body}</p>
              </section>
            ))}
          </div>
        )}

        {policy.htmlContent && policy.htmlContent.trim() && (
          <div className="policy-custom-content border-t border-zinc-100 pt-8 mt-8">
            <div 
              dangerouslySetInnerHTML={{ __html: policy.htmlContent }} 
              className="prose max-w-none prose-slate"
            />
          </div>
        )}
      </article>
    </div>
  );
}
