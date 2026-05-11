import React, { useState, useEffect, useRef } from 'react';
import { Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function FloatingContactMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [isZaloHovered, setIsZaloHovered] = useState(false);
  const [settings, setSettings] = useState({
    zaloPhone: '0917722425',
    callPhone: '0917722425',
    zaloIcon: 'https://res.cloudinary.com/dcj4qhcfh/image/upload/v1778164803/media/rbkdvi2xgqeg6b79cq1n.webp',
    callIcon: 'https://res.cloudinary.com/dcj4qhcfh/image/upload/v1778166005/media/ximp16qsaxdt7noebddh.jpg'
  });

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'floatingMenu')).then(snap => {
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      }
    });
  }, []);

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

  return (
    <div
      ref={menuRef}
      className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-[100] flex flex-col items-center"
    >
      {/* Expanded Menu */}
      <div
        className={cn(
          'flex flex-col items-end gap-3 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-20 pointer-events-none absolute'
        )}
      >
        {/* Zalo Option */}
        <a
          href={`https://zalo.me/${settings.zaloPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 outline-none"
          onMouseEnter={() => setIsZaloHovered(true)}
          onMouseLeave={() => setIsZaloHovered(false)}
        >
          <div className={cn(
            "px-3 py-1.5 bg-white/80 backdrop-blur-md border border-white/40 rounded-xl shadow-lg transition-all duration-300 transform",
            isZaloHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
          )}>
            <span className="text-[#0068ff] text-[12px] font-bold tracking-tight">Chat Zalo</span>
          </div>
          <div className="h-12 w-12 rounded-[18px] bg-white p-0.5 shadow-xl group-hover:scale-110 group-active:scale-95 transition-all duration-300 border border-white/50 overflow-hidden">
            <img 
              src={settings.zaloIcon} 
              alt="Chat Zalo hỗ trợ khách hàng" 
              loading="lazy"
              className="h-full w-full object-cover rounded-[16px]" 
            />
          </div>
        </a>

        {/* Phone Option */}
        <div className="flex items-center gap-3 group">
          <div
            className={cn(
              "flex items-center gap-2.5 bg-white/80 backdrop-blur-md border border-white/40 px-0 rounded-xl shadow-lg transition-all duration-500 overflow-hidden whitespace-nowrap",
              showPhone ? "max-w-[200px] opacity-100 px-4 py-2" : "max-w-0 opacity-0 border-none"
            )}
          >
            <Phone className="h-3.5 w-3.5 text-[#1a56e8] fill-[#1a56e8]/10" />
            <a href={`tel:${settings.callPhone}`} className="text-[#1a56e8] font-black text-xs tracking-widest">
              {settings.callPhone}
            </a>
          </div>
          <button
            onClick={() => setShowPhone(!showPhone)}
            className={cn(
              "flex items-center justify-center h-12 w-12 rounded-[18px] shadow-xl transition-all duration-300 border border-white/50",
              showPhone 
                ? "bg-white text-[#1a56e8] rotate-[135deg]" 
                : "bg-[#1a56e8] text-white hover:scale-110 active:scale-95"
            )}
          >
            <Phone className="h-5 w-5" />
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={() => { setIsOpen(false); setShowPhone(false); }}
          className="flex items-center justify-center h-10 w-10 text-black hover:scale-110 active:scale-90 transition-all duration-300 mr-1"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative h-14 w-14 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-90 group"
        >
          <div className="absolute inset-0 bg-[#0f172a] rounded-[20px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)]" />
          <div className="absolute -inset-1 border border-blue-400/20 rounded-[24px] animate-[ping_3s_infinite]" />
          <div className="relative z-10 h-14 w-14 rounded-[20px] overflow-hidden">
            <img 
              src={settings.callIcon} 
              alt="Liên hệ hỗ trợ UR Sport" 
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" 
            />
          </div>
        </button>
      )}
    </div>
  );
}
