import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CATEGORY_METADATA } from '../data';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { useProducts } from '../ProductsContext';
import { Button } from '@/components/ui/button';
import { 
  Star, 
  ShoppingBag, 
  ShoppingCart,
  Heart, 
  Minus, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const ProductDetail: React.FC = () => {
  const { categorySlug, productSlug } = useParams<{ categorySlug: string, productSlug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { products, loading } = useProducts();
  
  // Find current product
  const product = products.find(p => p.slug === productSlug);
  
  // SEO Navigation Logic (Prev/Next)
  const catMetadata = CATEGORY_METADATA.find(c => c.slug === categorySlug);
  const categoryName = catMetadata ? catMetadata.name : product?.category;
  const categoryProducts = products.filter(p => p.category === categoryName);
  const currentIndex = categoryProducts.findIndex(p => p.slug === productSlug);
  
  const prevProduct = currentIndex > 0 ? categoryProducts[currentIndex - 1] : null;
  const nextProduct = currentIndex < categoryProducts.length - 1 ? categoryProducts[currentIndex + 1] : null;

  const { addToCart } = useCart();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors?.[0] || '');
      setSelectedSize(product.sizes?.[0] || '');
      setMainImage(product.images?.[0] || '');
      window.scrollTo(0, 0);
    }
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-[#0082c8] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">PRODUCT NOT FOUND</h2>
        <Button onClick={() => navigate('/shop')}>Back to Shop</Button>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, selectedColor, selectedSize, quantity);
    
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`, {
      description: `${selectedColor} / Size ${selectedSize} (qty: ${quantity})`,
      position: 'top-center',
      className: 'font-sans font-medium'
    });
  };

  return (
    <div className="bg-white min-h-screen pb-20 font-sans text-zinc-900">
      {/* 1. Standard SEO Breadcrumbs & Nav Row */}
      <div className="mb-8">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 tracking-wider">
            <Link to="/" className="hover:text-black transition-colors">Home</Link>
            <span className="opacity-30">/</span>
            <Link 
              to={`/apparel/${categorySlug}`} 
              className="hover:text-black transition-colors"
            >
              {categoryName}
            </Link>
            <span className="opacity-30">/</span>
            <span className="text-zinc-600 font-medium capitalize-first">{product.name}</span>
          </nav>

          <div className="flex items-center gap-3 text-zinc-400">
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => prevProduct && navigate(`/apparel/${categorySlug}/${prevProduct.slug}`)}
                  disabled={!prevProduct}
                  className="w-6 h-6 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-bold min-w-[40px] text-center">
                  {currentIndex + 1} of {categoryProducts.length}
                </span>
                <button 
                  onClick={() => nextProduct && navigate(`/apparel/${categorySlug}/${nextProduct.slug}`)}
                  disabled={!nextProduct}
                  className="w-6 h-6 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
             </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-8 items-start text-left">
          {/* Left: Product Gallery */}
          <div className="space-y-6 order-1 lg:order-1">
            <div className="relative aspect-square w-full overflow-hidden bg-white border border-zinc-100 rounded-lg shadow-sm">
              {mainImage && (
                <motion.img 
                  key={mainImage}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={mainImage} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              {product.discountPrice && (
                 <div className="absolute top-4 left-4 bg-[#ff3b30] text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg">
                    HOT -{Math.round((1 - product.discountPrice / product.price) * 100)}%
                 </div>
              )}
            </div>
            
            <div className="flex justify-start flex-wrap gap-2">
              {(product.images || []).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  className={cn(
                    "w-12 h-12 rounded-md border-2 transition-all p-1 bg-white",
                    mainImage === img ? "border-[#0082c8] shadow-md scale-105" : "border-zinc-100 hover:border-zinc-300"
                  )}
                >
                  {img && <img src={img} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />}
                </button>
              ))}
            </div>

            {/* Sharing & Likes Section - MỚI */}
            <div className="flex flex-col sm:flex-row items-center justify-start gap-6 pt-8 border-t border-zinc-50">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-black text-zinc-400 uppercase tracking-widest leading-none">Share:</span>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-full bg-[#0084FF]/10 flex items-center justify-center text-[#0084FF] hover:bg-[#0084FF] hover:text-white transition-all shadow-sm" title="Messenger">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.455 5.518 3.735 7.21v3.532l3.39-1.858a11.233 11.233 0 002.875.374c5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.295 12.518l-2.613-2.79-5.1 2.79 5.613-5.962 2.613 2.79 5.1-2.79-5.613 5.962z" />
                    </svg>
                  </button>
                  <button className="w-8 h-8 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all shadow-sm" title="Facebook">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                  <button className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-zinc-900 hover:bg-black hover:text-white transition-all shadow-sm" title="X">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.494h2.039L6.486 3.24H4.298l13.311 17.407z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="hidden sm:block w-px h-6 bg-zinc-200" />
              
              <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-100 hover:bg-zinc-100 transition-colors cursor-pointer group">
                <Heart className="h-4 w-4 text-zinc-400 group-hover:text-red-500 group-hover:fill-red-500 transition-all" />
                <span className="text-[12px] font-bold text-zinc-600">Đã thích (11,8k)</span>
              </div>
            </div>
          </div>

          {/* Right: Product Info Sidebar */}
          <div className="space-y-8 lg:sticky lg:top-24 order-2 lg:order-2">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-medium text-zinc-900 tracking-tight italic leading-tight capitalize-first">
                  {product.name}
                </h1>
                <div className="flex items-center flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("h-3.5 w-3.5", i < Math.floor(product.rating) ? "text-[#ffa800] fill-[#ffa800]" : "text-zinc-200")} />
                      ))}
                    </div>
                    <button className="text-blue-600 font-black hover:underline text-[10px] uppercase tracking-widest border-l border-zinc-200 pl-4 h-3 flex items-center">
                      Write a review
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-3 py-1 rounded border border-zinc-100 group">
                    CODE: <span className="text-zinc-900">TS{product.id.replace('-', '').toUpperCase()}</span>
                    <button className="p-0.5 hover:text-black transition-colors" title="Copy code">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-zinc-50">
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-black text-black tracking-tighter">
                    {(product.discountPrice || product.price).toLocaleString('vi-VN')}₫
                  </span>
                  {product.discountPrice && (
                    <span className="text-lg text-zinc-300 line-through font-bold">
                      {product.price.toLocaleString('vi-VN')}₫
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-[#1e4b64] uppercase tracking-widest rounded-full py-1">
                    <div className="w-2 h-2 rounded-full bg-[#1e4b64] animate-pulse" /> IN STOCK
                  </div>
                </div>
              </div>
            </div>


            {/* Color Selector */}
            <div className="space-y-4 text-left">
               <p className="text-[13px] font-bold text-zinc-900">Color: <span className="text-zinc-500 ml-1 font-normal uppercase">{selectedColor}</span></p>
               <div className="flex flex-wrap gap-3">
                  {(product.colors || []).map((color, idx) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        if (product.images?.[idx]) setMainImage(product.images[idx]);
                      }}
                      className={cn(
                        "relative flex items-center gap-3 pr-4 rounded-md border transition-all bg-white group h-12 overflow-hidden",
                        selectedColor === color ? "border-[#0082c8] ring-1 ring-[#0082c8]/10 shadow-sm" : "border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      <div className="w-12 h-12 flex items-center justify-center bg-white border-r border-zinc-100 shrink-0 p-1">
                        {(product.images?.[idx] || product.images?.[0]) && (
                          <img 
                            src={product.images?.[idx] || product.images?.[0]} 
                            alt={color} 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer" 
                          />
                        )}
                      </div>
                      <span className={cn(
                        "text-[13px] font-medium transition-colors uppercase whitespace-nowrap",
                        selectedColor === color ? "text-[#0082c8] font-bold" : "text-zinc-500 group-hover:text-zinc-900"
                      )}>
                        {color}
                      </span>
                      {selectedColor === color && (
                        <div className="absolute bottom-0 right-0 overflow-hidden w-4 h-4">
                           <div className="absolute bottom-0 right-0 bg-[#0082c8] w-full h-full" style={{ clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' }}>
                            <Check className="h-2 w-2 text-white stroke-[4px] absolute bottom-0 right-0" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
               </div>
            </div>

            {/* Size Selector */}
            <div className="flex items-center gap-4 text-left">
               <p className="text-[13px] font-bold text-zinc-900">Size:</p>
               <div className="flex flex-wrap gap-2">
                  {(product.sizes || []).map(size => (
                    <button
                       key={size}
                       onClick={() => setSelectedSize(size)}
                       className={cn(
                         "relative min-w-[48px] h-10 px-3 rounded-md text-sm font-bold transition-all border flex items-center justify-center bg-white",
                         selectedSize === size 
                           ? "border-[#0082c8] text-[#0082c8] ring-1 ring-[#0082c8]/10 shadow-sm" 
                           : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                       )}
                    >
                       {size}
                       {selectedSize === size && (
                         <div className="absolute -top-1 -right-1">
                           <div className="bg-[#0082c8] rounded-full w-3.5 h-3.5 border border-white shadow-sm flex items-center justify-center">
                             <Check className="h-2 w-2 text-white stroke-[4px]" />
                           </div>
                         </div>
                       )}
                    </button>
                  ))}
               </div>
            </div>

            {/* Actions */}
            <div className="pt-4">
              <div className="flex items-center gap-2 h-12 w-full">
                {/* Quantity Selector */}
                <div className="flex items-center border border-zinc-200 rounded-md bg-white overflow-hidden shrink-0 h-full">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-full flex items-center justify-center text-zinc-400 hover:text-[#0082c8] hover:bg-zinc-50 transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="w-8 h-full flex items-center justify-center font-bold text-zinc-800 border-x border-zinc-100 text-xs">
                    {quantity}
                  </div>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-full flex items-center justify-center text-zinc-400 hover:text-[#0082c8] hover:bg-zinc-50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                
                {/* Add to Cart */}
                <button 
                  onClick={handleAddToCart}
                  className="flex-1 h-full min-w-0 bg-[#f0f9ff] border border-[#0082c8] text-[#0082c8] font-bold rounded-md text-[11px] flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-all uppercase tracking-tight shadow-sm active:scale-[0.98]"
                >
                  <div className="relative shrink-0">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <div className="absolute -top-1 -right-1 bg-[#0082c8] text-white rounded-full w-2.5 h-2.5 flex items-center justify-center border border-white">
                      <Plus className="h-1 w-1 stroke-[5px]" />
                    </div>
                  </div>
                  <span className="truncate">Thêm vào giỏ</span>
                </button>

                {/* Buy Now */}
                <button 
                  className="flex-1 h-full bg-[#1e4b64] text-white font-bold rounded-md text-[11px] uppercase tracking-wider hover:bg-[#153a4d] transition-all shadow-md active:scale-[0.98]"
                >
                  Mua Ngay
                </button>
              </div>
            </div>

            {/* Delivery, Payment & Warranty Section - VIETNAMESE */}
            <div className="pt-8 border-t border-zinc-100 space-y-4">
              {/* Delivery Section */}
              <div className="">
                <button 
                  onClick={() => setExpandedSection(expandedSection === 'delivery' ? null : 'delivery')}
                  className="flex items-center justify-between w-full py-4 text-sm font-bold text-zinc-900 border-b border-zinc-50 hover:text-blue-600 transition-colors group"
                >
                  <span>Nhà vận chuyển</span>
                  {expandedSection === 'delivery' ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-blue-600" />}
                </button>
                {expandedSection === 'delivery' && (
                  <div className="py-4 px-1">
                    <p className="text-[12px] text-zinc-600 font-bold">Viettel Post</p>
                  </div>
                )}
              </div>

              {/* Payment Section */}
              <div className="">
                <button 
                  onClick={() => setExpandedSection(expandedSection === 'payment' ? null : 'payment')}
                  className="flex items-center justify-between w-full py-4 text-sm font-bold text-zinc-900 border-b border-zinc-50 hover:text-blue-600 transition-colors group"
                >
                  <span>Các phương thức thanh toán</span>
                  {expandedSection === 'payment' ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-blue-600" />}
                </button>
                
                {expandedSection === 'payment' && (
                  <div className="py-4 px-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-[#EE4D2D]/5 border border-[#EE4D2D]/20 rounded">
                        <span className="text-[10px] font-black text-[#EE4D2D] italic">Shopee</span>
                        <span className="text-[10px] font-black text-[#EE4D2D]">Pay</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-[#008fe5]/5 border border-[#008fe5]/20 rounded">
                        <span className="text-[10px] font-black text-[#008fe5] italic">Zalo</span>
                        <span className="text-[10px] font-black text-[#008fe5]">Pay</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 border border-zinc-200 rounded">
                        <span className="text-[10px] font-black text-zinc-500 uppercase">BANK</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 border border-zinc-200 rounded">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">COD</span>
                      </div>
                    </div>

                    <p className="text-[12px] text-zinc-500 leading-relaxed">
                      Chấp nhận thanh toán trực tuyến qua ShopeePay, ZaloPay, chuyển khoản ngân hàng hoặc tiền mặt khi nhận hàng (COD).
                      <button className="ml-2 text-blue-600 font-bold hover:underline">Chi tiết ⓘ</button>
                    </p>
                  </div>
                )}
              </div>

              {/* Warranty Section */}
              <div className="">
                <button 
                  onClick={() => setExpandedSection(expandedSection === 'warranty' ? null : 'warranty')}
                  className="flex items-center justify-between w-full py-4 text-sm font-bold text-zinc-900 border-b border-zinc-50 hover:text-blue-600 transition-colors group"
                >
                  <span>Bảo hành và đổi trả</span>
                  {expandedSection === 'warranty' ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-blue-600" />}
                </button>
                {expandedSection === 'warranty' && (
                  <div className="py-4 px-1 space-y-3">
                    <p className="text-[12px] text-zinc-500 leading-relaxed">
                      Hỗ trợ đổi trả sản phẩm trong vòng <span className="font-bold text-zinc-900">30 ngày</span> nếu có lỗi từ nhà sản xuất.
                    </p>
                    <p className="text-[12px] text-zinc-500 leading-relaxed">
                      Bảo hành chính hãng: <span className="font-bold text-zinc-900">12 tháng</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 border-t border-zinc-100 pt-16">
          <h2 className="text-3xl font-bold text-black mb-12 uppercase italic tracking-tight">Chi tiết sản phẩm</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-2">
            <FeatureLine label="Màu sắc" value={selectedColor} />
            <FeatureLine label="Kích cỡ" value={selectedSize} />
            <FeatureLine label="Chất liệu" value="100% Cotton" opacity="opacity-50" />
            <FeatureLine label="Phong cách" value="Thể thao năng động" opacity="opacity-50" />
            <FeatureLine label="Bảo quản" value="Giặt máy ở chế độ nhẹ" opacity="opacity-50" />
            <FeatureLine label="Xuất xứ" value="Việt Nam" opacity="opacity-50" />
          </div>
        </div>

        {/* Detailed Description Section - TỪ ẢNH */}
        <div className="mt-20 space-y-16 pb-20 max-w-[1000px]">
          {/* Cover Media Upload Section - MỚI - Chỉ hiện cho Admin */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden mb-12">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-bold text-zinc-900">Ảnh bìa / Video (Admin Only)</span>
                </div>
                <div className="flex bg-zinc-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setUploadType('image')}
                    className={cn(
                      "px-4 py-1.5 text-[12px] font-bold rounded-md transition-all",
                      uploadType === 'image' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    Ảnh
                  </button>
                  <button 
                    onClick={() => setUploadType('video')}
                    className={cn(
                      "px-4 py-1.5 text-[12px] font-bold rounded-md transition-all",
                      uploadType === 'video' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    Video
                  </button>
                </div>
              </div>
              
              <div className="p-8">
                <div className="aspect-[21/9] w-full border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-4 group hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Upload className="h-6 w-6 text-zinc-400 group-hover:text-blue-500" />
                  </div>
                  <span className="text-[12px] font-bold text-zinc-500 group-hover:text-blue-600 transition-colors">
                    Tải {uploadType === 'image' ? 'ảnh' : 'video'} lên
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Chi tiết sản phẩm & Chất liệu</h3>
            <div className="w-20 h-1 bg-[#0082c8] rounded-full" />
          </div>

          <div className="space-y-12 text-[15px] leading-relaxed text-zinc-600 font-medium product-description">
             <div className="space-y-4">
                {product.description ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: product.description }} 
                    className="prose prose-zinc max-w-none 
                      [&_h1]:text-2xl [&_h1]:font-black [&_h1]:mb-4 [&_h1]:text-zinc-900
                      [&_h2]:text-xl [&_h2]:font-black [&_h2]:mb-3 [&_h2]:text-zinc-900
                      [&_h3]:text-lg [&_h3]:font-black [&_h3]:mb-2 [&_h3]:text-zinc-900
                      [&_p]:mb-4 [&_p]:leading-relaxed
                      [&_img]:rounded-2xl [&_img]:my-8 [&_img]:shadow-lg [&_img]:mx-auto
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
                      [&_blockquote]:border-l-4 [&_blockquote]:border-[#0082c8] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-500
                    "
                  />
                ) : (
                  <p>Sản phẩm này chưa có mô tả chi tiết.</p>
                )}
             </div>

             <div className="grid grid-cols-1 gap-12 pt-8 border-t border-zinc-100">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Đặc tính kỹ thuật vải</h4>
                    <ul className="space-y-4">
                      <li className="flex gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                        <div>
                          <p className="text-base font-bold text-zinc-900">Loại vải: Cotton co giãn 4 chiều</p>
                          <p className="text-sm text-zinc-500">Giống vải áo thể thao nhưng dày, mềm và mướt hơn. Thân thiện tuyệt đối với làn da em bé và người lớn.</p>
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                        <div>
                          <p className="text-base font-bold text-zinc-900">Thành phần: 98% Cotton, 2% Spandex</p>
                          <p className="text-sm text-zinc-500">Thành phần công bố 98% cotton. Thực tế xét nghiệm: 95.7% Cotton, 4.3% Spandex. KHÔNG POLY, KHÔNG NILON.</p>
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                        <div>
                          <p className="text-base font-bold text-zinc-900">Độ dày & Co rút: 230GSM</p>
                          <p className="text-sm text-zinc-500">Ngang: KHÔNG CO RÚT. Dọc: Rút nhẹ ~1cm (2,1%). NATO đã may dài hơn 1cm so với bảng size để sau khi giặt sẽ về đúng kích thước chuẩn.</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-zinc-100">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Độ bền sản phẩm</h4>
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-zinc-900">Độ bền màu giặt: Mức độ 4,5/5</p>
                        <p className="text-[13px] text-zinc-500">Bền màu sau hơn 20 lần giặt. Vải xuống dần nhưng không bị bạc màu nhanh hay loang lổ.</p>
                        <p className="text-sm font-bold text-zinc-900">Độ bền nén thủng: Chịu lực cao</p>
                        <p className="text-[13px] text-zinc-500">Không rách đường may sau thử nghiệm nén thủng cực đại. KHÔNG THỂ RÁCH KHI SỬ DỤNG THÔNG THƯỜNG.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Thông tin gia công</h4>
                      <div className="space-y-3 text-[13px] text-zinc-500 font-medium">
                        <p>• Sợi bông Mỹ chải kỹ: Cực kỳ thân thiện với làn da, mềm mướt không thô ráp.</p>
                        <p>• Xử lý bề mặt 2 lần: Cho cảm giác nhẵn nhụi, cực mịn tay khi chạm vào.</p>
                        <p>• Hút ẩm cực cao: Để máy lạnh 5 phút, tự động áo lạnh ngắt.</p>
                        <p>• Hồ lạnh: Duy trì cảm giác mát mẻ ban đầu, mất dần sau 5 lần giặt để lộ bề mặt cotton nguyên bản.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#0082c8] rounded-xl shadow-lg shadow-blue-100">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-zinc-900 uppercase italic">Tổng quan & Cam kết</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block">Khuyết điểm:</span>
                        <p className="text-sm text-zinc-600 font-medium italic">
                          Độ đứng form không bằng áo 2 chiều loại dày và cứng. Áo thuộc loại vải em bé nên mềm mại, nhìn độ phồng tay áo và vai sẽ tự nhiên, dễ hình dung hơn.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-[#1e4b64] uppercase tracking-widest block">Ưu điểm:</span>
                        <p className="text-sm text-zinc-600 font-medium">
                          Phù hợp da nhạy cảm hoặc người hay đổ mồ hôi. Mặc cực kỳ thích, mướt mịn, thấm hút hoàn hảo như áo thể thao chuyên dụng nhưng dày dặn hơn.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-zinc-200">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100">
                       <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                       <span className="text-[11px] font-bold text-zinc-900 uppercase">Ship 24/7 (1-3 ngày nhận)</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100">
                       <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                       <span className="text-[11px] font-bold text-zinc-900 uppercase">Hỏa tốc giao ngay trong 60'</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">
                      Sản phẩm được bảo hành <span className="text-blue-900 underline decoration-2 underline-offset-4">TRỌN ĐỜI</span> về độ bền & chất lượng
                    </p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureLine = ({ label, value, opacity = "" }: { label: string; value: string; opacity?: string }) => (
  <div className={cn("flex items-center gap-4 h-12 group", opacity)}>
    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
    <div className="h-px border-b border-dotted border-zinc-200 flex-1 relative top-[3px]" />
    <span className="text-sm font-bold text-zinc-900 uppercase">{value}</span>
  </div>
);
