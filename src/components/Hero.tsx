import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const Hero: React.FC<{ onShopClick: () => void }> = ({ onShopClick }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeBanners, setActiveBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'banners')).then(snap => {
      if (snap.exists() && snap.data().items?.length > 0) {
        setActiveBanners(snap.data().items);
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleButtonClick = () => {
    const currentBanner = activeBanners[currentIndex];
    if (currentBanner?.link) {
      if (currentBanner.link.startsWith('http')) {
        window.open(currentBanner.link, '_blank');
      } else {
        navigate(currentBanner.link);
      }
    } else {
      onShopClick();
    }
  };

  if (isLoading) return <div className="h-[500px] w-full bg-zinc-950 flex items-center justify-center text-white/10 font-black tracking-[0.5em] text-2xl animate-pulse uppercase">UR SPORT</div>;
  
  if (activeBanners.length === 0) return (
    <div className="relative h-[500px] w-full flex items-center justify-center bg-zinc-950 text-center px-4">
      <div className="max-w-2xl">
        <h2 className="text-white text-3xl font-black mb-4 uppercase tracking-tighter">Chào mừng đến với UR SPORT</h2>
        <p className="text-white/40 mb-8">Hãy cập nhật Banner trong trang quản trị để bắt đầu.</p>
        <Button onClick={onShopClick} className="bg-white text-black hover:bg-zinc-200 font-bold px-8 py-6 rounded-2xl">
          KHÁM PHÁ CỬA HÀNG
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative h-[480px] sm:h-[550px] md:h-[600px] lg:h-[700px] w-full overflow-hidden bg-black group/hero">
      <AnimatePresence mode="popLayout">
        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img
            src={activeBanners[currentIndex]?.image}
            alt={activeBanners[currentIndex]?.title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {activeBanners.length > 1 && (
        <div className="hidden sm:block">
          <button 
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover/hero:opacity-100 transition-all hover:bg-[#1e4b64] hover:border-[#1e4b64] shadow-2xl"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover/hero:opacity-100 transition-all hover:bg-[#1e4b64] hover:border-[#1e4b64] shadow-2xl"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-center px-6 sm:px-12 lg:px-20">
        <div className="max-w-3xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[#1e4b64] font-black uppercase tracking-[0.5em] text-[9px] sm:text-[11px] mb-4 block drop-shadow-md">
              UR SPORT PERFORMANCE
            </span>
            
            <div className="min-h-[140px] sm:min-h-[180px] mb-6">
              <AnimatePresence mode="wait">
                <motion.h1 
                  key={currentIndex}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-[34px] xs:text-[40px] sm:text-[56px] md:text-[68px] lg:text-[84px] font-black tracking-tighter text-white uppercase leading-[0.9] italic"
                >
                  {(activeBanners[currentIndex]?.title || "").split('\n').map((line: string, i: number) => (
                    <React.Fragment key={i}>
                      {i === 1 ? <span className="text-[#1e4b64]">{line}</span> : line}
                      <br />
                    </React.Fragment>
                  ))}
                </motion.h1>
              </AnimatePresence>
            </div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-white/80 text-[13px] sm:text-[17px] font-medium mb-10 max-w-lg leading-relaxed drop-shadow-sm"
            >
              {activeBanners[currentIndex]?.subtitle || 'Hiệu suất tối đa, phong cách vượt trội cho mọi hành trình.'}
            </motion.p>
            
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleButtonClick}
                className="group relative bg-white text-black hover:bg-[#1e4b64] hover:text-white font-black px-10 py-4 rounded-full text-[12px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-2xl active:scale-95 overflow-hidden"
              >
                <span className="relative z-10">Khám phá ngay</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
        
        {/* Banner indicators */}
        <div className="absolute bottom-10 left-6 sm:left-12 lg:left-20 flex items-center gap-4 z-20">
          <div className="flex gap-2">
            {activeBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  currentIndex === i 
                    ? "w-12 bg-[#1e4b64] shadow-[0_0_15px_rgba(30,75,100,0.6)]" 
                    : "w-4 bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>
          <div className="text-white/30 text-[10px] font-black tracking-widest">
            {String(currentIndex + 1).padStart(2, '0')} / {String(activeBanners.length).padStart(2, '0')}
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 right-6 sm:right-12 lg:right-20 hidden md:flex flex-col items-center gap-4"
        >
          <div className="h-16 w-[1px] bg-white/10 relative overflow-hidden">
            <motion.div 
              animate={{ y: [0, 64] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute top-0 left-0 w-full h-1/2 bg-[#1e4b64]"
            />
          </div>
          <span className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] vertical-text transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
            SCROLL
          </span>
        </motion.div>
      </div>
    </div>
  );
};
