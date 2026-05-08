import React from 'react';
import { CATEGORY_METADATA } from '../data';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Category } from '../types';

interface FULLCollectionSectionProps {
  onCategorySelect: (c: Category) => void;
}

export function FULLCollectionSection({ onCategorySelect }: FULLCollectionSectionProps) {
  const navigate = useNavigate();

  // Hình ảnh chất lượng cao cho collection
  const getCategoryImage = (slug: string) => {
    switch (slug) {
      case 'ao-thun-the-thao-nam':
        return 'https://images.unsplash.com/photo-1581009146145-b5ef03a7401f?auto=format&fit=crop&q=80&w=1200';
      case 'ao-polo-nam':
        return 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&q=80&w=1200';
      case 'quan-the-thao-nam':
        return 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=1200';
      case 'ao-thun-nam':
        return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200';
      case 'phu-kien-the-thao':
        return 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=1200';
      default:
        return 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=1200';
    }
  };

  const handleCategoryClick = (categoryName: Category) => {
    onCategorySelect(categoryName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Lấy 4 danh mục chính để hiển thị dạng Bento Box
  const mainCategories = CATEGORY_METADATA.slice(0, 4);

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 bg-white">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <span className="text-[#1e4b64] font-black tracking-widest uppercase text-xs mb-2 block">Premium Collections</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-zinc-900 leading-none">
            Khám phá <span className="text-[#1e4b64]">Bộ Sưu Tập</span>
          </h2>
        </div>
        <p className="text-zinc-500 font-medium max-w-sm text-sm sm:text-base">
          Lựa chọn trang phục thể thao nam hoàn hảo cho mọi nhu cầu luyện tập và phong cách hàng ngày của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[250px] lg:auto-rows-[320px]">
        {/* Khối lớn nhất - Thường là danh mục top 2 */}
        {mainCategories[1] && (
          <div 
            onClick={() => handleCategoryClick(mainCategories[1].name)}
            className="group relative overflow-hidden rounded-[2.5rem] lg:col-span-2 lg:row-span-2 cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-700"
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-700 z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
            <img 
              src={getCategoryImage(mainCategories[1].slug)} 
              alt={mainCategories[1].name} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute bottom-0 left-0 p-8 lg:p-12 z-20 w-full">
              <h3 className="text-3xl lg:text-5xl font-black text-white mb-3 transform transition duration-500 group-hover:-translate-y-2">{mainCategories[1].name}</h3>
              <p className="text-white/80 font-medium text-base lg:text-lg max-w-md transform transition duration-500 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:-translate-y-2">Hiệu suất tối đa, thoáng mát vượt trội cho mọi bộ môn.</p>
              <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 rounded-full font-bold opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                Khám phá ngay <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}

        {/* Các khối nhỏ hơn */}
        {mainCategories.map((cat, index) => {
          if (index === 1) return null; // Bỏ qua khối lớn
          
          return (
            <div 
              key={cat.slug}
              onClick={() => handleCategoryClick(cat.name)}
              className="group relative overflow-hidden rounded-[2.5rem] cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-700 z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              <img 
                src={getCategoryImage(cat.slug)} 
                alt={cat.name} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute bottom-0 left-0 p-6 z-20">
                <h3 className="text-2xl font-black text-white mb-2 transform transition duration-500 group-hover:-translate-y-1">{cat.name}</h3>
                <div className="flex items-center gap-2 text-white/90 text-sm font-bold opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#1e4b64]">
                  Xem thêm <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Khối Phụ kiện */}
        {CATEGORY_METADATA[4] && (
          <div 
            onClick={() => handleCategoryClick(CATEGORY_METADATA[4].name)}
            className="group relative overflow-hidden rounded-[2.5rem] md:col-span-2 lg:col-span-1 bg-zinc-900 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col items-center justify-center p-8 text-center border border-zinc-800"
          >
            <div className="absolute inset-0 opacity-30 mix-blend-overlay grayscale group-hover:grayscale-0 transition-all duration-700">
              <img 
                src={getCategoryImage(CATEGORY_METADATA[4].slug)} 
                alt={CATEGORY_METADATA[4].name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative z-20">
              <h3 className="text-2xl font-black text-white mb-3">{CATEGORY_METADATA[4].name}</h3>
              <p className="text-zinc-400 text-sm font-medium mb-6">Trang bị hoàn hảo cho luyện tập</p>
              <span className="inline-flex items-center justify-center px-6 py-2.5 bg-white text-zinc-900 font-bold rounded-full text-sm group-hover:bg-[#1e4b64] group-hover:text-white transition-colors duration-300">
                Xem phụ kiện
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
