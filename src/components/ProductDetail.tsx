import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CATEGORY_METADATA } from '../data';
import { useSEO } from '../hooks/useSEO';
import { SITE_URL, absoluteUrl, buildBreadcrumbSchema, buildSeoGraph, cleanSeoText, merchantReturnPolicySchema, offerShippingDetailsSchema } from '../lib/seo';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { useProducts } from '../ProductsContext';
import { useRecentlyViewed } from '../RecentlyViewedContext';
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
  getDoc
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
  MessageCircle,
  Zap,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatFaqContentHtml } from '../lib/faqHtml';
import { sanitizeRichHtml } from '../lib/htmlContent';
import { showAddToCartToast } from './AddToCartToast';
import { ProductCard } from './ProductCard';
import { getProductPath, normalizeProductSlug } from '../lib/productUrls';
import { canonicalCategoryLabel, isSameCategoryLabel } from '../lib/categoryConfig';

export const ProductDetail: React.FC = () => {
  const { categorySlug, productSlug } = useParams<{ categorySlug?: string, productSlug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { products, loading } = useProducts();

  const normalizedRouteSlug = normalizeProductSlug(productSlug);
  const product = products.find(p => normalizeProductSlug(p.slug, p.id) === normalizedRouteSlug);

  const normalizedProductCategory = canonicalCategoryLabel(product?.category);
  const catMetadata = CATEGORY_METADATA.find(c => c.slug === categorySlug);
  const productCategoryMeta = catMetadata || CATEGORY_METADATA.find(c => isSameCategoryLabel(c.name, normalizedProductCategory));
  const productCategorySlug = productCategoryMeta?.slug || categorySlug || 'shop';
  const productCategoryUrl = productCategorySlug === 'shop' ? '/shop' : `/${productCategorySlug}`;
  const categoryName = catMetadata ? catMetadata.name : normalizedProductCategory;
  const categoryProducts = products.filter(p => isSameCategoryLabel(p.category, categoryName));
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
  const [userHeight, setUserHeight] = useState('');
  const [userWeight, setUserWeight] = useState('');
  const [suggestedSize, setSuggestedSize] = useState<string | null>(null);
  const [isSizeProfileModalOpen, setIsSizeProfileModalOpen] = useState(false);
  const { user } = useAuth();
  const { recentProductIds, recordProductView } = useRecentlyViewed();
  const [flashSaleSettings, setFlashSaleSettings] = useState<any>(null);
  const [flashSaleCountdown, setFlashSaleCountdown] = useState({ h: '00', m: '00', s: '00', active: false });
  const [showStickyBar, setShowStickyBar] = useState(false);
  const productCanonical = product ? getProductPath(product) : '/shop';
  const recentlyViewedProducts = React.useMemo(() => {
    const productMap = new Map(products.map((item) => [item.id, item]));
    return recentProductIds
      .filter((id) => id !== product?.id)
      .map((id) => productMap.get(id))
      .filter((item): item is Product => Boolean(item))
      .slice(0, 4);
  }, [products, recentProductIds, product?.id]);
  const productSchema = React.useMemo(() => {
    if (!product) return null;

    const productUrl = absoluteUrl(productCanonical);
    const ratingCount = product.reviewsCount || 0;
    const productNode: any = {
      '@type': 'Product',
      '@id': `${productUrl}#product`,
      name: product.name,
      image: (product.images || []).map(absoluteUrl),
      description: cleanSeoText(product.metaDescription || product.description, 500),
      sku: product.productCode || `UR-${product.id.substring(0, 6).toUpperCase()}`,
      category: product.category,
      color: product.colors,
      size: product.sizes,
      material: product.material,
      brand: {
        '@type': 'Brand',
        name: product.brand || 'UR Sport'
      },
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'VND',
        price: product.discountPrice || product.price,
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        shippingDetails: offerShippingDetailsSchema,
        hasMerchantReturnPolicy: merchantReturnPolicySchema,
        seller: { '@id': `${SITE_URL}/#organization` }
      }
    };

    if (ratingCount > 0) {
      productNode.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.rating || 5,
        reviewCount: ratingCount
      };
    }

    return buildSeoGraph(
      productNode,
      buildBreadcrumbSchema([
        { name: 'Trang chủ', url: '/' },
        { name: String(categoryName || product.category), url: productCategoryUrl },
        { name: product.name, url: productCanonical }
      ])
    );
  }, [product, productCanonical, categoryName, productCategoryUrl]);

  useSEO({
    title: product?.seoTitle || (product ? `${product.name} | UR Sport - Đồ Thể Thao Cao Cấp` : 'UR Sport'),
    description: product?.metaDescription || product?.description,
    keywords: product?.keywords || (product ? `${product.name}, ${product.category}, ur sport, đồ thể thao nam` : ''),
    canonical: productCanonical,
    image: product?.images?.[0],
    type: "product",
    schema: productSchema
  });

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth < 768) {
        setShowStickyBar(window.scrollY > 800);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const SHIRT_SIZES = [
    { size: 'M', vai: 46, dai: 37, nguc: 64 },
    { size: 'L', vai: 48, dai: 39, nguc: 66 },
    { size: 'XL', vai: 50, dai: 41, nguc: 68 },
    { size: 'XXL', vai: 52, dai: 43, nguc: 70 },
    { size: 'XXXL', vai: 54, dai: 48, nguc: 72 },
    { size: 'XXXXL', vai: 56, dai: 50, nguc: 74 }
  ];

  const handleSaveSizeProfile = () => {
    const h = parseInt(userHeight);
    const w = parseInt(userWeight);
    if (!h || !w || h < 100 || w < 30) {
      toast.error('Vui lòng nhập số đo hợp lý (cm và kg)');
      return;
    }
    
    let hIndex = 0;
    if (h < 165) hIndex = 0;
    else if (h <= 170) hIndex = 1;
    else if (h <= 175) hIndex = 2;
    else if (h <= 180) hIndex = 3;
    else if (h <= 185) hIndex = 4;
    else hIndex = 5;

    let wIndex = 0;
    if (w < 60) wIndex = 0;
    else if (w <= 68) wIndex = 1;
    else if (w <= 75) wIndex = 2;
    else if (w <= 82) wIndex = 3;
    else if (w <= 90) wIndex = 4;
    else wIndex = 5;

    const sizes = ['M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
    const finalIndex = Math.max(hIndex, wIndex);
    const size = sizes[finalIndex];
    
    setSuggestedSize(size);
    setIsSizeProfileModalOpen(false);
    toast.success(`Hệ thống đã cập nhật size đề xuất cho bạn`, {
      position: 'top-center',
    });
  };

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

      const visibleReviews = reviewsData.filter(review => isAdmin || !review.status || review.status === 'approved');
      const sortedReviews = [...visibleReviews].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setReviews(sortedReviews);
    });

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

    const fetchFlashSale = async () => {
      const snap = await getDoc(doc(db, 'settings', 'flashSale'));
      if (snap.exists()) {
        setFlashSaleSettings(snap.data());
      }
    };
    fetchFlashSale();

    return () => unsubscribe();
  }, [product?.id, user]);

  useEffect(() => {
    if (!flashSaleSettings || !flashSaleSettings.isActive || !product?.id) return;

    const flashSaleProduct = flashSaleSettings.products?.find((p: any) => p.id === product.id);
    if (!flashSaleProduct) {
      setFlashSaleCountdown(prev => ({ ...prev, active: false }));
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(flashSaleSettings.startTime).getTime();
      const end = new Date(flashSaleSettings.endTime).getTime();

      if (now >= start && now <= end) {
        const diff = end - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setFlashSaleCountdown({
          h: h.toString().padStart(2, '0'),
          m: m.toString().padStart(2, '0'),
          s: s.toString().padStart(2, '0'),
          active: true
        });
      } else {
        setFlashSaleCountdown(prev => ({ ...prev, active: false }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [flashSaleSettings, product?.id]);

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

      await addDoc(collection(db, 'reviews'), {
        productId: product.id,
        productName: product.name,
        userId: user.uid,
        userName: user?.displayName || newReview.userName,
        rating: newReview.rating,
        comment: newReview.comment,
        variant: `${selectedSize} / ${selectedColor}`,
        images: imageUrls,
        videos: videoUrls,
        status: 'pending',
        createdAt: serverTimestamp()
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
    }
  }, [product?.id]);

  useEffect(() => {
    if (product?.id) {
      recordProductView(product.id);
    }
  }, [product?.id, recordProductView]);

  useEffect(() => {
    if (product && selectedColor) {
      const variant = product.colorImages?.find(ci => ci.name === selectedColor);
      if (variant?.image) {
        setMainImage(variant.image);
      }
    }
  }, [selectedColor, product?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-[#1e4b64] border-t-transparent animate-spin" />
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
    const flashSaleProduct = flashSaleSettings?.products?.find((p: any) => p.id === product.id);
    const finalPrice = (flashSaleCountdown.active && flashSaleProduct) 
      ? flashSaleProduct.flashSalePrice 
      : (product.discountPrice || product.price);

    const cartProduct = { ...product, discountPrice: finalPrice };
    
    addToCart(cartProduct, selectedColor, selectedSize, quantity);
    showAddToCartToast({
      productName: product.name,
      image: product.images?.[0],
      meta: `${selectedColor} / Size ${selectedSize} / SL: ${quantity}`,
      onCheckout: () => navigate('/checkout'),
    });
  };

  const handleBuyNow = () => {
    const flashSaleProduct = flashSaleSettings?.products?.find((p: any) => p.id === product.id);
    const finalPrice = (flashSaleCountdown.active && flashSaleProduct) 
      ? flashSaleProduct.flashSalePrice 
      : (product.discountPrice || product.price);

    const cartProduct = { ...product, discountPrice: finalPrice };
    
    addToCart(cartProduct, selectedColor, selectedSize, quantity);
    navigate('/checkout');
  };



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white min-h-screen pt-2 pb-32 font-sans text-zinc-900"
    >
      {/* Breadcrumbs & Nav Row */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-auto max-w-[1400px] px-4 h-10 sm:px-6 lg:px-8 flex items-center justify-between border-b border-zinc-100 mb-4"
      >
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-400 overflow-hidden">
          <Link to="/" className="hover:text-black transition-colors shrink-0">Home</Link>
          <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
          <Link to={productCategorySlug === 'shop' ? '/shop' : `/${productCategorySlug}`} className="hover:text-black transition-colors shrink-0">{categoryName}</Link>
          <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
          <span className="text-zinc-500 truncate">{product.name}</span>
        </nav>

        <div className="flex items-center gap-2 h-full shrink-0 ml-4">
          <button
            onClick={() => prevProduct && navigate(`/${prevProduct.slug}`)}
            disabled={!prevProduct}
            className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-20 transition-all group"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900" />
          </button>

          <span className="text-xs font-medium text-zinc-400 min-w-[40px] text-center">
            {currentIndex + 1} <span className="text-zinc-200 mx-0.5">/</span> {categoryProducts.length}
          </span>

          <button
            onClick={() => nextProduct && navigate(`/${nextProduct.slug}`)}
            disabled={!nextProduct}
            className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-20 transition-all group"
          >
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900" />
          </button>
        </div>
      </motion.div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Product Info Grid */}
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
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(product.images || []).map((img, i) => (
                <button key={i} onClick={() => setMainImage(img)} className="w-20 h-20 rounded-xl border-2 border-zinc-100 overflow-hidden shrink-0">
                  <img src={img} alt={`${product.name} - Ảnh ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
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
                    CODE: <span className="text-zinc-900 font-bold">{product.productCode || `UR-${product.id.substring(0, 6).toUpperCase()}`}</span>
                    <Copy className="h-3.5 w-3.5 cursor-pointer hover:text-black transition-colors" />
                  </div>
                </div>
              </div>

              {flashSaleCountdown.active && (
                <div className="bg-gradient-to-r from-[#ff3b30] to-[#ff9500] rounded-xl overflow-hidden shadow-lg shadow-red-500/20 mb-6">
                  <div className="flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-white fill-white animate-pulse" />
                      <span className="text-white font-black text-lg uppercase tracking-tighter italic">FLASH SALE</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-white/90 text-[10px] font-black uppercase tracking-widest">
                        <Clock className="h-3.5 w-3.5" /> KẾT THÚC TRONG
                      </div>
                      <div className="flex items-center gap-1">
                        {[flashSaleCountdown.h, flashSaleCountdown.m, flashSaleCountdown.s].map((val, i) => (
                          <React.Fragment key={i}>
                            <span className="bg-zinc-900 text-white text-xs font-black px-1.5 py-1 rounded-md min-w-[24px] text-center shadow-xl">{val}</span>
                            {i < 2 && <span className="text-white font-black text-xs animate-pulse">:</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-zinc-100">
                <div className="flex items-baseline gap-2 sm:gap-4 flex-nowrap">
                  <span className="text-3xl sm:text-5xl font-bold text-[#ff3b30] tracking-tighter whitespace-nowrap">
                    {(flashSaleCountdown.active 
                      ? flashSaleSettings.products.find((p: any) => p.id === product.id)?.flashSalePrice 
                      : (product.discountPrice || product.price)
                    ).toLocaleString('vi-VN')}₫
                  </span>
                  {(product.discountPrice || flashSaleCountdown.active) && (
                    <span className="text-lg sm:text-2xl text-zinc-300 line-through font-bold whitespace-nowrap">
                      {product.price.toLocaleString('vi-VN')}₫
                    </span>
                  )}
                  {flashSaleCountdown.active && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-black rounded-lg">
                      -{Math.round((1 - (flashSaleSettings.products.find((p: any) => p.id === product.id)?.flashSalePrice / product.price)) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Selection UI */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider">
                  Màu sắc: <span className="text-[#1e4b64] font-bold ml-1">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  {(product.colors || []).map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "px-6 h-12 rounded-xl border-2 transition-all font-bold uppercase text-[13px] tracking-wide",
                        selectedColor === color ? "border-[#1e4b64] bg-blue-50/30 text-[#1e4b64]" : "border-zinc-100 text-zinc-600 hover:border-zinc-300"
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider">
                    Kích cỡ: <span className="text-[#1e4b64] font-bold ml-1">{selectedSize}</span>
                  </p>
                  <button onClick={() => setIsSizeGuideOpen(true)} className="text-[12px] font-bold text-[#0068c9] hover:underline uppercase tracking-widest italic">
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(product.sizes || []).map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "min-w-[70px] h-12 rounded-xl text-[14px] font-bold transition-all border-2 flex items-center justify-center",
                        selectedSize === size ? "border-[#1e4b64] text-[#1e4b64] bg-blue-50/30" : "border-zinc-100 text-zinc-600 hover:border-zinc-300"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-4 h-16 pt-4">
                <div className="flex items-center border-2 border-zinc-100 rounded-2xl bg-white overflow-hidden h-full">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-14 h-full flex items-center justify-center text-zinc-400 hover:text-[#1e4b64] hover:bg-zinc-50 transition-colors">
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="w-14 h-full flex items-center justify-center font-bold text-zinc-900 text-lg border-x-2 border-zinc-50">{quantity}</div>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-14 h-full flex items-center justify-center text-zinc-400 hover:text-[#1e4b64] hover:bg-zinc-50 transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button onClick={handleAddToCart} className="flex-1 h-full bg-[#f0f9ff] border-2 border-[#1e4b64] text-[#1e4b64] font-bold rounded-2xl text-[14px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-all active:scale-[0.98]">
                  <ShoppingCart className="h-5 w-5" /> Thêm vào giỏ
                </button>
                <button onClick={handleBuyNow} className="flex-1 h-full bg-[#1e4b64] text-white font-bold rounded-2xl text-[14px] uppercase tracking-widest hover:bg-[#153a4d] transition-all active:scale-[0.98] shadow-lg">
                  Mua Ngay
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-8 border-t border-zinc-100">
                <div className="bg-zinc-50/50 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-zinc-100">
                      <ShieldCheck className="h-6 w-6 text-[#1e4b64]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-tight text-zinc-900">Cam kết chính hãng</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Hoàn tiền 200% nếu giả</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-y sm:border-y-0 sm:border-x border-zinc-100 py-4 sm:py-0 sm:px-6">
                    <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-zinc-100">
                      <RefreshCcw className="h-6 w-6 text-[#1e4b64]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-tight text-zinc-900">7 ngày đổi trả</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Lỗi là đổi tận nơi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-zinc-100">
                      <Truck className="h-6 w-6 text-[#1e4b64]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-tight text-zinc-900">Giao hàng hỏa tốc</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Toàn quốc từ 2-3 ngày</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                  {["COD", "Bank Transfer", "Momo", "ZaloPay", "ShopeePay"].map((method) => (
                    <span key={method} className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {recentlyViewedProducts.length > 0 && (
          <section className="mt-14 border-t border-zinc-100 pt-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1e4b64]">
                  Xem lại nhanh
                </p>
                <h2 className="text-2xl font-black tracking-tight text-zinc-950">
                  Sản phẩm đã xem gần đây
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/da-xem')}
                className="hidden text-[#1e4b64] text-[11px] sm:text-[14px] font-bold items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap sm:flex"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
              {recentlyViewedProducts.map((recentProduct) => (
                <ProductCard
                  key={recentProduct.id}
                  product={recentProduct}
                  onClick={() => navigate(`/${recentProduct.slug || recentProduct.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Mobile Sticky Bar */}
        <AnimatePresence>
          {showStickyBar && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-zinc-100 p-4 pb-safe-area shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                  <img src={mainImage} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-zinc-900 truncate">{product.name}</p>
                  <p className="text-[14px] font-black text-[#ff3b30]">
                    {(flashSaleCountdown.active 
                      ? flashSaleSettings.products.find((p: any) => p.id === product.id)?.flashSalePrice 
                      : (product.discountPrice || product.price)
                    ).toLocaleString('vi-VN')}₫
                  </p>
                </div>
                <Button 
                  onClick={handleBuyNow}
                  className="bg-[#1e4b64] text-white font-black uppercase text-[12px] tracking-widest px-6 h-12 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                >
                  Mua ngay
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: Description & Details */}
        <div className="mt-12 pt-12 border-t border-zinc-100">
          <div className="space-y-12">
            {/* Full Width Content Section */}
            <div className="w-full space-y-8">

              {/* ── 1. CHI TIẾT SẢN PHẨM ── */}
              <div>
                <h4 className="text-[18px] font-bold text-zinc-900 italic mb-4 pb-3 border-b-2 border-zinc-900 inline-block pr-8">
                  CHI TIẾT SẢN PHẨM
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 w-full">
                  {[
                    { label: 'Thương hiệu', value: product.brand || 'UR SPORT' },
                    { label: 'Xuất xứ', value: product.origin || 'Việt Nam' },
                    { label: 'Kiểu dáng', value: product.style || 'Slim Fit' },
                    { label: 'Chất liệu', value: product.material || 'Cotton Premium' },
                    { label: 'Phong cách', value: product.fashionStyle || 'Thể thao, Cơ bản, Hàn Quốc, Đường phố, Công sở' },
                    { label: 'Cổ áo', value: product.collarType || 'Cổ tròn' }
                  ].map(row => (
                    <div key={row.label} className="flex items-center py-[14px] border-b border-zinc-100 last:border-0 gap-4 w-full">
                      <span className="text-zinc-400 text-[14px] w-32 shrink-0">{row.label}</span>
                      {row.label === 'Thương hiệu' ? (
                        <Link 
                          to={`/shop?brand=${encodeURIComponent(row.value)}`}
                          className="text-[#1e4b64] text-[14px] font-bold hover:underline"
                        >
                          {row.value}
                        </Link>
                      ) : (
                        <span className="text-zinc-800 text-[14px] font-semibold">{row.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 2. HƯỚNG DẪN CHỌN SIZE ── */}
              <div>
                <h4 className="text-[18px] font-bold text-zinc-900 italic mb-6 pb-4 border-b-2 border-zinc-900 inline-block pr-8">
                  HƯỚNG DẪN CHỌN SIZE
                </h4>
                
                <div className="w-full">
                  <h5 className="text-[15px] font-medium text-zinc-800 mb-4">Số đo sản phẩm</h5>
                  
                  {/* Banner Đề xuất Size */}
                  <div className="w-full border border-red-200 bg-red-50/30 rounded-xl p-4 flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      <span className="text-[14px] text-zinc-700">
                        {suggestedSize ? (
                          <>Size đề xuất: <strong className="text-red-500">{suggestedSize}</strong></>
                        ) : (
                          'Nhập chiều cao cân nặng để nhận đề xuất size'
                        )}
                      </span>
                    </div>
                    <button 
                      onClick={() => setIsSizeProfileModalOpen(true)}
                      className="text-[13px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors"
                    >
                      Hồ sơ size <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Bảng thông số */}
                  <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 mb-6">
                    <table className="w-full text-center text-[14px] min-w-[500px]">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200 text-left">Size (Quốc Tế)</th>
                          <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">Vai <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
                          <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">Chiều dài áo <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
                          <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">Vòng ngực <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {SHIRT_SIZES.map((row) => {
                          const isSuggested = suggestedSize === row.size;
                          return (
                            <tr key={row.size} className={cn("border-b border-zinc-100 last:border-0", isSuggested ? "bg-red-50/20" : "")}>
                              <td className={cn("py-4 px-4 text-left font-medium", isSuggested ? "text-red-500 font-bold" : "text-zinc-600")}>{row.size}</td>
                              <td className={cn("py-4 px-4", isSuggested ? "text-red-500 font-bold" : "text-zinc-600")}>{row.vai}</td>
                              <td className={cn("py-4 px-4", isSuggested ? "text-red-500 font-bold" : "text-zinc-600")}>{row.dai}</td>
                              <td className={cn("py-4 px-4", isSuggested ? "text-red-500 font-bold" : "text-zinc-600")}>{row.nguc}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Ảnh bảng size (product.sizeGuideUrl) đã được di chuyển lên Modal 'SIZE GUIDE', không còn hiển thị ở đây */}
                  <p className="text-[12px] text-zinc-400 mt-4">Số đo có thể thay đổi nhẹ tùy thuộc vào từng form áo.</p>
                </div>
              </div>

              {/* Modal Hồ Sơ Size */}
              <AnimatePresence>
                {isSizeProfileModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsSizeProfileModalOpen(false)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="relative w-full max-w-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-5 border-b border-zinc-100">
                        <h3 className="text-[18px] font-medium text-zinc-800">Thông tin số đo</h3>
                        <button 
                          onClick={() => setIsSizeProfileModalOpen(false)}
                          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                        >
                          <X className="h-5 w-5 text-zinc-500" />
                        </button>
                      </div>
                      
                      <div className="p-6">
                        <h4 className="text-[15px] font-medium text-zinc-800 mb-4">Các số đo cơ bản</h4>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div>
                            <label className="block text-[13px] text-zinc-600 mb-2">Chiều cao mẫu<span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={userHeight}
                                onChange={(e) => setUserHeight(e.target.value)}
                                placeholder="VD: 175"
                                className="w-full h-11 px-4 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64] text-[14px]"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">cm</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[13px] text-zinc-600 mb-2">Cân nặng mẫu<span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={userWeight}
                                onChange={(e) => setUserWeight(e.target.value)}
                                placeholder="VD: 70"
                                className="w-full h-11 px-4 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64] text-[14px]"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">kg</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-zinc-100 pt-4 mb-6">
                          <button className="w-full flex items-center justify-between text-[14px] text-zinc-800">
                            Các số đo khác
                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                          </button>
                        </div>

                        <div className="flex justify-end">
                          <button 
                            onClick={handleSaveSizeProfile}
                            className="px-10 py-2.5 bg-[#f05d40] text-white font-bold rounded-md hover:bg-[#d94b30] transition-colors"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* ── 3. MÔ TẢ SẢN PHẨM ── */}
              <div className="w-full">
                <h4 className="text-[18px] font-bold text-zinc-900 italic mb-5 pb-3 border-b-2 border-zinc-900 inline-block pr-8">
                  MÔ TẢ SẢN PHẨM
                </h4>

                {/* Wrapper: clip chiều cao khi chưa expand, luôn clip overflow ngang */}
                <div className="relative w-full overflow-x-hidden">
                  <ProductDescriptionHtml
                    className={cn(
                      "product-description-container notranslate w-full text-zinc-600 leading-loose transition-[max-height] duration-700 ease-in-out overflow-x-hidden",
                      !isDescriptionExpanded
                        ? "max-h-[1200px] overflow-y-hidden"
                        : "max-h-none overflow-y-visible"
                    )}
                    html={product.description
                      .replace(/&nbsp;/g, ' ')
                      .replace(/\u00a0/g, ' ')
                    }
                    fallbackImages={[
                      ...(product.colorImages || []).map(item => ({ url: item.image, label: item.name })),
                      ...(product.images || []).map(url => ({ url }))
                    ]}
                  />

                  {/* Gradient fade khi thu gọn */}
                  {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                  )}
                </div>

                <div className="flex justify-center pt-10">
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="px-8 py-3 bg-white text-[#153446] border border-zinc-200 text-sm font-bold rounded-full shadow-sm hover:text-[#1e4b64] hover:border-[#1e4b64] hover:-translate-y-1 transition-all flex items-center gap-2 group"
                  >
                    {isDescriptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                    <ChevronDown className={cn("h-4 w-4 transition-all duration-300", isDescriptionExpanded && "rotate-180")} />
                  </button>
                </div>
              </div>
            </div>

            {/* Suggested Products */}
            <div className="w-full pt-12 border-t border-zinc-200">
              <div className="flex items-center justify-between mb-10">
                <h4 className="text-[20px] font-bold text-zinc-900 uppercase tracking-tight">CÓ THỂ BẠN CŨNG THÍCH</h4>
                <Link to={`/apparel/${categorySlug || 'all'}`} className="text-[#1e4b64] text-[11px] sm:text-[14px] font-bold flex items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap">
                  <span>Xem tất cả</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {categoryProducts.filter(p => p.id !== product.id).slice(0, 5).map(p => (
                  <Link to={getProductPath(p)} key={p.id} className="block group">
                    <div className="aspect-[4/5] w-full overflow-hidden bg-zinc-50 mb-4 relative rounded-2xl border border-zinc-100 shadow-sm group-hover:shadow-md transition-all">
                      <img
                        src={p.images?.[0]}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {p.videos && p.videos.length > 0 && (
                        <div className="absolute bottom-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center">
                          <Play className="h-3 w-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <h5 className="text-[14px] font-bold text-zinc-800 leading-snug line-clamp-2 group-hover:text-[#1e4b64] transition-colors mb-2">
                      {p.name}
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[#ff3b30] font-black text-[16px]">
                        {p.discountPrice ? p.discountPrice.toLocaleString('vi-VN') : p.price.toLocaleString('vi-VN')}₫
                      </span>
                      {p.discountPrice && (
                        <span className="text-zinc-400 text-xs line-through">{p.price.toLocaleString('vi-VN')}₫</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews-section" className="mt-12 bg-zinc-50/50 rounded-[40px] p-6 sm:p-8 border border-zinc-100 shadow-sm">
          <div className="space-y-6">
            <div className="text-left">
              <h4 className="text-xl font-bold text-zinc-900 tracking-tight">Đánh giá sản phẩm</h4>
            </div>

            <div className="bg-[#fffbf8] border border-[#f9ede5] p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:gap-12 shadow-sm/50">
              <div className="text-center md:text-left shrink-0">
                <div className="text-[#ee4d2d] font-bold mb-2 flex items-baseline justify-center md:justify-start gap-1">
                  <span className="text-4xl font-black tracking-tight">{product.rating ? product.rating.toFixed(1) : '0.0'}</span>
                  <span className="text-sm font-bold text-zinc-500 uppercase tracking-wide">trên 5</span>
                </div>
                <div className="flex justify-center md:justify-start gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-5 w-5", i < Math.floor(product.rating || 0) ? "fill-[#ee4d2d] text-[#ee4d2d]" : "text-zinc-200")} />
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-wrap gap-2 justify-center md:justify-start w-full">
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
                        "px-4 py-2.5 text-xs sm:text-sm rounded-full border transition-all duration-200 flex items-center justify-center cursor-pointer select-none active:scale-95",
                        reviewFilter === filter.id
                          ? "bg-[#ee4d2d]/10 border-[#ee4d2d] text-[#ee4d2d] font-bold shadow-sm"
                          : "bg-white border-zinc-200 text-zinc-700 hover:border-[#ee4d2d]/50 hover:bg-[#ee4d2d]/5 font-medium"
                      )}
                    >
                      {filter.label}
                    </button>
                  ));
                })()}
              </div>
            </div>

            {!isCheckingPurchase && hasPurchased ? (
              <div className="bg-white rounded-[24px] p-5 sm:p-8 border border-zinc-100 shadow-sm">
                <h5 className="text-lg font-bold text-zinc-900 mb-4">Viết cảm nhận của bạn</h5>
                <form onSubmit={handleSubmitReview} className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pb-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-500 uppercase tracking-wider">Bạn chấm mấy sao?</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setNewReview({ ...newReview, rating: star })} className="transition-transform active:scale-125 cursor-pointer">
                          <Star className={cn("h-8 w-8 transition-all", star <= newReview.rating ? "fill-[#ee4d2d] text-[#ee4d2d]" : "text-zinc-200")} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {!user && (
                      <input
                        type="text"
                        placeholder="Họ và tên của bạn..."
                        value={newReview.userName}
                        onChange={(e) => setNewReview({ ...newReview, userName: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-transparent rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ee4d2d]/20 focus:border-[#ee4d2d]/30 outline-none transition-all"
                      />
                    )}
                    <textarea
                      rows={4}
                      placeholder="Sản phẩm mặc có mát không? Form dáng thế nào?..."
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full px-6 py-6 bg-zinc-50 border border-transparent rounded-[24px] text-sm font-medium focus:ring-2 focus:ring-[#ee4d2d]/20 focus:border-[#ee4d2d]/30 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-zinc-50 hover:bg-zinc-100 rounded-2xl cursor-pointer transition-all border-2 border-dashed border-zinc-200 text-zinc-600 font-bold text-xs uppercase tracking-widest group">
                        <Camera className="h-4 w-4 group-hover:text-[#ee4d2d] group-active:text-[#ee4d2d] transition-colors shrink-0" />
                        <span>Thêm ảnh hoặc video</span>
                        <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>

                    {reviewPreviews.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {reviewPreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-zinc-100 group shadow-sm">
                            {preview.type === 'image' ? (
                              <img src={preview.url} alt={`Đánh giá sản phẩm ${product.name}`} loading="lazy" className="w-full h-full object-cover" />
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
                              className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center sm:opacity-0 group-hover:opacity-100 opacity-100 transition-opacity hover:bg-red-500 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end w-full sm:w-auto">
                    <Button type="submit" disabled={isSubmittingReview} className="w-full sm:w-auto bg-[#ee4d2d] hover:bg-[#d73211] text-white px-12 py-5 sm:py-7 h-auto rounded-2xl font-bold tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all cursor-pointer">
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
                  Bạn cần mua sản phẩm này và đơn hàng phải ở trạng thái{' '}
                  <strong className="text-[#ee4d2d]">"Đã giao hàng"</strong> để có thể chia sẻ trải nghiệm của mình.
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
                      <div key={review.id} className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[28px] border border-zinc-100 shadow-sm space-y-6 transition-all hover:shadow-md">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-[#ee4d2d] to-[#ff7337] flex items-center justify-center text-white font-bold text-lg sm:text-xl border-4 border-white shadow-md shrink-0">
                              {review.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 text-[15px]">{review.userName}</p>
                              <div className="flex gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "fill-[#ee4d2d] text-[#ee4d2d]" : "text-zinc-200")} />
                                ))}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-zinc-400 font-medium">
                                <span>{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleString('vi-VN') : 'Mới đây'}</span>
                                {review.variant && (
                                  <>
                                    <span className="w-1 h-1 bg-zinc-200 rounded-full hidden sm:inline" />
                                    <span>Phân loại hàng: {review.variant}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pl-0 sm:pl-18 space-y-4">
                          <p className="text-zinc-700 text-[16px] leading-relaxed font-medium">
                            {review.comment}
                          </p>
                          {review.adminReply && (
                            <div className="rounded-2xl border border-[#1e4b64]/10 bg-blue-50/60 p-4">
                              <p className="text-[11px] font-black uppercase tracking-widest text-[#1e4b64]">UR Sport phản hồi</p>
                              <p className="mt-2 text-sm font-medium leading-6 text-zinc-700">{review.adminReply}</p>
                            </div>
                          )}

                          {(review.images?.length || review.videos?.length) && (
                            <div className="flex flex-wrap gap-4 pt-2">
                              {review.images?.map((img: string, i: number) => (
                                <div key={i} className="w-32 h-32 rounded-xl overflow-hidden border border-zinc-100 cursor-pointer hover:scale-105 transition-all shadow-sm">
                                  <img src={img} alt={`Đánh giá ${product.name} - Ảnh ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
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
                              <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M7 10v12M15 5.88l-1.42 1.42a4.41 4.41 0 0 1-6.23 0l-1.42-1.42a1 1 0 0 0-1.42 1.42l1.42 1.42a6.41 6.41 0 0 0 9.06 0l1.42-1.42a1 1 0 0 0-1.42-1.42Z" />
                                <path d="M14 10V4.5a2.5 2.5 0 0 0-5 0V10" />
                              </svg>
                              <span className="text-sm font-bold">Hữu ích</span>
                            </button>
                            <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-12 pt-8 border-t border-zinc-100">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => {
                            setCurrentPage(prev => prev - 1);
                            window.scrollTo({ top: document.getElementById('reviews-section')?.offsetTop || 0, behavior: 'smooth' });
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 disabled:opacity-30 hover:bg-zinc-50 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => {
                                setCurrentPage(page);
                                window.scrollTo({ top: document.getElementById('reviews-section')?.offsetTop || 0, behavior: 'smooth' });
                              }}
                              className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-all cursor-pointer",
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
                          onClick={() => {
                            setCurrentPage(prev => prev + 1);
                            window.scrollTo({ top: document.getElementById('reviews-section')?.offsetTop || 0, behavior: 'smooth' });
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 disabled:opacity-30 hover:bg-zinc-50 transition-colors cursor-pointer"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 p-2.5 pb-safe flex gap-2 shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.1)]">
        <button
          onClick={handleAddToCart}
          className="flex-1 h-12 bg-[#f0f9ff] border-2 border-[#1e4b64] text-[#1e4b64] font-black rounded-xl text-[12px] uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-transform whitespace-nowrap"
        >
          <ShoppingCart className="h-4 w-4" /> Thêm
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-[1.15] h-12 bg-[#1e4b64] text-white font-black rounded-xl text-[12px] uppercase tracking-wide active:scale-95 transition-transform shadow-lg shadow-blue-500/20 whitespace-nowrap"
        >
          Mua Ngay
        </button>
      </div>

      {/* Size Guide Modal */}
      {isSizeGuideOpen && product.sizeGuideUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsSizeGuideOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/10 hover:bg-black/20 text-black flex items-center justify-center rounded-full z-10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="max-h-[85vh] overflow-auto">
              <img src={product.sizeGuideUrl} alt={`Bảng size ${product.name}`} loading="lazy" className="w-full h-auto" />
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

type DescriptionFallbackImage = string | { url: string; label?: string };

const normalizeFallbackKey = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd');

const isLocalDescriptionImage = (src: string) => {
  const value = src.trim();
  if (!value) return false;
  if (value.startsWith('/images/')) return true;

  try {
    const parsed = new URL(value);
    return ['shop-ur-sport.vercel.app', 'ursport.vn', 'www.ursport.vn', 'localhost', '127.0.0.1'].includes(parsed.hostname)
      && parsed.pathname.startsWith('/images/');
  } catch {
    return false;
  }
};

const getDescriptionFallbackImage = (
  img: HTMLImageElement,
  index: number,
  fallbackImages: Array<{ url: string; label?: string }>
) => {
  const imageText = normalizeFallbackKey([
    img.getAttribute('src') || '',
    img.getAttribute('alt') || '',
    img.getAttribute('title') || ''
  ].join(' '));
  const matchedFallback = fallbackImages.find(item => {
    const label = normalizeFallbackKey(item.label || '');
    return label && imageText.includes(label);
  });

  return matchedFallback?.url || fallbackImages[index % fallbackImages.length]?.url;
};

const ProductDescriptionHtml = React.memo(({ html, className, fallbackImages = [] }: { html: string; className?: string; fallbackImages?: DescriptionFallbackImage[] }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const normalizedFallbackImages = React.useMemo(
    () => {
      const seen = new Set<string>();
      return fallbackImages
        .map(item => typeof item === 'string' ? { url: item, label: '' } : item)
        .filter(item => item.url)
        .filter(item => {
          if (seen.has(item.url)) return false;
          seen.add(item.url);
          return true;
        });
    },
    [fallbackImages]
  );
  const formattedHtml = React.useMemo(() => {
    const safeHtml = sanitizeRichHtml(formatFaqContentHtml(html));
    if (!safeHtml || normalizedFallbackImages.length === 0 || typeof DOMParser === 'undefined') {
      return safeHtml;
    }

    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<div>${safeHtml}</div>`, 'text/html');
    const wrapper = parsed.body.firstElementChild as HTMLElement | null;
    if (!wrapper) return safeHtml;

    Array.from(wrapper.querySelectorAll('img')).forEach((img, index) => {
      const src = img.getAttribute('src') || '';
      if (isLocalDescriptionImage(src)) return;

      const fallback = getDescriptionFallbackImage(img, index, normalizedFallbackImages);
      if (fallback) {
        img.setAttribute('src', fallback);
      }
    });

    return wrapper.innerHTML;
  }, [html, normalizedFallbackImages]);

  React.useEffect(() => {
    if (containerRef.current && containerRef.current.innerHTML !== formattedHtml) {
      containerRef.current.innerHTML = formattedHtml;
    }
  }, [formattedHtml]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || normalizedFallbackImages.length === 0) return;

    const images = Array.from(container.querySelectorAll('img'));
    images.forEach((img, index) => {
      img.onerror = () => {
        const fallback = getDescriptionFallbackImage(img, index, normalizedFallbackImages);
        if (!fallback || img.src === fallback) return;
        img.onerror = null;
        img.src = fallback;
      };
    });
  }, [formattedHtml, normalizedFallbackImages]);

  return <div ref={containerRef} className={className} />;
});

ProductDescriptionHtml.displayName = 'ProductDescriptionHtml';
