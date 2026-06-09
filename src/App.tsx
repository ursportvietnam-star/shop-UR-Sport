import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CartSidebar } from './components/CartSidebar';
import { FloatingContactMenu } from './components/FloatingContactMenu';
import { Footer } from './components/Footer';
import { Toaster } from 'sonner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { WishlistProvider } from './WishlistContext';
import { RecentlyViewedProvider } from './RecentlyViewedContext';
import { ComparisonProvider } from './ComparisonContext';
import { ProductsProvider } from './ProductsContext';
import { PromotionProvider } from './PromotionContext';
import { CATEGORY_METADATA } from './data';
import { Category } from './types';
import { DEFAULT_SEO_SUBCATEGORIES, CATEGORY_PRODUCT_MATCH_TERMS, slugifyVietnamese } from './lib/categoryConfig';
import { getHomepageTopPanelSection, readLocalHomepageSections, type HomepageSectionConfig } from './lib/homepageConfig';

// Lazy loaded pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ShopPage = React.lazy(() => import('./pages/ShopPage'));
const OrderLookupPage = React.lazy(() => import('./pages/OrderLookupPage'));
const ProductComparisonPage = React.lazy(() => import('./pages/ProductComparisonPage'));
const PolicyPage = React.lazy(() => import('./pages/PolicyPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));

// Other lazy-loaded components
const ProductDetail = React.lazy(() => import('./components/ProductDetail').then(module => ({ default: module.ProductDetail })));
const Checkout = React.lazy(() => import('./components/Checkout').then(module => ({ default: module.Checkout })));
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
const NewsPage = React.lazy(() => import('./components/NewsPage').then(module => ({ default: module.NewsPage })));
const AccountPage = React.lazy(() => import('./components/AccountPage').then(module => ({ default: module.AccountPage })));
const OrderSuccessPage = React.lazy(() => import('./components/OrderSuccessPage').then(module => ({ default: module.OrderSuccessPage })));
const WishlistPage = React.lazy(() => import('./components/WishlistPage').then(module => ({ default: module.WishlistPage })));
const RecentlyViewedPage = React.lazy(() => import('./components/RecentlyViewedPage').then(module => ({ default: module.RecentlyViewedPage })));

const TrustBadgesSection = React.lazy(() => import('./components/TrustBadgesSection').then(module => ({ default: module.TrustBadgesSection })));
const CompareFloatingBar = React.lazy(() => import('./components/CompareFloatingBar').then(module => ({ default: module.CompareFloatingBar })));

const COLLECTION_REDIRECTS: Record<string, string> = {
  'cong-so': '/ao-polo-nam',
  'basic': '/ao-thun-nam',
  'cao-cap': '/ao-polo-nam',
  'the-thao': '/ao-thun-the-thao-nam',
  'thu-dong': '/ao-thun-nam'
};

function LegacyCollectionRedirect() {
  const { collectionSlug } = useParams<{ collectionSlug?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const slug = collectionSlug?.trim().toLowerCase() || '';
    const fallbackCategory = CATEGORY_METADATA.find(
      category => category.slug === slug || slugifyVietnamese(category.name) === slug
    );
    const target = COLLECTION_REDIRECTS[slug] || (fallbackCategory ? `/${fallbackCategory.slug}` : '/shop');
    navigate(target, { replace: true });
  }, [collectionSlug, navigate]);

  return null;
}

function LegacyBlogRedirect() {
  const { '*': rest } = useParams<{ '*': string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!rest) {
      navigate('/blog', { replace: true });
      return;
    }

    const segments = rest.split('/').filter(Boolean);
    while (segments.length > 0 && segments[0].toLowerCase() === 'blog') {
      segments.shift();
    }

    if (segments.length === 0) {
      navigate('/blog', { replace: true });
      return;
    }

    const normalized = segments.join('/');
    if (normalized.startsWith('category/')) {
      navigate(`/blog/${normalized}`, { replace: true });
      return;
    }

    if (segments.length === 1) {
      navigate(`/blog/${segments[0]}`, { replace: true });
      return;
    }

    navigate(`/blog/${segments[segments.length - 1]}`, { replace: true });
  }, [rest, navigate]);

  return null;
}

const SEO_LANDING_PAGES = DEFAULT_SEO_SUBCATEGORIES
  .map(page => ({
    slug: page.slug,
    label: page.label,
    parentCategory: page.parentLabel,
    matchTerms: CATEGORY_PRODUCT_MATCH_TERMS[page.slug] || []
  }));

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1e4b64]/10 text-lg font-black text-[#1e4b64]">
        UR
      </div>
      <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">Trang này chưa sẵn sàng</h1>
      <p className="mt-3 text-sm font-medium leading-6 text-zinc-500 sm:text-base">
        Đường dẫn có thể đã được đổi tên hoặc sản phẩm đã ngừng hiển thị. Bạn có thể quay lại cửa hàng để tiếp tục mua sắm.
      </p>
      <button
        type="button"
        onClick={() => navigate('/shop')}
        className="mt-8 rounded-full bg-[#1e4b64] px-6 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-[#153a4d]"
      >
        Về cửa hàng
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState(() => {
    const path = location.pathname.substring(1);
    const cat = CATEGORY_METADATA.find(c => c.slug === path);
    return cat ? cat.name : 'All';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logoSettings, setLogoSettings] = useState<{ logoLight?: string; logoDark?: string; favicon?: string } | null>(null);
  const [hasTopPanel, setHasTopPanel] = useState(true);
  const previousPathRef = useRef(location.pathname);
  const navigate = useNavigate();

  // Inject custom CSS từ Firestore vào mọi trang
  useEffect(() => {
    if (!db) return;

    const localHomepageSections = readLocalHomepageSections();
    if (localHomepageSections) {
      setHasTopPanel(Boolean(getHomepageTopPanelSection(localHomepageSections)));
    }

    getDoc(doc(db, 'settings', 'homepage')).then(snap => {
      if (!snap.exists()) return;
      const sections = Array.isArray(snap.data().sections) ? snap.data().sections as HomepageSectionConfig[] : [];
      if (sections.length) {
        setHasTopPanel(Boolean(getHomepageTopPanelSection(sections)));
      }
    }).catch(() => {});

    getDoc(doc(db, 'settings', 'customCss')).then(snap => {
      if (!snap.exists()) return;
      const css = snap.data().css || '';
      if (!css.trim()) return;
      let styleEl = document.getElementById('custom-global-css') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-global-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
    }).catch(() => {});

    // Load Logo & Favicon Settings from Firestore
    getDoc(doc(db, 'settings', 'logoSettings')).then(snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setLogoSettings(data);
      if (data.favicon) {
        const faviconPath = String(data.favicon).split('?')[0].toLowerCase();
        const faviconType =
          faviconPath.endsWith('.ico') ? 'image/x-icon' :
          faviconPath.endsWith('.png') ? 'image/png' :
          faviconPath.endsWith('.webp') ? 'image/webp' :
          faviconPath.endsWith('.gif') ? 'image/gif' :
          faviconPath.endsWith('.jpg') || faviconPath.endsWith('.jpeg') ? 'image/jpeg' :
          faviconPath.endsWith('.svg') ? 'image/svg+xml' :
          '';
        const iconLinks = Array.from(document.querySelectorAll("link[rel~='icon']")) as HTMLLinkElement[];
        const linksToUpdate = iconLinks.length ? iconLinks : [document.createElement('link') as HTMLLinkElement];
        linksToUpdate.forEach((iconLink) => {
          if (!iconLink.parentElement) {
            iconLink.rel = 'icon';
            document.head.appendChild(iconLink);
          }
          iconLink.href = data.favicon;
          if (faviconType) iconLink.type = faviconType;
          iconLink.removeAttribute('sizes');
        });

        let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
        if (!appleLink) {
          appleLink = document.createElement('link');
          appleLink.rel = 'apple-touch-icon';
          document.head.appendChild(appleLink);
        }
        appleLink.href = data.favicon;
      }
    }).catch(() => {});
  }, []);

  const handleCategorySelect = (category: Category) => {
    setActiveCategory(category);
    const catMetadata = CATEGORY_METADATA.find(c => c.name === category);
    if (catMetadata) {
      navigate(`/${catMetadata.slug}`);
    } else {
      navigate('/shop');
    }
  };

  const onPageChange = (page: string) => {
    const cleanPage = page.startsWith('/') ? page : `/${page}`;
    navigate(page === 'home' ? '/' : cleanPage);
    window.scrollTo(0, 0);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const handleCheckoutComplete = (orderId?: string) => {
    navigate(orderId ? `/dat-hang-thanh-cong/${orderId}` : '/shop');
  };

  const isAdminRoute = location.pathname === '/quan-tri' || location.pathname === '/quantri' || location.pathname.startsWith('/admin');
  const isBlogRoute = location.pathname === '/blog' || location.pathname.startsWith('/blog/');

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    if (!isAdminRoute) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, isAdminRoute]);

  const commonShopProps = {
    activeCategory,
    setActiveCategory,
    isLoading,
    onProductSelect: () => {}
  };

  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
        <WishlistProvider>
        <RecentlyViewedProvider>
        <ComparisonProvider>
        <PromotionProvider>
        <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-black selection:text-white w-full relative">
          {!isAdminRoute && (
            <Navbar 
              onCartClick={() => setIsCartOpen(true)} 
              onPageChange={onPageChange}
              onCategorySelect={handleCategorySelect}
              activeCategory={activeCategory as any}
              logoSettings={logoSettings}
            />
          )}
          
          <main className={!isAdminRoute ? (hasTopPanel ? "flex-1 pt-16 md:pt-24" : "flex-1 pt-16") : "flex-1"}>
            <React.Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-[#1e4b64] border-t-transparent animate-spin" /></div>}>
            <Routes>
              <Route path="/" element={<HomePage onCategorySelect={handleCategorySelect} onPageChange={onPageChange} />} />
              <Route path="/shop" element={<ShopPage {...commonShopProps} />} />
              <Route path="/apparel/:categorySlug" element={<ShopPage {...commonShopProps} />} />
              <Route path="/apparel/:categorySlug/:productSlug" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout onComplete={handleCheckoutComplete} />} />
              <Route path="/dat-hang-thanh-cong/:orderId" element={<OrderSuccessPage />} />
              <Route path="/tra-cuu-don-hang" element={<OrderLookupPage />} />
              <Route path="/so-sanh" element={<ProductComparisonPage />} />
              <Route path="/tai-khoan" element={<AccountPage />} />
              <Route path="/yeu-thich" element={<WishlistPage />} />
              <Route path="/da-xem" element={<RecentlyViewedPage />} />
              <Route path="/chinh-sach-giao-hang" element={<PolicyPage key="shipping-policy" type="shipping" />} />
              <Route path="/chinh-sach-doi-tra" element={<PolicyPage key="returns-policy" type="returns" />} />
              <Route path="/chinh-sach/:policySlug" element={<PolicyPage />} />
              <Route path="/lien-he" element={<ContactPage />} />
              <Route path="/contact" element={<Navigate to="/lien-he" replace />} />
              <Route path="/blog" element={<NewsPage />} />
              <Route path="/blog/category/:categorySlug" element={<NewsPage />} />
              <Route path="/blog/:slug" element={<NewsPage />} />
              <Route path="/blog/*" element={<LegacyBlogRedirect />} />
              <Route path="/san-pham/:productSlug" element={<ProductDetail />} />
              <Route path="/danh-muc/:categorySlug" element={<ShopPage {...commonShopProps} />} />
              <Route path="/collection/:collectionSlug" element={<LegacyCollectionRedirect />} />
              <Route path="/quan-tri" element={<AdminPanel />} />
              <Route path="/quantri" element={<AdminPanel />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/seo" element={<AdminPanel initialTab="ai-seo-report" />} />
              <Route path="/admin/ai/product-factory" element={<AdminPanel initialTab="ai-product-factory" />} />
              <Route path="/ao-thun-nam-the-thao" element={<Navigate to="/ao-thun-the-thao-nam" replace />} />
              <Route path="/ao-thun-nam-cotton" element={<Navigate to="/ao-thun-cotton-nam" replace />} />
              
              {/* Clean Category URLs at root */}
              {CATEGORY_METADATA.map(cat => (
                <Route key={cat.slug} path={`/${cat.slug}`} element={<ShopPage {...commonShopProps} categoryName={cat.name} />} />
              ))}
              {SEO_LANDING_PAGES.map(page => (
                <Route
                  key={page.slug}
                  path={`/${page.slug}`}
                  element={<ShopPage {...commonShopProps} seoLanding={page} />}
                />
              ))}
              {/* Shopee-style clean URLs for products at root */}
              <Route path="/:productSlug" element={<ProductDetail />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </React.Suspense>
          </main>

          {!isAdminRoute && location.pathname !== '/' && (
            <>
              {!isBlogRoute && (
                <React.Suspense fallback={null}>
                  <TrustBadgesSection />
                </React.Suspense>
              )}
              
              <Footer 
                onPageChange={onPageChange}
                onCategorySelect={handleCategorySelect}
                logoSettings={logoSettings}
              />
            </>
          )}
          
          <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={handleCheckout} />
          {!isAdminRoute && <FloatingContactMenu />}
          <React.Suspense fallback={null}>
            <CompareFloatingBar />
          </React.Suspense>
          <Toaster position="top-right" richColors />
        </div>
        </PromotionProvider>
        </ComparisonProvider>
        </RecentlyViewedProvider>
        </WishlistProvider>
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  );
}
