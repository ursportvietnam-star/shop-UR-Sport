import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  inverse?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, inverse }) => {
  return (
    <div className={cn("flex flex-col items-start select-none", className)}>
      <div className="flex items-baseline leading-none">
        <span className="text-3xl sm:text-4xl font-black italic tracking-tighter text-[#0082c8]">U</span>
        <span className="text-3xl sm:text-4xl font-black italic tracking-tighter text-[#1e4b64] relative">
          R
          <span className="absolute -top-1 -right-4 text-[8px] font-bold border border-current rounded-full w-3 h-3 flex items-center justify-center not-italic">R</span>
        </span>
      </div>
      <div className={cn(
        "text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase mt-1",
        inverse ? "text-white/70" : "text-zinc-500"
      )}>
        SPORT
      </div>
    </div>
  );
};
