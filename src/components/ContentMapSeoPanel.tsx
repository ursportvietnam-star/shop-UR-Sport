import React from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Edit2, FileText, Home, Layers3, Network, Package, Save, Search, Sparkles, X } from 'lucide-react';
import { BlogPost, Product } from '../types';
import { buildContentMap, summarizeProductSeo } from '../lib/seoAutomation';
import { SEO_CONTENT_CHECKLIST } from '../lib/seoGuide';
import { cn } from '@/lib/utils';

type MapNavigationItem = {
  id?: string | number;
  label: string;
  link?: string;
  group?: 'main' | 'category' | 'subcategory' | string;
  parentLabel?: string;
};

type MapBlogCategoryItem = {
  id?: string | number;
  label: string;
  link?: string;
  group?: 'main' | 'category' | 'subcategory' | string;
  parentLabel?: string;
  seoTitle?: string;
  metaDescription?: string;
};

interface ContentMapSeoPanelProps {
  products: Product[];
  blogPosts: BlogPost[];
  navigation: MapNavigationItem[];
  blogCategories: MapBlogCategoryItem[];
  onEditProduct?: (product: Product) => void;
  onEditBlogPost?: (post: BlogPost) => void;
  onSaveProductSeo?: (productId: string, data: { seoTitle: string; metaDescription: string; description: string }) => Promise<void>;
  onSaveBlogSeo?: (postId: string, data: { title: string; seoTitle: string; metaDescription: string; excerpt: string }) => Promise<void>;
}

type SelectedSeoTarget =
  | { type: 'blog'; clusterLabel: string; item: BlogPost; suggestions: string[] }
  | { type: 'product'; clusterLabel: string; item: Product; suggestions: string[] };

type InlineEditState = {
  title: string;
  seoTitle: string;
  metaDescription: string;
  description: string;
  saving: boolean;
  saved: boolean;
};

const scoreTone = (score: number) => {
  if (score >= 85) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (score >= 65) return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-red-500/20 bg-red-500/10 text-red-300';
};

const normalizeText = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const matchesLabel = (source: unknown, label: unknown) => {
  const sourceText = normalizeText(source);
  const labelText = normalizeText(label);
  return Boolean(sourceText && labelText && (sourceText.includes(labelText) || labelText.includes(sourceText)));
};

const pageSeoReady = (item: MapBlogCategoryItem | MapNavigationItem) => {
  const maybeSeo = item as MapBlogCategoryItem;
  if (item.group === 'main') return true;
  if (!maybeSeo.seoTitle && !maybeSeo.metaDescription) return false;
  return String(maybeSeo.seoTitle || '').length <= 65 && String(maybeSeo.metaDescription || '').length <= 170;
};

const stripHtml = (value: string) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const wordCount = (value: string) => stripHtml(value).split(/\s+/).filter(Boolean).length;

const buildBlogSeoSuggestions = (post: BlogPost, clusterLabel: string) => {
  const suggestions: string[] = [];
  const titleLength = String(post.title || '').trim().length;
  const seoTitleLength = String(post.seoTitle || '').trim().length;
  const metaLength = String(post.metaDescription || '').trim().length;
  const bodyWords = wordCount(post.content || post.excerpt || '');
  const text = normalizeText(`${post.title} ${post.seoTitle} ${post.metaDescription} ${post.content}`);
  const clusterTerm = normalizeText(clusterLabel);

  if (!post.seoTitle || seoTitleLength < 35 || seoTitleLength > 65) {
    suggestions.push(`Viết lại SEO title 35-65 ký tự, có cụm "${clusterLabel}" ở nửa đầu title.`);
  }
  if (!post.metaDescription || metaLength < 110 || metaLength > 170) {
    suggestions.push('Bổ sung meta description 110-170 ký tự: nêu lợi ích, đối tượng nam giới, chất liệu/form và lời mời xem sản phẩm.');
  }
  if (titleLength < 25 || !text.includes(clusterTerm)) {
    suggestions.push(`H1/title nên nói rõ intent tìm kiếm và chứa cụm "${clusterLabel}" tự nhiên.`);
  }
  if (bodyWords < 900) {
    suggestions.push('Mở rộng nội dung lên tối thiểu 900-1,200 từ với H2: cách chọn, chất liệu, form dáng, bảng so sánh và FAQ.');
  }
  if (!/href=["']\//i.test(post.content || '')) {
    suggestions.push('Chèn 2-4 internal link tới category/sản phẩm liên quan trong cụm SEO này.');
  }
  if (!/faq|câu hỏi|hoi/i.test(`${post.content} ${post.excerpt}`)) {
    suggestions.push('Thêm FAQ 3-5 câu hỏi cuối bài để tăng khả năng lấy rich result và phủ long-tail keyword.');
  }

  return suggestions.length ? suggestions : ['Bài viết đã ổn. Có thể tinh chỉnh thêm internal link, hình ảnh WebP và FAQ để tăng sức mạnh cụm.'];
};

const buildProductSeoSuggestions = (product: Product, suggestions: string[]) => {
  if (suggestions.length) return suggestions;
  return [
    `Sản phẩm "${product.name}" đã ổn. Có thể kiểm tra thêm ảnh WebP, alt ảnh, liên kết từ blog hỗ trợ và schema Product.`,
  ];
};

const clampText = (value: string, max: number) => value.trim().slice(0, max);

const buildInlineEditState = (target: SelectedSeoTarget): InlineEditState => {
  if (target.type === 'blog') {
    return {
      title: target.item.title || '',
      seoTitle: target.item.seoTitle || target.item.title || '',
      metaDescription: target.item.metaDescription || target.item.excerpt || '',
      description: target.item.excerpt || stripHtml(target.item.content || '').slice(0, 300),
      saving: false,
      saved: false,
    };
  }

  return {
    title: target.item.name || '',
    seoTitle: target.item.seoTitle || target.item.name || '',
    metaDescription: target.item.metaDescription || '',
    description: stripHtml(target.item.description || '').slice(0, 500),
    saving: false,
    saved: false,
  };
};

const buildAiDrafts = (target: SelectedSeoTarget) => {
  if (target.type === 'blog') {
    const label = target.clusterLabel.toLowerCase();
    return {
      title: clampText(`${target.clusterLabel}: hướng dẫn chọn đúng và phối đồ đẹp cho nam`, 65),
      seoTitle: clampText(`${target.clusterLabel} đẹp, dễ mặc - Hướng dẫn chọn chuẩn URSport`, 65),
      metaDescription: clampText(`Tìm hiểu cách chọn ${label} theo chất liệu, form dáng và nhu cầu sử dụng. Gợi ý phối đồ, chọn size và sản phẩm phù hợp tại URSport.`, 170),
      description: clampText(`Bài viết giúp bạn chọn ${label} đúng nhu cầu: chất liệu, form dáng, cách phối đồ, bảng so sánh và FAQ để mua tự tin hơn.`, 300),
    };
  }

  const productName = target.item.name || target.clusterLabel;
  return {
    title: clampText(productName, 65),
    seoTitle: clampText(`${productName} - ${target.clusterLabel} chuẩn form | URSport`, 65),
    metaDescription: clampText(`${productName} chất liệu thoáng mát, form dễ mặc, phù hợp tập luyện và mặc hằng ngày. Xem giá, màu, size và ưu đãi tại URSport.`, 170),
    description: clampText(`${productName} được thiết kế cho nam giới cần sự thoải mái, gọn dáng và dễ phối đồ. Chất liệu mềm thoáng, hỗ trợ vận động, giữ form tốt sau nhiều lần giặt. Phù hợp đi tập, đi chơi hoặc mặc hằng ngày.`, 300),
  };
};

export function ContentMapSeoPanel({
  products,
  blogPosts,
  navigation,
  blogCategories,
  onEditProduct,
  onEditBlogPost,
  onSaveProductSeo,
  onSaveBlogSeo
}: ContentMapSeoPanelProps) {
  const productSummary = React.useMemo(() => summarizeProductSeo(products), [products]);
  const clusters = React.useMemo(() => buildContentMap(products, blogPosts), [products, blogPosts]);
  const [selectedTarget, setSelectedTarget] = React.useState<SelectedSeoTarget | null>(null);
  const [activeClusterId, setActiveClusterId] = React.useState<string | null>(clusters[0]?.id || null);
  const [editState, setEditState] = React.useState<InlineEditState | null>(null);

  const productCategories = React.useMemo(
    () => navigation.filter(item => item.group === 'category' || item.group === 'subcategory'),
    [navigation]
  );
  const blogCategoryNodes = React.useMemo(
    () => blogCategories.filter(item => item.group !== 'main'),
    [blogCategories]
  );

  const categoryGaps = productCategories.filter(category => {
    const linkedProducts = products.filter(product => matchesLabel(product.category, category.label));
    return linkedProducts.length === 0 || !pageSeoReady(category);
  });

  const blogCategoryGaps = blogCategoryNodes.filter(category => {
    const linkedPosts = blogPosts.filter(post => matchesLabel(post.category, category.label));
    return linkedPosts.length === 0 || !pageSeoReady(category);
  });

  const weakClusters = clusters.filter(cluster => cluster.issues.length > 0);
  const publishedBlogSlugs = React.useMemo(
    () => new Set(blogPosts.map(post => normalizeText(post.slug || post.title))),
    [blogPosts]
  );
  const checklistStatus = SEO_CONTENT_CHECKLIST.map((item, index) => {
    const passed = [
      products.some(product => product.seoTitle),
      products.some(product => product.metaDescription),
      true,
      true,
      true,
      navigation.some(nav => nav.group === 'category' || nav.group === 'subcategory'),
      products.some(product => product.images?.length && product.price),
      blogPosts.length > 0,
      blogPosts.some(post => /faq|câu hỏi|hoi/i.test(`${post.content} ${post.excerpt}`)),
      products.some(product => product.images?.some(image => /\.webp($|\?)/i.test(image))),
      products.every(product => !String(product.slug || '').includes('?')),
      clusters.some(cluster => cluster.products.length > 0 && cluster.blogs.length > 0),
      true,
      navigation.some(nav => matchesLabel(nav.label, 'bảng size')) || blogPosts.some(post => matchesLabel(post.title, 'bảng size'))
    ][index] ?? false;

    return { item, passed };
  });
  const overallScore = Math.round((
    (productSummary.averageScore || 0) +
    (clusters.reduce((sum, cluster) => sum + cluster.score, 0) / Math.max(clusters.length, 1)) +
    (categoryGaps.length === 0 ? 100 : Math.max(40, 100 - categoryGaps.length * 10)) +
    (blogCategoryGaps.length === 0 ? 100 : Math.max(40, 100 - blogCategoryGaps.length * 10))
  ) / 4);

  const actions = [
    ...weakClusters.slice(0, 3).map(cluster => ({
      id: `cluster-${cluster.id}`,
      label: cluster.label,
      detail: cluster.issues[0]?.detail || 'Chuẩn hoá lại cụm nội dung và liên kết nội bộ.',
      tone: cluster.issues[0]?.severity === 'critical' ? 'red' : 'amber'
    })),
    ...categoryGaps.slice(0, 2).map(category => ({
      id: `category-${category.id || category.label}`,
      label: category.label,
      detail: 'Danh mục sản phẩm cần có sản phẩm liên quan, SEO title và meta description rõ cụm từ khoá.',
      tone: 'blue'
    })),
    ...blogCategoryGaps.slice(0, 2).map(category => ({
      id: `blog-${category.id || category.label}`,
      label: category.label,
      detail: 'Danh mục blog cần có bài hỗ trợ và meta description cho cụm chủ đề.',
      tone: 'purple'
    }))
  ].slice(0, 6);

  const selectTarget = (target: SelectedSeoTarget) => {
    setSelectedTarget(target);
    setEditState(buildInlineEditState(target));
  };

  const updateEditState = (patch: Partial<InlineEditState>) => {
    setEditState(prev => prev ? { ...prev, ...patch, saved: false } : prev);
  };

  const applyAiDraft = (field?: keyof ReturnType<typeof buildAiDrafts>) => {
    if (!selectedTarget) return;
    const draft = buildAiDrafts(selectedTarget);
    if (field) {
      updateEditState({ [field === 'description' ? 'description' : field]: draft[field] } as Partial<InlineEditState>);
      return;
    }
    updateEditState({
      title: draft.title,
      seoTitle: draft.seoTitle,
      metaDescription: draft.metaDescription,
      description: draft.description,
    });
  };

  const saveInlineEdit = async () => {
    if (!selectedTarget || !editState) return;
    updateEditState({ saving: true });
    try {
      if (selectedTarget.type === 'blog') {
        await onSaveBlogSeo?.(selectedTarget.item.id, {
          title: editState.title,
          seoTitle: editState.seoTitle,
          metaDescription: editState.metaDescription,
          excerpt: editState.description,
        });
      } else {
        await onSaveProductSeo?.(selectedTarget.item.id, {
          seoTitle: editState.seoTitle,
          metaDescription: editState.metaDescription,
          description: editState.description,
        });
      }
      setEditState(prev => prev ? { ...prev, saving: false, saved: true } : prev);
    } catch (error) {
      setEditState(prev => prev ? { ...prev, saving: false } : prev);
      throw error;
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Content Map SEO</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/30">Homepage, category, product, blog silo</p>
              </div>
            </div>
            <p className="max-w-3xl text-sm font-medium leading-6 text-white/45">
              Bản đồ này gom toàn bộ trang chủ, danh mục sản phẩm, danh mục blog, sản phẩm và bài viết thành các cụm SEO để quản lý liên kết nội bộ và chuẩn hoá nội dung.
            </p>
          </div>
          <div className={cn("shrink-0 rounded-2xl border px-5 py-4 text-center", scoreTone(overallScore))}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">SEO Map Score</p>
            <p className="mt-1 text-3xl font-black leading-none">{overallScore}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Trang chủ', value: 1, icon: Home },
            { label: 'Danh mục SP', value: productCategories.length, icon: Layers3 },
            { label: 'Sản phẩm', value: products.length, icon: Package },
            { label: 'Danh mục Blog', value: blogCategoryNodes.length, icon: Search },
            { label: 'Bài blog', value: blogPosts.length, icon: FileText }
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <stat.icon className="mb-3 h-4 w-4 text-white/35" />
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/30">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Cụm Nội Dung Chính</h3>
            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/35">
              Silo SEO
            </span>
          </div>

          <div className="space-y-3">
            {clusters.map(cluster => {
              const isActive = activeClusterId === cluster.id;

              return (
              <div key={cluster.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <button
                  type="button"
                  onClick={() => setActiveClusterId(isActive ? null : cluster.id)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-black", scoreTone(cluster.score))}>
                    {cluster.score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-white">{cluster.label}</p>
                      {cluster.issues.length === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium leading-5 text-white/40">{cluster.intent}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/45">{cluster.products.length} sản phẩm</span>
                      <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/45">{cluster.blogs.length} blog</span>
                      <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/45">{cluster.weakProducts.length} cần sửa</span>
                    </div>
                  </div>
                  <ChevronDown className={cn("mt-3 h-4 w-4 shrink-0 text-white/35 transition-transform", isActive && "rotate-180")} />
                </button>
                {isActive && cluster.issues[0] && (
                  <div className={cn(
                    "mt-3 rounded-xl border px-3 py-2 text-xs font-medium leading-5",
                    cluster.issues[0].severity === 'critical'
                      ? "border-red-500/15 bg-red-500/5 text-red-200"
                      : "border-amber-500/15 bg-amber-500/5 text-amber-200"
                  )}>
                    <span className="font-black">{cluster.issues[0].label}:</span> {cluster.issues[0].detail}
                  </div>
                )}
                {isActive && <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Bài viết hỗ trợ</p>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-white/35">{cluster.blogs.length}</span>
                    </div>
                    <div className="space-y-2">
                      {cluster.blogs.slice(0, 4).map(post => {
                        const suggestions = buildBlogSeoSuggestions(post, cluster.label);
                        const isWeak = suggestions.length > 1 || !post.seoTitle || !post.metaDescription;
                        const isSelected = selectedTarget?.type === 'blog' && selectedTarget.item.id === post.id;

                        return (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => selectTarget({ type: 'blog', clusterLabel: cluster.label, item: post, suggestions })}
                            className={cn(
                              "w-full rounded-lg border p-3 text-left transition-all",
                              isSelected
                                ? "border-sky-400/50 bg-sky-500/10"
                                : "border-white/5 bg-white/[0.02] hover:border-sky-400/30 hover:bg-sky-500/5"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-xs font-black text-white">{post.title}</p>
                                <p className="mt-1 text-[11px] font-medium text-white/35">
                                  {post.seoTitle ? 'Có SEO title' : 'Thiếu SEO title'} · {post.metaDescription ? 'Có meta' : 'Thiếu meta'}
                                </p>
                              </div>
                              {isWeak ? (
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                              ) : (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {cluster.blogs.length === 0 && (
                        <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3 text-xs font-medium leading-5 text-amber-100/80">
                          Cụm này chưa có bài viết hỗ trợ. Nên tạo bài pillar/support trước khi đẩy sản phẩm.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Sản phẩm landing</p>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-white/35">{cluster.products.length}</span>
                    </div>
                    <div className="space-y-2">
                      {cluster.products.slice(0, 4).map(product => {
                        const weakProduct = cluster.weakProducts.find(item => item.product.id === product.id);
                        const suggestions = buildProductSeoSuggestions(product, weakProduct?.audit.quickWins.map(issue => issue.detail) || []);
                        const isSelected = selectedTarget?.type === 'product' && selectedTarget.item.id === product.id;

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectTarget({ type: 'product', clusterLabel: cluster.label, item: product, suggestions })}
                            className={cn(
                              "w-full rounded-lg border p-3 text-left transition-all",
                              isSelected
                                ? "border-violet-400/50 bg-violet-500/10"
                                : "border-white/5 bg-white/[0.02] hover:border-violet-400/30 hover:bg-violet-500/5"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-xs font-black text-white">{product.name}</p>
                                <p className="mt-1 text-[11px] font-medium text-white/35">
                                  SKU: {product.id} · {weakProduct ? `${weakProduct.audit.score}/100` : 'SEO ổn'}
                                </p>
                              </div>
                              {weakProduct ? (
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                              ) : (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {cluster.products.length === 0 && (
                        <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3 text-xs font-medium leading-5 text-red-100/80">
                          Chưa có sản phẩm landing cho cụm này. Cần thêm hoặc đổi category/keyword cho sản phẩm liên quan.
                        </div>
                      )}
                    </div>
                  </div>
                </div>}
              </div>
            );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-white">Việc Cần Chuẩn Hoá</h3>
            <div className="space-y-3">
              {actions.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm font-bold text-emerald-300">
                  Content map đang ổn: có sản phẩm, blog hỗ trợ và danh mục đủ tín hiệu SEO.
                </div>
              ) : actions.map(action => (
                <div key={action.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm font-black text-white">{action.label}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/45">{action.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-white">Checklist SEO.md</h3>
            <div className="space-y-2">
              {checklistStatus.map(({ item, passed }) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  {passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <p className={cn("text-xs font-medium leading-5", passed ? "text-white/45" : "text-amber-100/80")}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "rounded-2xl border p-5",
        selectedTarget
          ? "border-sky-400/25 bg-sky-500/[0.06]"
          : "border-white/5 bg-[#13161f]"
      )}>
        {selectedTarget && editState ? (
          <div className="overflow-hidden rounded-2xl border border-violet-400/40 bg-[#252523]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-violet-100 px-4 py-3 text-zinc-900">
              <div className="flex min-w-0 items-center gap-2">
                <Edit2 className="h-4 w-4 shrink-0 text-violet-700" />
                <h3 className="line-clamp-1 text-sm font-black text-violet-950">
                  {selectedTarget.type === 'blog' ? editState.title : selectedTarget.item.name}
                </h3>
                <span className="rounded-md bg-violet-600 px-2 py-1 text-[10px] font-black text-white">
                  {selectedTarget.type === 'blog' ? 'Bài viết' : 'Sản phẩm'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTarget(null);
                  setEditState(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-300/60 text-violet-500 hover:bg-white/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-4">
              <div>
                <p className="mb-2 text-xs font-black text-white/50">Vấn đề phát hiện</p>
                <div className="space-y-2">
                  {selectedTarget.suggestions.slice(0, 4).map((suggestion, index) => (
                    <div key={`${selectedTarget.type}-issue-${index}`} className={cn(
                      "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-bold leading-5",
                      index < 2 ? "border-red-300/30 bg-red-100 text-red-700" : "border-amber-300/30 bg-amber-100 text-amber-800"
                    )}>
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="mb-4 text-xs font-black text-white/50">Chỉnh sửa trực tiếp - AI gợi ý sẵn bên dưới mỗi trường</p>

                {selectedTarget.type === 'blog' && (
                  <div className="mb-4">
                    <div className="mb-1 flex items-center gap-2">
                      <label className="text-xs font-black text-white/55">Tiêu đề bài viết</label>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">{editState.title.length}/65 ký tự</span>
                    </div>
                    <input
                      value={editState.title}
                      onChange={(event) => updateEditState({ title: event.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                    />
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/15 p-3">
                      <p className="mb-1 flex items-center gap-1 text-xs font-black text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Gợi ý AI:</p>
                      <p className="text-sm font-bold italic text-white">{buildAiDrafts(selectedTarget).title}</p>
                      <button type="button" onClick={() => applyAiDraft('title')} className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/10">Dùng gợi ý này</button>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="mb-1 flex items-center gap-2">
                    <label className="text-xs font-black text-white/55">{selectedTarget.type === 'blog' ? 'SEO title' : 'Title thẻ sản phẩm'}</label>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">{editState.seoTitle.length}/60 ký tự</span>
                  </div>
                  <input
                    value={editState.seoTitle}
                    onChange={(event) => updateEditState({ seoTitle: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  />
                  <div className="mt-2 rounded-lg border border-white/10 bg-black/15 p-3">
                    <p className="mb-1 flex items-center gap-1 text-xs font-black text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Gợi ý AI:</p>
                    <p className="text-sm font-bold italic text-white">{buildAiDrafts(selectedTarget).seoTitle}</p>
                    <button type="button" onClick={() => applyAiDraft('seoTitle')} className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/10">Dùng gợi ý này</button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="mb-1 flex items-center gap-2">
                    <label className="text-xs font-black text-white/55">Meta description</label>
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">{editState.metaDescription.length}/160 ký tự</span>
                  </div>
                  <input
                    value={editState.metaDescription}
                    onChange={(event) => updateEditState({ metaDescription: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  />
                  <div className="mt-2 rounded-lg border border-white/10 bg-black/15 p-3">
                    <p className="mb-1 flex items-center gap-1 text-xs font-black text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Gợi ý AI:</p>
                    <p className="text-sm font-bold italic text-white">{buildAiDrafts(selectedTarget).metaDescription}</p>
                    <button type="button" onClick={() => applyAiDraft('metaDescription')} className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/10">Dùng gợi ý này</button>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <label className="text-xs font-black text-white/55">{selectedTarget.type === 'blog' ? 'Mô tả ngắn bài viết' : 'Mô tả sản phẩm snippet'}</label>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">{editState.description.length}/300 ký tự</span>
                  </div>
                  <textarea
                    value={editState.description}
                    onChange={(event) => updateEditState({ description: event.target.value })}
                    rows={4}
                    className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  />
                  <div className="mt-2 rounded-lg border border-white/10 bg-black/15 p-3">
                    <p className="mb-1 flex items-center gap-1 text-xs font-black text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Gợi ý AI:</p>
                    <p className="text-sm font-bold italic text-white">{buildAiDrafts(selectedTarget).description}</p>
                    <button type="button" onClick={() => applyAiDraft('description')} className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/10">Dùng gợi ý này</button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => saveInlineEdit().catch(() => undefined)}
                    disabled={editState.saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {editState.saving ? 'Đang lưu...' : editState.saved ? 'Đã lưu' : 'Lưu thay đổi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAiDraft()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10"
                  >
                    <Sparkles className="h-4 w-4" />
                    Áp dụng tất cả gợi ý AI
                  </button>
                  <button
                    type="button"
                    onClick={() => selectedTarget.type === 'blog' ? onEditBlogPost?.(selectedTarget.item) : onEditProduct?.(selectedTarget.item)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-white/70 hover:bg-white/10"
                  >
                    <Edit2 className="h-4 w-4" />
                    Mở form đầy đủ
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-white/40" />
            <div>
              <p className="text-sm font-black text-white">Chọn một bài viết hoặc sản phẩm để xem gợi ý tối ưu SEO</p>
              <p className="mt-1 text-xs font-medium text-white/40">Nhấn vào card trong từng cụm từ khóa để xem checklist chỉnh sửa chi tiết và mở editor ngay tại trang quản trị.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
