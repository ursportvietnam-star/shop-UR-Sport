import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  inverse?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, inverse = false }) => {
  return (
    <div className={cn("inline-flex flex-col items-center select-none", className)}>
      <div className="relative flex items-end leading-none">
        <span className="font-black text-[46px] sm:text-[64px] italic tracking-[-0.08em] text-[#0e76d9]">
          U
        </span>

        <span className="relative font-black text-[46px] sm:text-[64px] italic tracking-[-0.08em] text-[#0a3c6f] -ml-1">
          R
          <span className="absolute -top-3 -right-6 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0a3c6f] bg-white text-[12px] font-bold not-italic leading-none text-[#0a3c6f]">
            ®
          </span>
        </span>
      </div>

      <div
        className={cn(
          "-mt-1 text-center text-[15px] sm:text-[24px] font-light tracking-[0.08em] uppercase leading-none",
          inverse ? "text-white/80" : "text-[#475569]"
        )}
      >
        SPORT
      </div>
    </div>
  );
};
