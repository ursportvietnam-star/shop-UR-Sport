import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Hero: React.FC<{ onShopClick: () => void }> = ({ onShopClick }) => {
  return (
    <div className="relative h-[80vh] w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&q=80&w=2000"
          alt="Hero"
          className="h-full w-full object-cover opacity-70 scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-linear-to-r from-black/60 to-transparent" />
      </div>

      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <span className="text-secondary font-black uppercase tracking-widest text-sm mb-6 block">
            BỘ SƯU TẬP THIẾT BỊ CAO CẤP
          </span>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black italic tracking-tighter text-white uppercase leading-[1] mb-8">
            Hiệu Suất <br />
            Vượt Trội <br />
            Bắt Đầu Từ Đây.
          </h1>
          <p className="text-lg sm:text-xl text-zinc-300 max-w-lg mb-10 leading-relaxed font-medium">
            Trang bị đồ thể thao hiện đại, mang lại sự tự tin và thoải mái tuyệt đối trong mọi buổi tập.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={onShopClick}
              className="bg-[#0082c8] border-2 border-[#0082c8] text-white hover:bg-white hover:text-[#0082c8] font-black px-10 py-6 rounded-full text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30"
            >
              Khám phá Bộ sưu tập UR
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
