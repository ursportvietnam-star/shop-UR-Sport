import React from 'react';
import { cn } from '@/lib/utils';

type Item = {
  id: number | string;
  label: string;
  link: string;
};

interface CategoryTabsProps {
  categories: Item[];
  active?: string;
  onSelect?: (item: Item) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ categories = [], active = '', onSelect }) => {
  return (
    <div className="w-full mb-10">
      {/* Scrollable Container with Hidden Scrollbar styling */}
      <div className="w-full overflow-x-auto scrollbar-hide py-2">
        <div className="flex gap-2.5 items-center justify-start md:justify-center px-1">
          {categories.map((c) => {
            const isActive = active === c.label;
            return (
              <button
                key={c.id}
                onClick={() => onSelect?.(c)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap touch-target cursor-pointer shrink-0",
                  isActive
                    ? "bg-[#1e4b64] text-white shadow-lg shadow-sky-950/20 border border-[#1e4b64]"
                    : "bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 border border-zinc-200 shadow-sm"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;
