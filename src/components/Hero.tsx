import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BANNERS } from '../data';

export const Hero: React.FC<{ onShopClick: () => void }> = ({ onShopClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[85vh] w-full overflow-hidden bg-black">
      <AnimatePresence mode="popLayout">
        <motion.div 
          key={currentIndex}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img
            src={BANNERS[currentIndex].image}
            alt={BANNERS[currentIndex].title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-linear-to-r from-black/80 to-transparent" />

      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl relative z-10">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-[#0082c8] font-bold uppercase tracking-[0.3em] text-xs sm:text-sm mb-6 block"
          >
            BỘ SƯU TẬP THIẾT BỊ CAO CẤP 2026
          </motion.span>
          
          <div className="h-[200px] sm:h-[250px] md:h-[300px] mb-8">
            <AnimatePresence mode="wait">
              <motion.h1 
                key={currentIndex}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white uppercase leading-[0.9]"
              >
                {BANNERS[currentIndex].title.split(' ')[0]} <br />
                <span className="text-[#0082c8]">{BANNERS[currentIndex].title.split(' ').slice(1).join(' ')}</span> <br />
                MỖI NGÀY.
              </motion.h1>
            </AnimatePresence>
          </div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-zinc-300 max-w-xl mb-12 leading-relaxed font-medium"
          >
            Trang bị đồ thể thao hiện đại, mang lại sự tự tin và thoải mái tuyệt đối trong mọi buổi tập.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <Button 
              onClick={onShopClick}
              className="bg-[#0082c8] border-2 border-[#0082c8] text-white hover:bg-white hover:text-[#0082c8] font-bold px-8 sm:px-12 py-6 sm:py-8 rounded-2xl text-[12px] sm:text-[13px] uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95"
            >
              Khám phá ngay
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
        
        {/* Banner indicators */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-[#0082c8]' : 'w-2 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
