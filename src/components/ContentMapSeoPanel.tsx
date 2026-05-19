import React from 'react';
import { AlertCircle, CheckCircle2, FileText, Home, Layers3, Network, Package, Search } from 'lucide-react';
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
}

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

export function ContentMapSeoPanel({ products, blogPosts, navigation, blogCategories }: ContentMapSeoPanelProps) {
  const productSummary = React.useMemo(() => summarizeProductSeo(products), [products]);
  const clusters = React.useMemo(() => buildContentMap(products, blogPosts), [products, blogPosts]);

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
            {clusters.map(cluster => (
              <div key={cluster.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
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
                </div>
                {cluster.issues[0] && (
                  <div className={cn(
                    "mt-3 rounded-xl border px-3 py-2 text-xs font-medium leading-5",
                    cluster.issues[0].severity === 'critical'
                      ? "border-red-500/15 bg-red-500/5 text-red-200"
                      : "border-amber-500/15 bg-amber-500/5 text-amber-200"
                  )}>
                    <span className="font-black">{cluster.issues[0].label}:</span> {cluster.issues[0].detail}
                  </div>
                )}
              </div>
            ))}
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
    </div>
  );
}
