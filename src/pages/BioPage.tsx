import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  MessageCircle, 
  Facebook, 
  Instagram, 
  Globe, 
  TrendingUp, 
  ChevronRight,
  Sparkles,
  Phone,
  Video
} from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { PRODUCTS as STATIC_PRODUCTS } from '../data';
import { Product } from '../types';
import { mergeLocalProducts } from '../lib/localProducts';

// Custom Zalo icon component (since Zalo is not in lucide-react)
const ZaloIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.62 13.06c-.36.72-.94 1.22-1.72 1.44-.45.13-.92.19-1.39.19H8.78c-1.37 0-2.48-1.11-2.48-2.48v-3.72c0-1.37 1.11-2.48 2.48-2.48h4.73c.47 0 .94.06 1.39.19.78.22 1.36.72 1.72 1.44.25.5.38 1.07.38 1.66v1.65c0 .59-.13 1.16-.38 1.66z" />
    <path d="M13.51 10.74c-.16 0-.32.06-.44.18s-.18.28-.18.44v1.28c0 .16.06.32.18.44.12.12.28.18.44.18h1.28c.16 0 .32-.06.44-.18.12-.12.18-.28.18-.44v-1.28c0-.16-.06-.32-.18-.44s-.28-.18-.44-.18h-1.28z" />
  </svg>
);

export default function BioPage() {
  const navigate = useNavigate();
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>('/images/ao-thun-nam.webp');
  const [customHtml, setCustomHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Set title for SEO
    document.title = 'UR Sport - Link Bio chính thức | Tổng hợp kênh mua sắm và hỗ trợ';

    // Fetch custom HTML and logo from Firestore
    if (db) {
      setLoading(true);
      getDoc(doc(db, 'settings', 'bio')).then(snap => {
        if (snap.exists() && snap.data().htmlCode) {
          setCustomHtml(snap.data().htmlCode);
        }
        setLoading(false);
      }).catch((err) => {
        console.error("Error loading bio HTML", err);
        setLoading(false);
      });

      getDoc(doc(db, 'settings', 'logoSettings')).then(snap => {
        if (snap.exists() && snap.data().logoDark) {
          setLogoUrl(snap.data().logoDark);
        }
      }).catch(() => {});
    } else {
      setLoading(false);
    }

    // Load best sellers
    const sourceProducts = STATIC_PRODUCTS;
    const allProducts = mergeLocalProducts(sourceProducts);
    const featured = allProducts
      .filter(p => p.images && p.images.length > 0)
      .slice(0, 4);
    setBestSellers(featured);
  }, []);

  const handleProductClick = (slug: string) => {
    navigate(`/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b11] flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-[#1e4b64] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (customHtml) {
    return <div dangerouslySetInnerHTML={{ __html: customHtml }} />;
  }

  return (
    <div className="min-h-screen bg-[#090b11] text-zinc-100 flex flex-col items-center justify-between pb-12 relative overflow-hidden font-sans selection:bg-white selection:text-[#090b11]">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-[#1e4b64]/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[480px] px-5 pt-12 z-10 flex flex-col items-center">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#1e4b64] to-emerald-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#13161f] border-2 border-white/10 flex items-center justify-center p-2 shadow-2xl">
              <img 
                src={logoUrl} 
                alt="UR Sport Logo" 
                className="w-full h-full object-contain filter drop-shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/ao-thun-nam.webp';
                }}
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide text-white flex items-center justify-center gap-1.5">
              UR SPORT <Sparkles className="w-5 h-5 text-emerald-400 fill-emerald-400 animate-pulse shrink-0" />
            </h1>
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mt-1.5">Thời Trang Thể Thao Nam</p>
            <p className="text-zinc-500 text-sm font-medium mt-2.5 max-w-[340px] leading-relaxed">
              Trang phục năng động, thoáng mát, chuẩn form dáng cho ngày dài tự tin bứt phá.
            </p>
          </div>
        </div>

        {/* Links Section */}
        <div className="w-full space-y-7">
          {/* Group 1: Shopping Channels */}
          <div className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1e4b64] pl-1">Cửa hàng & Mua sắm</h2>
            <div className="space-y-3">
              <a 
                href="https://www.ursport.vn" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 group shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-[#1e4b64]/20 rounded-xl flex items-center justify-center text-sky-400 border border-[#1e4b64]/20 group-hover:scale-105 transition-transform">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Website chính thức</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Đặt hàng trực tiếp, ưu đãi tới 30%</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>

              <a 
                href="https://shopee.vn/ursport.vn" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 group shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-[#ee4d2d]/10 rounded-xl flex items-center justify-center text-[#ee4d2d] border border-[#ee4d2d]/10 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Cửa hàng Shopee</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Mall chính hãng, deal hời xu lẻ</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>

              <a 
                href="https://www.tiktok.com/@ursportvietnam" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 group shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/5 group-hover:scale-105 transition-transform">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">TikTok Shop</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Xem livestream, chốt voucher độc quyền</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>
            </div>
          </div>

          {/* Group 2: Support channels */}
          <div className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1e4b64] pl-1">Tư vấn & Chăm sóc khách hàng</h2>
            <div className="space-y-3">
              <a 
                href="https://zalo.me/0917722425" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-[#1e4b64]/10 hover:bg-[#1e4b64]/20 border border-[#1e4b64]/20 rounded-2xl transition-all duration-300 group shadow-lg relative overflow-hidden"
              >
                {/* Glowing Border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/25 group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      Hotline Zalo (Chính thức)
                      <span className="animate-ping w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">Đặt hàng, tư vấn chọn size chuẩn 24/7</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>

              <a 
                href="https://www.facebook.com/ursportvietnam" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 group shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-600/10 group-hover:scale-105 transition-transform">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Facebook Messenger</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Hỗ trợ nhanh, giải đáp khiếu nại</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>
            </div>
          </div>

          {/* Group 3: Social Medias */}
          <div className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1e4b64] pl-1">Mạng xã hội & Hình ảnh</h2>
            <div className="grid grid-cols-2 gap-3">
              <a 
                href="https://www.tiktok.com/@ursportvietnam" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 group text-center shadow-lg"
              >
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white mb-2.5 group-hover:scale-105 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">TikTok</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Video phối đồ</p>
              </a>

              <a 
                href="https://www.instagram.com/ursportvietnam" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 group text-center shadow-lg"
              >
                <div className="w-10 h-10 bg-pink-600/10 rounded-xl flex items-center justify-center text-pink-500 mb-2.5 group-hover:scale-105 transition-transform">
                  <Instagram className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Instagram</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Góc ảnh thể thao</p>
              </a>
            </div>
          </div>

          {/* Dynamic Best Sellers Showcase */}
          {bestSellers.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-white font-bold pl-1 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Sản phẩm bán chạy nhất
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {bestSellers.map(product => (
                  <div 
                    key={product.id} 
                    onClick={() => handleProductClick(product.slug)}
                    className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-2.5 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="aspect-[4/5] rounded-xl overflow-hidden bg-white/5 mb-3 relative">
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        loading="lazy"
                      />
                      {product.discountPrice && (
                        <span className="absolute top-2 left-2 bg-[#ee4d2d] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Giảm giá
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-zinc-300 text-xs font-bold line-clamp-1 group-hover:text-white transition-colors" title={product.name}>
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-emerald-400 font-bold text-xs">
                          {(product.discountPrice || product.price).toLocaleString('vi-VN')}₫
                        </span>
                        {product.discountPrice && (
                          <span className="text-zinc-500 text-[9px] line-through">
                            {product.price.toLocaleString('vi-VN')}₫
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-[10px] text-zinc-600 font-bold tracking-widest uppercase">
        © 2026 UR SPORT · ĐÚNG CHẤT THỂ THAO
      </div>
    </div>
  );
}
