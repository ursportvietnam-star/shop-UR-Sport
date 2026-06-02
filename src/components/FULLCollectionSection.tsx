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
    image: '/images/ao-thun-nam.webp',
    description: 'Cotton, graphic, oversize cho mặc hằng ngày.',
  },
  'ao-thun-the-thao-nam': {
    image: '/images/ao-thun-the-thao-nam.webp',
    description: 'Thoáng khí, co giãn, hợp gym và chạy bộ.',
  },
  'ao-polo-nam': {
    image: '/images/ao-polo-nam.webp',
    description: 'Gọn gàng hơn cho đi làm, đi chơi, chơi golf.',
  },
  'quan-the-thao-nam': {
    image: '/images/quan-the-thao-nam.webp',
    description: 'Short, jogger, quần tập dễ vận động.',
  },
  'phu-kien-the-thao': {
    image: '/images/phu-kien-the-thao.webp',
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
      <div className="mb-8 flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
        <div className="homepage-heading-copy">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-[#1e4b64]">
            Danh mục nổi bật
          </span>
          <h2 className="section-title">
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
