import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CATEGORY_METADATA } from '../data';
import { Category } from '../types';
import { LazyImage } from './LazyImage';

interface FULLCollectionSectionProps {
  onCategorySelect: (c: Category) => void;
}

const CATEGORY_DETAILS: Record<string, { image: string; description: string }> = {
  'ao-thun-nam': {
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=900',
    description: 'Cotton, graphic, oversize cho mặc hằng ngày.',
  },
  'ao-thun-the-thao-nam': {
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef03a7401f?auto=format&fit=crop&q=80&w=900',
    description: 'Thoáng khí, co giãn, hợp gym và chạy bộ.',
  },
  'ao-polo-nam': {
    image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&q=80&w=900',
    description: 'Gọn gàng hơn cho đi làm, đi chơi, chơi golf.',
  },
  'quan-the-thao-nam': {
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=900',
    description: 'Short, jogger, quần tập dễ vận động.',
  },
  'phu-kien-the-thao': {
    image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=900',
    description: 'Túi, bình nước, phụ kiện hoàn thiện set tập.',
  },
};

export function FULLCollectionSection({ onCategorySelect }: FULLCollectionSectionProps) {
  const handleCategoryClick = (categoryName: Category) => {
    onCategorySelect(categoryName);
    window.scrollTo(0, 0);
  };

  const categoryCards = CATEGORY_METADATA.map((category) => ({
    ...category,
    ...CATEGORY_DETAILS[category.slug],
  }));

  return (
    <section className="mx-auto max-w-[1440px] bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-[#1e4b64]">
            Danh mục nổi bật
          </span>
          <h2 className="text-3xl font-black leading-none tracking-tight text-zinc-900 sm:text-4xl">
            Mua theo nhu cầu
          </h2>
        </div>
        <p className="max-w-md text-sm font-medium leading-6 text-zinc-500 sm:text-base">
          Chọn nhanh đúng nhóm sản phẩm bạn cần, từ áo mặc hằng ngày đến đồ tập và phụ kiện.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {categoryCards.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => handleCategoryClick(cat.name)}
            className="group overflow-hidden rounded-3xl border border-zinc-100 bg-white text-left shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
              <LazyImage
                src={cat.image}
                alt={cat.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-black leading-tight text-white">{cat.name}</h3>
              </div>
            </div>
            <div className="min-h-[118px] p-5">
              <p className="mb-4 text-sm font-medium leading-5 text-zinc-500">{cat.description}</p>
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e4b64]">
                Xem sản phẩm <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
