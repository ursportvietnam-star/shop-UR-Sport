import React, { useState, useEffect, useRef } from 'react';
import { Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ZALO_URL = 'https://zalo.me/0917722425';
const PHONE_NUMBER = 'tel:0917722425';

// iOS-style Zalo icon (white bg + blue chat bubble) — dùng làm nút toggle chính
const ZALO_ICON_IOS = 'https://res.cloudinary.com/dcj4qhcfh/image/upload/v1778166005/media/ximp16qsaxdt7noebddh.jpg';

export function FloatingContactMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [isZaloHovered, setIsZaloHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowPhone(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (isOpen) setShowPhone(false);
  };

  return (
    <div
      ref={menuRef}
      className="fixed bottom-8 right-6 sm:bottom-10 sm:right-10 z-[100] flex flex-col items-center gap-4"
    >
      {/* Expanded Actions */}
      <div
        className={cn(
          'flex flex-col items-end gap-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-10 pointer-events-none'
        )}
      >
        {/* Zalo Option */}
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 outline-none"
          onMouseEnter={() => setIsZaloHovered(true)}
          onMouseLeave={() => setIsZaloHovered(false)}
        >
          <div className={cn(
            "px-4 py-2 bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl transition-all duration-300 transform",
            isZaloHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
          )}>
            <span className="text-[#0068ff] text-[13px] font-bold tracking-tight">Nhắn Zalo cho UR SPORT</span>
          </div>
          <div className="h-14 w-14 rounded-[22px] bg-white p-0.5 shadow-2xl group-hover:scale-110 group-active:scale-95 transition-all duration-300 border border-white/50 overflow-hidden">
            <img 
              src='https://res.cloudinary.com/dcj4qhcfh/image/upload/v1778164803/media/rbkdvi2xgqeg6b79cq1n.webp' 
              alt="Zalo" 
              className="h-full w-full object-cover rounded-[20px]" 
            />
          </div>
        </a>

        {/* Phone Option */}
        <div className="flex items-center gap-4 group">
          <div
            className={cn(
              "flex items-center gap-3 bg-white/80 backdrop-blur-md border border-white/40 px-0 rounded-2xl shadow-xl transition-all duration-500 overflow-hidden whitespace-nowrap",
              showPhone ? "max-w-[220px] opacity-100 px-5 py-3" : "max-w-0 opacity-0 border-none"
            )}
          >
            <Phone className="h-4 w-4 text-[#1a56e8] fill-[#1a56e8]/10" />
            <a href={PHONE_NUMBER} className="text-[#1a56e8] font-black text-sm tracking-widest hover:underline">
              0917.722.425
            </a>
          </div>
          <button
            onClick={() => setShowPhone(!showPhone)}
            className={cn(
              "flex items-center justify-center h-14 w-14 rounded-[22px] shadow-2xl transition-all duration-300 border border-white/50",
              showPhone 
                ? "bg-white text-[#1a56e8] rotate-[135deg]" 
                : "bg-[#1a56e8] text-white hover:scale-110 active:scale-95"
            )}
          >
            {showPhone ? <X className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={toggleMenu}
        className={cn(
          "relative h-16 w-16 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90",
          isOpen ? "rotate-90 scale-90" : "hover:scale-105"
        )}
      >
        {/* Layered Shadows & Glow */}
        <div className={cn(
          "absolute inset-0 rounded-[24px] transition-all duration-500",
          isOpen 
            ? "bg-white/90 backdrop-blur-xl shadow-inner border border-black/5" 
            : "bg-[#0f172a] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.4)]"
        )} />
        
        {/* Animated Rings */}
        {!isOpen && (
          <div className="absolute -inset-1.5 border border-blue-400/20 rounded-[28px] animate-[ping_3s_infinite]" />
        )}

        <div className="relative z-10 flex items-center justify-center">
          {isOpen ? (
            <X className="h-7 w-7 text-slate-800" />
          ) : (
            <div className="relative h-16 w-16 rounded-[24px] overflow-hidden">
               <img 
                src={ZALO_ICON_IOS} 
                alt="Contact" 
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
