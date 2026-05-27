import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  ClipboardList,
  Edit2,
  FileText,
  Link2,
  PackagePlus,
  RefreshCcw,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { BlogPost, Order, Product } from '../types';
import { buildContentMap, summarizeProductSeo } from '../lib/seoAutomation';
import { buildSeoBlogPrompt, getDailySeoSuggestions, SeoSuggestion } from '../lib/dailySeoSuggestions';
import { AIBlogData, AISeoActionPlan, AISeoContentDraft, generateBlogSEO } from '../lib/gemini';
import { addAdminDocument, adminTimestamp, getAdminDocument, mergeAdminDocument } from '../services/adminData';
import { analyzeGscRowsDetailed, normalizeGscRow, type SeoGscRow, type SeoOpportunity } from '../services/seoAnalyzer';
import { parseGscImport } from '../services/gscImporter';
import { createSeoActionPlan } from '../services/seoAI';
import { createSeoContentDraft, getSlugFromPageUrl } from '../services/contentOptimizer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DailySeoSuggestionPanel } from './DailySeoSuggestionPanel';

type AISeoReportPanelProps = {
  products: Product[];
  blogPosts: BlogPost[];
  orders: Order[];
  onCreateBlogDraft?: (draft: Partial<BlogPost>) => void;
  onUseBlogSuggestion?: (suggestion: SeoSuggestion) => void;
  onOpenProduct?: (product: Product) => void;
  onOpenBlogPost?: (post: BlogPost) => void;
  onOpenCategory?: (category: string) => void;
};

type ActionPriority = 'high' | 'medium' | 'low';

type ReportAction = {
  id: string;
  priority: ActionPriority;
  title: string;
  detail: string;
  fixes: string[];
  reason: string;
  impact: string;
  source: string;
  kind: 'blog-draft' | 'blog-refresh' | 'product' | 'category' | 'cluster' | 'gsc';
  targetUrl?: string;
  targetProductId?: string;
  targetCategory?: string;
  draft?: Partial<BlogPost>;
  blogSuggestion?: SeoSuggestion;
};

type SeoDraftRecord = {
  id: string;
  opportunityId: string;
  slug: string;
  page: string;
  query: string;
  oldTitle: string;
  oldDescription: string;
  oldHeading: string;
  oldContent: string;
  draft: AISeoContentDraft;
  status: 'pending' | 'applied' | 'rejected';
};

type ContentMapTarget =
  | { type: 'blog'; clusterLabel: string; item: BlogPost; suggestions: string[] }
  | { type: 'product'; clusterLabel: string; item: Product; suggestions: string[] };

type ContentMapEditState = {
  title: string;
  seoTitle: string;
  metaDescription: string;
  description: string;
  saving: boolean;
  saved: boolean;
};

const priorityTone: Record<ActionPriority, string> = {
  high: 'border-red-500/20 bg-red-500/10 text-red-200',
  medium: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
  low: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
};

const priorityLabel: Record<ActionPriority, string> = {
  high: 'Ưu tiên cao',
  medium: 'Ưu tiên vừa',
  low: 'Theo dõi',
};

const opportunityTypeLabel: Record<SeoOpportunity['type'], string> = {
  quick_win: 'Quick win',
  low_ctr: 'CTR low',
  content_gap: 'Content gap',
  losing_keyword: 'Losing keyword',
  cannibalization: 'Cannibalization',
  money_keyword: 'Money keyword',
  monitor: 'Monitor',
};

const opportunityPriorityTone: Record<SeoOpportunity['priority'], string> = {
  critical: 'bg-red-600/15 text-red-100 border-red-400/30',
  high: 'bg-red-500/10 text-red-200 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
  low: 'bg-sky-500/10 text-sky-200 border-sky-500/20',
};

const normalizeText = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const cleanText = (value: unknown) =>
  String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const wordCount = (value: unknown) => cleanText(value).split(/\s+/).filter(Boolean).length;

const clampText = (value: string, max: number) => value.trim().slice(0, max);

const buildBlogMapSuggestions = (post: BlogPost, clusterLabel: string) => {
  const suggestions: string[] = [];
  const bodyWords = wordCount(post.content || post.excerpt);
  const clusterTerm = normalizeText(clusterLabel);
  const haystack = normalizeText(`${post.title} ${post.seoTitle} ${post.metaDescription} ${post.content}`);

  if (!post.seoTitle || post.seoTitle.length < 35 || post.seoTitle.length > 65) {
    suggestions.push(`SEO title cần 35-65 ký tự và chứa "${clusterLabel}" tự nhiên.`);
  }
  if (!post.metaDescription || post.metaDescription.length < 110 || post.metaDescription.length > 170) {
    suggestions.push('Meta description cần 110-170 ký tự, có lợi ích rõ và CTA xem sản phẩm.');
  }
  if (!haystack.includes(clusterTerm)) {
    suggestions.push(`Bài viết chưa phủ rõ cụm "${clusterLabel}" trong title/meta/nội dung.`);
  }
  if (bodyWords < 900) {
    suggestions.push('Nội dung còn ngắn; nên mở rộng lên 900-1,200 từ với H2, FAQ và bảng so sánh.');
  }
  if (!/href=["']\//i.test(post.content || '')) {
    suggestions.push('Thiếu internal link tới category hoặc sản phẩm trong cùng cụm.');
  }

  return suggestions.length ? suggestions : ['Bài viết đã ổn. Có thể bổ sung FAQ, ảnh WebP và link sang sản phẩm trọng tâm.'];
};

const buildProductMapSuggestions = (issues: string[]) =>
  issues.length ? issues : ['Sản phẩm đã ổn. Có thể kiểm tra thêm alt ảnh, schema Product và link từ blog hỗ trợ.'];

const buildMapEditState = (target: ContentMapTarget): ContentMapEditState => {
  if (target.type === 'blog') {
    return {
      title: target.item.title || '',
      seoTitle: target.item.seoTitle || target.item.title || '',
      metaDescription: target.item.metaDescription || target.item.excerpt || '',
      description: target.item.excerpt || cleanText(target.item.content).slice(0, 300),
      saving: false,
      saved: false,
    };
  }

  return {
    title: target.item.name || '',
    seoTitle: target.item.seoTitle || target.item.name || '',
    metaDescription: target.item.metaDescription || '',
    description: cleanText(target.item.description).slice(0, 300),
    saving: false,
    saved: false,
  };
};

const buildMapAiDraft = (target: ContentMapTarget) => {
  if (target.type === 'blog') {
    const keyword = target.clusterLabel.toLowerCase();
    return {
      title: clampText(`${target.clusterLabel}: hướng dẫn chọn đúng và phối đồ đẹp cho nam`, 65),
      seoTitle: clampText(`${target.clusterLabel} đẹp, dễ mặc - Hướng dẫn chọn chuẩn URSport`, 65),
      metaDescription: clampText(`Tìm hiểu cách chọn ${keyword} theo chất liệu, form dáng và nhu cầu sử dụng. Gợi ý phối đồ, chọn size và sản phẩm phù hợp tại URSport.`, 170),
      description: clampText(`Bài viết giúp bạn chọn ${keyword} đúng nhu cầu: chất liệu, form dáng, cách phối đồ, bảng so sánh và FAQ để mua tự tin hơn.`, 300),
    };
  }

  const name = target.item.name || target.clusterLabel;
  return {
    title: clampText(name, 65),
    seoTitle: clampText(`${name} - ${target.clusterLabel} chuẩn form | URSport`, 65),
    metaDescription: clampText(`${name} chất liệu thoáng mát, form dễ mặc, phù hợp tập luyện và mặc hằng ngày. Xem màu, size và ưu đãi tại URSport.`, 170),
    description: clampText(`${name} được thiết kế cho nam giới cần sự thoải mái, gọn dáng và dễ phối đồ. Chất liệu mềm thoáng, hỗ trợ vận động, giữ form tốt sau nhiều lần giặt.`, 300),
  };
};

function FieldLabel({ label, count, max }: { label: string; count: number; max: number }) {
  const isTooLong = count > max;
  return (
    <div className="mb-1 flex items-center gap-2">
      <label className="text-xs font-black text-white/55">{label}</label>
      <span className={cn(
        "rounded px-2 py-0.5 text-[10px] font-black",
        isTooLong ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
      )}>
        {count}/{max} ký tự
      </span>
    </div>
  );
}

function SuggestionBox({ value, onApply }: { value: string; onApply: () => void }) {
  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-black/15 p-3">
      <p className="mb-1 flex items-center gap-1 text-xs font-black text-violet-300">
        <Sparkles className="h-3.5 w-3.5" />
        Gợi ý AI:
      </p>
      <p className="text-sm font-bold italic text-white">{value}</p>
      <button
        type="button"
        onClick={onApply}
        className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/10"
      >
        Dùng gợi ý này
      </button>
    </div>
  );
}

const toTime = (value: unknown) => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
  if (typeof value === 'object') {
    const maybeTimestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof maybeTimestamp.seconds === 'number') return maybeTimestamp.seconds * 1000;
    if (typeof maybeTimestamp.toDate === 'function') return maybeTimestamp.toDate().getTime();
  }
  return 0;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

const getOrderTotal = (order: Order) => order.finalTotal ?? order.total ?? 0;

const aiBlogToDraft = (data: AIBlogData): Partial<BlogPost> => ({
  id: data.slug,
  title: data.title,
  slug: data.slug,
  content: data.contentHtml,
  excerpt: data.metaDescription,
  seoTitle: data.metaTitle,
  metaDescription: data.metaDescription,
  customSchema: data.faqSchema,
  category: data.keywordCluster?.[0] || 'SEO',
  author: 'UR Sport',
  date: new Date().toLocaleDateString('vi-VN'),
  image: '',
});

export function AISeoReportPanel({
  products,
  blogPosts,
  orders,
  onCreateBlogDraft,
  onUseBlogSuggestion,
  onOpenProduct,
  onOpenBlogPost,
  onOpenCategory,
}: AISeoReportPanelProps) {
  const [gscRows, setGscRows] = React.useState<SeoGscRow[]>([]);
  const [storedSeoOpportunities, setStoredSeoOpportunities] = React.useState<SeoOpportunity[]>([]);
  const [seoActionPlans, setSeoActionPlans] = React.useState<Record<string, AISeoActionPlan>>({});
  const [seoDrafts, setSeoDrafts] = React.useState<Record<string, SeoDraftRecord>>({});
  const [generatingSeoActionId, setGeneratingSeoActionId] = React.useState<string | null>(null);
  const [generatingSeoDraftId, setGeneratingSeoDraftId] = React.useState<string | null>(null);
  const [applyingSeoDraftId, setApplyingSeoDraftId] = React.useState<string | null>(null);
  const [gscImportText, setGscImportText] = React.useState('');
  const [isSavingReport, setIsSavingReport] = React.useState(false);
  const [generatingActionId, setGeneratingActionId] = React.useState<string | null>(null);
  const [activeMapClusterId, setActiveMapClusterId] = React.useState<string | null>(null);
  const [selectedMapTarget, setSelectedMapTarget] = React.useState<ContentMapTarget | null>(null);
  const [mapEditState, setMapEditState] = React.useState<ContentMapEditState | null>(null);
  const reportDate = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  React.useEffect(() => {
    getAdminDocument<{ rows?: SeoGscRow[]; opportunities?: SeoOpportunity[] }>('seoGscData', 'latest')
      .then(data => {
        setGscRows((data?.rows || []).map(normalizeGscRow).filter(Boolean) as SeoGscRow[]);
        setStoredSeoOpportunities(data?.opportunities || []);
      })
      .catch(() => {
        setGscRows([]);
        setStoredSeoOpportunities([]);
      });
  }, []);

  const deliveredOrders = React.useMemo(
    () => orders.filter(order => order.status !== 'cancelled'),
    [orders]
  );

  const revenue = React.useMemo(
    () => deliveredOrders.reduce((sum, order) => sum + getOrderTotal(order), 0),
    [deliveredOrders]
  );

  const categorySales = React.useMemo(() => {
    const stats = new Map<string, { category: string; orders: number; quantity: number; revenue: number }>();
    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        const key = String(item.category || 'Chưa phân loại');
        const current = stats.get(key) || { category: key, orders: 0, quantity: 0, revenue: 0 };
        current.orders += 1;
        current.quantity += item.quantity || 1;
        current.revenue += (item.discountPrice || item.price || 0) * (item.quantity || 1);
        stats.set(key, current);
      });
    });
    return [...stats.values()].sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
  }, [deliveredOrders]);

  const productSummary = React.useMemo(() => summarizeProductSeo(products), [products]);
  const clusters = React.useMemo(() => buildContentMap(products, blogPosts), [products, blogPosts]);
  const dailyBlogSuggestions = React.useMemo(() => getDailySeoSuggestions(blogPosts, 3), [blogPosts]);
  const liveSeoAnalysis = React.useMemo(() => analyzeGscRowsDetailed(gscRows), [gscRows]);
  const seoOpportunities = storedSeoOpportunities.length > 0 ? storedSeoOpportunities : liveSeoAnalysis.opportunities;
  const gscOpportunities = React.useMemo(() => {
    const lowCtr = gscRows
      .filter(row => row.impressions >= 100 && row.ctr > 0 && row.ctr < 0.025)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 2);
    const nearTop = gscRows
      .filter(row => row.impressions >= 50 && row.position >= 8 && row.position <= 20)
      .sort((a, b) => a.position - b.position || b.impressions - a.impressions)
      .slice(0, 2);
    return { lowCtr, nearTop };
  }, [gscRows]);

  const opportunityStats = React.useMemo(() => ({
    quickWin: seoOpportunities.filter(item => item.type === 'quick_win').length,
    lowCtr: seoOpportunities.filter(item => item.type === 'low_ctr').length,
    contentGap: seoOpportunities.filter(item => item.type === 'content_gap').length,
    losingKeyword: seoOpportunities.filter(item => item.type === 'losing_keyword').length,
    cannibalization: seoOpportunities.filter(item => item.type === 'cannibalization').length,
    moneyKeyword: seoOpportunities.filter(item => item.type === 'money_keyword').length,
  }), [seoOpportunities]);

  const blogRefreshCandidates = React.useMemo(() => {
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return blogPosts
      .map(post => {
        const contentLength = cleanText(post.content || post.excerpt).length;
        const publishedTime = toTime(post.createdAt || post.date);
        const ageDays = publishedTime ? Math.round((now - publishedTime) / (24 * 60 * 60 * 1000)) : 999;
        const score =
          (!post.seoTitle ? 28 : 0) +
          (!post.metaDescription ? 28 : 0) +
          (contentLength < 1200 ? 22 : 0) +
          (ageDays > 90 ? 18 : 0) +
          (!/faq|câu hỏi|hoi/i.test(`${post.content} ${post.excerpt}`) ? 12 : 0);

        return { post, contentLength, ageDays, score };
      })
      .filter(item => item.score > 0 || item.ageDays > 90)
      .sort((a, b) => b.score - a.score || b.ageDays - a.ageDays)
      .slice(0, 4);
  }, [blogPosts]);

  const keywordOpportunities = React.useMemo(() => {
    const productTerms = products
      .flatMap(product => [
        product.category,
        product.material,
        product.style,
        product.fashionStyle,
        ...(product.keywords || '').split(','),
      ])
      .map(term => String(term || '').trim())
      .filter(Boolean);

    const counts = new Map<string, number>();
    productTerms.forEach(term => {
      const key = normalizeText(term);
      if (!key || key.length < 4) return;
      counts.set(term, (counts.get(term) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([term, count]) => ({ term, count }));
  }, [products]);

  const actions = React.useMemo<ReportAction[]>(() => {
    const list: ReportAction[] = [];
    const topCategory = categorySales[0];
    const weakCluster = clusters.find(cluster => cluster.issues.length > 0);
    const weakProduct = productSummary.critical[0] || productSummary.warning[0];
    const refreshCandidate = blogRefreshCandidates[0];
    const blogSuggestion = dailyBlogSuggestions[0];
    const lowCtrRow = gscOpportunities.lowCtr[0];
    const nearTopRow = gscOpportunities.nearTop[0];

    if (lowCtrRow) {
      list.push({
        id: `gsc-ctr-${lowCtrRow.page}-${lowCtrRow.query}`,
        priority: 'high',
        title: `Tăng CTR cho: ${lowCtrRow.query || lowCtrRow.page}`,
        detail: `${lowCtrRow.impressions} impressions nhưng CTR chỉ ${(lowCtrRow.ctr * 100).toFixed(1)}%.`,
        fixes: [
          'Viết lại SEO title rõ lợi ích hơn, đặt keyword/query ở nửa đầu.',
          'Meta description cần có lý do click cụ thể, tránh mô tả chung chung.',
          'So khớp intent của query với đoạn mở bài và H2 đầu tiên.',
          'Kiểm tra canonical và schema Article/Product đúng URL.',
        ],
        reason: `GSC: ${lowCtrRow.clicks} clicks / ${lowCtrRow.impressions} impressions, vị trí trung bình ${lowCtrRow.position.toFixed(1)}.`,
        impact: 'Tăng click tự nhiên mà không cần tạo thêm URL mới.',
        source: 'Google Search Console',
        kind: 'gsc',
        targetUrl: lowCtrRow.page,
      });
    }

    if (nearTopRow) {
      list.push({
        id: `gsc-near-top-${nearTopRow.page}-${nearTopRow.query}`,
        priority: 'high',
        title: `Đẩy keyword gần top: ${nearTopRow.query || nearTopRow.page}`,
        detail: `Keyword đang ở vị trí ${nearTopRow.position.toFixed(1)}, đủ gần để tối ưu lên top 5-10.`,
        fixes: [
          'Thêm đoạn trả lời trực tiếp query trong 100-150 chữ đầu.',
          'Bổ sung 1 bảng/checklist/FAQ liên quan trực tiếp keyword.',
          'Gắn 3 internal links từ bài/category cùng cụm về URL này.',
          'Cập nhật ngày sửa bài và kiểm tra ảnh/alt text liên quan.',
        ],
        reason: `GSC: ${nearTopRow.impressions} impressions, CTR ${(nearTopRow.ctr * 100).toFixed(1)}%, position ${nearTopRow.position.toFixed(1)}.`,
        impact: 'Tận dụng URL đã có tín hiệu để leo hạng nhanh hơn viết bài mới.',
        source: 'Google Search Console',
        kind: 'gsc',
        targetUrl: nearTopRow.page,
      });
    }

    if (refreshCandidate) {
      list.push({
        id: `refresh-${refreshCandidate.post.slug || refreshCandidate.post.id}`,
        priority: 'high',
        title: `Update bài: ${refreshCandidate.post.title}`,
        detail: `Rà lại title/meta, bổ sung FAQ, CTA và link sang category liên quan.`,
        fixes: [
          'Viết lại SEO title 45-65 ký tự, có keyword chính ở nửa đầu.',
          'Viết meta description 120-165 ký tự, có lợi ích rõ và lời mời click.',
          'Bổ sung 1 đoạn trả lời nhanh intent ngay sau mở bài.',
          'Thêm FAQ 3-5 câu và CTA dẫn về category/sản phẩm liên quan.',
          'Chèn 3-5 internal links tự nhiên sang bài/cụm/category cùng intent.',
        ],
        reason: `Điểm cần làm mới ${refreshCandidate.score}; nội dung khoảng ${refreshCandidate.contentLength} ký tự.`,
        impact: 'Tăng CTR và giữ hạng cho bài cũ hoặc bài mỏng.',
        source: 'Blog + content quality',
        kind: 'blog-refresh',
        targetUrl: `/blog/${refreshCandidate.post.slug || refreshCandidate.post.id}`,
        draft: refreshCandidate.post,
      });
    }

    if (topCategory) {
      const categoryProducts = products.filter(product => normalizeText(product.category) === normalizeText(topCategory.category));
      if (categoryProducts.length < 10) {
        list.push({
          id: `category-${topCategory.category}`,
          priority: 'high',
          title: `Thêm sản phẩm cho ${topCategory.category}`,
          detail: `Category này đang có ${topCategory.quantity} sản phẩm đã bán nhưng chỉ có ${categoryProducts.length} SKU trong catalog.`,
          fixes: [
            'Thêm 2-3 SKU mới bám đúng nhu cầu đang có đơn hàng.',
            'Mỗi sản phẩm cần đủ ảnh chính, ảnh chi tiết, size, màu, chất liệu và tồn kho.',
            'Tối ưu SEO title/meta riêng cho từng sản phẩm, tránh trùng category.',
            'Thêm link từ category và 2 bài blog liên quan sang sản phẩm mới.',
          ],
          reason: `Doanh thu ghi nhận ${formatCurrency(topCategory.revenue)} từ đơn hàng hiện có.`,
          impact: 'Tăng khả năng chuyển đổi khi traffic SEO vào category có nhu cầu mua thật.',
          source: 'Orders + products',
          kind: 'category',
          targetCategory: topCategory.category,
        });
      }
    }

    if (weakProduct) {
      list.push({
        id: `product-${weakProduct.product.id}`,
        priority: weakProduct.audit.status === 'critical' ? 'high' : 'medium',
        title: `Tối ưu sản phẩm: ${weakProduct.product.name}`,
        detail: weakProduct.audit.quickWins.map(issue => issue.label).join(', '),
        fixes: weakProduct.audit.quickWins.map(issue => issue.detail).concat([
          'Kiểm tra lại Product schema sau khi sửa title, meta, ảnh và tồn kho.',
        ]),
        reason: `SEO score sản phẩm hiện là ${weakProduct.audit.score}/100.`,
        impact: 'Cải thiện landing product và tín hiệu Product schema.',
        source: 'Product SEO audit',
        kind: 'product',
        targetProductId: weakProduct.product.id,
      });
    }

    if (weakCluster) {
      list.push({
        id: `cluster-${weakCluster.id}`,
        priority: weakCluster.score < 65 ? 'high' : 'medium',
        title: `Gia cố cụm nội dung ${weakCluster.label}`,
        detail: weakCluster.issues[0]?.detail || 'Bổ sung blog hỗ trợ và internal links.',
        fixes: [
          'Chọn 1 trang pillar/category làm URL chính cho cụm này.',
          'Thêm hoặc update 1-3 bài blog hỗ trợ theo TOFU/MOFU/BOFU.',
          'Liên kết 2 chiều giữa blog hỗ trợ, category và sản phẩm chủ lực.',
          'Kiểm tra sản phẩm yếu trong cụm và sửa title/meta/mô tả trước.',
        ],
        reason: `Cluster score ${weakCluster.score}/100; ${weakCluster.products.length} sản phẩm, ${weakCluster.blogs.length} blog.`,
        impact: 'Tăng topical authority và giảm orphan content.',
        source: 'Content map',
        kind: 'cluster',
        targetCategory: weakCluster.label,
      });
    }

    if (blogSuggestion) {
      list.push({
        id: `blog-${blogSuggestion.slug}`,
        priority: blogSuggestion.priority === 'HIGH' ? 'high' : 'medium',
        title: `Viết bài mới: ${blogSuggestion.title}`,
        detail: `Keyword chính: ${blogSuggestion.keyword}. Link nội bộ: ${blogSuggestion.internalLinks.slice(0, 3).join(', ')}`,
        fixes: [
          `Giữ slug chuẩn: /blog/${blogSuggestion.slug}.`,
          `Dùng SEO title đề xuất: ${blogSuggestion.seoTitle}.`,
          `Dùng meta description đề xuất: ${blogSuggestion.seoDescription}.`,
          `Chèn keyword chính tự nhiên: ${blogSuggestion.keyword}.`,
          `Gắn internal links: ${blogSuggestion.internalLinks.slice(0, 5).join(', ')}.`,
          'Cuối bài phải có FAQ và CTA về category/sản phẩm phù hợp.',
        ],
        reason: blogSuggestion.reason,
        impact: 'Mở rộng coverage cho keyword cluster chưa có bài published.',
        source: 'SEO daily plan',
        kind: 'blog-draft',
        targetUrl: `/blog/${blogSuggestion.slug}`,
        draft: {
          id: blogSuggestion.slug,
          slug: blogSuggestion.slug,
          title: blogSuggestion.title,
          category: blogSuggestion.cluster,
          author: 'UR Sport',
          date: new Date().toLocaleDateString('vi-VN'),
          image: '',
          excerpt: blogSuggestion.seoDescription,
          content: '',
          seoTitle: blogSuggestion.seoTitle,
          metaDescription: blogSuggestion.seoDescription,
        },
        blogSuggestion,
      });
    }

    return list.slice(0, 6);
  }, [blogRefreshCandidates, categorySales, clusters, dailyBlogSuggestions, gscOpportunities, productSummary, products]);

  const connectedSources = [
    { label: 'Google Search Console', status: gscRows.length > 0 ? 'Đang dùng' : 'Chờ kết nối', value: gscRows.length > 0 ? `${gscRows.length} dòng query/page` : 'Clicks, impressions, CTR, vị trí' },
    { label: 'GA4', status: 'Chờ kết nối', value: 'Organic sessions, engagement, conversions' },
    { label: 'Đơn hàng', status: orders.length > 0 ? 'Đang dùng' : 'Chưa có dữ liệu', value: `${orders.length} đơn hàng` },
    { label: 'Catalog + Blog', status: 'Đang dùng', value: `${products.length} sản phẩm, ${blogPosts.length} blog` },
  ];

  const handleImportGsc = async () => {
    try {
      const { rows, previousRows, analysis } = parseGscImport(gscImportText, gscRows);
      if (rows.length === 0) {
        toast.error('Không tìm thấy dòng GSC hợp lệ.');
        return;
      }
      const opportunities = analysis.opportunities;
      const importRef = await addAdminDocument('seoGscImports', {
        sourceName: 'manual-json',
        dateRange: reportDate,
        totalRows: rows.length,
        opportunitiesCount: opportunities.length,
        summary: analysis.summary,
        createdAt: adminTimestamp(),
      });
      await mergeAdminDocument('seoGscData', 'latest', {
        importId: importRef.id,
        sourceName: 'manual-json',
        dateRange: reportDate,
        rows,
        previousRows,
        opportunities,
        summary: analysis.summary,
        totalRows: rows.length,
        updatedAt: adminTimestamp(),
      });
      await mergeAdminDocument('seoOpportunities', 'latest', {
        importId: importRef.id,
        items: opportunities,
        summary: analysis.summary,
        updatedAt: adminTimestamp(),
      });
      setGscRows(rows);
      setStoredSeoOpportunities(opportunities);
      setGscImportText('');
      toast.success(`Đã lưu ${rows.length} dòng GSC.`);
    } catch (error: any) {
      toast.error('JSON GSC chưa hợp lệ.');
    }
  };

  const checklistText = (action: ReportAction) => [
    action.title,
    '',
    'Cần chỉnh sửa:',
    ...action.fixes.map(item => `- ${item}`),
    '',
    `Vì sao: ${action.reason}`,
    `Tác động kỳ vọng: ${action.impact}`,
  ].join('\n');

  const handleCopyChecklist = async (action: ReportAction) => {
    await navigator.clipboard.writeText(checklistText(action));
    toast.success('Đã copy checklist chỉnh sửa.');
  };

  const handleGenerateSeoAction = async (opportunity: SeoOpportunity) => {
    setGeneratingSeoActionId(opportunity.id);
    try {
      const plan = await createSeoActionPlan(opportunity, products, blogPosts);
      await mergeAdminDocument('seoAiActions', opportunity.id, {
        opportunityId: opportunity.id,
        opportunity,
        plan,
        updatedAt: adminTimestamp(),
      });
      setSeoActionPlans(prev => ({ ...prev, [opportunity.id]: plan }));
      toast.success('AI da tao action plan SEO.');
    } catch (error: any) {
      toast.error(error.message || 'Chua tao duoc AI action plan.');
    } finally {
      setGeneratingSeoActionId(null);
    }
  };

  const handleCopySeoAction = async (plan: AISeoActionPlan) => {
    await navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
    toast.success('Da copy AI action JSON.');
  };

  const handleGenerateSeoDraft = async (opportunity: SeoOpportunity) => {
    setGeneratingSeoDraftId(opportunity.id);
    try {
      const slug = getSlugFromPageUrl(opportunity.page);
      const current = await getAdminDocument<{
        heading?: string;
        seoTitle?: string;
        seoDescription?: string;
        content?: string;
      }>('categorySeo', slug);
      const plan = seoActionPlans[opportunity.id];
      const draft = await createSeoContentDraft(opportunity, plan, {
        slug,
        ...current,
      });

      if (!draft.contentHtml.trim()) {
        throw new Error('AI chua tao contentHtml cho draft.');
      }

      const draftRef = await addAdminDocument('seoDrafts', {
        opportunityId: opportunity.id,
        slug,
        page: opportunity.page,
        query: opportunity.query,
        oldTitle: current?.seoTitle || '',
        oldDescription: current?.seoDescription || '',
        oldHeading: current?.heading || '',
        oldContent: current?.content || '',
        draft,
        status: 'pending',
        createdAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
      });

      setSeoDrafts(prev => ({
        ...prev,
        [opportunity.id]: {
          id: draftRef.id,
          opportunityId: opportunity.id,
          slug,
          page: opportunity.page,
          query: opportunity.query,
          oldTitle: current?.seoTitle || '',
          oldDescription: current?.seoDescription || '',
          oldHeading: current?.heading || '',
          oldContent: current?.content || '',
          draft,
          status: 'pending',
        },
      }));
      toast.success('AI da tao draft toi uu. Hay review truoc khi Apply.');
    } catch (error: any) {
      toast.error(error.message || 'Chua tao duoc SEO draft.');
    } finally {
      setGeneratingSeoDraftId(null);
    }
  };

  const handleApplySeoDraft = async (record: SeoDraftRecord) => {
    setApplyingSeoDraftId(record.id);
    try {
      await mergeAdminDocument('categorySeo', record.slug, {
        heading: record.draft.heading || record.oldHeading,
        seoTitle: record.draft.seoTitle || record.oldTitle,
        seoDescription: record.draft.seoDescription || record.oldDescription,
        content: record.draft.contentHtml,
        updatedAt: adminTimestamp(),
      });
      await mergeAdminDocument('seoDrafts', record.id, {
        status: 'applied',
        appliedAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
      });
      setSeoDrafts(prev => ({
        ...prev,
        [record.opportunityId]: { ...record, status: 'applied' },
      }));
      toast.success('Da apply SEO draft vao categorySeo.');
    } catch (error: any) {
      toast.error(error.message || 'Chua apply duoc SEO draft.');
    } finally {
      setApplyingSeoDraftId(null);
    }
  };

  const selectContentMapTarget = (target: ContentMapTarget) => {
    setSelectedMapTarget(target);
    setMapEditState(buildMapEditState(target));
  };

  const updateMapEdit = (patch: Partial<ContentMapEditState>) => {
    setMapEditState(prev => prev ? { ...prev, ...patch, saved: false } : prev);
  };

  const applyMapAiDraft = (field?: keyof ReturnType<typeof buildMapAiDraft>) => {
    if (!selectedMapTarget) return;
    const draft = buildMapAiDraft(selectedMapTarget);
    if (field) {
      updateMapEdit({ [field]: draft[field] } as Partial<ContentMapEditState>);
      return;
    }
    updateMapEdit({
      title: draft.title,
      seoTitle: draft.seoTitle,
      metaDescription: draft.metaDescription,
      description: draft.description,
    });
  };

  const saveContentMapInline = async () => {
    if (!selectedMapTarget || !mapEditState) return;
    updateMapEdit({ saving: true });
    try {
      if (selectedMapTarget.type === 'blog') {
        await mergeAdminDocument('blogPosts', selectedMapTarget.item.id, {
          title: mapEditState.title,
          seoTitle: mapEditState.seoTitle,
          metaDescription: mapEditState.metaDescription,
          excerpt: mapEditState.description,
          updatedAt: adminTimestamp(),
        });
        toast.success('Đã lưu SEO bài viết từ Content Map.');
      } else {
        await mergeAdminDocument('products', selectedMapTarget.item.id, {
          seoTitle: mapEditState.seoTitle,
          metaDescription: mapEditState.metaDescription,
          description: mapEditState.description,
          specifications: mapEditState.description,
          updatedAt: adminTimestamp(),
        });
        toast.success('Đã lưu SEO sản phẩm từ Content Map.');
      }
      setMapEditState(prev => prev ? { ...prev, saving: false, saved: true } : prev);
    } catch (error: any) {
      setMapEditState(prev => prev ? { ...prev, saving: false } : prev);
      toast.error(error?.message || 'Không thể lưu chỉnh sửa SEO.');
    }
  };

  const createBlogDraftFromSuggestion = async (suggestion: SeoSuggestion, actionId = `blog-${suggestion.slug}`) => {
    setGeneratingActionId(actionId);
    try {
      const prompt = buildSeoBlogPrompt(suggestion);
      const data = await generateBlogSEO(prompt);
      if (!data?.contentHtml?.trim()) {
        throw new Error('AI chưa trả nội dung bài viết. Bấm "Dùng gợi ý" để mở brief .md trong AI Blog Creator rồi tạo lại.');
      }
      onCreateBlogDraft?.(aiBlogToDraft(data));
      toast.success('Đã tạo draft blog bằng AI từ dữ liệu .md.');
    } catch (error: any) {
      toast.error(error.message || 'Chưa tạo được draft blog bằng AI.');
    } finally {
      setGeneratingActionId(null);
    }
  };

  const handleAction = async (action: ReportAction) => {
    if (action.kind === 'blog-draft' && action.blogSuggestion) {
      await createBlogDraftFromSuggestion(action.blogSuggestion, action.id);
      return;
    }
    if ((action.kind === 'blog-draft' || action.kind === 'blog-refresh') && action.draft) {
      onCreateBlogDraft?.(action.draft);
      return;
    }
    if (action.kind === 'product' && action.targetProductId) {
      const product = products.find(item => item.id === action.targetProductId);
      if (product) onOpenProduct?.(product);
      return;
    }
    if ((action.kind === 'category' || action.kind === 'cluster') && action.targetCategory) {
      onOpenCategory?.(action.targetCategory);
      return;
    }
    if (action.targetUrl) {
      window.open(action.targetUrl, '_blank');
    }
  };

  const primaryActionLabel = (action: ReportAction) => {
    if (action.kind === 'blog-draft') return 'Tạo bằng AI';
    if (action.kind === 'blog-refresh') return 'Mở bài cần sửa';
    if (action.kind === 'product') return 'Mở sản phẩm';
    if (action.kind === 'category' || action.kind === 'cluster') return 'Mở category';
    return 'Mở URL';
  };

  const handleSaveDailyReport = async () => {
    setIsSavingReport(true);
    try {
      await mergeAdminDocument('seoReports', reportDate, {
        id: reportDate,
        title: `AI SEO Report ${reportDate}`,
        reportDate,
        updatedAt: adminTimestamp(),
        stats: {
          gscRows: gscRows.length,
          products: products.length,
          blogPosts: blogPosts.length,
          orders: orders.length,
          revenue,
          seoOpportunities: seoOpportunities.length,
          opportunityStats,
        },
        gscOpportunities: seoOpportunities.slice(0, 20),
        actions: actions.map(action => ({
          id: action.id,
          priority: action.priority,
          title: action.title,
          detail: action.detail,
          fixes: action.fixes,
          reason: action.reason,
          impact: action.impact,
          source: action.source,
          kind: action.kind,
          targetUrl: action.targetUrl || null,
          targetProductId: action.targetProductId || null,
          targetCategory: action.targetCategory || null,
        })),
      });
      toast.success(`Đã lưu báo cáo SEO ngày ${reportDate}.`);
    } catch (error) {
      toast.error('Chưa lưu được báo cáo SEO.');
    } finally {
      setIsSavingReport(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">AI SEO Report</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/30">Daily action plan from SEO, catalog, orders</p>
              </div>
            </div>
            <p className="max-w-3xl text-sm font-medium leading-6 text-white/45">
              Báo cáo này gom dữ liệu blog, sản phẩm, đơn hàng và content map để đề xuất việc cần làm mỗi ngày. GSC và GA4 đang được chừa sẵn cổng kết nối để đưa clicks, impressions, CTR và organic conversion vào cùng luồng.
            </p>
            <button
              type="button"
              onClick={handleSaveDailyReport}
              disabled={isSavingReport}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingReport ? (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Lưu report hôm nay
            </button>
          </div>

          <div className="grid min-w-[280px] gap-2 sm:grid-cols-2">
            {connectedSources.map(source => (
              <div key={source.label} className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/35">{source.label}</p>
                  <span className={cn(
                    'rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest',
                    source.status === 'Đang dùng' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-white/35'
                  )}>
                    {source.status}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium leading-5 text-white/45">{source.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            { label: 'Doanh thu đơn', value: formatCurrency(revenue), icon: ShoppingBag },
            { label: 'Blog cần update', value: blogRefreshCandidates.length, icon: RefreshCcw },
            { label: 'Sản phẩm yếu SEO', value: productSummary.critical.length + productSummary.warning.length, icon: AlertTriangle },
            { label: 'Cluster cần xử lý', value: clusters.filter(cluster => cluster.issues.length > 0).length, icon: Link2 },
            { label: 'Bài mới đề xuất', value: dailyBlogSuggestions.length, icon: FileText },
            { label: 'GSC opportunities', value: seoOpportunities.length, icon: Target },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <stat.icon className="mb-3 h-4 w-4 text-white/35" />
              <p className="text-xl font-black text-white">{stat.value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/30">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Kết Nối GSC</h3>
            <p className="mt-1 text-xs font-medium leading-5 text-white/40">
              Paste JSON từ Search Console API/export với field: page, query, clicks, impressions, ctr, position.
            </p>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            {gscRows.length} dòng đã lưu
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <textarea
            value={gscImportText}
            onChange={event => setGscImportText(event.target.value)}
            placeholder='[{"page":"https://www.ursport.vn/ao-thun-nam","query":"áo thun nam","clicks":20,"impressions":1200,"ctr":0.016,"position":8.4}]'
            className="min-h-24 rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs leading-5 text-white outline-none transition placeholder:text-white/20 focus:border-emerald-400/40"
          />
          <button
            type="button"
            onClick={handleImportGsc}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs font-black text-emerald-200 transition hover:bg-emerald-400/20 lg:w-44"
          >
            <Save className="h-3.5 w-3.5" />
            Lưu GSC
          </button>
        </div>
      </div>

      {gscRows.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">SEO Opportunities</h3>
              <p className="mt-1 text-xs font-medium leading-5 text-white/40">
                Rule engine tu GSC: quick win, CTR thap, content gap va cannibalization.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                { label: 'Quick win', value: opportunityStats.quickWin },
                { label: 'CTR low', value: opportunityStats.lowCtr },
                { label: 'Gap', value: opportunityStats.contentGap },
                { label: 'Losing', value: opportunityStats.losingKeyword },
                { label: 'Conflict', value: opportunityStats.cannibalization },
                { label: 'Money', value: opportunityStats.moneyKeyword },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2 text-right">
                  <p className="text-sm font-black text-white">{item.value}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {seoOpportunities.slice(0, 3).map(item => (
              <div key={`top-${item.id}`} className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={cn('rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest', opportunityPriorityTone[item.priority])}>
                    {item.priority}
                  </span>
                  <span className="text-sm font-black text-emerald-300">{item.impactScore}</span>
                </div>
                <p className="line-clamp-2 text-sm font-black leading-5 text-white">{item.query}</p>
                <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-white/45">{item.aiAction}</p>
              </div>
            ))}
          </div>

          {seoOpportunities.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm font-bold text-emerald-300">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              GSC import hop le, chua thay opportunity lon theo rule MVP.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/5">
              <div className="hidden grid-cols-[1fr_1.2fr_130px_110px_170px] gap-3 border-b border-white/5 bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/35 lg:grid">
                <span>Query</span>
                <span>Page</span>
                <span>Type</span>
                <span>Priority</span>
                <span className="text-right">Score / action</span>
              </div>
              <div className="divide-y divide-white/5">
                {seoOpportunities.slice(0, 12).map(item => {
                  const plan = seoActionPlans[item.id];
                  const draftRecord = seoDrafts[item.id];
                  return (
                  <div key={item.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_1.2fr_130px_110px_170px] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{item.query}</p>
                      <p className="mt-1 text-xs font-medium text-white/40">
                        {item.impressions} imp · CTR {(item.ctr * 100).toFixed(1)}% · pos {item.position.toFixed(1)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white/55">{item.page}</p>
                      {item.competingPages?.length ? (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                          {item.competingPages.length} URL cung query
                        </p>
                      ) : null}
                      {item.delta ? (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-300">
                          clicks {item.delta.clicks}, pos {item.delta.position >= 0 ? '+' : ''}{item.delta.position.toFixed(1)}
                        </p>
                      ) : null}
                    </div>
                    <span className="w-fit rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white/45">
                      {opportunityTypeLabel[item.type]}
                    </span>
                    <span className={cn('w-fit rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest', opportunityPriorityTone[item.priority])}>
                      {item.priority}
                    </span>
                    <div className="text-left lg:text-right">
                      <p className="text-sm font-black text-emerald-300">{item.impactScore}</p>
                      <p className="mt-1 text-[10px] font-medium leading-4 text-white/40">{item.nextSteps[0] || item.aiAction}</p>
                      <button
                        type="button"
                        onClick={() => handleGenerateSeoAction(item)}
                        disabled={generatingSeoActionId === item.id}
                        className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {generatingSeoActionId === item.id ? (
                          <span className="h-3 w-3 rounded-full border-2 border-emerald-100 border-t-transparent animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        Tao AI action
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateSeoDraft(item)}
                        disabled={generatingSeoDraftId === item.id}
                        className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-sky-100 transition hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {generatingSeoDraftId === item.id ? (
                          <span className="h-3 w-3 rounded-full border-2 border-sky-100 border-t-transparent animate-spin" />
                        ) : (
                          <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                        Tao draft
                      </button>
                    </div>
                    {plan && (
                      <div className="rounded-xl border border-emerald-400/10 bg-black/20 p-4 lg:col-span-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">AI Action Generator</p>
                          <button
                            type="button"
                            onClick={() => handleCopySeoAction(plan)}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/65 transition hover:border-emerald-400/30 hover:text-emerald-100"
                          >
                            <Clipboard className="h-3.5 w-3.5" />
                            Copy JSON
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-white/5 bg-white/[0.025] p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Title</p>
                            <p className="mt-1 text-sm font-bold leading-5 text-white">{plan.suggestedTitle}</p>
                          </div>
                          <div className="rounded-lg border border-white/5 bg-white/[0.025] p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Meta description</p>
                            <p className="mt-1 text-sm font-medium leading-5 text-white/60">{plan.suggestedMeta}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">H2</p>
                            <ul className="mt-2 space-y-1">
                              {plan.suggestedH2.slice(0, 4).map(text => <li key={text} className="text-xs font-medium leading-5 text-white/60">- {text}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">FAQ</p>
                            <ul className="mt-2 space-y-1">
                              {plan.suggestedFaq.slice(0, 3).map(faq => <li key={faq.question} className="text-xs font-medium leading-5 text-white/60">- {faq.question}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Internal links</p>
                            <ul className="mt-2 space-y-1">
                              {plan.internalLinks.slice(0, 3).map(link => <li key={`${link.href}-${link.anchor}`} className="text-xs font-medium leading-5 text-white/60">- {link.anchor} {'->'} {link.href}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {draftRecord && (
                      <div className="rounded-xl border border-sky-400/10 bg-sky-400/[0.035] p-4 lg:col-span-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Auto Content Optimizer</p>
                            <p className="mt-1 text-xs font-medium text-white/40">AI Suggest {'->'} Admin Review {'->'} Apply</p>
                          </div>
                          <span className={cn(
                            'rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest',
                            draftRecord.status === 'applied'
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                              : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                          )}>
                            {draftRecord.status}
                          </span>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Old content</p>
                            <p className="mt-2 text-sm font-bold text-white">{draftRecord.oldTitle || 'Chua co title'}</p>
                            <p className="mt-1 text-xs font-medium leading-5 text-white/45">{draftRecord.oldDescription || 'Chua co meta description'}</p>
                            <div className="mt-3 max-h-44 overflow-auto rounded-lg bg-black/20 p-3 text-xs leading-5 text-white/45">
                              {cleanText(draftRecord.oldContent).slice(0, 900) || 'Chua co content'}
                            </div>
                          </div>
                          <div className="rounded-lg border border-sky-400/10 bg-black/20 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">New draft</p>
                            <p className="mt-2 text-sm font-bold text-white">{draftRecord.draft.seoTitle}</p>
                            <p className="mt-1 text-xs font-medium leading-5 text-white/55">{draftRecord.draft.seoDescription}</p>
                            <div className="mt-3 max-h-44 overflow-auto rounded-lg bg-black/20 p-3 text-xs leading-5 text-white/55">
                              {cleanText(draftRecord.draft.contentHtml).slice(0, 900)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplySeoDraft(draftRecord)}
                            disabled={draftRecord.status === 'applied' || applyingSeoDraftId === draftRecord.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {applyingSeoDraftId === draftRecord.id ? (
                              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(draftRecord.draft.contentHtml).then(() => toast.success('Da copy draft HTML.'))}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/65 transition hover:border-sky-400/30 hover:text-sky-100"
                          >
                            <Clipboard className="h-3.5 w-3.5" />
                            Copy HTML
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <DailySeoSuggestionPanel
        blogPosts={blogPosts}
        onUseSuggestion={onUseBlogSuggestion}
        onGenerateSuggestion={(suggestion) => createBlogDraftFromSuggestion(suggestion, `blog-${suggestion.slug}`)}
        generatingSlug={generatingActionId?.startsWith('blog-') ? generatingActionId.replace(/^blog-/, '') : undefined}
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Đề Xuất Hành Động Hôm Nay</h3>
            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/35">
              {actions.length} việc
            </span>
          </div>

          <div className="space-y-3">
            {actions.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                Chưa thấy điểm nghẽn lớn từ dữ liệu nội bộ hiện có.
              </div>
            ) : (
              actions.map(action => (
                <div key={action.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest', priorityTone[action.priority])}>
                      {priorityLabel[action.priority]}
                    </span>
                    <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/40">{action.source}</span>
                    {action.kind === 'blog-draft' && (
                      <span className="rounded-lg bg-purple-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-purple-300">
                        Đồng bộ AI Blog
                      </span>
                    )}
                  </div>
                  <p className="text-base font-black leading-6 text-white">{action.title}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/55">{action.detail}</p>
                  <div className="mt-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Cần chỉnh sửa</p>
                    <ul className="mt-2 space-y-1.5">
                      {action.fixes.map(fix => (
                        <li key={fix} className="flex gap-2 text-xs font-medium leading-5 text-emerald-50/70">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Vì sao</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-white/50">{action.reason}</p>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Tác động kỳ vọng</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-white/50">{action.impact}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(action)}
                      disabled={generatingActionId === action.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generatingActionId === action.id ? (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                      {primaryActionLabel(action)}
                    </button>
                    {action.kind === 'blog-draft' && action.blogSuggestion && (
                      <button
                        type="button"
                        onClick={() => onUseBlogSuggestion?.(action.blogSuggestion!)}
                        className="inline-flex items-center gap-2 rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs font-black text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-400/20"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Dùng gợi ý
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyChecklist(action)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/65 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-100"
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                      Copy checklist
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
            <div className="mb-4 flex items-center gap-3">
              <Target className="h-4 w-4 text-sky-300" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Từ Khóa/Cụm Nên Đẩy</h3>
            </div>
            <div className="space-y-2">
              {keywordOpportunities.map(item => (
                <div key={item.term} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{item.term}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{item.count} tín hiệu trong catalog</p>
                  </div>
                  <Search className="h-4 w-4 shrink-0 text-white/25" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
            <div className="mb-4 flex items-center gap-3">
              <PackagePlus className="h-4 w-4 text-emerald-300" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Category Có Nhu Cầu Mua</h3>
            </div>
            <div className="space-y-2">
              {categorySales.length === 0 ? (
                <p className="text-sm font-medium leading-6 text-white/45">Chưa có đơn hàng để phân tích nhu cầu category.</p>
              ) : (
                categorySales.slice(0, 5).map(category => (
                  <div key={category.category} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{category.category}</p>
                        <p className="mt-1 text-xs font-medium text-white/40">{category.quantity} sản phẩm bán ra</p>
                      </div>
                      <p className="text-right text-xs font-black text-emerald-300">{formatCurrency(category.revenue)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
            <div className="mb-4 flex items-center gap-3">
              <Link2 className="h-4 w-4 text-violet-300" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Content Map Đồng Bộ</h3>
            </div>
            <div className="space-y-2">
              {clusters.map(cluster => {
                const isOpen = activeMapClusterId === cluster.id;

                return (
                <div key={cluster.id} className={cn("rounded-xl border bg-white/[0.02] p-3", isOpen ? "border-violet-400/40" : "border-white/5")}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMapClusterId(isOpen ? null : cluster.id);
                      if (!isOpen) {
                        setSelectedMapTarget(null);
                        setMapEditState(null);
                      }
                    }}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{cluster.label}</p>
                      <p className="mt-1 text-xs font-medium text-white/40">
                        {cluster.products.length} sản phẩm · {cluster.blogs.length} blog · {cluster.weakProducts.length} cần sửa
                      </p>
                    </div>
                    <span className={cn(
                      'rounded-lg border px-2 py-1 text-xs font-black',
                      cluster.score >= 85
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : cluster.score >= 65
                          ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                          : 'border-red-500/20 bg-red-500/10 text-red-300'
                    )}>
                      {cluster.score}
                    </span>
                    <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-white/35 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && cluster.issues[0] && (
                    <p className="mt-2 text-xs font-medium leading-5 text-amber-100/65">
                      {cluster.issues[0].label}: {cluster.issues[0].detail}
                    </p>
                  )}

                  {isOpen && (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-3 xl:grid-cols-2">
                        <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Bài viết blog ({cluster.blogs.length})</p>
                            <FileText className="h-4 w-4 text-white/30" />
                          </div>
                          <div className="space-y-2">
                            {cluster.blogs.slice(0, 5).map(post => {
                              const suggestions = buildBlogMapSuggestions(post, cluster.label);
                              const selected = selectedMapTarget?.type === 'blog' && selectedMapTarget.item.id === post.id;
                              return (
                                <button
                                  key={post.id}
                                  type="button"
                                  onClick={() => selectContentMapTarget({ type: 'blog', clusterLabel: cluster.label, item: post, suggestions })}
                                  className={cn("w-full rounded-lg border p-3 text-left transition-all", selected ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-white/[0.03] hover:border-violet-400/40")}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="line-clamp-1 text-xs font-black text-white">{post.title}</p>
                                      <p className="mt-1 text-[11px] font-medium text-white/45">
                                        {post.seoTitle ? 'Có SEO title' : 'Thiếu SEO title'} · {wordCount(post.content || post.excerpt)} từ
                                      </p>
                                    </div>
                                    {suggestions.length > 1 ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />}
                                  </div>
                                </button>
                              );
                            })}
                            {cluster.blogs.length === 0 && (
                              <p className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3 text-xs font-medium leading-5 text-amber-100/70">Cụm này chưa có bài viết hỗ trợ.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Sản phẩm ({cluster.products.length})</p>
                            <ShoppingBag className="h-4 w-4 text-white/30" />
                          </div>
                          <div className="space-y-2">
                            {cluster.products.slice(0, 5).map(product => {
                              const weak = cluster.weakProducts.find(item => item.product.id === product.id);
                              const suggestions = buildProductMapSuggestions(weak?.audit.quickWins.map(issue => issue.detail) || []);
                              const selected = selectedMapTarget?.type === 'product' && selectedMapTarget.item.id === product.id;
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => selectContentMapTarget({ type: 'product', clusterLabel: cluster.label, item: product, suggestions })}
                                  className={cn("w-full rounded-lg border p-3 text-left transition-all", selected ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-white/[0.03] hover:border-violet-400/40")}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="line-clamp-1 text-xs font-black text-white">{product.name}</p>
                                      <p className="mt-1 text-[11px] font-medium text-white/45">
                                        SKU: {product.id} · {weak ? `Score ${weak.audit.score}` : 'Đã tối ưu'}
                                      </p>
                                    </div>
                                    {weak ? <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-600">SEO yếu</span> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />}
                                  </div>
                                </button>
                              );
                            })}
                            {cluster.products.length === 0 && (
                              <p className="rounded-lg border border-red-500/15 bg-red-500/5 p-3 text-xs font-medium leading-5 text-red-100/70">Thiếu sản phẩm trụ cột cho cụm này.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {selectedMapTarget && mapEditState && (
                        <div className="overflow-hidden rounded-xl border border-violet-400/40 bg-[#252523]">
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-violet-100 px-4 py-3 text-zinc-900">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">{selectedMapTarget.type === 'blog' ? 'Bài viết' : 'Sản phẩm'} · {selectedMapTarget.clusterLabel}</p>
                              <p className="line-clamp-1 text-sm font-black text-violet-950">{selectedMapTarget.type === 'blog' ? mapEditState.title : selectedMapTarget.item.name}</p>
                            </div>
                            <button type="button" onClick={() => { setSelectedMapTarget(null); setMapEditState(null); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-300/60 text-violet-500 hover:bg-white/50">
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="space-y-4 p-4">
                            <div>
                              <p className="mb-2 text-xs font-black text-white/50">Vấn đề phát hiện</p>
                              <div className="space-y-2">
                                {selectedMapTarget.suggestions.slice(0, 3).map((suggestion, index) => (
                                  <div key={suggestion} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-bold leading-5", index < 2 ? "border-red-300/30 bg-red-100 text-red-700" : "border-amber-300/30 bg-amber-100 text-amber-800")}>
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{suggestion}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {selectedMapTarget.type === 'blog' && (
                              <div>
                                <FieldLabel label="Tiêu đề bài viết" count={mapEditState.title.length} max={65} />
                                <input value={mapEditState.title} onChange={(event) => updateMapEdit({ title: event.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
                                <SuggestionBox value={buildMapAiDraft(selectedMapTarget).title} onApply={() => applyMapAiDraft('title')} />
                              </div>
                            )}

                            <div>
                              <FieldLabel label={selectedMapTarget.type === 'blog' ? 'SEO title' : 'Title thẻ sản phẩm'} count={mapEditState.seoTitle.length} max={60} />
                              <input value={mapEditState.seoTitle} onChange={(event) => updateMapEdit({ seoTitle: event.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
                              <SuggestionBox value={buildMapAiDraft(selectedMapTarget).seoTitle} onApply={() => applyMapAiDraft('seoTitle')} />
                            </div>

                            <div>
                              <FieldLabel label="Meta description" count={mapEditState.metaDescription.length} max={160} />
                              <input value={mapEditState.metaDescription} onChange={(event) => updateMapEdit({ metaDescription: event.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
                              <SuggestionBox value={buildMapAiDraft(selectedMapTarget).metaDescription} onApply={() => applyMapAiDraft('metaDescription')} />
                            </div>

                            <div>
                              <FieldLabel label={selectedMapTarget.type === 'blog' ? 'Mô tả ngắn bài viết' : 'Mô tả sản phẩm snippet'} count={mapEditState.description.length} max={300} />
                              <textarea value={mapEditState.description} onChange={(event) => updateMapEdit({ description: event.target.value })} rows={4} className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400" />
                              <SuggestionBox value={buildMapAiDraft(selectedMapTarget).description} onApply={() => applyMapAiDraft('description')} />
                            </div>

                            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                              <button type="button" onClick={saveContentMapInline} disabled={mapEditState.saving} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 disabled:opacity-50">
                                <Save className="h-4 w-4" />
                                {mapEditState.saving ? 'Đang lưu...' : mapEditState.saved ? 'Đã lưu' : 'Lưu thay đổi'}
                              </button>
                              <button type="button" onClick={() => applyMapAiDraft()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10">
                                <Sparkles className="h-4 w-4" />
                                Áp dụng tất cả gợi ý AI
                              </button>
                              <button type="button" onClick={() => selectedMapTarget.type === 'product' ? onOpenProduct?.(selectedMapTarget.item) : onOpenBlogPost?.(selectedMapTarget.item)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-white/70 hover:bg-white/10">
                                <Edit2 className="h-4 w-4" />
                                Mở form đầy đủ
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-5">
            <div className="mb-3 flex items-center gap-3">
              <ArrowUpRight className="h-4 w-4 text-sky-300" />
              <h3 className="text-sm font-black uppercase tracking-widest text-sky-100">Bước Kết Nối Dữ Liệu Thật</h3>
            </div>
            <p className="text-sm font-medium leading-6 text-sky-100/65">
              Khi có GSC/GA4, tab này sẽ thay heuristic bằng dữ liệu: page có impressions cao CTR thấp, keyword vị trí 8-20, landing page có traffic nhưng không ra đơn, và organic revenue theo category.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
