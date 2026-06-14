import React, { useState, useEffect } from 'react';
import { useProducts } from '../ProductsContext';
import { ProductCard } from '../components/ProductCard';
import { Video, ShoppingBag, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, getCountFromServer, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function LivestreamPage() {
  const { products } = useProducts();
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [viewerCount, setViewerCount] = useState(1);
  const [presenceError, setPresenceError] = useState('');
  const sessionIdRef = React.useRef(`session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // Presence System: Announce we are here and keep heartbeat
  useEffect(() => {
    if (!db) return;
    const sessionId = sessionIdRef.current;
    const presenceDoc = doc(db, 'live_viewers', sessionId);

    const updatePresence = async () => {
      try {
        await setDoc(presenceDoc, { lastActive: Date.now() }, { merge: true });
        setPresenceError(''); // Clear error if success
      } catch (error: any) {
        console.error("Firestore Rules might be blocking presence updates:", error);
        if (error.code === 'permission-denied') {
          setPresenceError('Chưa cấp quyền Firebase Rules');
        } else {
          setPresenceError(error.message);
        }
      }
    };

    updatePresence();
    const heartbeat = setInterval(updatePresence, 30000); // 30s heartbeat

    const cleanup = () => {
      deleteDoc(presenceDoc).catch(() => {});
    };

    window.addEventListener('beforeunload', cleanup);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);

  // Poll for active viewer count
  useEffect(() => {
    if (!db) return;
    const viewersCol = collection(db, 'live_viewers');

    const fetchCount = async () => {
      try {
        // Query users active in the last 60 seconds using client Date.now() to match
        const activeThreshold = Date.now() - 60000;
        const q = query(viewersCol, where('lastActive', '>', activeThreshold));
        const snapshot = await getCountFromServer(q);
        setViewerCount(Math.max(1, snapshot.data().count));
      } catch (error: any) {
        console.error("Firestore Rules might be blocking presence count:", error);
        if (error.code === 'permission-denied') {
          setPresenceError('Chưa cấp quyền Rules');
        }
      }
    };

    fetchCount();
    const pollInterval = setInterval(fetchCount, 10000); // Poll every 10s
    return () => clearInterval(pollInterval);
  }, []);

  // Fetch livestream config
  const [livestreamConfig, setLivestreamConfig] = useState({
    videoUrl: '',
    title: '',
    description: ''
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (!db) return;
        const snap = await getDoc(doc(db, 'settings', 'livestream'));
        if (snap.exists()) {
          const data = snap.data();
          setLivestreamConfig({
            videoUrl: data.videoUrl || '',
            title: data.title || '🔥 Siêu Sale Đồ Thể Thao Cao Cấp',
            description: data.description || 'Săn ngay deal hot giảm giá đến 50% chỉ có trong livestream hôm nay.'
          });
        } else {
          setLivestreamConfig({
            videoUrl: '',
            title: '🔥 Siêu Sale Đồ Thể Thao Cao Cấp',
            description: 'Săn ngay deal hot giảm giá đến 50% chỉ có trong livestream hôm nay.'
          });
        }
      } catch (error) {
        console.error("Error fetching livestream config:", error);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Fetch some products to display (e.g., first 8 products or flash sale ones)
  useEffect(() => {
    if (products.length > 0) {
      setLiveProducts(products.slice(0, 8));
    }
  }, [products]);

  // Helper to parse Video URL
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=auto`;
    }
    
    // Youtube matching
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    const liveMatch = url.match(/youtube\.com\/live\/([^"&?\/\s]{11})/i);
    
    const videoId = (ytMatch && ytMatch[1]) || (liveMatch && liveMatch[1]);
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0`;
    }
    return '';
  };

  const embedUrl = getEmbedUrl(livestreamConfig.videoUrl);

  return (
    <div className="bg-zinc-50 min-h-screen pb-20 pt-8 sm:pt-0">
      {/* Header Section */}
      <div className="bg-white border-b border-zinc-200 sticky top-[88px] md:top-[104px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <div className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500"></span>
            </div>
            <h1 className="text-sm sm:text-lg font-black uppercase text-zinc-900 flex items-center gap-1 sm:gap-2 tracking-tight whitespace-nowrap truncate">
              UR Sport <span className="text-red-500">Live</span>
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-red-50 text-red-600 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-sm border border-red-100 shrink-0">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="whitespace-nowrap">{viewerCount} đang xem</span>
            </div>
            {presenceError && (
              <span className="text-[9px] text-red-500 font-medium whitespace-nowrap">{presenceError}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: Video Embed */}
          <div className="w-full lg:w-2/3 xl:w-3/4 flex flex-col gap-4">
            <div className="bg-black sm:rounded-2xl overflow-hidden shadow-xl border border-zinc-800 relative w-full pt-[56.25%]">
              {/* 16:9 Aspect Ratio Container */}
              {isLoadingConfig ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-red-500 rounded-full animate-spin"></div>
                </div>
              ) : embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Livestream Player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                ></iframe>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                  Chưa có luồng phát trực tiếp nào được cấu hình
                </div>
              )}
            </div>

            <div className="px-4 sm:px-0">
              <h2 className="text-xl font-bold text-zinc-900">{livestreamConfig.title}</h2>
              <p className="text-sm text-zinc-500 mt-1">{livestreamConfig.description}</p>
            </div>
          </div>

          {/* Right Column (Desktop) / Bottom Section (Mobile): Product List */}
          <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-4 px-4 sm:px-0">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200 sticky top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto hidden lg:block scrollbar-hide">
              <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white pb-2 z-10 border-b border-zinc-100">
                <ShoppingBag className="w-5 h-5 text-[#1e4b64]" />
                <h3 className="font-black text-lg text-zinc-900 tracking-tight">Sản Phẩm Trong Live</h3>
              </div>
              
              <div className="flex flex-col gap-4">
                {liveProducts.map((product, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={product.id}
                  >
                    <ProductCard product={product} onClick={() => {}} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Product Grid (Shown below video on mobile) */}
      <div className="lg:hidden px-4 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5 text-[#1e4b64]" />
          <h3 className="font-black text-lg text-zinc-900 tracking-tight">Sản Phẩm Trong Live</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {liveProducts.map((product, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (idx % 2) * 0.1 }}
              key={product.id}
            >
              <ProductCard product={product} onClick={() => {}} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
