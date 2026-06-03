import React from 'react';
import { BlogPost } from '../types';
import {
  SEO_DAILY_SUGGESTIONS,
  SeoSuggestion,
  getDailySeoSuggestions,
  getSeoSuggestionProgress
} from '../lib/dailySeoSuggestions';
import { BrainCircuit, CheckCircle2, ClipboardList, RefreshCw, WandSparkles } from 'lucide-react';

type DailySeoSuggestionPanelProps = {
  blogPosts: BlogPost[];
  onUseSuggestion?: (suggestion: SeoSuggestion) => void;
  onGenerateSuggestion?: (suggestion: SeoSuggestion) => void;
  generatingSlug?: string;
};

const SuggestionActions = ({
  generatingSlug,
  onGenerateSuggestion,
  onUseSuggestion,
  suggestion,
  primary = false
}: {
  generatingSlug?: string;
  onGenerateSuggestion?: (suggestion: SeoSuggestion) => void;
  onUseSuggestion?: (suggestion: SeoSuggestion) => void;
  primary?: boolean;
  suggestion: SeoSuggestion;
}) => (
  <div className="mt-3 flex flex-wrap gap-2">
    <button
      type="button"
      onClick={() => onUseSuggestion?.(suggestion)}
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/70 transition-colors hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-sky-100"
    >
      <ClipboardList className="h-3.5 w-3.5" />
      Dùng gợi ý
    </button>
    <button
      type="button"
      onClick={() => onGenerateSuggestion?.(suggestion)}
      disabled={generatingSlug === suggestion.slug}
      className={primary
        ? "inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        : "inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-black text-white/65 transition-colors hover:bg-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {generatingSlug === suggestion.slug ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
      ) : primary ? (
        <WandSparkles className="h-3.5 w-3.5" />
      ) : (
        <BrainCircuit className="h-3.5 w-3.5" />
      )}
      {primary ? 'Tạo bằng AI' : 'Tạo'}
    </button>
  </div>
);

export function DailySeoSuggestionPanel({
  blogPosts,
  onUseSuggestion,
  onGenerateSuggestion,
  generatingSlug
}: DailySeoSuggestionPanelProps) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [lastCheckedAt, setLastCheckedAt] = React.useState<Date | null>(null);
  const suggestedPosts = React.useMemo(
    () => getDailySeoSuggestions(blogPosts, 4),
    [blogPosts, refreshKey]
  );
  const progress = React.useMemo(
    () => getSeoSuggestionProgress(blogPosts),
    [blogPosts, refreshKey]
  );
  const dailySuggestion = suggestedPosts[0];

  const handleRecheck = () => {
    setRefreshKey(prev => prev + 1);
    setLastCheckedAt(new Date());
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">AI gợi ý bài viết</h3>
          <p className="mt-1 text-xs font-bold text-white/35">
            {progress.pendingCount} bài chưa viết · {progress.writtenCount} bài đã có slug trong blog
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lastCheckedAt && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              Đã check {lastCheckedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={handleRecheck}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/55 transition-colors hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-sky-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Check lại bài đã viết
          </button>
          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/35">
            {SEO_DAILY_SUGGESTIONS.length} bài kế hoạch
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {suggestedPosts.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm font-bold text-emerald-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Tất cả {SEO_DAILY_SUGGESTIONS.length} bài trong kế hoạch SEO đã có slug tương ứng trong blog. Sau khi publish bài mới, bấm “Check lại bài đã viết” để cập nhật trạng thái.
              </p>
            </div>
          </div>
        ) : (
          <>
            {dailySuggestion && (
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-sky-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
                    Bài tiếp theo cần viết
                  </span>
                  <span className="rounded-lg bg-sky-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
                    {dailySuggestion.funnel}
                  </span>
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/45">
                    {dailySuggestion.intent}
                  </span>
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/45">
                    Cụm: {dailySuggestion.cluster}
                  </span>
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/45">
                    MD: {dailySuggestion.sourceFile}
                  </span>
                </div>

                <p className="text-base font-black leading-6 text-white">{dailySuggestion.title}</p>
                <p className="mt-1 text-xs font-medium text-white/45">Keyword: {dailySuggestion.keyword}</p>
                <p className="mt-2 text-xs font-medium leading-5 text-sky-100/70">{dailySuggestion.reason}</p>

                <SuggestionActions
                  generatingSlug={generatingSlug}
                  onGenerateSuggestion={onGenerateSuggestion}
                  onUseSuggestion={onUseSuggestion}
                  primary
                  suggestion={dailySuggestion}
                />

                <div className="mt-3 rounded-lg border border-sky-500/20 bg-sky-950/30 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">URL chuẩn SEO bài viết</p>
                  <p className="mt-1 break-all font-mono text-xs font-black text-white">/blog/{dailySuggestion.slug}</p>
                </div>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">SEO Title</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-white">{dailySuggestion.seoTitle}</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">SEO Description</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-white/55">{dailySuggestion.seoDescription}</p>
                  </div>
                </div>

                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-white/30">
                  Link nội bộ nên gắn trong bài
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dailySuggestion.internalLinks.map(link => (
                    <span key={link} className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold text-white/40">
                      {link}
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-white/30">Outline H2/H3 ngắn</p>
                <div className="mt-2 space-y-2">
                  {dailySuggestion.outline.map(section => (
                    <div key={section.h2} className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2">
                      <p className="text-xs font-black leading-5 text-white">{section.h2}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {section.h3.map(item => (
                          <span key={item} className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold text-white/35">
                            H3: {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestedPosts.slice(1).map(post => (
              <div key={post.slug} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-sky-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
                    Tiếp theo
                  </span>
                  <span className="rounded-lg bg-sky-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
                    {post.funnel}
                  </span>
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/40">
                    Cụm: {post.cluster}
                  </span>
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/40">
                    MD: {post.sourceFile}
                  </span>
                </div>
                <p className="text-sm font-black leading-5 text-white">{post.title}</p>
                <p className="mt-1 text-xs font-medium text-white/40">Keyword: {post.keyword}</p>
                <div className="mt-3 rounded-lg border border-sky-500/15 bg-sky-500/5 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">URL chuẩn SEO bài viết</p>
                  <p className="mt-1 break-all font-mono text-xs font-black text-white">/blog/{post.slug}</p>
                </div>
                <SuggestionActions
                  generatingSlug={generatingSlug}
                  onGenerateSuggestion={onGenerateSuggestion}
                  onUseSuggestion={onUseSuggestion}
                  suggestion={post}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
