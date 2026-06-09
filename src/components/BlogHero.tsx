import React from 'react';
import { Search } from 'lucide-react';

interface BlogHeroProps {
  title?: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  trendingTags?: string[];
  onTagClick?: (tag: string) => void;
}

export const BlogHero: React.FC<BlogHeroProps> = ({
  title = '',
  subtitle = '',
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = '',
  trendingTags = [],
  onTagClick
}) => {
  return (
    <header className="relative mb-12 w-full overflow-hidden rounded-[32px] border border-zinc-100 bg-[#0f172a] shadow-xl">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(30,75,100,0.95),rgba(15,23,42,0.96)),url('/images/og-ursport.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff12_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 py-16 text-center md:px-12 md:py-24">
        <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-sky-300/25 bg-sky-300/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-sky-200">
          UR SPORT BLOG
        </span>

        <h1 className="mb-6 text-balance text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          {title}
        </h1>

        <p className="mb-10 max-w-3xl text-balance text-base font-medium leading-relaxed text-zinc-200 sm:text-lg md:text-xl">
          {subtitle}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit?.();
          }}
          className="group relative mb-6 flex w-full max-w-xl items-center"
        >
          <div className="absolute left-4 text-zinc-400 transition-colors group-focus-within:text-sky-300">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            aria-label="Tìm kiếm bài viết"
            className="h-14 w-full rounded-2xl border border-white/10 bg-white/8 pl-12 pr-28 text-base font-semibold text-white shadow-2xl backdrop-blur-md transition-all placeholder:text-zinc-400 hover:bg-white/10 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
            placeholder={searchPlaceholder}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-sky-400"
            aria-label="Tìm kiếm bài viết"
          >
            <Search className="h-4 w-4" />
            Tìm
          </button>
        </form>

        {trendingTags.length > 0 && (
          <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Từ khóa nổi bật:</span>
            {trendingTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="rounded-full border border-white/10 bg-white/8 px-3.5 py-1.5 text-xs font-bold text-zinc-100 shadow-sm transition-all hover:border-white/20 hover:bg-white/15 hover:text-white"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default BlogHero;
