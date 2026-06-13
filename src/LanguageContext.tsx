import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'vi' | 'en';

type TranslationKey =
  | 'location'
  | 'shippingPayment'
  | 'returns'
  | 'contact'
  | 'info'
  | 'currency'
  | 'languageVi'
  | 'languageEn'
  | 'searchPlaceholder'
  | 'voiceSearch'
  | 'login'
  | 'register'
  | 'account'
  | 'accountOrders'
  | 'cart'
  | 'menu'
  | 'search'
  | 'zalo'
  | 'allResults'
  | 'productSuggestions'
  | 'notFoundTitle'
  | 'notFoundBody'
  | 'backToShop'
  | 'redirectingSocial'
  | 'shop'
  | 'all'
  | 'reviews'
  | 'writeReview'
  | 'color'
  | 'size'
  | 'sizeGuide'
  | 'quantity'
  | 'addToCart'
  | 'buyNow'
  | 'marketplaceTitle'
  | 'marketplaceSubtitle'
  | 'officialCommit'
  | 'officialCommitDesc'
  | 'returnDays'
  | 'returnDaysDesc'
  | 'fastShipping'
  | 'fastShippingDesc'
  | 'productNotFound'
  | 'productNotFoundBody';

const translations: Record<Language, Record<TranslationKey, string>> = {
  vi: {
    location: 'TP. Hồ Chí Minh',
    shippingPayment: 'Giao hàng và thanh toán',
    returns: 'Đổi trả',
    contact: 'Liên hệ',
    info: 'Thông tin',
    currency: '₫',
    languageVi: 'Tiếng Việt',
    languageEn: 'English',
    searchPlaceholder: 'Tìm kiếm sản phẩm...',
    voiceSearch: 'Tìm kiếm bằng giọng nói',
    login: 'Đăng nhập',
    register: 'Đăng ký',
    account: 'Tài khoản',
    accountOrders: 'Tài khoản và đơn hàng',
    cart: 'Giỏ hàng',
    menu: 'Menu',
    search: 'Tìm kiếm',
    zalo: 'Zalo',
    allResults: 'Xem tất cả kết quả',
    productSuggestions: 'Gợi ý sản phẩm',
    notFoundTitle: 'Trang này chưa sẵn sàng',
    notFoundBody: 'Đường dẫn có thể đã được đổi tên hoặc sản phẩm đã ngừng hiển thị. Bạn có thể quay lại cửa hàng để tiếp tục mua sắm.',
    backToShop: 'Về cửa hàng',
    redirectingSocial: 'Đang chuyển hướng đến trang mạng xã hội của UR Sport...',
    shop: 'Cửa hàng',
    all: 'Tất cả',
    reviews: 'Reviews',
    writeReview: 'Viết đánh giá',
    color: 'Màu sắc',
    size: 'Kích cỡ',
    sizeGuide: 'Size Guide',
    quantity: 'Số lượng',
    addToCart: 'Thêm vào giỏ',
    buyNow: 'Mua ngay',
    marketplaceTitle: 'Mua trên sàn',
    marketplaceSubtitle: 'Chọn kênh bạn tiện thanh toán nhất',
    officialCommit: 'Cam kết chính hãng',
    officialCommitDesc: 'Hoàn tiền 200% nếu giả',
    returnDays: '7 ngày đổi trả',
    returnDaysDesc: 'Lỗi là đổi tận nơi',
    fastShipping: 'Giao hàng hỏa tốc',
    fastShippingDesc: 'Toàn quốc từ 2-3 ngày',
    productNotFound: 'Không tìm thấy sản phẩm',
    productNotFoundBody: 'Sản phẩm có thể đã đổi đường dẫn hoặc tạm ngưng hiển thị.',
  },
  en: {
    location: 'Ho Chi Minh City',
    shippingPayment: 'Shipping & Payment',
    returns: 'Returns',
    contact: 'Contact',
    info: 'Info',
    currency: '₫',
    languageVi: 'Vietnamese',
    languageEn: 'English',
    searchPlaceholder: 'Search products...',
    voiceSearch: 'Voice search',
    login: 'Sign in',
    register: 'Sign up',
    account: 'Account',
    accountOrders: 'Account and orders',
    cart: 'Cart',
    menu: 'Menu',
    search: 'Search',
    zalo: 'Zalo',
    allResults: 'View all results',
    productSuggestions: 'Product suggestions',
    notFoundTitle: 'This page is not ready',
    notFoundBody: 'The link may have changed or the product may no longer be available. You can return to the shop to continue browsing.',
    backToShop: 'Back to shop',
    redirectingSocial: 'Redirecting to UR Sport social page...',
    shop: 'Shop',
    all: 'All',
    reviews: 'Reviews',
    writeReview: 'Write a review',
    color: 'Color',
    size: 'Size',
    sizeGuide: 'Size Guide',
    quantity: 'Quantity',
    addToCart: 'Add to cart',
    buyNow: 'Buy now',
    marketplaceTitle: 'Marketplaces',
    marketplaceSubtitle: 'Choose your preferred checkout channel',
    officialCommit: 'Authenticity guaranteed',
    officialCommitDesc: '200% refund if counterfeit',
    returnDays: '7-day exchange',
    returnDaysDesc: 'Defects exchanged at your door',
    fastShipping: 'Express delivery',
    fastShippingDesc: 'Nationwide in 2-3 days',
    productNotFound: 'Product not found',
    productNotFoundBody: 'This product may have moved or is no longer available.',
  },
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

const topPanelLabelMap: Record<string, TranslationKey> = {
  'tp. ho chi minh': 'location',
  'giao hang va thanh toan': 'shippingPayment',
  'doi tra': 'returns',
  'lien he': 'contact',
  'thong tin': 'info',
  'tieng viet': 'languageVi',
  'english': 'languageEn',
  '$': 'currency',
  '₫': 'currency',
};

const clearGoogleTranslateArtifacts = () => {
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const hostname = window.location.hostname;
  const hostParts = hostname.split('.');
  const domains = new Set<string>([hostname]);

  if (hostParts.length > 1) {
    domains.add(`.${hostname}`);
    domains.add(`.${hostParts.slice(-2).join('.')}`);
  }

  document.cookie = `googtrans=; ${expired}; path=/`;
  domains.forEach((domain) => {
    if (domain) document.cookie = `googtrans=; ${expired}; path=/; domain=${domain}`;
  });

  document.getElementById('google_translate_element')?.remove();
  document.getElementById('google-translate-script')?.remove();
  document.getElementById('google-translate-hide-style')?.remove();
  document.querySelectorAll('.skiptranslate, .goog-te-banner-frame, .goog-te-balloon-frame').forEach((element) => {
    element.remove();
  });
  document.body.style.top = '';
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  translateTopPanelLabel: (label: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return window.localStorage.getItem('ursport_language') === 'en' ? 'en' : 'vi';
    } catch {
      return 'vi';
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem('ursport_language', language);
    clearGoogleTranslateArtifacts();
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: TranslationKey) => translations[language][key] || translations.vi[key] || key;
    return {
      language,
      setLanguage: setLanguageState,
      t,
      translateTopPanelLabel: (label: string) => {
        const mappedKey = topPanelLabelMap[normalizeText(label)];
        return mappedKey ? t(mappedKey) : label;
      },
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}
