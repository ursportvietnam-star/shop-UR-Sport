import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, Search, Sparkles, Wand2, Zap } from 'lucide-react';
import { Product } from '../types';
import { auditProductSeo, summarizeProductSeo } from '../lib/seoAutomation';
import { generateProductSeoFix, AIProductSeoFix } from '../lib/gemini';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductSeoAutomationPanelProps {
  products: Product[];
  onOptimizeProduct: (product: Product) => void;
  onApplySeoFix: (product: Product, fix: AIProductSeoFix) => Promise<void>;
}

const scoreTone = (score: number) => {
  if (score >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (score >= 65) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-red-400 bg-red-500/10 border-red-500/20';
};

const buildFixPrompt = (product: Product, issues: string[]) => `
Sản phẩm cần tối ưu:
- Tên: ${product.name}
- Danh mục: ${product.category}
- Slug: ${product.slug}
- Giá: ${product.price}
- Giá KM: ${product.discountPrice || ''}
- Chất liệu: ${product.material || ''}
- Kiểu dáng: ${product.style || product.fashionStyle || ''}
- Màu: ${(product.colors || []).join(', ')}
- Size: ${(product.sizes || []).join(', ')}
- SEO title hiện tại: ${product.seoTitle || ''}
- Meta description hiện tại: ${product.metaDescription || ''}
- Keywords hiện tại: ${product.keywords || ''}
- Features hiện tại: ${(product.features || []).join(' | ')}
- Mô tả hiện tại: ${String(product.description || '').replace(/<[^>]*>/g, ' ').slice(0, 1400)}

Các lỗi cần sửa:
${issues.map(issue => `- ${issue}`).join('\n')}
`;

export function ProductSeoAutomationPanel({ products, onOptimizeProduct, onApplySeoFix }: ProductSeoAutomationPanelProps) {
  const summary = React.useMemo(() => summarizeProductSeo(products), [products]);
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);
  const [applyingId, setApplyingId] = React.useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = React.useState(false);
  const [batchApplying, setBatchApplying] = React.useState(false);
  const [fixes, setFixes] = React.useState<Record<string, AIProductSeoFix>>({});
  const topIssues = Object.values(summary.topIssues)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const priorityProducts = [...summary.critical, ...summary.warning]
    .sort((a, b) => a.audit.score - b.audit.score)
    .slice(0, 5);

  const handleGenerateFix = async (product: Product, issues: string[]) => {
    setGeneratingId(product.id);
    try {
      const fix = await generateProductSeoFix(buildFixPrompt(product, issues));
      setFixes(prev => ({ ...prev, [product.id]: fix }));
      toast.success('AI đã tạo bản sửa SEO');
    } catch (error: any) {
      toast.error(error.message || 'Không tạo được bản sửa SEO');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleApplyFix = async (product: Product) => {
    const fix = fixes[product.id];
    if (!fix) return;

    setApplyingId(product.id);
    try {
      await onApplySeoFix(product, fix);
      setFixes(prev => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      toast.success('Đã áp dụng bản sửa SEO');
    } catch (error: any) {
      toast.error(error.message || 'Không lưu được bản sửa SEO');
    } finally {
      setApplyingId(null);
    }
  };

  const handleGenerateBatch = async () => {
    const targets = priorityProducts
      .filter(({ product }) => !fixes[product.id])
      .slice(0, 5);

    if (targets.length === 0) {
      toast.info('Không còn sản phẩm ưu tiên cần tạo bản sửa');
      return;
    }

    setBatchGenerating(true);
    let generated = 0;
    try {
      for (const { product, audit } of targets) {
        setGeneratingId(product.id);
        const fix = await generateProductSeoFix(
          buildFixPrompt(product, audit.issues.map(issue => `${issue.label}: ${issue.detail}`))
        );
        generated += 1;
        setFixes(prev => ({ ...prev, [product.id]: fix }));
      }
      toast.success(`AI đã tạo ${generated} bản sửa SEO`);
    } catch (error: any) {
      toast.error(error.message || `Đã tạo ${generated} bản sửa, nhưng một sản phẩm bị lỗi`);
    } finally {
      setGeneratingId(null);
      setBatchGenerating(false);
    }
  };

  const handleApplyBatch = async () => {
    const targets = priorityProducts
      .map(({ product }) => product)
      .filter(product => fixes[product.id])
      .slice(0, 5);

    if (targets.length === 0) {
      toast.info('Chưa có bản sửa SEO nào để áp dụng');
      return;
    }

    setBatchApplying(true);
    let applied = 0;
    try {
      for (const product of targets) {
        setApplyingId(product.id);
        await onApplySeoFix(product, fixes[product.id]);
        applied += 1;
        setFixes(prev => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
      }
      toast.success(`Đã áp dụng ${applied} bản sửa SEO`);
    } catch (error: any) {
      toast.error(error.message || `Đã áp dụng ${applied} bản sửa, nhưng một sản phẩm bị lỗi`);
    } finally {
      setApplyingId(null);
      setBatchApplying(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-[#1e4b64]" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">SEO Automation</h3>
            </div>
            <p className="text-xs font-medium leading-5 text-white/40">
              Hệ thống tự chấm điểm sản phẩm, phát hiện thiếu meta, mô tả mỏng, thiếu ảnh, thiếu biến thể và tín hiệu từ khóa.
            </p>
          </div>
          <div className={cn("shrink-0 rounded-2xl border px-4 py-3 text-center", scoreTone(summary.averageScore))}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Điểm TB</p>
            <p className="text-2xl font-black leading-none">{summary.averageScore}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
            <p className="text-2xl font-black text-emerald-400">{summary.good.length}</p>
            <p className="mt-1 text-[10px] font-black uppercase text-white/35">Tốt</p>
          </div>
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
            <p className="text-2xl font-black text-amber-400">{summary.warning.length}</p>
            <p className="mt-1 text-[10px] font-black uppercase text-white/35">Cần tối ưu</p>
          </div>
          <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3">
            <p className="text-2xl font-black text-red-400">{summary.critical.length}</p>
            <p className="mt-1 text-[10px] font-black uppercase text-white/35">Ưu tiên</p>
          </div>
        </div>

        {topIssues.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Lỗi lặp lại nhiều nhất</p>
            {topIssues.map(({ issue, count }) => (
              <div key={issue.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <span className="text-xs font-bold text-white/60">{issue.label}</span>
                <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/35">{count} SP</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Việc cần làm ngay</h3>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            Auto Audit
          </span>
        </div>

        {priorityProducts.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleGenerateBatch}
              disabled={batchGenerating || batchApplying}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-[11px] font-black uppercase tracking-widest text-amber-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {batchGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Tạo 5 bản sửa
            </button>
            <button
              type="button"
              onClick={handleApplyBatch}
              disabled={batchGenerating || batchApplying || Object.keys(fixes).length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[11px] font-black uppercase tracking-widest text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {batchApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Áp dụng đã tạo
            </button>
          </div>
        )}

        <div className="space-y-3">
          {priorityProducts.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-black">Tất cả sản phẩm đang ổn</p>
              </div>
            </div>
          ) : priorityProducts.map(({ product, audit }) => {
            const fix = fixes[product.id];
            const isGenerating = generatingId === product.id;
            const isApplying = applyingId === product.id;

            return (
            <div key={product.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-black", scoreTone(audit.score))}>
                  {audit.score}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-black text-white">{product.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {audit.quickWins.map(issue => (
                      <span
                        key={issue.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold",
                          issue.severity === 'critical'
                            ? 'bg-red-500/10 text-red-300'
                            : 'bg-amber-500/10 text-amber-300'
                        )}
                      >
                        <AlertCircle className="h-3 w-3" />
                        {issue.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateFix(product, audit.issues.map(issue => `${issue.label}: ${issue.detail}`))}
                  disabled={isGenerating || isApplying || batchGenerating || batchApplying}
                  className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-amber-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onOptimizeProduct(product)}
                  disabled={batchGenerating || batchApplying}
                  className="shrink-0 rounded-lg bg-[#1e4b64] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-[#153446]"
                >
                  Sửa
                </button>
              </div>
              {fix && (
                <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-300">Bản sửa AI</p>
                    <button
                      type="button"
                      onClick={() => handleApplyFix(product)}
                      disabled={isApplying || batchGenerating || batchApplying}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isApplying ? 'Đang lưu...' : 'Áp dụng'}
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-white">{fix.seoTitle}</p>
                    <p className="leading-5 text-white/50">{fix.metaDescription}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {fix.features.slice(0, 4).map(feature => (
                        <span key={feature} className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold text-white/45">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>

        <div className="mt-4 rounded-xl border border-blue-500/15 bg-blue-500/5 p-3">
          <div className="flex gap-2 text-blue-300">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs font-medium leading-5">
              Bước kế tiếp có thể nối AI để tự viết title, meta description và mô tả theo điểm thiếu của từng sản phẩm.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductSeoScoreBadge({ product }: { product: Product }) {
  const audit = auditProductSeo(product);

  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex min-w-12 items-center justify-center rounded-lg border px-2 py-1 text-xs font-black", scoreTone(audit.score))}>
        {audit.score}
      </span>
      <span className="hidden max-w-40 truncate text-[11px] font-bold text-white/35 xl:inline">
        {audit.quickWins[0]?.label || 'SEO ổn'}
      </span>
    </div>
  );
}
