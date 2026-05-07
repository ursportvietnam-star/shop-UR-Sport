import React, { useState, useEffect, useRef } from 'react';
import { Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ZALO_URL = 'https://zalo.me/0917722425';
const PHONE_NUMBER = 'tel:0917722425';

// iOS-style Zalo icon (white bg + blue chat bubble) — dùng làm nút toggle chính
const ZALO_ICON_IOS = 'data:image/webp;base64,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';

export function FloatingContactMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={menuRef}
      className="fixed bottom-6 right-5 sm:bottom-8 sm:right-7 z-[90] flex flex-col items-center gap-3"
    >
      {/* Expanded menu items */}
      <div
        className={cn(
          'flex flex-col items-center gap-3 transition-all duration-300 origin-bottom',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-75 translate-y-4 pointer-events-none'
        )}
      >
        {/* Zalo button */}
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex flex-col items-center"
          title="Chat Zalo"
        >
          <div className="mb-1.5 bg-white text-[#0068ff] text-[11px] font-bold px-3 py-1 rounded-full shadow-md border border-blue-100 whitespace-nowrap">
            Zalo
          </div>
          <div className="h-12 w-12 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-200 overflow-hidden">
            <img src='https://res.cloudinary.com/dcj4qhcfh/image/upload/v1777816867/products/s8ravrnwzfynn2dgwagn.jpg' alt="Zalo" className="h-full w-full object-cover" />
          </div>
        </a>

        {/* Phone button */}
        <a
          href={PHONE_NUMBER}
          className="group relative flex flex-col items-center"
          title="Gọi ngay"
        >
          <div className="mb-1.5 bg-white text-[#0082c8] text-[11px] font-bold px-3 py-1 rounded-full shadow-md border border-blue-100 whitespace-nowrap">
            Hotline
          </div>
          <div className="flex items-center justify-center h-12 w-12 bg-[#1a56e8] rounded-full shadow-lg group-hover:scale-110 transition-transform duration-200">
            <Phone className="h-5 w-5 text-white" />
          </div>
        </a>
      </div>

      {/* Close button */}
      <button
        onClick={() => setIsOpen(false)}
        className={cn(
          'flex items-center justify-center h-10 w-10 bg-white rounded-full shadow-md border border-gray-200 transition-all duration-300 hover:bg-gray-100',
          isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'
        )}
        aria-label="Đóng"
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>

      {/* Main toggle button — iOS Zalo icon */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'relative h-14 w-14 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,104,255,0.35)] transition-all duration-300 hover:scale-105',
          isOpen ? 'opacity-0 scale-50 pointer-events-none absolute' : 'opacity-100 scale-100 pointer-events-auto'
        )}
        aria-label="Liên hệ"
      >
        {/* Pulse ring */}
        <div className="absolute -inset-1.5 rounded-2xl bg-[#0068ff]/20 animate-ping" />
        <img src='https://res.cloudinary.com/dcj4qhcfh/image/upload/v1777814824/products/omyofio8vz0gvcv0uk62.png' alt="Liên hệ" className="h-full w-full object-cover relative z-10" />
      </button>
    </div>
  );
}
