import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CATEGORY_METADATA } from '../data';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { useProducts } from '../ProductsContext';
import { Button } from '@/components/ui/button';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  doc,
  runTransaction
} from 'firebase/firestore';
import { Review, Product } from '../types';
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
  Play,
  Camera,
  Video,
  X,
  Truck,
  ShieldCheck,
  RefreshCcw,
  MessageCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const ProductDetail: React.FC = () => {
  const { categorySlug, productSlug } = useParams<{ categorySlug?: string, productSlug: string }>();
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
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const REVIEWS_PER_PAGE = 5;
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', userName: '' });
  const [selectedReviewFiles, setSelectedReviewFiles] = useState<File[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<{ url: string, type: 'image' | 'video' }[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!product?.id) return;

    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', product.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      
      const sortedReviews = [...reviewsData].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setReviews(sortedReviews);
    });

    // Kiểm tra trạng thái mua hàng
    const checkPurchaseStatus = async () => {
      if (!user) {
        setHasPurchased(false);
        setIsCheckingPurchase(false);
        return;
      }

      try {
        const { getDocs } = await import('firebase/firestore');
        const ordersRef = collection(db, 'orders');
        const purchaseQuery = query(
          ordersRef, 
          where('userId', '==', user.uid),
          where('status', '==', 'delivered')
        );
        
        const querySnapshot = await getDocs(purchaseQuery);
        const purchased = querySnapshot.docs.some(doc => {
          const orderData = doc.data();
          return orderData.items?.some((item: any) => item.id === product.id);
        });

        setHasPurchased(purchased);
      } catch (error) {
        console.error('Lỗi kiểm tra trạng thái mua hàng:', error);
      } finally {
        setIsCheckingPurchase(false);
      }
    };

    checkPurchaseStatus();

    return () => unsubscribe();
  }, [product?.id, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedReviewFiles(prev => [...prev, ...files]);

      const newPreviews = files.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image' as 'image' | 'video'
      }));
      setReviewPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedReviewFiles(prev => prev.filter((_, i) => i !== index));
    setReviewPreviews(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id) return;
    if (!user) {
      toast.error('Vui lòng đăng nhập để gửi đánh giá!');
      return;
    }
    if (!newReview.comment.trim() || (!user && !newReview.userName.trim())) {
      toast.error('Vui lòng nhập đầy đủ thông tin đánh giá!');
      return;
    }

    setIsSubmittingReview(true);
    const uploadToast = toast.loading('Đang chuẩn bị gửi đánh giá...');
    
    try {
      // 1. Upload media to Cloudinary
      const imageUrls: string[] = [];
      const videoUrls: string[] = [];

      const CLOUDINARY_CLOUD_NAME = 'dcj4qhcfh';
      const CLOUDINARY_UPLOAD_PRESET = 'ursport_uploads';

      if (selectedReviewFiles.length > 0) {
        for (let i = 0; i < selectedReviewFiles.length; i++) {
          const file = selectedReviewFiles[i];
          const isVideo = file.type.startsWith('video');
          toast.loading(`Đang tải ${isVideo ? 'video' : 'ảnh'} (${i + 1}/${selectedReviewFiles.length})...`, { id: uploadToast });
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('folder', `reviews/${product.id}`);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? 'video' : 'image'}/upload`,
            { method: 'POST', body: formData }
          );

          if (!response.ok) throw new Error('Lỗi upload Cloudinary');
          
          const data = await response.json();
          if (isVideo) {
            videoUrls.push(data.secure_url);
          } else {
            imageUrls.push(data.secure_url);
          }
        }
      }

      toast.loading('Đang lưu thông tin đánh giá...', { id: uploadToast });

      // 2. Thêm review mới
      await addDoc(collection(db, 'reviews'), {
        productId: product.id,
        userId: user.uid,
        userName: user?.displayName || newReview.userName,
        rating: newReview.rating,
        comment: newReview.comment,
        variant: `${selectedSize} / ${selectedColor}`,
        images: imageUrls,
        videos: videoUrls,
        createdAt: serverTimestamp()
      });

      // 3. Sử dụng Transaction để cập nhật rating và reviewsCount của sản phẩm
      const productRef = doc(db, 'products', product.id);
      
      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) return;

        const currentData = productDoc.data();
        const currentCount = currentData.reviewsCount || 0;
        const currentRating = currentData.rating || 0;
        
        const newCount = currentCount + 1;
        const newAvgRating = parseFloat(((currentRating * currentCount + newReview.rating) / newCount).toFixed(1));
        
        transaction.update(productRef, {
          rating: newAvgRating,
          reviewsCount: newCount
        });
      });

      setNewReview({ rating: 5, comment: '', userName: '' });
      setSelectedReviewFiles([]);
      setReviewPreviews([]);
      toast.success('Cảm ơn bạn đã đánh giá sản phẩm!', { id: uploadToast });
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error('Có lỗi xảy ra: ' + error.message, { id: uploadToast });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors?.[0] || '');
      setSelectedSize(product.sizes?.[0] || '');
      setMainImage(product.images?.[0] || '');
      window.scrollTo(0, 0);

      // Dynamic SEO Meta Tags
      document.title = product.seoTitle || `${product.name} | UR Sport - Phong cách thể thao`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      const descContent = product.metaDescription || product.description.replace(/<[^>]*>?/gm, '').slice(0, 160);
      if (metaDescription) {
        metaDescription.setAttribute('content', descContent);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = descContent;
        document.head.appendChild(meta);
      }

      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', product.keywords || '');
      } else if (product.keywords) {
        const meta = document.createElement('meta');
        meta.name = 'keywords';
        meta.content = product.keywords;
        document.head.appendChild(meta);
      }
    }
  }, [product]);
  
  // Update main image when color selection changes
  useEffect(() => {
    if (product && selectedColor) {
      const variant = product.colorImages?.find(ci => ci.name === selectedColor);
      if (variant?.image) {
        setMainImage(variant.image);
      }
    }
  }, [selectedColor, product]);

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

  const handleBuyNow = () => {
    addToCart(product, selectedColor, selectedSize, quantity);
    navigate('/checkout');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white min-h-screen pt-6 pb-32 font-sans text-zinc-900"
    >
      {/* 1. SEO Breadcrumbs & Nav Row */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-auto max-w-[1400px] px-4 h-14 sm:px-6 lg:px-8 flex items-center justify-between border-b border-zinc-100 mb-8"
      >
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <Link to="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-zinc-300" />
          <Link to={`/apparel/${categorySlug}`} className="hover:text-black transition-colors shrink-0">{categoryName}</Link>
          <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
          <span className="text-zinc-500 truncate max-w-[120px] xs:max-w-[150px] sm:max-w-md">{product.name}</span>
        </nav>

        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-2 h-full">
            <button 
              onClick={() => prevProduct && navigate(`/apparel/${categorySlug}/${prevProduct.slug}`)}
              disabled={!prevProduct}
              className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-20 transition-all group"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900" />
            </button>
            
            <span className="text-xs font-medium text-zinc-400 min-w-[40px] text-center">
              {currentIndex + 1} <span className="text-zinc-200 mx-0.5">/</span> {categoryProducts.length}
            </span>

            <button 
              onClick={() => nextProduct && navigate(`/apparel/${categorySlug}/${nextProduct.slug}`)}
              disabled={!nextProduct}
              className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-20 transition-all group"
            >
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900" />
            </button>
          </div>
        </div>
      </motion.div>
 
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Left: Images */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-white border border-zinc-100 rounded-2xl shadow-sm">
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
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(product.images || []).map((img, i) => (
                <button key={i} onClick={() => setMainImage(img)} className="w-20 h-20 rounded-xl border-2 border-zinc-100 overflow-hidden shrink-0">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Right: Product Info */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-7 space-y-10 lg:sticky lg:top-24"
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-[13px] font-bold text-[#00a651] uppercase tracking-widest"
                >
                  UR SPORT Official
                </motion.p>
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-[20px] font-medium text-zinc-900 leading-tight"
                >
                  {product.name}
                </motion.h1>
                <div className="flex items-center flex-wrap gap-6 pt-4">
                  <div className="flex items-center gap-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("h-4 w-4", i < Math.floor(product.rating || 0) ? "text-[#ffa800] fill-[#ffa800]" : "text-zinc-200")} />
                    ))}
                    <span className="text-sm font-bold text-zinc-400 ml-2">({product.reviewsCount || 0} đánh giá)</span>
                  </div>
                  <div className="h-4 w-px bg-zinc-200" />
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    CODE: <span className="text-zinc-900 font-bold">UR-{product.id.substring(0,6).toUpperCase()}</span>
                    <Copy className="h-3.5 w-3.5 cursor-pointer hover:text-black transition-colors" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-8 border-t border-zinc-100">
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl font-bold text-[#ff3b30] tracking-tighter">
                    {(product.discountPrice || product.price).toLocaleString('vi-VN')}₫
                  </span>
                  {product.discountPrice && (
                    <span className="text-2xl text-zinc-300 line-through font-bold">
                      {product.price.toLocaleString('vi-VN')}₫
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Selection UI */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider">Màu sắc: <span className="text-[#0082c8] font-bold ml-1">{selectedColor}</span></p>
                <div className="flex flex-wrap gap-3">
                  {(product.colors || []).map((color, idx) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "px-6 h-12 rounded-xl border-2 transition-all font-bold uppercase text-[13px] tracking-wide",
                        selectedColor === color ? "border-[#0082c8] bg-blue-50/30 text-[#0082c8]" : "border-zinc-100 text-zinc-600 hover:border-zinc-300"
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider">Kích cỡ: <span className="text-[#0082c8] font-bold ml-1">{selectedSize}</span></p>
                  <button onClick={() => setIsSizeGuideOpen(true)} className="text-[12px] font-bold text-[#0068c9] hover:underline uppercase tracking-widest italic">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(product.sizes || []).map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "min-w-[70px] h-12 rounded-xl text-[14px] font-bold transition-all border-2 flex items-center justify-center",
                        selectedSize === size ? "border-[#0082c8] text-[#0082c8] bg-blue-50/30" : "border-zinc-100 text-zinc-600 hover:border-zinc-300"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

                <div className="hidden md:flex items-center gap-4 h-16 pt-4">
                  <div className="flex items-center border-2 border-zinc-100 rounded-2xl bg-white overflow-hidden h-full">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-14 h-full flex items-center justify-center text-zinc-400 hover:text-[#0082c8] hover:bg-zinc-50 transition-colors"><Minus className="h-4 w-4" /></button>
                    <div className="w-14 h-full flex items-center justify-center font-bold text-zinc-900 text-lg border-x-2 border-zinc-50">{quantity}</div>
                    <button onClick={() => setQuantity(quantity + 1)} className="w-14 h-full flex items-center justify-center text-zinc-400 hover:text-[#0082c8] hover:bg-zinc-50 transition-colors"><Plus className="h-4 w-4" /></button>
                  </div>
                  <button onClick={handleAddToCart} className="flex-1 h-full bg-[#f0f9ff] border-2 border-[#0082c8] text-[#0082c8] font-bold rounded-2xl text-[14px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-all active:scale-[0.98]">
                    <ShoppingCart className="h-5 w-5" /> Thêm vào giỏ
                  </button>
                  <button onClick={handleBuyNow} className="flex-1 h-full bg-[#1e4b64] text-white font-bold rounded-2xl text-[14px] uppercase tracking-widest hover:bg-[#153a4d] transition-all active:scale-[0.98] shadow-lg">Mua Ngay</button>
                </div>

                {/* Trust Badges - Improved for Conversion */}
                <div className="pt-6 border-t border-zinc-100">
                  <div className="bg-zinc-50/80 rounded-2xl p-6 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Truck className="h-5 w-5 text-[#0082c8]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-tight">Miễn phí giao hàng</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Cho đơn từ 500k</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <ShieldCheck className="h-5 w-5 text-[#0082c8]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-tight">Thanh toán an toàn</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">COD, Bank, E-Wallet</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-center gap-6">
                    {["COD", "Bank Transfer", "Momo", "ZaloPay"].map((method) => (
                      <span key={method} className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
        </div>
 
        {/* Bottom: Tabs/Description */}
        <div className="mt-20 pt-20 border-t border-zinc-100">
          <div className="w-full">
            <div className="space-y-12">

              <div>
                  <div className="flex flex-col lg:flex-row gap-0">
                    {/* Left Column: Main Content (~81%) */}
                    <div className="flex-1 min-w-0 lg:border-r lg:border-zinc-200 lg:pr-8 space-y-10 overflow-hidden">

                      {/* ── 1. CHI TIẾT SẢN PHẨM ── */}
                      <div>
                        <h4 className="text-[16px] font-bold text-zinc-900 italic mb-6 pb-4 border-b border-zinc-200">CHI TIẾT SẢN PHẨM</h4>
                        <div className="grid grid-cols-1 gap-y-0">
                          {[
                            { label: 'Thương hiệu', value: product.brand || 'UR SPORT' },
                            { label: 'Xuất xứ', value: product.origin || 'Việt Nam' },
                            { label: 'Kiểu dáng', value: product.style || 'Slim Fit' },
                            { label: 'Chất liệu', value: product.material || 'Cotton Premium' },
                            { label: 'Phong cách', value: product.fashionStyle || 'Thể thao, Cơ bản, Hàn Quốc, Đường phố, Công sở' },
                            { label: 'Cổ áo', value: product.collarType || 'Cổ tròn' }
                          ].map(row => (
                            <div key={row.label} className="flex flex-col sm:flex-row sm:items-center py-[14px] border-b border-zinc-100 last:border-0 gap-1 sm:gap-0">
                              <span className="text-zinc-400 text-[13px] sm:text-[14px] w-full sm:w-44 shrink-0">{row.label}</span>
                              <span className="text-zinc-800 text-[14px] font-semibold">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── 2. HƯỚNG DẪN CHỌN SIZE ── */}
                      {product.sizeGuideUrl && (
                        <div>
                          <h4 className="text-[16px] font-bold text-zinc-900 italic mb-6 pb-4 border-b border-zinc-200">Hướng Dẫn Chọn Size</h4>
                          <img src={product.sizeGuideUrl} alt="Hướng dẫn chọn size" className="w-full max-w-[700px] h-auto rounded-lg border border-zinc-200" />
                        </div>
                      )}

                      {/* ── 3. MÔ TẢ SẢN PHẨM ── */}
                      <div>
                        <h4 className="text-[16px] font-bold text-zinc-900 italic mb-6 pb-4 border-b border-zinc-200">MÔ TẢ SẢN PHẨM</h4>
                        <div className="relative">
                          <div className={cn(
                            "product-description-container max-w-none text-zinc-600 leading-relaxed overflow-hidden transition-all duration-700 break-normal",
                            !isDescriptionExpanded ? "max-h-[800px]" : "max-h-none"
                          )}>
                            <div dangerouslySetInnerHTML={{ __html: product.description }} />
                          </div>
                          {!isDescriptionExpanded && <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none" />}
                          <div className="flex justify-center pt-8">
                            <button 
                              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                              className="px-5 py-2 bg-white border border-zinc-200 text-[#0082c8] text-sm font-bold rounded-full shadow-sm hover:text-black hover:border-zinc-300 hover:shadow-md transition-all flex items-center gap-2"
                            >
                              {isDescriptionExpanded ? 'Thu gọn' : 'Xem thêm nội dung'}
                              <ChevronDown className={cn("h-4 w-4 transition-transform", isDescriptionExpanded && "rotate-180")} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Sidebar (~19%) */}
                    <div className="hidden lg:block w-[220px] shrink-0 pl-6">
                      <div className="sticky top-24">
                        <h4 className="text-[14px] text-zinc-400 mb-6">Top Sản Phẩm Nổi Bật</h4>
                        <div className="space-y-6">
                          {categoryProducts.filter(p => p.id !== product.id).slice(0, 4).map(p => (
                            <Link to={`/apparel/${categorySlug || 'all'}/${p.slug}`} key={p.id} className="block group">
                              <div className="aspect-[4/5] w-full overflow-hidden bg-zinc-100 mb-2 relative">
                                <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                {p.videos && p.videos.length > 0 && (
                                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                                    <Play className="h-3 w-3 text-white fill-white" />
                                  </div>
                                )}
                              </div>
                              <h5 className="text-[13px] font-medium text-zinc-700 leading-snug line-clamp-2 group-hover:text-[#0082c8] transition-colors">{p.name}</h5>
                              <p className="text-[#ee4d2d] font-medium text-[14px] mt-1">
                                {p.discountPrice ? p.discountPrice.toLocaleString('vi-VN') : p.price.toLocaleString('vi-VN')}₫
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Reviews Section */}
        <div id="reviews-section" className="mt-12 bg-zinc-50/50 rounded-[40px] p-6 sm:p-8 border border-zinc-100 shadow-sm">
          <div className="space-y-6">
            <div className="text-left">
              <h4 className="text-xl font-bold text-zinc-900 tracking-tight">Đánh giá sản phẩm</h4>
            </div>

            <div className="bg-[#fffbf8] border border-[#f9ede5] p-6 sm:p-8 rounded-sm flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="text-center md:text-left">
                <div className="text-[#ee4d2d] font-medium mb-2">
                  <span className="text-3xl font-bold">{product.rating ? product.rating.toFixed(1) : '0.0'}</span>
                  <span className="text-lg ml-1">trên 5</span>
                </div>
                <div className="flex justify-center md:justify-start gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-5 w-5", i < Math.floor(product.rating || 0) ? "fill-[#ee4d2d] text-[#ee4d2d]" : "text-zinc-200")} />
                  ))}
                </div>
              </div>
              
              <div className="flex-1 flex flex-wrap gap-2.5">
                {(() => {
                  const formatCount = (count: number) => {
                    if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.', ',')}k`;
                    return count.toString();
                  };

                  return [
                    { id: 'all', label: 'Tất Cả' },
                    { id: '5', label: `5 Sao (${formatCount(reviews.filter(r => r.rating === 5).length)})` },
                    { id: '4', label: `4 Sao (${formatCount(reviews.filter(r => r.rating === 4).length)})` },
                    { id: '3', label: `3 Sao (${formatCount(reviews.filter(r => r.rating === 3).length)})` },
                    { id: '2', label: `2 Sao (${formatCount(reviews.filter(r => r.rating === 2).length)})` },
                    { id: '1', label: `1 Sao (${formatCount(reviews.filter(r => r.rating === 1).length)})` },
                    { id: 'comment', label: `Có Bình Luận (${formatCount(reviews.filter(r => r.comment.trim()).length)})` },
                    { id: 'media', label: `Có Hình Ảnh / Video (${formatCount(reviews.filter(r => (r.images?.length || 0) > 0 || (r.videos?.length || 0) > 0).length)})` }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => { setReviewFilter(filter.id); setCurrentPage(1); }}
                      className={cn(
                        "px-4 py-2 text-[14px] rounded-sm border transition-all min-w-[100px] h-10 flex items-center justify-center",
                        reviewFilter === filter.id 
                          ? "bg-white border-[#ee4d2d] text-[#ee4d2d]" 
                          : "bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300"
                      )}
                    >
                      {filter.label}
                    </button>
                  ));
                })()}
              </div>
            </div>

            {!isCheckingPurchase && (hasPurchased || isAdmin) ? (
              <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-zinc-100 shadow-sm">
                <h5 className="text-lg font-bold text-zinc-900 mb-4">Viết cảm nhận của bạn</h5>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-zinc-600 uppercase">Bạn chấm mấy sao?</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setNewReview({ ...newReview, rating: star })} className="transition-transform active:scale-125">
                          <Star className={cn("h-8 w-8 transition-all", star <= newReview.rating ? "fill-[#ee4d2d] text-[#ee4d2d]" : "text-zinc-200")} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {!user && (
                      <input 
                        type="text"
                        placeholder="Họ và tên của bạn..."
                        value={newReview.userName}
                        onChange={(e) => setNewReview({ ...newReview, userName: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ee4d2d]/20 outline-none transition-all"
                      />
                    )}
                    <textarea 
                      rows={4}
                      placeholder="Sản phẩm mặc có mát không? Form dáng thế nào?..."
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full px-6 py-6 bg-zinc-50 border-none rounded-[24px] text-sm font-medium focus:ring-2 focus:ring-[#ee4d2d]/20 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Media Upload */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 px-6 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl cursor-pointer transition-all border-2 border-dashed border-zinc-200 text-zinc-600 font-bold text-xs uppercase tracking-widest group">
                        <Camera className="h-4 w-4 group-hover:text-[#ee4d2d] transition-colors" />
                        <span>Thêm ảnh hoặc video</span>
                        <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>

                    {reviewPreviews.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {reviewPreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-zinc-100 group shadow-sm">
                            {preview.type === 'image' ? (
                              <img src={preview.url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                <Video className="h-8 w-8 text-white/50" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <Play className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            )}
                            <button 
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmittingReview} className="bg-[#ee4d2d] hover:bg-[#d73211] text-white px-12 py-7 rounded-2xl font-bold tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all">
                      {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá ngay'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : !isCheckingPurchase && (
              <div className="bg-[#fffbf8] border border-[#f9ede5] p-8 rounded-2xl text-center">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#f9ede5]">
                  <ShoppingBag className="h-8 w-8 text-[#ee4d2d]" />
                </div>
                <h5 className="text-lg font-bold text-zinc-900 mb-2">Chỉ người mua hàng mới có thể đánh giá</h5>
                <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                  Bạn cần mua sản phẩm này và đơn hàng phải ở trạng thái <strong className="text-[#ee4d2d]">"Đã giao hàng"</strong> để có thể chia sẻ trải nghiệm của mình.
                </p>
                {!user && (
                  <Button onClick={() => window.location.href = '/login'} className="mt-6 bg-[#ee4d2d] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-500/20">
                    Đăng nhập để kiểm tra
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-8">
              {(() => {
                const filtered = reviews.filter(r => {
                  if (reviewFilter === 'all') return true;
                  if (reviewFilter === 'comment') return r.comment.trim().length > 0;
                  if (reviewFilter === 'media') return (r.images?.length || 0) > 0 || (r.videos?.length || 0) > 0;
                  return r.rating === parseInt(reviewFilter);
                });

                const totalPages = Math.ceil(filtered.length / REVIEWS_PER_PAGE);
                const paginated = filtered.slice((currentPage - 1) * REVIEWS_PER_PAGE, currentPage * REVIEWS_PER_PAGE);

                return (
                  <>
                    {paginated.map((review: any) => (
                      <div key={review.id} className="bg-white p-8 rounded-[28px] border border-zinc-100 shadow-sm space-y-6 transition-all hover:shadow-md">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#ee4d2d] to-[#ff7337] flex items-center justify-center text-white font-bold text-xl border-4 border-white shadow-md">
                              {review.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 text-[15px]">{review.userName}</p>
                              <div className="flex gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "fill-[#ee4d2d] text-[#ee4d2d]" : "text-zinc-200")} />
                                ))}
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-[12px] text-zinc-400 font-medium">
                                <span>{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleString('vi-VN') : 'Mới đây'}</span>
                                {review.variant && (
                                  <>
                                    <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                    <span>Phân loại hàng: {review.variant}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pl-18 space-y-4">
                          <p className="text-zinc-700 text-[16px] leading-relaxed font-medium">
                            {review.comment}
                          </p>

                          {/* Review Media Display */}
                          {(review.images?.length || review.videos?.length) && (
                            <div className="flex flex-wrap gap-4 pt-2">
                              {review.images?.map((img: string, i: number) => (
                                <div key={i} className="w-32 h-32 rounded-xl overflow-hidden border border-zinc-100 cursor-pointer hover:scale-105 transition-all shadow-sm">
                                  <img src={img} className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {review.videos?.map((vid: string, i: number) => (
                                <div key={i} className="w-32 h-32 rounded-xl overflow-hidden border border-zinc-100 cursor-pointer hover:scale-105 transition-all shadow-sm relative group">
                                  <video src={vid} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-all">
                                    <Play className="h-10 w-10 text-white fill-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-6 pt-4">
                            <button className="flex items-center gap-2 text-zinc-400 hover:text-[#ee4d2d] transition-colors group">
                              <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10v12M15 5.88l-1.42 1.42a4.41 4.41 0 0 1-6.23 0l-1.42-1.42a1 1 0 0 0-1.42 1.42l1.42 1.42a6.41 6.41 0 0 0 9.06 0l1.42-1.42a1 1 0 0 0-1.42-1.42Z"/><path d="M14 10V4.5a2.5 2.5 0 0 0-5 0V10"/></svg>
                              <span className="text-sm font-bold">Hữu ích</span>
                            </button>
                            <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-12 pt-8 border-t border-zinc-100">
                        <button 
                          disabled={currentPage === 1}
                          onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo({ top: document.getElementById('reviews-section')?.offsetTop || 0, behavior: 'smooth' }); }}
                          className="w-10 h-10 flex items-center justify-center rounded-sm border border-zinc-200 disabled:opacity-30 hover:bg-zinc-50 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        
                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
                          // Hiển thị logic rút gọn trang nếu cần, nhưng ở đây ta cứ hiện hết cho đơn giản nếu số lượng ít
                          return (
                            <button
                              key={page}
                              onClick={() => { setCurrentPage(page); window.scrollTo({ top: document.getElementById('reviews-section')?.offsetTop || 0, behavior: 'smooth' }); }}
                              className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-sm text-sm font-medium transition-all",
                                currentPage === page 
                                  ? "bg-[#ee4d2d] text-white shadow-md" 
                                  : "text-zinc-500 hover:bg-zinc-50 border border-transparent hover:border-zinc-200"
                              )}
                            >
                              {page}
                            </button>
                          );
                        })}

                        <button 
                          disabled={currentPage === totalPages}
                          onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({ top: document.getElementById('reviews-section')?.offsetTop || 0, behavior: 'smooth' }); }}
                          className="w-10 h-10 flex items-center justify-center rounded-sm border border-zinc-200 disabled:opacity-30 hover:bg-zinc-50 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-zinc-200 p-3 pb-safe flex gap-2 shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.1)]">
        <button 
          onClick={handleAddToCart}
          className="flex-1 h-12 bg-[#f0f9ff] border-2 border-[#0082c8] text-[#0082c8] font-bold rounded-xl text-[13px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <ShoppingCart className="h-4 w-4" /> Thêm
        </button>
        <button 
          onClick={handleBuyNow}
          className="flex-[1.2] h-12 bg-[#0082c8] text-white font-bold rounded-xl text-[13px] uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
        >
          Mua Ngay
        </button>
      </div>

      {/* Size Guide Modal */}
      {isSizeGuideOpen && product.sizeGuideUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsSizeGuideOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsSizeGuideOpen(false)} className="absolute top-4 right-4 w-10 h-10 bg-black/10 hover:bg-black/20 text-black flex items-center justify-center rounded-full z-10 transition-colors"><X className="h-5 w-5" /></button>
            <div className="max-h-[85vh] overflow-auto">
              <img src={product.sizeGuideUrl} alt="Size Guide" className="w-full h-auto" />
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const FeatureLine = ({ label, value, opacity = "" }: { label: string; value: string; opacity?: string }) => (
  <div className={cn("flex items-center gap-4 h-12 group", opacity)}>
    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
    <div className="h-px border-b border-dotted border-zinc-200 flex-1 relative top-[3px]" />
    <span className="text-sm font-bold text-zinc-900 uppercase">{value}</span>
  </div>
);
