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
import { db, isFirebaseConfigured } from '../firebase';
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
  Phone,
  Zap,
  Clock,
  ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatFaqContentHtml } from '../lib/faqHtml';
import { sanitizeRichHtml } from '../lib/htmlContent';
import { showAddToCartToast } from './AddToCartToast';
import { ProductCard } from './ProductCard';
import { ImageLightbox } from './ImageLightbox';
import { getProductPath, normalizeProductSlug } from '../lib/productUrls';
import { canonicalCategoryLabel, isSameCategoryLabel } from '../lib/categoryConfig';
import { useLanguage } from '../LanguageContext';
import {
  getLocalizedCategoryLabel,
  getLocalizedProductAttribute,
  getLocalizedProductCategory,
  getLocalizedProductDescription,
  getLocalizedProductName
} from '../lib/productI18n';

export const ProductDetail: React.FC = () => {
  const { categorySlug, productSlug } = useParams<{ categorySlug?: string, productSlug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();
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
  const productName = product ? getLocalizedProductName(product, language) : '';
  const productCategoryName = product ? getLocalizedProductCategory(product, language) : getLocalizedCategoryLabel(String(categoryName || ''), language);
  const localizedCategoryName = getLocalizedCategoryLabel(String(categoryName || ''), language);
  const productDescription = product ? getLocalizedProductDescription(product, language) : '';

  const prevProduct = currentIndex > 0 ? categoryProducts[currentIndex - 1] : null;
  const nextProduct = currentIndex < categoryProducts.length - 1 ? categoryProducts[currentIndex + 1] : null;

  const { addToCart } = useCart();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState('');
  const [mainVideo, setMainVideo] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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
  const { user, isVip } = useAuth();
  const { recentProductIds, recordProductView } = useRecentlyViewed();
  const [flashSaleSettings, setFlashSaleSettings] = useState<any>(null);
  const [flashSaleCountdown, setFlashSaleCountdown] = useState({ h: '00', m: '00', s: '00', active: false });
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isMobilePickerOpen, setIsMobilePickerOpen] = useState(false);
  const [mobilePickerMode, setMobilePickerMode] = useState<'cart' | 'buy'>('cart');
  const [contactSettings, setContactSettings] = useState({
    zaloPhone: '0917722425',
    callPhone: '0917722425',
  });
  const productCanonical = product ? getProductPath(product) : '/shop';
  const primaryImage = product?.images?.find(image => image?.trim()) || null;
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
      name: getLocalizedProductName(product, language),
      image: (product.images || []).map(absoluteUrl),
      description: cleanSeoText(language === 'en' ? getLocalizedProductDescription(product, language) : (product.metaDescription || product.description), 500),
      sku: product.productCode || `UR-${product.id.substring(0, 6).toUpperCase()}`,
      category: getLocalizedProductCategory(product, language),
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

    const relatedProductsList = categoryProducts
      .filter(p => p.id !== product.id)
      .slice(0, 4);

    if (relatedProductsList.length > 0) {
      productNode.isRelatedTo = relatedProductsList.map(rp => ({
        '@type': 'Product',
        '@id': `${absoluteUrl(getProductPath(rp))}#product`,
        name: getLocalizedProductName(rp, language),
        url: absoluteUrl(getProductPath(rp)),
        image: (rp.images || []).slice(0, 1).map(absoluteUrl)
      }));
    }

    return buildSeoGraph(
      productNode,
      buildBreadcrumbSchema([
        { name: language === 'en' ? 'Home' : 'Trang chủ', url: '/' },
        { name: getLocalizedCategoryLabel(String(categoryName || product.category), language), url: productCategoryUrl },
        { name: getLocalizedProductName(product, language), url: productCanonical }
      ])
    );
  }, [product, productCanonical, categoryName, productCategoryUrl, categoryProducts, language]);

  useSEO({
    title: product ? (language === 'en' ? `${productName} | UR Sport - Premium Sportswear` : (product.seoTitle || `${product.name} | UR Sport - Đồ Thể Thao Cao Cấp`)) : 'UR Sport',
    description: product ? (language === 'en' ? cleanSeoText(productDescription, 220) : (product.metaDescription || product.description)) : '',
    keywords: product ? (language === 'en' ? `${productName}, ${productCategoryName}, ur sport, men sportswear` : (product.keywords || `${product.name}, ${product.category}, ur sport, đồ thể thao nam`)) : '',
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

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return;
    getDoc(doc(db, 'settings', 'floatingMenu')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setContactSettings({
          zaloPhone: data.zaloPhone || '0917722425',
          callPhone: data.callPhone || '0917722425',
        });
      }
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'hide-floating-menu-mobile-on-product';
    style.innerHTML = `
      @media (max-width: 767px) {
        .floating-contact-menu {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('hide-floating-menu-mobile-on-product');
      if (el) el.remove();
    };
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

    if (!db || !isFirebaseConfigured) {
      setReviews([]);
      setHasPurchased(false);
      setIsCheckingPurchase(false);
      setFlashSaleSettings(null);
      return;
    }

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
    if (!db || !isFirebaseConfigured) {
      toast.error('Chức năng đánh giá tạm thời không khả dụng do hệ thống chưa cấu hình Firebase.');
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
          toast.loading(language === 'en'
            ? `Uploading ${isVideo ? 'video' : 'image'} (${i + 1}/${selectedReviewFiles.length})...`
            : `Đang tải ${isVideo ? 'video' : 'ảnh'} (${i + 1}/${selectedReviewFiles.length})...`, { id: uploadToast });

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

      toast.loading(language === 'en' ? 'Saving your review...' : 'Đang lưu thông tin đánh giá...', { id: uploadToast });

      await addDoc(collection(db, 'reviews'), {
        productId: product.id,
        productName,
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
      toast.success(language === 'en' ? 'Thanks for reviewing this product!' : 'Cảm ơn bạn đã đánh giá sản phẩm!', { id: uploadToast });
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error((language === 'en' ? 'An error occurred: ' : 'Có lỗi xảy ra: ') + error.message, { id: uploadToast });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors?.[0] || '');
      setSelectedSize(product.sizes?.[0] || '');
      // Nếu có video thì hiển thị video, không thì hiển thị ảnh
      if (product.videos?.length > 0) {
        setMainVideo(product.videos[0]);
        setMainImage('');
      } else {
        setMainVideo('');
        setMainImage(product.images?.[0] || '');
      }
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
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1e4b64]/10 text-lg font-black text-[#1e4b64]">
          UR
        </div>
        <h2 className="mb-3 text-center text-2xl font-black text-zinc-950">{t('productNotFound')}</h2>
        <p className="mb-7 max-w-md text-center text-sm font-medium leading-6 text-zinc-500">
          {language === 'en'
            ? 'This product may have changed its URL or is temporarily unavailable. Please return to the shop to view available items.'
            : 'Sản phẩm có thể đã đổi đường dẫn hoặc tạm ngừng hiển thị. Bạn quay lại cửa hàng để xem các mẫu đang có nhé.'}
        </p>
        <Button onClick={() => navigate('/shop')} className="rounded-full bg-[#1e4b64] px-6 font-black hover:bg-[#153a4d]">
          {t('backToShop')}
        </Button>
      </div>
    );
  }

  const hasVariantStock = Boolean(product.variants?.length);
  const findVariant = (color: string, size: string) =>
    product.variants?.find(variant => variant.color === color && variant.size === size);
  const isColorUnavailable = (color: string) => {
    if (!hasVariantStock) return false;
    if (selectedSize) {
      const variant = findVariant(color, selectedSize);
      return !variant || Number(variant.stock || 0) <= 0;
    }
    return !product.variants?.some(variant => variant.color === color && Number(variant.stock || 0) > 0);
  };
  const isSizeUnavailable = (size: string) => {
    if (!hasVariantStock) return false;
    if (selectedColor) {
      const variant = findVariant(selectedColor, size);
      return !variant || Number(variant.stock || 0) <= 0;
    }
    return !product.variants?.some(variant => variant.size === size && Number(variant.stock || 0) > 0);
  };
  const selectedVariant = selectedColor && selectedSize ? findVariant(selectedColor, selectedSize) : null;
  const selectedVariantOutOfStock = Boolean(hasVariantStock && selectedColor && selectedSize && (!selectedVariant || Number(selectedVariant.stock || 0) <= 0));
  const selectedVariantStock = selectedVariant ? Number(selectedVariant.stock || 0) : null;
  const selectedColorImage = selectedColor
    ? product.colorImages?.find(ci => ci.name.trim().toLowerCase() === selectedColor.trim().toLowerCase())?.image
    : '';
  const videoThumbnailImage = primaryImage || selectedColorImage || product.images?.find(Boolean) || '';
  const activeFlashSaleProduct = flashSaleCountdown.active
    ? flashSaleSettings?.products?.find((p: any) => p.id === product.id)
    : null;
  const salePrice = Number(activeFlashSaleProduct?.flashSalePrice || product.discountPrice || product.price);
  const memberPrice = Math.round(salePrice * 0.95);
  const activePrice = isVip ? memberPrice : salePrice;
  const comparePrice = isVip ? salePrice : product.price;
  const hasComparePrice = comparePrice > activePrice;
  const marketplaceLinks = [
    {
      id: 'shopee',
      label: 'Shopee',
      caption: language === 'en' ? 'Quick purchase from the official store' : 'Mua nhanh trên gian hàng chính hãng',
      href: product.marketplaceLinks?.shopee || 'https://shopee.vn/ursport.vn',
      icon: '/images/logo_icon/icon-shopee.webp',
      className: 'border-[#ee4d2d]/20 bg-[#fff6f2] text-[#ee4d2d] hover:border-[#ee4d2d]/50 hover:bg-[#fff0e9] hover:shadow-[#ee4d2d]/10'
    },
    {
      id: 'tiktok-shop',
      label: 'TikTok Shop',
      caption: language === 'en' ? 'Watch real videos and live deals' : 'Xem video thật và ưu đãi live',
      href: product.marketplaceLinks?.tiktokShop || 'https://www.tiktok.com/@ursportvietnam',
      icon: '/images/logo_icon/icon-tiktok.webp',
      className: 'border-zinc-900/10 bg-zinc-950 text-white hover:bg-black hover:shadow-zinc-900/15'
    }
  ].filter(link => link.href);

  const ensureSelectedVariantAvailable = () => {
    if (!selectedVariantOutOfStock) return true;
    toast.error(language === 'en' ? 'This variant is out of stock. Please choose another color or size.' : 'Phân loại này đang hết hàng, vui lòng chọn màu hoặc size khác', {
      position: 'top-center',
    });
    return false;
  };

  const handleAddToCart = () => {
    if (!ensureSelectedVariantAvailable()) return;

    const cartProduct = { ...product, discountPrice: activePrice };
    
    addToCart(cartProduct, selectedColor, selectedSize, quantity);
    showAddToCartToast({
      productName,
      image: primaryImage || undefined,
      meta: `${selectedColor} / Size ${selectedSize} / ${language === 'en' ? 'Qty' : 'SL'}: ${quantity}`,
      onCheckout: () => navigate('/checkout'),
    });
  };

  const handleBuyNow = () => {
    if (!ensureSelectedVariantAvailable()) return;

    const cartProduct = { ...product, discountPrice: activePrice };
    
    addToCart(cartProduct, selectedColor, selectedSize, quantity);
    navigate('/checkout');
  };



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white min-h-screen pt-2 pb-20 md:pb-24 font-sans text-zinc-900"
    >
      {/* Breadcrumbs & Nav Row */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-auto max-w-[1400px] px-4 h-10 sm:px-6 lg:px-8 flex items-center justify-between border-b border-zinc-100 mb-4 gap-3"
      >
        <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs font-medium text-zinc-400 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link to="/" className="hover:text-black transition-colors shrink-0">Home</Link>
          <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
          <Link to={productCategorySlug === 'shop' ? '/shop' : `/${productCategorySlug}`} className="hover:text-black transition-colors shrink-0">{localizedCategoryName}</Link>
          <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
          <span className="min-w-[120px] max-w-[55vw] truncate text-zinc-500 sm:max-w-md">{productName}</span>
        </nav>

        <div className="flex items-center gap-2 h-full shrink-0">
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
            <div 
              onClick={() => {
                if (mainVideo) return;
                const imagesList = product.images || [];
                const idx = imagesList.indexOf(mainImage);
                setLightboxIndex(idx !== -1 ? idx : 0);
                setIsLightboxOpen(true);
              }}
              className="relative aspect-square w-full overflow-hidden bg-white border border-zinc-100 rounded-2xl shadow-sm cursor-zoom-in group animate-in fade-in duration-300"
            >
              {mainVideo ? (
                mainVideo.includes('youtube.com/embed') || mainVideo.includes('youtu.be') || mainVideo.includes('player.vimeo.com') || mainVideo.includes('vimeo.com') ? (
                  <iframe
                    src={mainVideo}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <video 
                    src={mainVideo} 
                    controls
                    controlsList="nodownload"
                    crossOrigin="anonymous"
                    preload="metadata"
                    className="w-full h-full object-cover" 
                  />
                )
              ) : mainImage && (
                <motion.img
                  key={mainImage}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={mainImage}
                  alt={productName}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  referrerPolicy="no-referrer"
                />
              )}
              {/* App-like Page Indicator for Mobile */}
              {!mainVideo && (
                <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold md:hidden">
                  {Math.max(1, (product.images || []).indexOf(mainImage) + 1)} / {(product.images || []).length}
                </div>
              )}
              {!mainVideo && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                  <div className="p-3 rounded-full bg-white/95 text-zinc-800 shadow-lg scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                    <ZoomIn className="h-5 w-5" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(product.videos || []).map((vid, i) => (
                <button 
                  key={`video-${i}`} 
                  onClick={() => {
                    setMainVideo(vid);
                    setMainImage('');
                  }} 
                  className={cn(
                    "w-20 h-20 rounded-xl border-2 overflow-hidden shrink-0 transition-all duration-200 bg-zinc-100 flex items-center justify-center relative group",
                    mainVideo === vid ? "border-[#1e4b64] scale-[1.03]" : "border-zinc-100 hover:border-zinc-300"
                  )}
                >
                  {videoThumbnailImage ? (
                    <img
                      src={videoThumbnailImage}
                      alt={`${productName} - Video ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-zinc-100 to-zinc-200" />
                  )}
                  <div className="absolute inset-0 bg-black/20 transition-all group-hover:bg-black/10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#ff3b30] shadow-lg">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </div>
                  <div className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-sm">
                    <Video className="h-3 w-3" />
                  </div>
                </button>
              ))}
              {(product.images || []).map((img, i) => (
                <button 
                  key={`image-${i}`} 
                  onClick={() => {
                    setMainImage(img);
                    setMainVideo('');
                  }} 
                  className={cn(
                    "w-20 h-20 rounded-xl border-2 overflow-hidden shrink-0 transition-all duration-200",
                    mainImage === img && !mainVideo ? "border-[#1e4b64] scale-[1.03]" : "border-zinc-100 hover:border-zinc-300"
                  )}
                >
                  <img src={img} alt={`${productName} - ${language === 'en' ? 'Image' : 'Ảnh'} ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Right: Product Info */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-7 space-y-6 lg:sticky lg:top-24"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-[20px] font-semibold leading-tight text-zinc-950 sm:text-[22px]"
                >
                  {productName}
                </motion.h1>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] leading-none text-zinc-500">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < Math.floor(product.rating || 0) ? "fill-[#ff6a00] text-[#ff6a00]" : "text-zinc-200"
                        )}
                      />
                    ))}
                  </div>
                  <span>{(product.rating || 0).toFixed(1)}</span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="text-[#0068FF] underline underline-offset-2 transition-colors hover:text-[#005AE0]"
                  >
                    {t('reviews')}: {product.reviewsCount || 0}
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="text-[#0068FF] underline underline-offset-2 transition-colors hover:text-[#005AE0]"
                  >
                    {t('writeReview')}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] leading-none text-zinc-500">
                  <span className="font-medium uppercase tracking-wide">CODE:</span>
                  <span className="font-bold tracking-[0.08em] text-zinc-900">
                    {product.productCode || `UR-${product.id.substring(0, 6).toUpperCase()}`}
                  </span>
                  <Copy className="h-3.5 w-3.5 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-900" />
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

              <div className="space-y-2 border-t border-zinc-100 pt-4">
                <div className="flex items-baseline gap-2 sm:gap-3 flex-nowrap">
                  <span className="text-3xl font-bold tracking-tighter text-[#ff3b30] sm:text-[44px] whitespace-nowrap">
                    {activePrice.toLocaleString('vi-VN')}₫
                  </span>
                  {hasComparePrice && (
                    <span className="text-lg font-bold text-zinc-300 line-through sm:text-xl whitespace-nowrap">
                      {comparePrice.toLocaleString('vi-VN')}₫
                    </span>
                  )}
                  {flashSaleCountdown.active && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-black rounded-lg">
                      -{Math.round((1 - (flashSaleSettings.products.find((p: any) => p.id === product.id)?.flashSalePrice / product.price)) * 100)}%
                    </span>
                  )}
                </div>

                {/* Member VIP Banner inspired by Shopee */}
                <div className="mt-3 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-2.5 py-2 text-xs md:hidden">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">VIP</span>
                    <span className="hidden">
                      Mua ngay với giá <strong className="text-[#ff3b30]">{memberPrice.toLocaleString('vi-VN')}đ</strong> khi là thành viên UR VIP!
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
                    <span className="min-w-0 truncate font-bold text-zinc-700">{isVip ? 'Đã kích hoạt VIP' : 'Giá thành viên'}</span>
                    <strong className="shrink-0 font-black text-[#ff3b30]">
                      {memberPrice.toLocaleString('vi-VN')}đ
                    </strong>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-red-500" />
                </div>
              </div>
            </div>

            {/* Selection UI */}
            <div className="space-y-5">
              <div className="space-y-2.5">
                <p className="text-[13px] font-bold text-zinc-900 uppercase tracking-wider">
                  {t('color')}: <span className="text-[#ff3b30] font-bold ml-1">{selectedColor}</span>
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {(product.colors || []).map((color) => {
                    const unavailable = isColorUnavailable(color);
                    const colorImgObj = product.colorImages?.find(
                      ci => ci.name.trim().toLowerCase() === color.trim().toLowerCase()
                    );
                    const colorImg = colorImgObj?.image || product.images?.[0] || '';

                    return (
                      <button
                        key={color}
                        disabled={unavailable}
                        onClick={() => {
                          if (unavailable) return;
                          setSelectedColor(color);
                        }}
                        className={cn(
                          "relative flex h-9 items-center gap-1.5 overflow-hidden rounded-xl border pl-1.5 pr-3 text-[12px] font-semibold transition-all",
                          selectedColor === color
                            ? "border-[#ff3b30] bg-red-50/10 text-[#ff3b30] font-bold"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300",
                          unavailable && "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 opacity-55 hover:border-zinc-100 after:absolute after:left-3 after:right-3 after:top-1/2 after:h-px after:-rotate-12 after:bg-zinc-300 after:content-['']"
                        )}
                        title={unavailable ? `${color} hết hàng với size đang chọn` : color}
                      >
                        {colorImg && (
                          <img
                            src={colorImg}
                            alt={color}
                            className="h-6 w-6 flex-shrink-0 rounded-lg bg-zinc-100 object-cover"
                          />
                        )}
                        <span className="normal-case tracking-normal">{color}</span>
                        {selectedColor === color && (
                          <div
                            className="absolute bottom-0 right-0 w-3 h-3 bg-[#ff3b30] flex items-center justify-center"
                            style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
                          >
                            <Check className="h-1.5 w-1.5 text-white absolute bottom-px right-px" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-zinc-900 uppercase tracking-wider">
                    {t('size')}: <span className="text-[#ff3b30] font-bold ml-1">{selectedSize}</span>
                    {selectedVariantStock !== null && !selectedVariantOutOfStock && (
                      <span className="ml-2 text-[11px] font-bold normal-case tracking-normal text-zinc-400">
                        Còn {selectedVariantStock}
                      </span>
                    )}
                  </p>
                  <button onClick={() => setIsSizeGuideOpen(true)} className="text-[11px] font-bold uppercase italic tracking-widest text-[#0068c9] hover:underline">
                    {t('sizeGuide')}
                  </button>
                </div>
                <div className={cn(
                  "w-full",
                  (product.sizes || []).includes('4XL') || (product.sizes || []).includes('XXXXL') || (product.sizes || []).length >= 6
                    ? "grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap" 
                    : "flex flex-row flex-nowrap gap-1.5 sm:gap-2"
                )}>
                  {(product.sizes || []).map(size => {
                    const unavailable = isSizeUnavailable(size);
                    const sizes = product.sizes || [];
                    const has4XLOrMore = sizes.includes('4XL') || sizes.includes('XXXXL') || sizes.length >= 6;
                    const shouldStretch = sizes.length >= 4;

                    return (
                      <button
                        key={size}
                        disabled={unavailable}
                        onClick={() => {
                          if (unavailable) return;
                          setSelectedSize(size);
                        }}
                        className={cn(
                          "relative flex h-10 items-center justify-center overflow-hidden rounded-xl border-2 text-[13px] font-bold transition-all sm:h-11",
                          selectedSize === size ? "border-[#ff3b30] text-[#ff3b30] bg-red-50/10" : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300",
                          unavailable && "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 opacity-55 hover:border-zinc-100 after:absolute after:left-2 after:right-2 after:top-1/2 after:h-px after:-rotate-12 after:bg-zinc-300 after:content-['']",
                          has4XLOrMore 
                            ? "w-full sm:w-auto sm:min-w-[64px] sm:px-4" 
                            : (shouldStretch ? "flex-1 min-w-0" : "px-5")
                        )}
                        title={unavailable ? `Size ${size} hết hàng với màu đang chọn` : `Size ${size}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Quantity Selector Row */}
              <div className="flex items-center justify-between py-4 border-t border-b border-zinc-100 md:hidden">
                <span className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider">{t('quantity')}</span>
                <div className="flex items-center border border-zinc-200 rounded-xl bg-white overflow-hidden h-9">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-full flex items-center justify-center text-zinc-400 active:bg-zinc-50">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="w-10 h-full flex items-center justify-center font-bold text-zinc-900 text-sm border-x border-zinc-100">{quantity}</div>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-full flex items-center justify-center text-zinc-400 active:bg-zinc-50">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="hidden h-12 items-center gap-3 md:flex">
                <div className="flex h-full items-center overflow-hidden rounded-xl border border-zinc-100 bg-white">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-full w-12 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-[#1e4b64]">
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex h-full w-12 items-center justify-center border-x border-zinc-50 text-base font-bold text-zinc-900">{quantity}</div>
                  <button onClick={() => setQuantity(quantity + 1)} className="flex h-full w-12 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-[#1e4b64]">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={selectedVariantOutOfStock}
                  className="flex h-full flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#1e4b64] bg-[#f0f9ff] text-[13px] font-bold uppercase tracking-widest text-[#1e4b64] transition-all hover:bg-blue-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  <ShoppingCart className="h-5 w-5" /> {t('addToCart')}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={selectedVariantOutOfStock}
                  className="h-full flex-1 rounded-xl bg-[#1e4b64] text-[13px] font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-[#153a4d] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
                >
                  {t('buyNow')}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-white px-2 py-1.5 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.28)]">
                <div className="mb-1 flex items-center justify-between gap-3 px-0.5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{t('marketplaceTitle')}</p>
                    <p className="text-[11px] font-bold leading-tight text-zinc-900">{t('marketplaceSubtitle')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {marketplaceLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "group flex min-h-[42px] items-center gap-2 rounded-lg border px-2 py-1 transition-all hover:-translate-y-0.5 hover:shadow-md sm:min-h-[44px]",
                        link.className
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                        <img src={link.icon} alt={link.label} loading="lazy" className="h-4.5 w-4.5 object-contain" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-black uppercase tracking-wide sm:text-[11px] sm:tracking-widest">{link.label}</span>
                        <span className={cn("mt-0.5 hidden truncate text-[8px] font-bold leading-none xl:block", link.id === 'tiktok-shop' ? 'text-white/60' : 'text-[#ee4d2d]/65')}>
                          {link.caption}
                        </span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform group-hover:translate-x-1" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Trust Badges */}
              <div>
                <div className="bg-zinc-50/50 rounded-2xl px-4 py-3 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-5">
                  <div className="flex min-w-0 items-center gap-3 py-3 sm:gap-4 sm:py-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-white flex items-center justify-center shadow-sm border border-zinc-100 sm:h-12 sm:w-12">
                      <ShieldCheck className="h-5 w-5 text-[#1e4b64] sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase leading-tight tracking-tight text-zinc-900 sm:text-[12px]">{t('officialCommit')}</p>
                      <p className="mt-0.5 text-[9px] text-zinc-400 font-bold uppercase leading-tight sm:text-[10px]">{t('officialCommitDesc')}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-3 border-y sm:border-y-0 sm:border-x border-zinc-100 py-3 sm:gap-4 sm:py-0 sm:px-6">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-white flex items-center justify-center shadow-sm border border-zinc-100 sm:h-12 sm:w-12">
                      <RefreshCcw className="h-5 w-5 text-[#1e4b64] sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase leading-tight tracking-tight text-zinc-900 sm:text-[12px]">{t('returnDays')}</p>
                      <p className="mt-0.5 text-[9px] text-zinc-400 font-bold uppercase leading-tight sm:text-[10px]">{t('returnDaysDesc')}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-3 py-3 sm:gap-4 sm:py-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-white flex items-center justify-center shadow-sm border border-zinc-100 sm:h-12 sm:w-12">
                      <Truck className="h-5 w-5 text-[#1e4b64] sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase leading-tight tracking-tight text-zinc-900 sm:text-[12px]">{t('fastShipping')}</p>
                      <p className="mt-0.5 text-[9px] text-zinc-400 font-bold uppercase leading-tight sm:text-[10px]">{t('fastShippingDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {recentlyViewedProducts.length > 0 && (
          <section className="mt-8 border-t border-zinc-100 pt-6 sm:mt-12 sm:pt-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1e4b64]">
                  {language === 'en' ? 'Quick review' : 'Xem lại nhanh'}
                </p>
                <h2 className="text-2xl font-black tracking-tight text-zinc-950">
                  {language === 'en' ? 'Recently viewed products' : 'Sản phẩm đã xem gần đây'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/da-xem')}
                className="hidden text-[#1e4b64] text-[11px] sm:text-[14px] font-bold items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap sm:flex"
              >
                <span>{language === 'en' ? 'View all' : 'Xem tất cả'}</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

        {/* Premium Mobile Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col overflow-hidden border-t border-zinc-200 bg-white md:hidden pb-safe-area shadow-[0_-8px_22px_rgba(15,23,42,0.10)]">
          <div className="flex h-[62px] items-stretch bg-white">
            {/* Chat Button */}
            <a
              href={`https://zalo.me/${contactSettings.zaloPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                const productUrl = window.location.href;
                navigator.clipboard.writeText(`Chào shop, tôi muốn được tư vấn sản phẩm này: ${productUrl}`)
                  .then(() => {
                    toast.success('Đã copy link sản phẩm! Hãy dán (Paste) vào ô chat Zalo để gửi.', {
                      position: 'top-center',
                      duration: 4000
                    });
                  })
                  .catch(err => {
                    console.error('Failed to copy link: ', err);
                  });
              }}
              className="relative flex w-[23%] shrink-0 flex-col items-center justify-center gap-0.5 bg-white text-[#0068FF] transition-colors active:bg-zinc-50"
              aria-label="Chat với UR Sport"
            >
              <svg
                className="h-[24px] w-[24px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.6}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                <circle cx="8" cy="12" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="16" cy="12" r="1.2" fill="currentColor" stroke="none" />
              </svg>
              <span className="text-[10px] font-semibold leading-none text-[#0068FF]">Zalo</span>
            </a>

            {/* Divider */}
            <div className="my-auto h-[32px] w-px bg-zinc-300" />

            {/* Add to Cart Icon Button */}
            <button
              onClick={() => {
                setMobilePickerMode('cart');
                setIsMobilePickerOpen(true);
              }}
              disabled={selectedVariantOutOfStock}
              className="relative flex w-[23%] shrink-0 flex-col items-center justify-center gap-0.5 bg-white text-[#0068FF] transition-colors active:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
              aria-label="Thêm vào giỏ hàng"
            >
              <svg
                className="h-[24px] w-[24px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6h4m-2-2v4" />
              </svg>
              <span className="text-[10px] font-semibold leading-none text-[#0068FF]">Giỏ hàng</span>
            </button>

            {/* Buy Now Button */}
            <button
              onClick={() => {
                setMobilePickerMode('buy');
                setIsMobilePickerOpen(true);
              }}
              disabled={selectedVariantOutOfStock}
              className="relative flex flex-1 flex-col items-center justify-center bg-[#1e4b64] text-white transition-colors active:bg-[#153648] disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <span className="text-[13px] font-medium leading-none mb-[4px]">Mua ngay</span>
              <span className="text-[17px] font-bold leading-none tracking-tight">
                {activePrice.toLocaleString('vi-VN')}
                <span className="underline ml-[0.5px]">đ</span>
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Shopee-style Variant Selection Drawer */}
        <AnimatePresence>
          {isMobilePickerOpen && (
            <>
              {/* Dark Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobilePickerOpen(false)}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl p-5 pb-safe-area flex flex-col md:hidden max-h-[85vh] shadow-[0_-12px_36px_rgba(0,0,0,0.15)]"
              >
                {/* Header Section */}
                <div className="flex gap-4 pb-4 border-b border-zinc-100 relative">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-100 shrink-0">
                    <img src={mainImage} alt={productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-end min-w-0 pr-8">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl font-black text-[#ff3b30] tracking-tight">
                        {activePrice.toLocaleString('vi-VN')}₫
                      </span>
                      {hasComparePrice && (
                        <span className="text-sm text-zinc-300 line-through font-bold">
                          {comparePrice.toLocaleString('vi-VN')}₫
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-bold text-zinc-400 mt-1">
                      {selectedVariantStock !== null ? `Kho: ${selectedVariantStock}` : `Kho: ${product.stock}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMobilePickerOpen(false)}
                    className="absolute top-0 right-0 w-8 h-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 active:bg-zinc-100"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Scrollable Selector Area */}
                <div className="flex-1 overflow-y-auto py-4 space-y-5 -mx-5 px-5 select-none scrollbar-none">
                  {/* Colors Section */}
                  <div className="space-y-3">
                    <p className="text-[13px] font-bold text-zinc-800 uppercase tracking-wider">{t('color')}</p>
                    <div className="flex flex-wrap gap-2">
                      {(product.colors || []).map((color) => {
                        const unavailable = isColorUnavailable(color);
                        const colorImgObj = product.colorImages?.find(
                          ci => ci.name.trim().toLowerCase() === color.trim().toLowerCase()
                        );
                        const colorImg = colorImgObj?.image || product.images?.[0] || '';

                        return (
                          <button
                            key={`sheet-color-${color}`}
                            disabled={unavailable}
                            onClick={() => {
                              if (unavailable) return;
                              setSelectedColor(color);
                            }}
                            className={cn(
                              "relative pl-1.5 pr-3 h-10 rounded-xl border transition-all font-semibold text-[12px] overflow-hidden flex items-center gap-2",
                              selectedColor === color
                                ? "border-[#ff3b30] bg-red-50/10 text-[#ff3b30] font-bold"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300",
                              unavailable && "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 opacity-55 hover:border-zinc-100 after:absolute after:left-3 after:right-3 after:top-1/2 after:h-px after:-rotate-12 after:bg-zinc-300 after:content-['']"
                            )}
                          >
                            {colorImg && (
                              <img
                                src={colorImg}
                                alt={color}
                                className="w-7 h-7 rounded-lg object-cover bg-zinc-100 flex-shrink-0"
                              />
                            )}
                            <span className="normal-case tracking-normal">{color}</span>
                            {selectedColor === color && (
                              <div
                                className="absolute bottom-0 right-0 w-3 h-3 bg-[#ff3b30] flex items-center justify-center"
                                style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
                              >
                                <Check className="h-1.5 w-1.5 text-white absolute bottom-px right-px" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Size Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-bold text-zinc-800 uppercase tracking-wider">Size</p>
                      <button onClick={() => { setIsSizeGuideOpen(true); setIsMobilePickerOpen(false); }} className="text-[12px] font-bold text-zinc-400 hover:text-zinc-800 flex items-center gap-0.5">
                        Hướng dẫn chọn kích cỡ <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className={cn(
                      "w-full",
                      (product.sizes || []).includes('4XL') || (product.sizes || []).includes('XXXXL') || (product.sizes || []).length >= 6
                        ? "grid grid-cols-3 gap-2" 
                        : "flex flex-row flex-nowrap gap-1.5 sm:gap-2"
                    )}>
                      {(product.sizes || []).map(size => {
                        const unavailable = isSizeUnavailable(size);
                        const sizes = product.sizes || [];
                        const has4XLOrMore = sizes.includes('4XL') || sizes.includes('XXXXL') || sizes.length >= 6;
                        const shouldStretch = sizes.length >= 4;

                        return (
                          <button
                            key={`sheet-size-${size}`}
                            disabled={unavailable}
                            onClick={() => {
                              if (unavailable) return;
                              setSelectedSize(size);
                            }}
                            className={cn(
                              "relative h-11 rounded-xl text-[13px] font-bold transition-all border-2 flex items-center justify-center overflow-hidden",
                              selectedSize === size ? "border-[#ff3b30] text-[#ff3b30] bg-red-50/10" : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300",
                              unavailable && "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 opacity-55 hover:border-zinc-100 after:absolute after:left-2 after:right-2 after:top-1/2 after:h-px after:-rotate-12 after:bg-zinc-300 after:content-['']",
                              has4XLOrMore 
                                ? "w-full" 
                                : (shouldStretch ? "flex-1 min-w-0" : "px-5")
                            )}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity Section */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] font-bold text-zinc-800 uppercase tracking-wider">{t('quantity')}</span>
                    <div className="flex items-center border border-zinc-200 rounded-xl bg-white overflow-hidden h-9">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-full flex items-center justify-center text-zinc-400 active:bg-zinc-50">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <div className="w-10 h-full flex items-center justify-center font-bold text-zinc-900 text-sm border-x border-zinc-100">{quantity}</div>
                      <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-full flex items-center justify-center text-zinc-400 active:bg-zinc-50">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Final Drawer Action Button */}
                <div className="pt-4 border-t border-zinc-100">
                  <button
                    onClick={() => {
                      if (!selectedColor || !selectedSize) {
                        toast.error('Vui lòng chọn đầy đủ phân loại trước khi tiếp tục', { position: 'top-center' });
                        return;
                      }
                      if (mobilePickerMode === 'cart') {
                        handleAddToCart();
                      } else {
                        handleBuyNow();
                      }
                      setIsMobilePickerOpen(false);
                    }}
                    disabled={selectedVariantOutOfStock}
                    className="w-full h-12 bg-[#ff3b30] text-white font-black text-[14px] uppercase tracking-wider rounded-2xl flex items-center justify-center transition-all active:scale-[0.99] disabled:bg-zinc-300"
                  >
                    {mobilePickerMode === 'cart' ? t('addToCart') : t('buyNow')}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Image Lightbox */}
        <ImageLightbox
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          images={product.images || []}
          currentIndex={lightboxIndex}
          onChangeIndex={setLightboxIndex}
          productName={productName}
          price={product.price}
          discountPrice={
            activePrice < product.price ? activePrice : product.discountPrice
          }
          selectedVariantOutOfStock={selectedVariantOutOfStock}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />

        {/* Bottom: Description & Details */}
        <div className="mt-8 pt-8 border-t border-zinc-100 sm:mt-12 sm:pt-10">
          <div className="space-y-12">
            {/* Full Width Content Section */}
            <div className="w-full space-y-8">

              {/* ── 1. CHI TIẾT SẢN PHẨM ── */}
              <div>
                <h4 className="text-[18px] font-bold text-zinc-900 italic mb-4 pb-3 border-b-2 border-zinc-900 inline-block pr-8">
                  {language === 'en' ? 'PRODUCT DETAILS' : 'CHI TIẾT SẢN PHẨM'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 w-full">
                  {[
                    { label: language === 'en' ? 'Brand' : 'Thương hiệu', value: product.brand || 'UR SPORT', key: 'brand' },
                    { label: language === 'en' ? 'Origin' : 'Xuất xứ', value: language === 'en' ? getLocalizedProductAttribute(product.origin || 'Việt Nam', language) : (product.origin || 'Việt Nam'), key: 'origin' },
                    { label: language === 'en' ? 'Fit' : 'Kiểu dáng', value: getLocalizedProductAttribute(product.style || 'Slim Fit', language), key: 'style' },
                    { label: language === 'en' ? 'Material' : 'Chất liệu', value: getLocalizedProductAttribute(product.material || 'Cotton Premium', language), key: 'material' },
                    { label: language === 'en' ? 'Style' : 'Phong cách', value: language === 'en' ? getLocalizedProductAttribute(product.fashionStyle || 'Thể thao, Cơ bản, Hàn Quốc, Đường phố, Công sở', language) : (product.fashionStyle || 'Thể thao, Cơ bản, Hàn Quốc, Đường phố, Công sở'), key: 'fashionStyle' },
                    { label: language === 'en' ? 'Collar' : 'Cổ áo', value: language === 'en' ? getLocalizedProductAttribute(product.collarType || 'Cổ tròn', language) : (product.collarType || 'Cổ tròn'), key: 'collar' }
                  ].map(row => (
                    <div key={row.label} className="flex items-center py-[14px] border-b border-zinc-100 last:border-0 gap-4 w-full">
                      <span className="text-zinc-400 text-[14px] w-32 shrink-0">{row.label}</span>
                      {row.key === 'brand' ? (
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
                  {language === 'en' ? 'SIZE GUIDE' : 'HƯỚNG DẪN CHỌN SIZE'}
                </h4>
                
                <div className="w-full">
                  <h5 className="text-[15px] font-medium text-zinc-800 mb-4">{language === 'en' ? 'Product measurements' : 'Số đo sản phẩm'}</h5>
                  
                  {/* Banner Đề xuất Size */}
                  <div className="w-full border border-red-200 bg-red-50/30 rounded-xl p-4 flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      <span className="text-[14px] text-zinc-700">
                        {suggestedSize ? (
                          <>{language === 'en' ? 'Suggested size' : 'Size đề xuất'}: <strong className="text-red-500">{suggestedSize}</strong></>
                        ) : (
                          language === 'en' ? 'Enter height and weight to get a size suggestion' : 'Nhập chiều cao cân nặng để nhận đề xuất size'
                        )}
                      </span>
                    </div>
                    <button 
                      onClick={() => setIsSizeProfileModalOpen(true)}
                      className="text-[13px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors"
                    >
                      {language === 'en' ? 'Size profile' : 'Hồ sơ size'} <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Bảng thông số */}
                  <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 mb-6">
                    <table className="w-full text-center text-[14px] min-w-[500px]">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200 text-left">{language === 'en' ? 'Size (International)' : 'Size (Quốc Tế)'}</th>
                          <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">{language === 'en' ? 'Shoulder' : 'Vai'} <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
                          <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">{language === 'en' ? 'Shirt length' : 'Chiều dài áo'} <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
                          <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">{language === 'en' ? 'Chest' : 'Vòng ngực'} <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
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
                  <p className="text-[12px] text-zinc-400 mt-4">{language === 'en' ? 'Measurements may vary slightly depending on each fit.' : 'Số đo có thể thay đổi nhẹ tùy thuộc vào từng form áo.'}</p>
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
                        <h3 className="text-[18px] font-medium text-zinc-800">{language === 'en' ? 'Measurement information' : 'Thông tin số đo'}</h3>
                        <button 
                          onClick={() => setIsSizeProfileModalOpen(false)}
                          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                        >
                          <X className="h-5 w-5 text-zinc-500" />
                        </button>
                      </div>
                      
                      <div className="p-6">
                        <h4 className="text-[15px] font-medium text-zinc-800 mb-4">{language === 'en' ? 'Basic measurements' : 'Các số đo cơ bản'}</h4>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div>
                            <label className="block text-[13px] text-zinc-600 mb-2">{language === 'en' ? 'Height' : 'Chiều cao mẫu'}<span className="text-red-500">*</span></label>
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
                            <label className="block text-[13px] text-zinc-600 mb-2">{language === 'en' ? 'Weight' : 'Cân nặng mẫu'}<span className="text-red-500">*</span></label>
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
                            {language === 'en' ? 'Other measurements' : 'Các số đo khác'}
                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                          </button>
                        </div>

                        <div className="flex justify-end">
                          <button 
                            onClick={handleSaveSizeProfile}
                            className="px-10 py-2.5 bg-[#f05d40] text-white font-bold rounded-md hover:bg-[#d94b30] transition-colors"
                          >
                            {language === 'en' ? 'Save' : 'Lưu'}
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
                  {language === 'en' ? 'PRODUCT DESCRIPTION' : 'MÔ TẢ SẢN PHẨM'}
                </h4>

                {/* Wrapper: clip chiều cao khi chưa expand, luôn clip overflow ngang */}
                <div className="relative w-full overflow-x-hidden">
                  <ProductDescriptionHtml
                    className={cn(
                      "product-description-container w-full text-zinc-600 leading-loose transition-[max-height] duration-700 ease-in-out overflow-x-hidden",
                      !isDescriptionExpanded
                        ? "max-h-[1200px] overflow-y-hidden"
                        : "max-h-none overflow-y-visible"
                    )}
                    html={productDescription
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
                    {isDescriptionExpanded ? (language === 'en' ? 'Collapse' : 'Thu gọn') : (language === 'en' ? 'View more' : 'Xem thêm')}
                    <ChevronDown className={cn("h-4 w-4 transition-all duration-300", isDescriptionExpanded && "rotate-180")} />
                  </button>
                </div>
              </div>
            </div>

            {/* Suggested Products */}
            <div className="w-full pt-8 border-t border-zinc-200 sm:pt-12">
              <div className="flex items-center justify-between mb-10">
                <h4 className="text-[20px] font-bold text-zinc-900 uppercase tracking-tight">{language === 'en' ? 'YOU MAY ALSO LIKE' : 'CÓ THỂ BẠN CŨNG THÍCH'}</h4>
                <Link to={`/apparel/${categorySlug || 'all'}`} className="text-[#1e4b64] text-[11px] sm:text-[14px] font-bold flex items-center gap-0.5 sm:gap-1 hover:opacity-80 transition-all group flex-shrink-0 whitespace-nowrap">
                  <span>{language === 'en' ? 'View all' : 'Xem tất cả'}</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {categoryProducts.filter(p => p.id !== product.id).slice(0, 5).map(p => (
                  <Link to={getProductPath(p)} key={p.id} className="block group">
                    <div className="aspect-[4/5] w-full overflow-hidden bg-zinc-50 mb-4 relative rounded-2xl border border-zinc-100 shadow-sm group-hover:shadow-md transition-all">
                      <img
                        src={p.images?.[0]}
                        alt={getLocalizedProductName(p, language)}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {p.videos && p.videos.length > 0 && (
                        <div className="absolute bottom-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center">
                          <Play className="h-3 w-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <h5 className="text-[14px] font-bold text-zinc-800 leading-snug line-clamp-2 group-hover:text-[#1e4b64] transition-colors mb-2">
                      {getLocalizedProductName(p, language)}
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
        <div id="reviews-section" className="mt-8 bg-zinc-50/50 rounded-[28px] p-4 sm:mt-12 sm:rounded-[40px] sm:p-8 border border-zinc-100 shadow-sm">
          <div className="space-y-6">
            <div className="text-left">
              <h4 className="text-xl font-bold text-zinc-900 tracking-tight">{language === 'en' ? 'Product reviews' : 'Đánh giá sản phẩm'}</h4>
            </div>

            <div className="bg-[#fffbf8] border border-[#f9ede5] p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:gap-12 shadow-sm/50">
              <div className="text-center md:text-left shrink-0">
                <div className="text-[#ee4d2d] font-bold mb-2 flex items-baseline justify-center md:justify-start gap-1">
                  <span className="text-4xl font-black tracking-tight">{product.rating ? product.rating.toFixed(1) : '0.0'}</span>
                  <span className="text-sm font-bold text-zinc-500 uppercase tracking-wide">{language === 'en' ? 'out of 5' : 'trên 5'}</span>
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
                    { id: 'all', label: language === 'en' ? 'All' : 'Tất Cả' },
                    { id: '5', label: `5 ${language === 'en' ? 'Stars' : 'Sao'} (${formatCount(reviews.filter(r => r.rating === 5).length)})` },
                    { id: '4', label: `4 ${language === 'en' ? 'Stars' : 'Sao'} (${formatCount(reviews.filter(r => r.rating === 4).length)})` },
                    { id: '3', label: `3 ${language === 'en' ? 'Stars' : 'Sao'} (${formatCount(reviews.filter(r => r.rating === 3).length)})` },
                    { id: '2', label: `2 ${language === 'en' ? 'Stars' : 'Sao'} (${formatCount(reviews.filter(r => r.rating === 2).length)})` },
                    { id: '1', label: `1 ${language === 'en' ? 'Star' : 'Sao'} (${formatCount(reviews.filter(r => r.rating === 1).length)})` },
                    { id: 'comment', label: `${language === 'en' ? 'With comments' : 'Có Bình Luận'} (${formatCount(reviews.filter(r => r.comment.trim()).length)})` },
                    { id: 'media', label: `${language === 'en' ? 'With photos / videos' : 'Có Hình Ảnh / Video'} (${formatCount(reviews.filter(r => (r.images?.length || 0) > 0 || (r.videos?.length || 0) > 0).length)})` }
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
                <h5 className="text-lg font-bold text-zinc-900 mb-4">{language === 'en' ? 'Write your review' : 'Viết cảm nhận của bạn'}</h5>
                <form onSubmit={handleSubmitReview} className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pb-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-500 uppercase tracking-wider">{language === 'en' ? 'Your rating' : 'Bạn chấm mấy sao?'}</span>
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
                        placeholder={language === 'en' ? 'Your full name...' : 'Họ và tên của bạn...'}
                        value={newReview.userName}
                        onChange={(e) => setNewReview({ ...newReview, userName: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-transparent rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ee4d2d]/20 focus:border-[#ee4d2d]/30 outline-none transition-all"
                      />
                    )}
                    <textarea
                      rows={4}
                      placeholder={language === 'en' ? 'Is the product cool to wear? How is the fit?...' : 'Sản phẩm mặc có mát không? Form dáng thế nào?...'}
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full px-6 py-6 bg-zinc-50 border border-transparent rounded-[24px] text-sm font-medium focus:ring-2 focus:ring-[#ee4d2d]/20 focus:border-[#ee4d2d]/30 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-zinc-50 hover:bg-zinc-100 rounded-2xl cursor-pointer transition-all border-2 border-dashed border-zinc-200 text-zinc-600 font-bold text-xs uppercase tracking-widest group">
                        <Camera className="h-4 w-4 group-hover:text-[#ee4d2d] group-active:text-[#ee4d2d] transition-colors shrink-0" />
                        <span>{language === 'en' ? 'Add photos or videos' : 'Thêm ảnh hoặc video'}</span>
                        <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>

                    {reviewPreviews.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {reviewPreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-zinc-100 group shadow-sm">
                            {preview.type === 'image' ? (
                              <img src={preview.url} alt={`${language === 'en' ? 'Product review' : 'Đánh giá sản phẩm'} ${productName}`} loading="lazy" className="w-full h-full object-cover" />
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
                      {isSubmittingReview ? (language === 'en' ? 'Submitting...' : 'Đang gửi...') : (language === 'en' ? 'Submit review' : 'Gửi đánh giá ngay')}
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
                                  <img src={img} alt={`${language === 'en' ? 'Review' : 'Đánh giá'} ${productName} - ${language === 'en' ? 'Image' : 'Ảnh'} ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {review.videos?.map((vid: string, i: number) => (
                                <div key={i} className="w-32 h-32 rounded-xl overflow-hidden border border-zinc-100 cursor-pointer hover:scale-105 transition-all shadow-sm relative group">
                                  <video 
                                    src={vid} 
                                    className="w-full h-full object-cover" 
                                    controls
                                    controlsList="nodownload"
                                    crossOrigin="anonymous"
                                    preload="metadata"
                                    poster={`${vid}?quality=auto&fetch_format=auto&w=200&h=200&crop=fill&gravity=auto`}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-all pointer-events-none">
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
      <div className="hidden">
        <button
          onClick={handleAddToCart}
          disabled={selectedVariantOutOfStock}
          className="flex-1 h-12 bg-[#f0f9ff] border-2 border-[#1e4b64] text-[#1e4b64] font-black rounded-xl text-[12px] uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-transform whitespace-nowrap disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          <ShoppingCart className="h-4 w-4" /> Thêm
        </button>
        <button
          onClick={handleBuyNow}
          disabled={selectedVariantOutOfStock}
          className="flex-[1.15] h-12 bg-[#1e4b64] text-white font-black rounded-xl text-[12px] uppercase tracking-wide active:scale-95 transition-transform shadow-lg shadow-blue-500/20 whitespace-nowrap disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {t('buyNow')}
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
              <img src={product.sizeGuideUrl} alt={`${language === 'en' ? 'Size chart' : 'Bảng size'} ${productName}`} loading="lazy" decoding="async" className="w-full h-auto" />
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

const escapeDescriptionHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const hasStructuredDescriptionHtml = (value: string) =>
  /<(p|h[1-6]|ul|ol|li|table|img|figure|blockquote|section)\b/i.test(value);

const shouldFormatMarketplaceDescription = (value: string) => {
  if (!value.trim()) return false;
  if (/<(img|table|iframe|video)\b/i.test(value)) return false;
  return !hasStructuredDescriptionHtml(value) || /[=_-]{8,}|[♦◆•✓⚠💧🔁⚡]|【[^】]+】/.test(value);
};

const getPlainDescriptionText = (value: string) => {
  const normalized = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|h[1-6]|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ');

  if (typeof DOMParser === 'undefined') return normalized.replace(/<[^>]+>/g, ' ');

  const parsed = new DOMParser().parseFromString(`<div>${normalized}</div>`, 'text/html');
  return parsed.body.textContent || normalized.replace(/<[^>]+>/g, ' ');
};

const emphasizeLeadLabel = (line: string) => {
  const escaped = escapeDescriptionHtml(line);
  return escaped.replace(
    /^([A-ZÀ-Ỹ0-9][A-ZÀ-Ỹa-zà-ỹ0-9\s/+.-]{2,42}?)(\s*[—:-]\s*)/,
    '<strong>$1</strong>$2'
  );
};

const formatMarketplaceDescriptionHtml = (html: string) => {
  const source = html.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ');
  if (!shouldFormatMarketplaceDescription(source)) return source;

  const text = getPlainDescriptionText(source)
    .replace(/\r/g, '\n')
    .replace(/[=_-]{8,}/g, '\n')
    .replace(/\s+([♦◆])\s*/g, '\n$1 ')
    .replace(/\s+([•✓⚠💧🔁⚡])\s*/g, '\n$1 ')
    .replace(/\s{2,}/g, ' ')
    .split('\n')
    .map(line => line.trim().replace(/^[=_-]+\s*|\s*[=_-]+$/g, '').trim())
    .filter(Boolean);

  const blocks: string[] = [];
  let bulletItems: string[] = [];

  const flushBullets = () => {
    if (!bulletItems.length) return;
    blocks.push(`<ul>${bulletItems.map(item => `<li>${item}</li>`).join('')}</ul>`);
    bulletItems = [];
  };

  text.forEach((line) => {
    const bracketMatch = line.match(/^【\s*([^】]+?)\s*】\s*(.*)$/);
    if (bracketMatch) {
      flushBullets();
      blocks.push(`<h3>${escapeDescriptionHtml(bracketMatch[1])}</h3>`);
      if (bracketMatch[2]) blocks.push(`<p>${emphasizeLeadLabel(bracketMatch[2])}</p>`);
      return;
    }

    const sectionMatch = line.match(/^[♦◆]\s*(.+)$/);
    if (sectionMatch) {
      flushBullets();
      blocks.push(`<h3>${escapeDescriptionHtml(sectionMatch[1])}</h3>`);
      return;
    }

    const bulletMatch = line.match(/^[•✓⚠💧🔁⚡]\s*(.+)$/);
    if (bulletMatch) {
      bulletItems.push(emphasizeLeadLabel(bulletMatch[1]));
      return;
    }

    flushBullets();
    blocks.push(`<p>${emphasizeLeadLabel(line)}</p>`);
  });

  flushBullets();
  return blocks.join('');
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
    const safeHtml = sanitizeRichHtml(formatFaqContentHtml(formatMarketplaceDescriptionHtml(html)));
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
