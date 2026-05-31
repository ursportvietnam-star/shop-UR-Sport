import React from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LazyImage } from './LazyImage';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  content?: string;
  image: string;
  category?: string;
  date?: string;
  author?: string;
}

interface FeaturedCarouselProps {
  posts: Post[];
}

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ posts = [] }) => {
  const navigate = useNavigate();
  if (posts.length === 0) return null;

  const getBlogPostSlug = (post: Post) => String(post?.slug || post?.id || '').trim();
  const getBlogPostPath = (post: Post) => `/blog/${getBlogPostSlug(post)}`;

  // Main featured post (the latest post)
  const mainPost = posts[0];
  // Side featured posts (next 2 posts)
  const sidePosts = posts.slice(1, 3);

  return (
    <section className="w-full mb-16">
      <div className="flex flex-col items-start mb-8">
        <span className="text-[10px] font-black uppercase text-[#1e4b64] tracking-[0.28em] mb-2">TIÊU ĐIỂM</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">Bài Viết Nổi Bật</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Main Highlight Post (Left Column) - Spans 8 cols */}
        {mainPost && (
          <div 
            onClick={() => navigate(getBlogPostPath(mainPost))}
            className="lg:col-span-8 group cursor-pointer relative overflow-hidden rounded-[24px] bg-[#061325] h-[380px] sm:h-[460px] lg:h-auto flex flex-col justify-end shadow-md hover:shadow-lg transition-all duration-500 border border-zinc-900/10"
          >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <LazyImage 
                src={mainPost.image} 
                alt={mainPost.title} 
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061325] via-[#061325]/90 via-[#061325]/45 to-transparent" />
            </div>

            {/* Content overlay */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col max-w-3xl">
              {mainPost.category && (
                <span className="self-start px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-400 text-zinc-955 mb-3 shadow-xs">
                  {mainPost.category}
                </span>
              )}

              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-3 group-hover:text-sky-300 transition-colors">
                {mainPost.title}
              </h3>

              <div className="w-full h-px bg-white/10 my-3" />

              <p className="text-zinc-300 text-xs sm:text-sm font-medium leading-relaxed mb-4 line-clamp-2">
                {mainPost.excerpt}
              </p>

              {/* Read Link */}
              <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-sky-400 group-hover:text-sky-300 transition-colors">
                <span>Đọc bài</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        )}

        {/* Trending Column (Right Column) - Spans 4 cols */}
        <div className="lg:col-span-4 flex flex-col justify-start gap-6">
          {sidePosts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(getBlogPostPath(post))}
              className="group cursor-pointer flex flex-col w-full"
            >
              {/* Image Container */}
              <div className="w-full aspect-[16/9] overflow-hidden rounded-[16px] bg-zinc-50 relative border border-zinc-100/50 mb-3">
                <LazyImage 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103" 
                />
                {post.category && (
                  <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-md text-zinc-900 border border-white/20 shadow-xs">
                    {post.category}
                  </span>
                )}
              </div>

              {/* Title below image */}
              <h4 className="font-bold text-[14px] sm:text-[15px] text-zinc-900 leading-snug line-clamp-2 group-hover:text-[#1e4b64] transition-colors">
                {post.title}
              </h4>
            </div>
          ))}

          {/* If there are no side posts, display a CTA card to keep column heights visually aligned */}
          {sidePosts.length === 0 && (
            <div className="flex-grow flex flex-col justify-center items-center p-8 text-center rounded-[24px] bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">UR Sport Team</span>
              <h4 className="font-extrabold text-zinc-700 max-w-xs leading-snug mb-4">Theo dõi những kiến thức mới hàng ngày tại UR Sport</h4>
              <button onClick={() => navigate('/shop')} className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-zinc-900 hover:bg-[#1e4b64] text-white transition-all shadow-sm">Mua sắm ngay</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
