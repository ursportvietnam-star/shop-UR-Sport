import React from 'react';
import { BlogPost } from '../types';
import { SEO_DAILY_SUGGESTIONS, SeoSuggestion, getDailySeoSuggestions } from '../lib/dailySeoSuggestions';
import { BrainCircuit, ClipboardList, WandSparkles } from 'lucide-react';

type DailySeoSuggestionPanelProps = {
  blogPosts: BlogPost[];
  onUseSuggestion?: (suggestion: SeoSuggestion) => void;
  onGenerateSuggestion?: (suggestion: SeoSuggestion) => void;
  generatingSlug?: string;
};

export function DailySeoSuggestionPanel({
  blogPosts,
  onUseSuggestion,
  onGenerateSuggestion,
  generatingSlug
}: DailySeoSuggestionPanelProps) {
  const suggestedPosts = React.useMemo(
    () => getDailySeoSuggestions(blogPosts, 4),
    [blogPosts]
  );
  const dailySuggestion = suggestedPosts[0];

  return (
    <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">AI Gợi Ý Bài Viết</h3>
        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/35">
          10 file .md
        </span>
      </div>

      <div className="space-y-3">
        {suggestedPosts.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm font-bold text-emerald-300">
            Tất cả {SEO_DAILY_SUGGESTIONS.length} bài trong kế hoạch SEO đã có slug tương ứng trong blog.
          </div>
        ) : (
          <>
            {dailySuggestion && (
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-sky-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
                    Hôm nay
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

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onUseSuggestion?.(dailySuggestion)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/70 transition-colors hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-sky-100"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Dùng gợi ý
                  </button>
                  <button
                    type="button"
                    onClick={() => onGenerateSuggestion?.(dailySuggestion)}
                    disabled={generatingSlug === dailySuggestion.slug}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingSlug === dailySuggestion.slug ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <WandSparkles className="h-3.5 w-3.5" />
                    )}
                    Tạo bằng AI
                  </button>
                </div>

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
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onUseSuggestion?.(post)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/55 transition-colors hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-sky-100"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Dùng gợi ý
                  </button>
                  <button
                    type="button"
                    onClick={() => onGenerateSuggestion?.(post)}
                    disabled={generatingSlug === post.slug}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-black text-white/65 transition-colors hover:bg-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingSlug === post.slug ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <BrainCircuit className="h-3.5 w-3.5" />
                    )}
                    Tạo
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
