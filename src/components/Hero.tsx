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
    <div className="relative h-[450px] sm:h-[500px] md:h-[550px] w-full overflow-hidden bg-black group/hero">
      <AnimatePresence mode="popLayout">
        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={activeBanners[currentIndex]?.image}
            alt={activeBanners[currentIndex]?.title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/20" />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {activeBanners.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover/hero:opacity-100 transition-all hover:bg-white hover:text-black shadow-lg"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover/hero:opacity-100 transition-all hover:bg-white hover:text-black shadow-lg"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-center px-6 sm:px-12 lg:px-20">
        <div className="max-w-2xl relative z-10">
          <motion.span 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-[#0082c8] font-black uppercase tracking-[0.4em] text-[10px] sm:text-[11px] mb-4 block"
          >
            UR SPORT EXCLUSIVE
          </motion.span>
          
          <div className="min-h-[120px] sm:min-h-[160px] mb-6">
            <AnimatePresence mode="wait">
              <motion.h1 
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase leading-[0.95]"
              >
                {(activeBanners[currentIndex]?.title || "").split('\n').map((line: string, i: number) => (
                  <React.Fragment key={i}>
                    {i === 1 ? <span className="text-[#0082c8]">{line}</span> : line}
                    <br />
                  </React.Fragment>
                ))}
              </motion.h1>
            </AnimatePresence>
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-white/70 text-sm sm:text-base font-medium mb-8 max-w-lg leading-relaxed"
          >
            {activeBanners[currentIndex]?.subtitle || 'Hiệu suất tối đa, phong cách vượt trội cho mọi hành trình.'}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <button 
              onClick={handleButtonClick}
              className="bg-white text-black hover:bg-[#0082c8] hover:text-white font-black px-10 py-4 rounded-full text-[12px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95"
            >
              Xem chi tiết
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
        
        {/* Banner indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {activeBanners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                currentIndex === i 
                  ? "w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                  : "w-2 bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
