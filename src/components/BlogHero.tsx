import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface BlogHeroProps {
  title?: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: () => void;
  trendingTags?: string[];
  onTagClick?: (tag: string) => void;
}

export const BlogHero: React.FC<BlogHeroProps> = ({
  title = 'Tạp chí Thể thao UR SPORT',
  subtitle = 'Khám phá bí quyết chọn size, chất liệu vải cao cấp và phong cách phối đồ thể thao nam thời thượng dẫn đầu xu hướng.',
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  trendingTags = ['Áo thun nam', 'Chất liệu', 'Oversize', 'Chạy bộ', 'Tập gym'],
  onTagClick
}) => {
  return (
    <header className="relative w-full rounded-[32px] overflow-hidden mb-12 shadow-xl border border-zinc-100 bg-[#0f172a]">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-sky-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-10%] w-[60%] aspect-square rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none" />
      
      {/* Visual Pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />

      <div className="relative z-10 px-6 py-16 md:px-12 md:py-24 text-center max-w-4xl mx-auto flex flex-col items-center">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/20 mb-6 uppercase">
          UR SPORT MAGAZINE
        </span>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-6 text-balance">
          {title}
        </h1>

        <p className="text-zinc-300 text-base sm:text-lg md:text-xl font-medium max-w-2xl mb-10 leading-relaxed text-balance">
          {subtitle}
        </p>

        {/* Glassmorphic Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.();
          }}
          className="w-full max-w-xl relative flex items-center mb-6 group"
        >
          <div className="absolute left-4 text-zinc-400 group-focus-within:text-sky-400 transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label="Tìm kiếm bài viết"
            className="w-full h-14 pl-12 pr-28 rounded-2xl bg-white/5 hover:bg-white/8 backdrop-blur-md border border-white/10 text-white placeholder-zinc-400 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition-all shadow-2xl"
            placeholder="Tìm bài viết: size, chất liệu, cách phối..."
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.3em] text-white transition-all hover:bg-sky-400"
            aria-label="Tìm kiếm bài viết"
          >
            <Search className="h-4 w-4" />
            Tìm
          </button>
        </form>

        {/* Trending Tags */}
        {trendingTags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Xu hướng:</span>
            {trendingTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white border border-white/5 hover:border-white/10 transition-all shadow-sm"
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
