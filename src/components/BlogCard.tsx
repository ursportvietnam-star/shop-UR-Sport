import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock, User } from 'lucide-react';
import { LazyImage } from './LazyImage';

interface BlogCardProps {
  post: {
    id: string;
    slug?: string;
    title: string;
    excerpt?: string;
    content?: string;
    image: string;
    category?: string;
    date?: string;
    author?: string;
  };
}

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  const title = post?.title || 'Bài viết';
  const excerpt = post?.excerpt || '';
  const image = post?.image || '';
  
  // Estimate reading time based on content
  const wordCount = post.content ? post.content.split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200)) || 3;

  return (
    <article className="group h-full flex flex-col rounded-3xl overflow-hidden bg-white border border-zinc-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500">
      {/* Visual Image container */}
      <div className="relative aspect-[16/10] bg-zinc-50 overflow-hidden">
        {image ? (
          <LazyImage 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center text-zinc-300 font-bold">
            UR Sport
          </div>
        )}
        
        {/* Absolute Category Badge */}
        {post.category && (
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/80 backdrop-blur-md text-zinc-900 border border-white/20 shadow-sm">
              {post.category}
            </span>
          </div>
        )}
      </div>

      {/* Content wrapper */}
      <div className="p-6 flex-grow flex flex-col">
        {/* Metadata section */}
        <div className="flex flex-wrap items-center gap-3 text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{post.date || 'Gần đây'}</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-300" />
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{readTime} phút đọc</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-zinc-900 leading-snug tracking-tight mb-3 line-clamp-2 group-hover:text-[#1e4b64] transition-colors">
          {title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-zinc-500 font-medium leading-relaxed line-clamp-3 mb-6 flex-grow">
          {excerpt}
        </p>

        {/* Author Footer */}
        <div className="pt-4 border-t border-zinc-50 flex items-center gap-2.5 mt-auto">
          <div className="h-7 w-7 rounded-full bg-[#1e4b64] text-white font-black text-[10px] flex items-center justify-center uppercase shadow-sm">
            {(post.author || 'U').charAt(0)}
          </div>
          <span className="text-xs font-bold text-zinc-700">{post.author || 'UR Sport'}</span>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
