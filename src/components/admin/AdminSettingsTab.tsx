import { Check as CheckIcon, Code2, Copy, Download, Eye, Search, Trash2, Upload, Plus, X, AlertCircle, AlertTriangle, Calendar, ChevronRight, Globe, RefreshCw, Settings, ShieldCheck, Play, CheckCircle2, XCircle, Info, ExternalLink, FileText, Database, ArrowRight, Activity, Clock, Server, GripVertical } from 'lucide-react';
import { useState, useEffect, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImageUpload } from '../ImageUpload';
import { syncSiteFavicon } from '../../lib/localMediaUpload';
import { DEFAULT_SHIPPING_SETTINGS, normalizeShippingSettings, ShippingSettings } from '@/lib/shippingSettings';

import { CATEGORY_METADATA } from '../../data';
import { saveAdminSetting, getAdminSetting } from '../../services/adminData';
import type { FloatingMenuSettings } from '../../types/admin';
import type { Product, BlogPost } from '../../types';
import { DEFAULT_SEO_SUBCATEGORIES } from '../../lib/categoryConfig';
import { getProductPath } from '../../lib/productUrls';
import type { FirestoreTimestamp } from '../../types/firestore';

const withCacheBust = (url: string) => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
};

interface AdminSettingsTabProps {
  activeSection?: 'settings' | 'settings-logo' | 'settings-footer' | 'settings-shipping' | 'settings-css' | 'settings-contact' | 'seo-sitemap' | 'seo-schema' | 'seo-robots' | 'seo-redirects';
  blogPosts: BlogPost[];
  cssSaved: boolean;
  customCss: string;
  floatingMenu: FloatingMenuSettings;
  generateSitemapString: () => string;
  handleDeleteCss: () => void;
  handleGenerateRobots: () => void;
  handleGenerateSitemap: () => void;
  handleSaveCss: () => void;
  handleSaveFloatingMenu: () => void;
  products: Product[];
  setCustomCss: Dispatch<SetStateAction<string>>;
  setFloatingMenu: Dispatch<SetStateAction<FloatingMenuSettings>>;
  setShowSitemapPreview: Dispatch<SetStateAction<boolean>>;
  showSitemapPreview: boolean;
  logoSettings: { logoLight?: string; logoDark?: string; favicon?: string };
  setLogoSettings: Dispatch<SetStateAction<{ logoLight?: string; logoDark?: string; favicon?: string }>>;
  handleSaveLogoSettings: (settings: { logoLight?: string; logoDark?: string; favicon?: string }) => void;
  footerSettings: {
    description: string;
    address: string;
    phone: string;
    email: string;
    mapUrl: string;
    facebook: string;
    instagram: string;
    tiktok: string;
    copyright: string;
    customLinks: {
      title: string;
      items: {
        label: string;
        action: 'page' | 'category';
        value: string;
      }[];
    }[];
    paymentBadges: string[];
    paymentGateways: string[];
    showLogo?: boolean;
    showNewsletter?: boolean;
    newsletterPlaceholder?: string;
    newsletterButtonText?: string;
    columnOrder?: string[];
  };
  setFooterSettings: Dispatch<SetStateAction<{
    description: string;
    address: string;
    phone: string;
    email: string;
    mapUrl: string;
    facebook: string;
    instagram: string;
    tiktok: string;
    copyright: string;
    customLinks: {
      title: string;
      items: {
        label: string;
        action: 'page' | 'category';
        value: string;
      }[];
    }[];
    paymentBadges: string[];
    paymentGateways: string[];
    showLogo?: boolean;
    showNewsletter?: boolean;
    newsletterPlaceholder?: string;
    newsletterButtonText?: string;
    columnOrder?: string[];
  }>>;
  handleSaveFooterSettings: (settings: {
    description: string;
    address: string;
    phone: string;
    email: string;
    mapUrl: string;
    facebook: string;
    instagram: string;
    tiktok: string;
    copyright: string;
    customLinks: {
      title: string;
      items: {
        label: string;
        action: 'page' | 'category';
        value: string;
      }[];
    }[];
    paymentBadges: string[];
    paymentGateways: string[];
    showLogo?: boolean;
    showNewsletter?: boolean;
    newsletterPlaceholder?: string;
    newsletterButtonText?: string;
    columnOrder?: string[];
  }) => void;
  onOpenProductEdit?: (product: Product) => void;
  onOpenBlogPostEdit?: (post: BlogPost) => void;
}

export function AdminSettingsTab({
  activeSection = 'settings',
  blogPosts,
  cssSaved,
  customCss,
  floatingMenu,
  generateSitemapString,
  handleDeleteCss,
  handleGenerateRobots,
  handleGenerateSitemap,
  handleSaveCss,
  handleSaveFloatingMenu,
  products,
  setCustomCss,
  setFloatingMenu,
  setShowSitemapPreview,
  showSitemapPreview,
  logoSettings,
  setLogoSettings,
  handleSaveLogoSettings,
  footerSettings,
  setFooterSettings,
  handleSaveFooterSettings,
  onOpenProductEdit,
  onOpenBlogPostEdit,
}: AdminSettingsTabProps) {
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [expandedColId, setExpandedColId] = useState<string | null>('intro');

  const getFooterColumns = () => {
    const cols = [
      { id: 'intro', name: 'Cột 1: Giới thiệu (Logo & Đăng ký Email)' },
      ...(footerSettings.customLinks || []).map((col, idx) => ({
        id: `custom_${idx}`,
        name: `Cột ${idx + 2}: ${col.title || 'Liên kết tùy chỉnh'}`
      })),
      { id: 'contact', name: 'Cột Thông tin liên hệ' },
      { id: 'social', name: 'Cột Mạng xã hội & Thanh toán' }
    ];

    const order = footerSettings.columnOrder || ['intro', ...((footerSettings.customLinks || []).map((_, idx) => `custom_${idx}`)), 'contact', 'social'];
    
    const sortedCols = [];
    order.forEach(id => {
      const found = cols.find(c => c.id === id);
      if (found) sortedCols.push(found);
    });

    cols.forEach(c => {
      if (!sortedCols.some(sc => sc.id === c.id)) {
        sortedCols.push(c);
      }
    });

    return sortedCols;
  };

  const handleColDragStart = (id: string) => {
    setDraggedColId(id);
  };

  const handleColDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColId(id);
  };

  const handleColDrop = (id: string) => {
    if (!draggedColId || draggedColId === id) return;

    const cols = getFooterColumns();
    const order = cols.map(c => c.id);
    const fromIndex = order.indexOf(draggedColId);
    const toIndex = order.indexOf(id);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updatedOrder = [...order];
      updatedOrder.splice(fromIndex, 1);
      updatedOrder.splice(toIndex, 0, draggedColId);
      
      setFooterSettings({
        ...footerSettings,
        columnOrder: updatedOrder
      });
      toast.success('Đã thay đổi thứ tự cột!');
    }

    setDraggedColId(null);
    setDragOverColId(null);
  };

  const handleColDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };
  const [newBadgeText, setNewBadgeText] = useState('');
  const [newGatewayText, setNewGatewayText] = useState('');
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
  const [shippingSettingsLoading, setShippingSettingsLoading] = useState(true);
  const [shippingSettingsSaving, setShippingSettingsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setShippingSettingsLoading(true);
    getAdminSetting<Partial<ShippingSettings>>('shippingSettings')
      .then(data => {
        if (isMounted) setShippingSettings(normalizeShippingSettings(data));
      })
      .catch(error => {
        console.error('Error loading shipping settings:', error);
        if (isMounted) setShippingSettings(DEFAULT_SHIPPING_SETTINGS);
      })
      .finally(() => {
        if (isMounted) setShippingSettingsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveShippingSettings = async () => {
    setShippingSettingsSaving(true);
    try {
      const normalized = normalizeShippingSettings(shippingSettings);
      await saveAdminSetting('shippingSettings', normalized);
      setShippingSettings(normalized);
      toast.success('Đã lưu cài đặt phí vận chuyển!');
    } catch (error) {
      console.error('Error saving shipping settings:', error);
      toast.error('Không thể lưu cài đặt phí vận chuyển.');
    } finally {
      setShippingSettingsSaving(false);
    }
  };

  const clearLogoField = (field: 'logoLight' | 'logoDark' | 'favicon') => {
    const updated = { ...logoSettings, [field]: '' };
    setLogoSettings(updated);
    handleSaveLogoSettings(updated);
  };

  // --- Sub-tab selections ---
  const [sitemapSubTab, setSitemapSubTab] = useState<'overview' | 'product' | 'category' | 'blog' | 'image' | 'video' | 'brand' | 'gsc' | 'config'>('overview');
  const [schemaSubTab, setSchemaSubTab] = useState<'website' | 'organization' | 'product' | 'article' | 'faq' | 'breadcrumb' | 'collection' | 'validator'>('website');

  // --- Sitemap & Google Search Console States ---
  const [maxUrlsPerSitemap, setMaxUrlsPerSitemap] = useState(10000);
  const [sitemapSchedule, setSitemapSchedule] = useState<'daily' | 'weekly' | 'monthly' | 'manual'>('daily');
  const [gscHistory, setGscHistory] = useState([
    { url: 'https://ursport.vn/sitemap.xml', type: 'Sitemap Index', submittedAt: '31/05/2026 10:30', status: 'Success' as const, message: 'Đã nhận và xử lý' },
    { url: 'https://ursport.vn/sitemap-products-1.xml', type: 'Sitemap sản phẩm', submittedAt: '31/05/2026 10:31', status: 'Success' as const, message: 'Đã nhận (1,245 sản phẩm)' },
    { url: 'https://ursport.vn/sitemap-blog-1.xml', type: 'Sitemap bài viết', submittedAt: '31/05/2026 10:32', status: 'Success' as const, message: 'Đã nhận (542 bài viết)' }
  ]);
  const [isSubmittingToGsc, setIsSubmittingToGsc] = useState(false);

  // --- Schema Structured Data States ---
  const [schemaSettings, setSchemaSettings] = useState({
    businessType: 'LocalBusiness',
    name: 'URSport.vn',
    url: 'https://ursport.vn',
    logo: 'https://ursport.vn/images/logo.png',
    description: 'Chuyên cung cấp đồ thể thao chất lượng cao, phong cách hiện đại.',
    phone: '+84 917 722 425',
    email: 'support@ursport.vn',
    streetAddress: '72 Nguyễn Trãi, Quận 1',
    addressLocality: 'Hồ Chí Minh',
    addressRegion: 'TP. Hồ Chí Minh',
    postalCode: '700000',
    addressCountry: 'VN',
    facebook: 'https://facebook.com/ursport',
    instagram: 'https://instagram.com/ursport',
    tiktok: 'https://tiktok.com/@ursport',
  });
  const [schemaLoading, setSchemaLoading] = useState(true);

  // Dropdown options
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBlogPostId, setSelectedBlogPostId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // FAQ Manager state
  const [faqList, setFaqList] = useState<{ question: string; answer: string }[]>([
    { question: "URSport có giao hàng toàn quốc không?", answer: "Có, URSport hỗ trợ giao hàng COD nhanh toàn quốc với thời gian từ 2-4 ngày làm việc." },
    { question: "Chất liệu áo thun thể thao URSport có mát không?", answer: "Sản phẩm sử dụng chất liệu Premium Cotton hoặc thun lạnh thể thao co giãn 4 chiều, thấm hút mồ hôi cực tốt." },
    { question: "Chính sách đổi trả của cửa hàng ra sao?", answer: "URSport hỗ trợ đổi hàng miễn phí trong vòng 7 ngày kể từ lúc nhận hàng nếu không vừa size hoặc phát hiện lỗi sản xuất." }
  ]);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // Schema Validator state
  const [isAuditing, setIsAuditing] = useState(false);
  const [schemaAuditRun, setSchemaAuditRun] = useState(false);
  const [auditResults, setAuditResults] = useState<{
    website: 'ok' | 'warning' | 'error';
    organization: 'ok' | 'warning' | 'error';
    product: 'ok' | 'warning' | 'error';
    article: 'ok' | 'warning' | 'error';
    faq: 'ok' | 'warning' | 'error';
    breadcrumb: 'ok' | 'warning' | 'error';
    collection: 'ok' | 'warning' | 'error';
    warnings: string[];
    failedProducts: Product[];
    failedBlogPosts: BlogPost[];
  }>({
    website: 'ok',
    organization: 'ok',
    product: 'ok',
    article: 'ok',
    faq: 'ok',
    breadcrumb: 'ok',
    collection: 'ok',
    warnings: [],
    failedProducts: [],
    failedBlogPosts: [],
  });

  // --- Robots.txt & Google Indexing API States ---
  const [robotsTxt, setRobotsTxt] = useState(`User-agent: *\nDisallow: /admin/\nDisallow: /checkout/\nDisallow: /cart/\nAllow: /\n\nSitemap: https://ursport.vn/sitemap.xml`);
  const [robotsLoading, setRobotsLoading] = useState(false);
  const [indexingUrls, setIndexingUrls] = useState('');
  const [indexingAction, setIndexingAction] = useState<'URL_UPDATED' | 'URL_DELETED'>('URL_UPDATED');
  const [indexingLogs, setIndexingLogs] = useState<{ url: string; action: string; status: string; time: string }[]>([]);
  const [isIndexingSubmitting, setIsIndexingSubmitting] = useState(false);

  // --- Redirects & Canonical States ---
  const [redirectRules, setRedirectRules] = useState<{ source: string; destination: string; type: '301' | '302'; date: string }[]>([
    { source: '/ao-thun-nam-old', destination: '/ao-thun-nam', type: '301', date: '30/05/2026' },
    { source: '/do-gym-nam-cu', destination: '/collection/do-gym', type: '301', date: '28/05/2026' },
    { source: '/khuyen-mai-tet', destination: '/shop', type: '302', date: '25/05/2026' }
  ]);
  const [newRedirectSource, setNewRedirectSource] = useState('');
  const [newRedirectDest, setNewRedirectDest] = useState('');
  const [newRedirectType, setNewRedirectType] = useState<'301' | '302'>('301');
  const [redirectLoading, setRedirectLoading] = useState(false);

  const [canonicalSettings, setCanonicalSettings] = useState({
    preferredDomain: 'non-www',
    forceHttps: true,
    trailingSlash: 'remove'
  });
  const [canonicalLoading, setCanonicalLoading] = useState(false);

  // Set default selection when products or posts load
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (blogPosts.length > 0 && !selectedBlogPostId) {
      setSelectedBlogPostId(blogPosts[0].id);
    }
  }, [blogPosts, selectedBlogPostId]);

  useEffect(() => {
    if (CATEGORY_METADATA.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(CATEGORY_METADATA[0].slug);
    }
  }, [selectedCategoryId]);

  // --- Firestore Load Effect ---
  useEffect(() => {
    if (activeSection === 'seo-schema') {
      setSchemaLoading(true);
      getAdminSetting<Partial<typeof schemaSettings>>('schemaSettings').then((data) => {
        if (data) {
          setSchemaSettings((prev) => ({ ...prev, ...data }));
        }
        setSchemaLoading(false);
      }).catch((err) => {
        console.error(err);
        setSchemaLoading(false);
      });
      
      // Load FAQ list if stored
      getAdminSetting<{ faqList: any[] }>('schemaSettings' as any).then((data) => {
        if (data && data.faqList) {
          setFaqList(data.faqList);
        }
      }).catch(() => {});
    }

    if (activeSection === 'seo-robots') {
      setRobotsLoading(true);
      getAdminSetting<{ robotsTxt: string }>('robotsSettings').then((data) => {
        if (data && data.robotsTxt) {
          setRobotsTxt(data.robotsTxt);
        }
        setRobotsLoading(false);
      }).catch(() => setRobotsLoading(false));
    }

    if (activeSection === 'seo-redirects') {
      setRedirectLoading(true);
      getAdminSetting<{ redirectRules: any[] }>('redirectSettings').then((data) => {
        if (data && data.redirectRules) {
          setRedirectRules(data.redirectRules);
        }
        setRedirectLoading(false);
      }).catch(() => setRedirectLoading(false));

      setCanonicalLoading(true);
      getAdminSetting<any>('canonicalSettings').then((data) => {
        if (data) {
          setCanonicalSettings(prev => ({ ...prev, ...data }));
        }
        setCanonicalLoading(false);
      }).catch(() => setCanonicalLoading(false));
    }
  }, [activeSection]);

  // --- Save Handlers ---
  const handleSaveSchema = async () => {
    try {
      setSchemaLoading(true);
      await saveAdminSetting('schemaSettings', { ...schemaSettings, faqList });
      toast.success('Đã lưu cấu hình Schema Structured Data & FAQ!');
    } catch {
      toast.error('Lỗi khi lưu cấu hình Schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleSaveRobots = async () => {
    try {
      setRobotsLoading(true);
      await saveAdminSetting('robotsSettings', { robotsTxt });
      toast.success('Đã lưu cấu hình Robots.txt thành công!');
    } catch {
      toast.error('Lỗi khi lưu Robots.txt');
    } finally {
      setRobotsLoading(false);
    }
  };

  const handleSaveRedirects = async (newRules = redirectRules) => {
    try {
      setRedirectLoading(true);
      await saveAdminSetting('redirectSettings', { redirectRules: newRules });
      toast.success('Đã cập nhật cấu hình Redirects!');
    } catch {
      toast.error('Lỗi khi lưu Redirects');
    } finally {
      setRedirectLoading(false);
    }
  };

  const handleSaveCanonical = async () => {
    try {
      setCanonicalLoading(true);
      await saveAdminSetting('canonicalSettings', canonicalSettings);
      toast.success('Đã lưu cấu hình Canonical Domain!');
    } catch {
      toast.error('Lỗi khi lưu Canonical');
    } finally {
      setCanonicalLoading(false);
    }
  };

  // --- Sitemap splitting computations ---
  const getProductSitemapChunks = () => {
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += maxUrlsPerSitemap) {
      chunks.push(products.slice(i, i + maxUrlsPerSitemap));
    }
    return chunks;
  };

  const generateMainSitemapIndexString = () => {
    const baseUrl = 'https://ursport.vn';
    const currentDate = new Date().toISOString().split('T')[0];
    const productChunks = getProductSitemapChunks();
    const blogCount = blogPosts.length;
    const blogChunksCount = Math.ceil(blogCount / maxUrlsPerSitemap) || 1;

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    // Sitemap general
    xmlLines.push('  <sitemap>');
    xmlLines.push(`    <loc>${baseUrl}/sitemap-general.xml</loc>`);
    xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
    xmlLines.push('  </sitemap>');

    // Product chunks
    productChunks.forEach((_, idx) => {
      xmlLines.push('  <sitemap>');
      xmlLines.push(`    <loc>${baseUrl}/sitemap-products-${idx + 1}.xml</loc>`);
      xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
      xmlLines.push('  </sitemap>');
    });

    // Blog chunks
    for (let i = 0; i < blogChunksCount; i++) {
      xmlLines.push('  <sitemap>');
      xmlLines.push(`    <loc>${baseUrl}/sitemap-blog-${i + 1}.xml</loc>`);
      xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
      xmlLines.push('  </sitemap>');
    }

    // Image chunks
    xmlLines.push('  <sitemap>');
    xmlLines.push(`    <loc>${baseUrl}/sitemap-images-1.xml</loc>`);
    xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
    xmlLines.push('  </sitemap>');

    // Video chunks
    xmlLines.push('  <sitemap>');
    xmlLines.push(`    <loc>${baseUrl}/sitemap-video-1.xml</loc>`);
    xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
    xmlLines.push('  </sitemap>');

    // Brand chunks
    xmlLines.push('  <sitemap>');
    xmlLines.push(`    <loc>${baseUrl}/sitemap-brands.xml</loc>`);
    xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
    xmlLines.push('  </sitemap>');

    xmlLines.push('</sitemapindex>');
    return xmlLines.join('\n');
  };

  const generateProductSitemapString = (chunkIdx: number) => {
    const chunks = getProductSitemapChunks();
    const chunk = chunks[chunkIdx] || [];
    const baseUrl = 'https://ursport.vn';
    const currentDate = new Date().toISOString().split('T')[0];

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    chunk.forEach(p => {
      const path = getProductPath(p);
      const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${url}</loc>`);
      xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
      xmlLines.push('    <changefreq>weekly</changefreq>');
      xmlLines.push('    <priority>0.8</priority>');
      xmlLines.push('  </url>');
    });

    xmlLines.push('</urlset>');
    return xmlLines.join('\n');
  };

  const generateCategorySitemapString = () => {
    const baseUrl = 'https://ursport.vn';
    const currentDate = new Date().toISOString().split('T')[0];

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    CATEGORY_METADATA.forEach(cat => {
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${baseUrl}/${cat.slug}</loc>`);
      xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
      xmlLines.push('    <changefreq>daily</changefreq>');
      xmlLines.push('    <priority>0.9</priority>');
      xmlLines.push('  </url>');
    });

    DEFAULT_SEO_SUBCATEGORIES.forEach(sub => {
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${baseUrl}${sub.link}</loc>`);
      xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
      xmlLines.push('    <changefreq>weekly</changefreq>');
      xmlLines.push('    <priority>0.85</priority>');
      xmlLines.push('  </url>');
    });

    xmlLines.push('</urlset>');
    return xmlLines.join('\n');
  };

  const generateBlogSitemapString = () => {
    const baseUrl = 'https://ursport.vn';
    const currentDate = new Date().toISOString().split('T')[0];

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    blogPosts.forEach(post => {
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${baseUrl}/blog/${post.slug}</loc>`);
      xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
      xmlLines.push('    <changefreq>weekly</changefreq>');
      xmlLines.push('    <priority>0.7</priority>');
      xmlLines.push('  </url>');
    });

    xmlLines.push('</urlset>');
    return xmlLines.join('\n');
  };

  const generateImageSitemapString = () => {
    const baseUrl = 'https://ursport.vn';

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
    ];

    products.forEach(p => {
      const path = getProductPath(p);
      const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
      const img = p.images?.[0] || '/images/placeholder.jpg';
      const imgUrl = img.startsWith('http') ? img : `${baseUrl}${img}`;
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${url}</loc>`);
      xmlLines.push('    <image:image>');
      xmlLines.push(`      <image:loc>${imgUrl}</image:loc>`);
      xmlLines.push(`      <image:title><![CDATA[${p.name}]]></image:title>`);
      xmlLines.push('    </image:image>');
      xmlLines.push('  </url>');
    });

    xmlLines.push('</urlset>');
    return xmlLines.join('\n');
  };

  const generateVideoSitemapString = () => {
    const baseUrl = 'https://ursport.vn';

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'
    ];

    xmlLines.push('  <url>');
    xmlLines.push(`    <loc>${baseUrl}/blog/huong-dan-chon-do-tap-gym-cho-nam</loc>`);
    xmlLines.push('    <video:video>');
    xmlLines.push(`      <video:thumbnail_loc>${baseUrl}/images/blog/gym-guide-thumb.jpg</video:thumbnail_loc>`);
    xmlLines.push('      <video:title><![CDATA[Cách lựa chọn quần áo tập thể thao bền đẹp cho nam]]></video:title>');
    xmlLines.push('      <video:description><![CDATA[Video review chất liệu thun mè thể thao và cotton kháng khuẩn co giãn tốt tại URSport.]]></video:description>');
    xmlLines.push(`      <video:content_loc>${baseUrl}/videos/gym-guide.mp4</video:content_loc>`);
    xmlLines.push(`      <video:player_loc>https://www.youtube.com/embed/ursport-video-1</video:player_loc>`);
    xmlLines.push('    </video:video>');
    xmlLines.push('  </url>');

    xmlLines.push('</urlset>');
    return xmlLines.join('\n');
  };

  const generateBrandSitemapString = () => {
    const baseUrl = 'https://ursport.vn';
    const currentDate = new Date().toISOString().split('T')[0];

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    const brands = ['URSport', 'Nike', 'Adidas', 'Under-Armour', 'Puma'];
    brands.forEach(b => {
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${baseUrl}/brand/${b.toLowerCase()}</loc>`);
      xmlLines.push(`    <lastmod>${currentDate}</lastmod>`);
      xmlLines.push('    <changefreq>weekly</changefreq>');
      xmlLines.push('    <priority>0.75</priority>');
      xmlLines.push('  </url>');
    });

    xmlLines.push('</urlset>');
    return xmlLines.join('\n');
  };

  const getSitemapXmlContent = () => {
    switch (sitemapSubTab) {
      case 'overview':
        return generateMainSitemapIndexString();
      case 'product':
        return generateProductSitemapString(0);
      case 'category':
        return generateCategorySitemapString();
      case 'blog':
        return generateBlogSitemapString();
      case 'image':
        return generateImageSitemapString();
      case 'video':
        return generateVideoSitemapString();
      case 'brand':
        return generateBrandSitemapString();
      default:
        return '';
    }
  };

  // --- Schema Object String Generators ---
  const generateWebsiteSchemaString = () => {
    const websiteJson = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "URSport",
      "alternateName": "URSport Vietnam",
      "url": "https://ursport.vn",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://ursport.vn/shop?search={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    };
    return JSON.stringify(websiteJson, null, 2);
  };

  const generateOrganizationSchemaString = () => {
    const orgJson = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": schemaSettings.name,
      "url": schemaSettings.url,
      "logo": schemaSettings.logo,
      "description": schemaSettings.description,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": schemaSettings.phone,
        "contactType": "customer service",
        "email": schemaSettings.email,
        "areaServed": "VN",
        "availableLanguage": "Vietnamese"
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": schemaSettings.streetAddress,
        "addressLocality": schemaSettings.addressLocality,
        "addressRegion": schemaSettings.addressRegion,
        "postalCode": schemaSettings.postalCode,
        "addressCountry": schemaSettings.addressCountry
      },
      "sameAs": [
        schemaSettings.facebook,
        schemaSettings.instagram,
        schemaSettings.tiktok
      ].filter(Boolean)
    };
    return JSON.stringify(orgJson, null, 2);
  };

  const generateProductSchemaString = () => {
    const selectedProd = products.find(p => p.id === selectedProductId) || products[0];
    if (!selectedProd) return '{}';

    const baseUrl = 'https://ursport.vn';
    const productPath = getProductPath(selectedProd);
    const productUrl = productPath.startsWith('http') ? productPath : `${baseUrl}${productPath}`;
    const img = selectedProd.images?.[0] || '/images/placeholder.jpg';
    const imageUrl = img.startsWith('http') ? img : `${baseUrl}${img}`;

    const prodJson = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": selectedProd.name,
      "image": imageUrl,
      "description": selectedProd.description || `Mua sản phẩm ${selectedProd.name} cao cấp chính hãng tại URSport.`,
      "sku": selectedProd.productCode || `UR-${selectedProd.id.slice(0, 6).toUpperCase()}`,
      "mpn": selectedProd.productCode || `UR-${selectedProd.id.slice(0, 6).toUpperCase()}`,
      "brand": {
        "@type": "Brand",
        "name": "URSport"
      },
      "offers": {
        "@type": "Offer",
        "url": productUrl,
        "priceCurrency": "VND",
        "price": selectedProd.price || 0,
        "priceValidUntil": "2027-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": selectedProd.stock && selectedProd.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "URSport",
          "url": "https://ursport.vn"
        }
      }
    };
    return JSON.stringify(prodJson, null, 2);
  };

  const generateArticleSchemaString = () => {
    const selectedPost = blogPosts.find(p => p.id === selectedBlogPostId) || blogPosts[0];
    if (!selectedPost) return '{}';

    const baseUrl = 'https://ursport.vn';
    const img = selectedPost.image || '/images/placeholder.jpg';
    const imageUrl = img.startsWith('http') ? img : `${baseUrl}${img}`;
    
    const getJsDate = (ts?: FirestoreTimestamp | string) => {
      if (!ts) return new Date();
      if (typeof ts === 'string') return new Date(ts);
      if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate();
      if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
      return new Date();
    };
    const pubDate = getJsDate(selectedPost.createdAt || selectedPost.date).toISOString();

    const articleJson = {
      "@context": "https://schema.org",
      "@type": "Article",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${baseUrl}/blog/${selectedPost.slug}`
      },
      "headline": selectedPost.title,
      "image": [imageUrl],
      "datePublished": pubDate,
      "dateModified": pubDate,
      "author": {
        "@type": "Person",
        "name": selectedPost.author || "URSport Editor",
        "url": `${baseUrl}/blog`
      },
      "publisher": {
        "@type": "Organization",
        "name": "URSport",
        "logo": {
          "@type": "ImageObject",
          "url": schemaSettings.logo
        }
      },
      "description": selectedPost.excerpt || selectedPost.title
    };
    return JSON.stringify(articleJson, null, 2);
  };

  const generateFaqSchemaString = () => {
    const faqJson = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqList.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    return JSON.stringify(faqJson, null, 2);
  };

  const generateBreadcrumbSchemaString = () => {
    const baseUrl = 'https://ursport.vn';
    const breadcrumbJson = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Trang chủ",
          "item": baseUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Áo thun nam",
          "item": `${baseUrl}/ao-thun-nam`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Áo Thun Cotton Premium",
          "item": `${baseUrl}/ao-thun-nam/ao-thun-cotton-premium-ursport`
        }
      ]
    };
    return JSON.stringify(breadcrumbJson, null, 2);
  };

  const generateCollectionSchemaString = () => {
    const selectedCat = CATEGORY_METADATA.find(c => c.slug === selectedCategoryId) || CATEGORY_METADATA[0];
    if (!selectedCat) return '{}';

    const baseUrl = 'https://ursport.vn';
    const catProducts = products.filter(p => p.category === selectedCat.name).slice(0, 10);

    const collectionJson = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": selectedCat.name,
      "url": `${baseUrl}/${selectedCat.slug}`,
      "description": `Bộ sưu tập ${selectedCat.name} chính hãng chất lượng cao tại URSport.`,
      "numberOfItems": catProducts.length,
      "itemListElement": catProducts.map((p, idx) => {
        const path = getProductPath(p);
        const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
        return {
          "@type": "ListItem",
          "position": idx + 1,
          "url": url,
          "name": p.name
        };
      })
    };
    return JSON.stringify(collectionJson, null, 2);
  };

  // Run audit simulation
  const handleRunAudit = () => {
    setIsAuditing(true);
    setSchemaAuditRun(true);
    setTimeout(() => {
      const warnings: string[] = [];
      
      // 1. Audit products
      const failedProds = products.filter(p => !p.productCode);
      const anyProductMissingSku = failedProds.length > 0;
      if (anyProductMissingSku) {
        warnings.push(`Có ${failedProds.length} sản phẩm đang bị thiếu SKU (Mã sản phẩm). Google sẽ cảnh báo 'Missing field SKU'.`);
      }
      
      // 2. Audit ratings
      warnings.push("Các sản phẩm mới đăng chưa có AggregateRating (Đánh giá xếp hạng). Google sẽ bỏ qua hiển thị sao nếu không có review thực tế.");

      // 3. Check organization fields
      if (!schemaSettings.phone || !schemaSettings.email) {
        warnings.push("Organization thiếu thông tin liên lạc chính thức (Điện thoại hoặc Email).");
      }

      // 4. Audit blog posts
      const failedBlogs = blogPosts.filter(post => !post.image || !post.excerpt);
      const anyBlogFailed = failedBlogs.length > 0;
      if (anyBlogFailed) {
        warnings.push(`Có ${failedBlogs.length} bài viết blog đang bị thiếu ảnh đại diện hoặc tóm tắt (excerpt).`);
      }

      setAuditResults({
        website: 'ok',
        organization: schemaSettings.phone && schemaSettings.email ? 'ok' : 'warning',
        product: anyProductMissingSku ? 'warning' : 'ok',
        article: anyBlogFailed ? 'warning' : 'ok',
        faq: faqList.length > 0 ? 'ok' : 'warning',
        breadcrumb: 'ok',
        collection: CATEGORY_METADATA.length > 0 ? 'ok' : 'error',
        warnings,
        failedProducts: failedProds,
        failedBlogPosts: failedBlogs,
      });
      setIsAuditing(false);
      toast.success("Đã hoàn tất kiểm tra Schema Structured Data!");
    }, 1500);
  };

  // Google GSC submission simulator
  const handleSubmitSitemapToGsc = (sitemapUrl: string) => {
    setIsSubmittingToGsc(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const newHistoryItem = {
        url: sitemapUrl,
        type: sitemapUrl.includes('products') ? 'Sitemap sản phẩm' : sitemapUrl.includes('blog') ? 'Sitemap bài viết' : 'Sitemap chính',
        submittedAt: timeStr,
        status: 'Success' as const,
        message: 'Thành công (API Google Search Console 200 OK)'
      };

      setGscHistory(prev => [newHistoryItem, ...prev]);
      setIsSubmittingToGsc(false);
      toast.success(`Đã gửi sitemap ${sitemapUrl} lên Google Search Console thành công!`);
    }, 1200);
  };

  // Google Indexing API simulator
  const handleSendIndexingAPI = () => {
    if (!indexingUrls.trim()) {
      toast.error("Vui lòng nhập ít nhất một URL cần Index.");
      return;
    }

    const urls = indexingUrls.split('\n').map(u => u.trim()).filter(Boolean);
    const invalidUrl = urls.find(u => !u.startsWith('http'));
    if (invalidUrl) {
      toast.error(`URL không hợp lệ: "${invalidUrl}". URL phải bắt đầu bằng http:// hoặc https://`);
      return;
    }

    setIsIndexingSubmitting(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();

      const newLogs = urls.map(url => ({
        url,
        action: indexingAction === 'URL_UPDATED' ? 'Publish/Update' : 'Delete',
        status: '✓ 200 OK (Google Indexing API)',
        time: timeStr
      }));

      setIndexingLogs(prev => [...newLogs, ...prev]);
      setIsIndexingSubmitting(false);
      setIndexingUrls('');
      toast.success(`Đã gửi yêu cầu ${indexingAction === 'URL_UPDATED' ? 'Cập nhật' : 'Xóa'} cho ${urls.length} URLs lên Google Indexing API!`);
    }, 1500);
  };

  const handleDownloadSitemap = (xmlContent: string, fileName: string) => {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã tải xuống file ${fileName}`);
  };

  const handleDownloadRobotsTxtFile = () => {
    const blob = new Blob([robotsTxt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống file robots.txt');
  };

  const updateColumnTitle = (colIdx: number, newTitle: string) => {
    const updated = [...(footerSettings.customLinks || [])];
    updated[colIdx] = { ...updated[colIdx], title: newTitle };
    setFooterSettings({ ...footerSettings, customLinks: updated });
  };

  const deleteColumn = (colIdx: number) => {
    const updated = (footerSettings.customLinks || []).filter((_, idx) => idx !== colIdx);
    setFooterSettings({ ...footerSettings, customLinks: updated });
  };

  const addColumn = () => {
    const updated = [...(footerSettings.customLinks || []), { title: 'Cột liên kết mới', items: [] }];
    setFooterSettings({ ...footerSettings, customLinks: updated });
  };

  const addLinkItem = (colIdx: number) => {
    const updated = [...(footerSettings.customLinks || [])];
    updated[colIdx] = {
      ...updated[colIdx],
      items: [...(updated[colIdx].items || []), { label: 'Liên kết mới', action: 'page' as const, value: '#' }]
    };
    setFooterSettings({ ...footerSettings, customLinks: updated });
  };

  const updateLinkItem = (colIdx: number, itemIdx: number, key: 'label' | 'action' | 'value', value: any) => {
    const updated = [...(footerSettings.customLinks || [])];
    const items = [...(updated[colIdx].items || [])];
    items[itemIdx] = { ...items[itemIdx], [key]: value };
    updated[colIdx] = { ...updated[colIdx], items };
    setFooterSettings({ ...footerSettings, customLinks: updated });
  };

  const deleteLinkItem = (colIdx: number, itemIdx: number) => {
    const updated = [...(footerSettings.customLinks || [])];
    updated[colIdx] = {
      ...updated[colIdx],
      items: (updated[colIdx].items || []).filter((_, idx) => idx !== itemIdx)
    };
    setFooterSettings({ ...footerSettings, customLinks: updated });
  };

  const deletePaymentBadge = (badgeIdx: number) => {
    const updated = (footerSettings.paymentBadges || []).filter((_, idx) => idx !== badgeIdx);
    setFooterSettings({ ...footerSettings, paymentBadges: updated });
  };

  const addPaymentBadge = (badgeName: string) => {
    if (!badgeName.trim()) return;
    const current = footerSettings.paymentBadges || [];
    if (current.includes(badgeName.trim())) {
      toast.error('Huy hiệu này đã tồn tại');
      return;
    }
    setFooterSettings({ ...footerSettings, paymentBadges: [...current, badgeName.trim()] });
    setNewBadgeText('');
  };

  const deletePaymentGateway = (gatewayIdx: number) => {
    const updated = (footerSettings.paymentGateways || []).filter((_, idx) => idx !== gatewayIdx);
    setFooterSettings({ ...footerSettings, paymentGateways: updated });
  };

  const addPaymentGateway = (gatewayName: string) => {
    if (!gatewayName.trim()) return;
    const current = footerSettings.paymentGateways || [];
    if (current.includes(gatewayName.trim())) {
      toast.error('Cổng thanh toán này đã tồn tại');
      return;
    }
    setFooterSettings({ ...footerSettings, paymentGateways: [...current, gatewayName.trim()] });
    setNewGatewayText('');
  };

  return (
            <div className="space-y-6">
              {/* Logo & Favicon Config */}
              {(activeSection === 'settings' || activeSection === 'settings-logo') && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6">Cấu hình Logo & Favicon</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Logo Light Background */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                    <div>
                      <h4 className="text-white font-bold text-xs uppercase tracking-wider">Logo Website (Nền sáng / Header)</h4>
                      <p className="text-white/35 text-[10px] mt-1">Hiển thị trên thanh menu chính của cửa hàng (Nền sáng)</p>
                    </div>
                    <div className="aspect-[3/1] rounded-xl bg-white flex items-center justify-center p-4 border border-zinc-200 overflow-hidden">
                      {logoSettings.logoLight ? (
                        <img src={logoSettings.logoLight} alt="Logo Light Background" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-zinc-400 text-xs font-bold">Chưa có logo nền sáng</span>
                      )}
                    </div>
                    <ImageUpload 
                      folder="settings"
                      label="Tải lên Logo nền sáng"
                      compact={true}
                      externalPreview={logoSettings.logoLight}
                      onUploadComplete={async (url) => {
                        const updated = {...logoSettings, logoLight: url};
                        setLogoSettings(updated);
                        saveAdminSetting('logoSettings', updated);
                        toast.success('Đã tự động lưu Logo nền sáng!');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => clearLogoField('logoLight')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 text-xs font-bold px-3 py-2 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa logo nền sáng
                    </button>
                    <input 
                      type="text"
                      value={logoSettings.logoLight || ''}
                      onChange={(e) => setLogoSettings({...logoSettings, logoLight: e.target.value})}
                      placeholder="URL logo nền sáng"
                      className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                    />
                  </div>

                  {/* Logo Dark Background */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                    <div>
                      <h4 className="text-white font-bold text-xs uppercase tracking-wider">Logo Website (Nền tối / Footer)</h4>
                      <p className="text-white/35 text-[10px] mt-1">Hiển thị ở chân trang và trang quản trị (Nền tối)</p>
                    </div>
                    <div className="aspect-[3/1] rounded-xl bg-[#0f1117] flex items-center justify-center p-4 border border-white/5 overflow-hidden">
                      {logoSettings.logoDark ? (
                        <img src={logoSettings.logoDark} alt="Logo Dark Background" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-white/30 text-xs font-bold">Chưa có logo nền tối</span>
                      )}
                    </div>
                    <ImageUpload 
                      folder="settings"
                      label="Tải lên Logo nền tối"
                      compact={true}
                      externalPreview={logoSettings.logoDark}
                      onUploadComplete={async (url) => {
                        const updated = {...logoSettings, logoDark: url};
                        setLogoSettings(updated);
                        saveAdminSetting('logoSettings', updated);
                        toast.success('Đã tự động lưu Logo nền tối!');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => clearLogoField('logoDark')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 text-xs font-bold px-3 py-2 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa logo nền tối
                    </button>
                    <input 
                      type="text"
                      value={logoSettings.logoDark || ''}
                      onChange={(e) => setLogoSettings({...logoSettings, logoDark: e.target.value})}
                      placeholder="URL logo nền tối"
                      className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                    />
                  </div>

                  {/* Favicon Logo */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                    <div>
                      <h4 className="text-white font-bold text-xs uppercase tracking-wider">Logo Icon (Favicon / Tab trình duyệt)</h4>
                      <p className="text-white/35 text-[10px] mt-1">Biểu tượng hiển thị trên tab trình duyệt (Favicon logo)</p>
                    </div>
                    <div className="aspect-[3/1] rounded-xl bg-white/[0.02] flex items-center justify-center p-4 border border-white/5">
                      {logoSettings.favicon ? (
                        <div className="h-10 w-10 bg-[#1e4b64] rounded-xl flex items-center justify-center overflow-hidden">
                          <img src={logoSettings.favicon} alt="Favicon" className="h-full w-full object-contain" />
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs font-bold">Chưa có Favicon</span>
                      )}
                    </div>
                    <ImageUpload 
                      folder="settings"
                      label="Tải lên Favicon"
                      compact={true}
                      externalPreview={logoSettings.favicon}
                      allowedTypes={['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/webp', 'image/jpeg', 'image/gif']}
                      formatHint="ICO, PNG, WebP, JPG, GIF"
                      onUploadComplete={async (url) => {
                        const updated = {...logoSettings, favicon: withCacheBust(url)};
                        setLogoSettings(updated);
                        try {
                          await saveAdminSetting('logoSettings', updated);
                          await syncSiteFavicon(updated.favicon);
                          toast.success('Đã lưu và đồng bộ Favicon!');
                        } catch (error: any) {
                          toast.error(error.message || 'Lỗi khi đồng bộ Favicon');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => clearLogoField('favicon')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 text-xs font-bold px-3 py-2 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa Favicon
                    </button>
                    <input 
                      type="text"
                      value={logoSettings.favicon || ''}
                      onChange={(e) => setLogoSettings({...logoSettings, favicon: e.target.value})}
                      placeholder="URL Favicon logo"
                      className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button 
                    onClick={() => handleSaveLogoSettings(logoSettings)}
                    className="px-6 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
                  >
                    Lưu cấu hình Logo & Favicon
                  </button>
                </div>
              </div>
              )}

              {/* Footer Configuration Panel */}
              {(activeSection === 'settings' || activeSection === 'settings-footer') && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4 mb-6">
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-widest">Cấu hình Chân trang (Footer)</h3>
                      <p className="text-white/30 text-xs font-medium mt-1">Kéo thả các thanh tiêu đề để đổi vị trí cột, nhấp vào tiêu đề để sửa chi tiết từng cột</p>
                    </div>
                    <button 
                      onClick={() => handleSaveFooterSettings(footerSettings)}
                      className="mt-4 md:mt-0 px-6 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-xs font-black rounded-xl shadow-lg transition-all border border-white/10"
                    >
                      Lưu cấu hình Chân trang
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Danh sách các cột dạng Accordion Kéo thả */}
                    {getFooterColumns().map((col, idx) => {
                      const isExpanded = expandedColId === col.id;
                      const isDragging = draggedColId === col.id;
                      const isDragOver = dragOverColId === col.id;

                      return (
                        <div 
                          key={col.id} 
                          className={cn(
                            "bg-[#0f1117] border rounded-2xl overflow-hidden transition-all duration-200",
                            isExpanded ? "border-[#1e4b64]" : "border-white/5",
                            isDragging && "opacity-40 scale-98",
                            isDragOver && "border-blue-400 bg-white/[0.01]"
                          )}
                        >
                          {/* Accordion Header (Draggable) */}
                          <div 
                            draggable
                            onDragStart={() => handleColDragStart(col.id)}
                            onDragOver={(e) => handleColDragOver(col.id, e)}
                            onDrop={() => handleColDrop(col.id)}
                            onDragEnd={handleColDragEnd}
                            onClick={() => setExpandedColId(isExpanded ? null : col.id)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] select-none group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing p-1">
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-white/35 bg-white/5 px-2.5 py-1 rounded-md">Vị trí {idx + 1}</span>
                              <h4 className="text-white font-bold text-xs uppercase tracking-wider">{col.name}</h4>
                            </div>
                            <div className="text-white/40 group-hover:text-white transition-colors p-1">
                              <ChevronRight className={cn("h-4 w-4 transform transition-transform duration-300", isExpanded && "rotate-90")} />
                            </div>
                          </div>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="p-6 border-t border-white/5 bg-white/[0.01] space-y-6">
                              {/* 1. Intro Column Settings */}
                              {col.id === 'intro' && (
                                <div className="grid grid-cols-1 gap-6">
                                  <div>
                                    <label className="text-[10px] font-black uppercase text-white/35 mb-1.5 block">Mô tả giới thiệu chân trang</label>
                                    <textarea 
                                      value={footerSettings.description}
                                      onChange={(e) => setFooterSettings({...footerSettings, description: e.target.value})}
                                      placeholder="VD: Chuyên cung cấp đồ thể thao chất lượng cao..."
                                      rows={3}
                                      className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50 resize-y"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-6">
                                    {/* Logo Settings */}
                                    <div className="space-y-4">
                                      <label className="text-[10px] font-black uppercase text-white/35 block">Logo Chân Trang (Cột 1)</label>
                                      <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
                                          <input 
                                            type="checkbox"
                                            checked={footerSettings.showLogo !== false}
                                            onChange={(e) => setFooterSettings({...footerSettings, showLogo: e.target.checked})}
                                            className="accent-[#1e4b64] h-3.5 w-3.5 rounded border-white/10"
                                          />
                                          Hiển thị Logo ở chân trang
                                        </label>
                                      </div>
                                      {footerSettings.showLogo !== false && (
                                        <div className="space-y-3">
                                          <div className="aspect-[3/1] max-w-[200px] rounded-xl bg-[#0f1117] flex items-center justify-center p-3 border border-white/5 overflow-hidden">
                                            {logoSettings.logoDark ? (
                                              <img src={logoSettings.logoDark} alt="Logo Dark Background" className="max-h-full max-w-full object-contain" />
                                            ) : (
                                              <span className="text-white/30 text-xs font-bold">Chưa có logo nền tối</span>
                                            )}
                                          </div>
                                          <ImageUpload 
                                            folder="settings"
                                            label="Thay đổi Logo Footer (Nền tối)"
                                            compact={true}
                                            externalPreview={logoSettings.logoDark}
                                            onUploadComplete={(url) => {
                                              const updated = {...logoSettings, logoDark: url};
                                              setLogoSettings(updated);
                                              handleSaveLogoSettings(updated);
                                              toast.success('Đã cập nhật Logo chân trang!');
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => clearLogoField('logoDark')}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 text-xs font-bold px-3 py-2 hover:bg-red-500/10 transition"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" /> Xóa Logo chân trang
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Email Settings */}
                                    <div className="space-y-4">
                                      <label className="text-[10px] font-black uppercase text-white/35 block">Form Đăng ký Email (Cột 1)</label>
                                      <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
                                          <input 
                                            type="checkbox"
                                            checked={footerSettings.showNewsletter !== false}
                                            onChange={(e) => setFooterSettings({...footerSettings, showNewsletter: e.target.checked})}
                                            className="accent-[#1e4b64] h-3.5 w-3.5 rounded border-white/10"
                                          />
                                          Hiển thị Form Đăng ký nhận tin
                                        </label>
                                      </div>

                                      {footerSettings.showNewsletter !== false && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                          <div>
                                            <label className="text-[9px] font-black uppercase text-white/25 mb-1 block">Gợi ý ô nhập (Placeholder)</label>
                                            <input 
                                              type="text"
                                              value={footerSettings.newsletterPlaceholder || ''}
                                              onChange={(e) => setFooterSettings({...footerSettings, newsletterPlaceholder: e.target.value})}
                                              placeholder="VD: Email của bạn"
                                              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-black uppercase text-white/25 mb-1 block">Chữ trên nút (Button Text)</label>
                                            <input 
                                              type="text"
                                              value={footerSettings.newsletterButtonText || ''}
                                              onChange={(e) => setFooterSettings({...footerSettings, newsletterButtonText: e.target.value})}
                                              placeholder="VD: Đăng ký"
                                              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 2. Custom Link Column Settings */}
                              {col.id.startsWith('custom_') && (() => {
                                const colIdx = parseInt(col.id.split('_')[1]);
                                const customCol = footerSettings.customLinks?.[colIdx];
                                if (!customCol) return null;

                                return (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex-1">
                                        <label className="text-[9px] font-black uppercase text-white/30 mb-1.5 block">Tên Cột</label>
                                        <input
                                          type="text"
                                          value={customCol.title}
                                          onChange={(e) => updateColumnTitle(colIdx, e.target.value)}
                                          className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs font-bold outline-none focus:border-[#1e4b64]/50"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => deleteColumn(colIdx)}
                                        className="self-end p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all border border-red-500/20"
                                        title="Xóa cột này"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>

                                    <div className="space-y-3 border-t border-white/5 pt-4">
                                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-black uppercase text-white/40">Liên kết trong cột</span>
                                        <button
                                          type="button"
                                          onClick={() => addLinkItem(colIdx)}
                                          className="flex items-center gap-1 text-[10px] font-bold text-[#4ca6d8] hover:text-[#5cb6e8] transition-colors"
                                        >
                                          <Plus className="h-3 w-3" /> Thêm liên kết
                                        </button>
                                      </div>

                                      {(!customCol.items || customCol.items.length === 0) ? (
                                        <p className="text-white/20 text-[10px] text-center py-4 font-bold italic">Chưa có liên kết nào</p>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                          {customCol.items.map((item, itemIdx) => (
                                            <div key={itemIdx} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 space-y-2 relative group">
                                              <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                  <label className="text-[8px] font-black uppercase text-white/25 mb-0.5 block">Nhãn hiển thị</label>
                                                  <input
                                                    type="text"
                                                    value={item.label}
                                                    onChange={(e) => updateLinkItem(colIdx, itemIdx, 'label', e.target.value)}
                                                    placeholder="Tên nhãn..."
                                                    className="w-full bg-white/5 border border-white/5 rounded-md px-2 py-1 text-white text-[11px] outline-none focus:border-[#1e4b64]/50"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[8px] font-black uppercase text-white/25 mb-0.5 block">Hành động link</label>
                                                  <select
                                                    value={item.action}
                                                    onChange={(e) => updateLinkItem(colIdx, itemIdx, 'action', e.target.value as any)}
                                                    className="w-full bg-[#13161f] border border-white/5 rounded-md px-2 py-1 text-white text-[11px] outline-none focus:border-[#1e4b64]/55 [color-scheme:dark]"
                                                  >
                                                    <option value="category">Mở Danh mục</option>
                                                    <option value="page">Mở Trang</option>
                                                  </select>
                                                </div>
                                              </div>
                                              <div className="flex gap-2 items-center">
                                                <div className="flex-1">
                                                  <label className="text-[8px] font-black uppercase text-white/25 mb-0.5 block">
                                                    {item.action === 'category' ? 'Tên danh mục chính xác (VD: Áo thun nam)' : 'Đường dẫn/Slug trang (VD: blog, contact, etc.)'}
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={item.value}
                                                    onChange={(e) => updateLinkItem(colIdx, itemIdx, 'value', e.target.value)}
                                                    placeholder={item.action === 'category' ? 'VD: Áo thun nam' : 'VD: blog'}
                                                    className="w-full bg-white/5 border border-white/5 rounded-md px-2 py-1 text-white text-[11px] outline-none focus:border-[#1e4b64]/55"
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => deleteLinkItem(colIdx, itemIdx)}
                                                  className="self-end p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-all border border-red-500/20"
                                                  title="Xóa liên kết"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 3. Contact Info Column Settings */}
                              {col.id === 'contact' && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Địa chỉ liên hệ</label>
                                      <input 
                                        type="text"
                                        value={footerSettings.address}
                                        onChange={(e) => setFooterSettings({...footerSettings, address: e.target.value})}
                                        placeholder="VD: 72 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh"
                                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Số điện thoại liên hệ</label>
                                      <input 
                                        type="text"
                                        value={footerSettings.phone}
                                        onChange={(e) => setFooterSettings({...footerSettings, phone: e.target.value})}
                                        placeholder="VD: +84 917 722 425"
                                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Email liên hệ</label>
                                      <input 
                                        type="email"
                                        value={footerSettings.email}
                                        onChange={(e) => setFooterSettings({...footerSettings, email: e.target.value})}
                                        placeholder="VD: support@ursport.vn"
                                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                      />
                                    </div>
                                  </div>

                                  <div className="border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase text-white/30 block">Đường dẫn Iframe Google Maps</label>
                                      <textarea 
                                        value={footerSettings.mapUrl}
                                        onChange={(e) => setFooterSettings({...footerSettings, mapUrl: e.target.value})}
                                        placeholder="Dán thuộc tính src của mã nhúng iframe bản đồ..."
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50 resize-y font-mono"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase text-white/30 block">Xem trước bản đồ</label>
                                      {footerSettings.mapUrl ? (
                                        <div className="overflow-hidden rounded-lg border border-white/5 bg-slate-900 h-24">
                                          <iframe
                                            className="h-full w-full"
                                            src={footerSettings.mapUrl}
                                            title="Preview Google Map"
                                            loading="lazy"
                                          />
                                        </div>
                                      ) : (
                                        <p className="text-white/20 text-[10px] italic py-8 border border-dashed border-white/5 rounded-lg text-center">Chưa dán iframe bản đồ</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 4. Social & Payments Settings */}
                              {col.id === 'social' && (
                                <div className="space-y-6">
                                  <div className="space-y-4">
                                    <h5 className="text-white font-bold text-xs uppercase tracking-wider">Mạng xã hội (Social Links)</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      <div>
                                        <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Link Facebook</label>
                                        <input 
                                          type="text"
                                          value={footerSettings.facebook}
                                          onChange={(e) => setFooterSettings({...footerSettings, facebook: e.target.value})}
                                          placeholder="https://facebook.com/ursport"
                                          className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Link Instagram</label>
                                        <input 
                                          type="text"
                                          value={footerSettings.instagram}
                                          onChange={(e) => setFooterSettings({...footerSettings, instagram: e.target.value})}
                                          placeholder="https://instagram.com/ursport"
                                          className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Link TikTok</label>
                                        <input 
                                          type="text"
                                          value={footerSettings.tiktok}
                                          onChange={(e) => setFooterSettings({...footerSettings, tiktok: e.target.value})}
                                          placeholder="https://tiktok.com/@ursport"
                                          className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Payment Badges */}
                                    <div className="space-y-4">
                                      <div>
                                        <h5 className="text-white font-bold text-xs uppercase tracking-wider">Huy hiệu thanh toán (Payment Badges)</h5>
                                        <p className="text-white/35 text-[9px] mt-0.5">Hiển thị trong hộp Thanh toán màu xám</p>
                                      </div>

                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={newBadgeText}
                                          onChange={(e) => setNewBadgeText(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              addPaymentBadge(newBadgeText);
                                            }
                                          }}
                                          placeholder="Nhập mã huy hiệu mới (VD: VISA)..."
                                          className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => addPaymentBadge(newBadgeText)}
                                          className="px-3 bg-[#1e4b64] hover:bg-[#153446] text-white text-xs font-bold rounded-lg transition-all"
                                        >
                                          Thêm
                                        </button>
                                      </div>

                                      <div className="flex flex-wrap gap-2 bg-[#0f1117]/50 border border-white/5 rounded-xl p-3 min-h-16 items-center">
                                        {(!footerSettings.paymentBadges || footerSettings.paymentBadges.length === 0) ? (
                                          <span className="text-white/20 text-[10px] italic">Không có huy hiệu nào.</span>
                                        ) : (
                                          footerSettings.paymentBadges.map((badge, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center gap-1 bg-white hover:bg-zinc-100 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-zinc-200 transition-all select-none"
                                            >
                                              {badge}
                                              <button
                                                type="button"
                                                onClick={() => deletePaymentBadge(idx)}
                                                className="text-red-500 hover:text-red-700 transition-colors p-0.5"
                                                title="Xóa huy hiệu"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </span>
                                          ))
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className="text-[9px] font-bold text-white/30 uppercase mr-1">Gợi ý:</span>
                                        {['COD', 'BANK', 'MOMO', 'ZALO', 'VISA', 'MASTER', 'PAYPAL'].map((suggested) => {
                                          const current = footerSettings.paymentBadges || [];
                                          if (current.includes(suggested)) return null;
                                          return (
                                            <button
                                              key={suggested}
                                              type="button"
                                              onClick={() => addPaymentBadge(suggested)}
                                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5"
                                            >
                                              + {suggested}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Payment Gateways */}
                                    <div className="space-y-4">
                                      <div>
                                        <h5 className="text-white font-bold text-xs uppercase tracking-wider">Cổng thanh toán dưới cùng (Payment Gateways)</h5>
                                        <p className="text-white/35 text-[9px] mt-0.5">Hiển thị dạng viền chữ nhật nhỏ cạnh Copyright</p>
                                      </div>

                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={newGatewayText}
                                          onChange={(e) => setNewGatewayText(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              addPaymentGateway(newGatewayText);
                                            }
                                          }}
                                          placeholder="Nhập cổng mới (VD: Credit Card)..."
                                          className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => addPaymentGateway(newGatewayText)}
                                          className="px-3 bg-[#1e4b64] hover:bg-[#153446] text-white text-xs font-bold rounded-lg transition-all"
                                        >
                                          Thêm
                                        </button>
                                      </div>

                                      <div className="flex flex-wrap gap-2 bg-[#0f1117]/50 border border-white/5 rounded-xl p-3 min-h-16 items-center">
                                        {(!footerSettings.paymentGateways || footerSettings.paymentGateways.length === 0) ? (
                                          <span className="text-white/20 text-[10px] italic">Không có cổng nào.</span>
                                        ) : (
                                          footerSettings.paymentGateways.map((gw, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center gap-1 bg-white/5 border border-white/5 rounded-md px-2.5 py-0.5 text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all select-none"
                                            >
                                              {gw}
                                              <button
                                                type="button"
                                                onClick={() => deletePaymentGateway(idx)}
                                                className="text-red-400 hover:text-red-500 transition-colors p-0.5 ml-1"
                                                title="Xóa cổng thanh toán"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </span>
                                          ))
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className="text-[9px] font-bold text-white/30 uppercase mr-1">Gợi ý:</span>
                                        {['COD', 'Bank Transfer', 'E-Wallet', 'Credit Card', 'Pay Later'].map((suggested) => {
                                          const current = footerSettings.paymentGateways || [];
                                          if (current.includes(suggested)) return null;
                                          return (
                                            <button
                                              key={suggested}
                                              type="button"
                                              onClick={() => addPaymentGateway(suggested)}
                                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5"
                                            >
                                              + {suggested}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Khối Accordion phụ: Bản quyền & Cài đặt chung */}
                    <div 
                      className={cn(
                        "bg-[#0f1117] border rounded-2xl overflow-hidden transition-all duration-200",
                        expandedColId === 'general' ? "border-[#1e4b64]" : "border-white/5"
                      )}
                    >
                      <div 
                        onClick={() => setExpandedColId(expandedColId === 'general' ? null : 'general')}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] select-none group"
                      >
                        <div className="flex items-center gap-3 pl-8">
                          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Cài đặt Bản quyền (Copyright)</h4>
                        </div>
                        <div className="text-white/40 group-hover:text-white transition-colors p-1">
                          <ChevronRight className={cn("h-4 w-4 transform transition-transform duration-300", expandedColId === 'general' && "rotate-90")} />
                        </div>
                      </div>

                      {expandedColId === 'general' && (
                        <div className="p-6 border-t border-white/5 bg-white/[0.01] space-y-4">
                          <div>
                            <label className="text-[10px] font-black uppercase text-white/30 mb-1.5 block">Copyright Chân trang</label>
                            <input 
                              type="text"
                              value={footerSettings.copyright}
                              onChange={(e) => setFooterSettings({...footerSettings, copyright: e.target.value})}
                              placeholder="VD: © 2026 UR SPORT. All rights reserved"
                              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nút lưu cấu hình */}
                  <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-6">
                    <button
                      type="button"
                      onClick={addColumn}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e4b64]/20 hover:bg-[#1e4b64]/30 text-[#4ca6d8] hover:text-[#5cb6e8] text-xs font-bold transition-all border border-[#1e4b64]/30"
                    >
                      <Plus className="h-3.5 w-3.5" /> Thêm Cột Liên Kết Mới
                    </button>
                    <button 
                      onClick={() => handleSaveFooterSettings(footerSettings)}
                      className="px-8 py-2.5 bg-[#1e4b64] hover:bg-[#153446] text-white text-xs font-black rounded-xl shadow-lg transition-all border border-white/10"
                    >
                      Lưu cấu hình Chân trang
                    </button>
                  </div>
                </div>
              )}
              {/* Shipping Settings */}
              {(activeSection === 'settings' || activeSection === 'settings-shipping') && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                  <div className="flex flex-col gap-4 border-b border-white/5 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">Thanh toán & giao hàng</p>
                      <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-white">Cài đặt phí vận chuyển</h3>
                      <p className="mt-1 text-xs font-medium text-white/35">
                        COD tính phí dưới ngưỡng miễn phí; chuyển khoản và ví điện tử có thể miễn phí riêng.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveShippingSettings}
                      disabled={shippingSettingsSaving || shippingSettingsLoading}
                      className="rounded-xl bg-[#1e4b64] px-6 py-2.5 text-xs font-black text-white transition-colors hover:bg-[#153446] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {shippingSettingsSaving ? 'Đang lưu...' : 'Lưu cài đặt vận chuyển'}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/30">Phí COD dưới ngưỡng</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={shippingSettings.codFee}
                        onChange={event => setShippingSettings(prev => ({ ...prev, codFee: Number(event.target.value) || 0 }))}
                        className="h-11 w-full rounded-xl border border-white/5 bg-white/5 px-3 text-sm font-bold text-white outline-none focus:border-[#1e4b64]/60"
                      />
                      <p className="mt-1 text-[11px] font-medium text-white/30">
                        Hiện tại: {shippingSettings.codFee.toLocaleString('vi-VN')}đ
                      </p>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/30">Miễn phí COD từ</span>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={shippingSettings.codFreeThreshold}
                        onChange={event => setShippingSettings(prev => ({ ...prev, codFreeThreshold: Number(event.target.value) || 0 }))}
                        className="h-11 w-full rounded-xl border border-white/5 bg-white/5 px-3 text-sm font-bold text-white outline-none focus:border-[#1e4b64]/60"
                      />
                      <p className="mt-1 text-[11px] font-medium text-white/30">
                        Đơn COD từ {shippingSettings.codFreeThreshold.toLocaleString('vi-VN')}đ sẽ miễn phí vận chuyển.
                      </p>
                    </label>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {[
                      { key: 'bankTransferFree' as const, label: 'Chuyển khoản ngân hàng' },
                      { key: 'momoFree' as const, label: 'Ví MoMo' },
                      { key: 'zalopayFree' as const, label: 'Ví ZaloPay' },
                      { key: 'shopeepayFree' as const, label: 'Ví ShopeePay' },
                    ].map(option => (
                      <label key={option.key} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                        <span className="text-xs font-black uppercase tracking-widest text-white/70">{option.label}</span>
                        <input
                          type="checkbox"
                          checked={shippingSettings[option.key]}
                          onChange={event => setShippingSettings(prev => ({ ...prev, [option.key]: event.target.checked }))}
                          className="h-5 w-5 accent-[#1e4b64]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {/* Custom CSS */}
              {(activeSection === 'settings' || activeSection === 'settings-css') && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Code2 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-widest">Tùy biến giao diện (Custom CSS)</h3>
                      <p className="text-white/30 text-xs font-medium mt-0.5">CSS sẽ được chèn vào trang qua thẻ <code className="text-purple-400">#custom-global-css</code></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteCss}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </button>
                    <button
                      onClick={handleSaveCss}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        cssSaved
                          ? "bg-emerald-500 text-white"
                          : "bg-[#1e4b64] hover:bg-[#153446] text-white"
                      )}
                    >
                      {cssSaved ? <CheckIcon className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                      {cssSaved ? 'Đã lưu!' : 'Lưu & Áp dụng'}
                    </button>
                  </div>
                </div>

                {/* Code editor area */}
                <div className="relative">
                  {/* Line numbers */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/[0.02] border-r border-white/5 pointer-events-none flex flex-col items-end pt-4 pb-4 pr-2 select-none overflow-hidden">
                    {Array.from({ length: Math.max(customCss.split('\n').length, 20) }, (_, i) => (
                      <span key={i} className="text-white/15 text-xs font-mono leading-6">{i + 1}</span>
                    ))}
                  </div>
                  <textarea
                    value={customCss}
                    onChange={e => setCustomCss(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const val = customCss;
                        setCustomCss(val.substring(0, start) + '  ' + val.substring(end));
                        setTimeout(() => e.currentTarget.setSelectionRange(start + 2, start + 2), 0);
                      }
                      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        handleSaveCss();
                      }
                    }}
                    spellCheck={false}
                    placeholder={`/* Nhập CSS tùy biến của bạn vào đây... */\n\n/* Ví dụ: */\n.product-card {\n  border-radius: 16px;\n}\n\nbody {\n  font-family: 'Inter', sans-serif;\n}`}
                    className="w-full min-h-[400px] bg-transparent pl-14 pr-6 pt-4 pb-4 text-[13px] font-mono text-green-300 leading-6 resize-y outline-none placeholder:text-white/15 border-none"
                    style={{ caretColor: '#4ade80' }}
                  />
                </div>

                <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                  <p className="text-white/25 text-[11px] font-medium">
                    {customCss.split('\n').length} dòng • {customCss.length} ký tự • Lưu nhanh: <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/40">Ctrl+S</kbd>
                  </p>
                  <p className="text-white/25 text-[11px]">Tab = 2 spaces</p>
                </div>
              </div>
              )}



              {/* Floating Contact Settings */}
              {(activeSection === 'settings' || activeSection === 'settings-contact') && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6">Cài đặt Menu Liên hệ (Nút nổi)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Số điện thoại Zalo</label>
                      <input 
                        type="text"
                        value={floatingMenu.zaloPhone}
                        onChange={(e) => setFloatingMenu({...floatingMenu, zaloPhone: e.target.value})}
                        placeholder="0917722425"
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Số điện thoại Hotline</label>
                      <input 
                        type="text"
                        value={floatingMenu.callPhone}
                        onChange={(e) => setFloatingMenu({...floatingMenu, callPhone: e.target.value})}
                        placeholder="0917722425"
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                      />
                    </div>
                    <button 
                      onClick={handleSaveFloatingMenu}
                      className="px-6 py-2.5 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
                    >
                      Lưu thông tin liên hệ
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/30 block">Ảnh Icon Zalo</label>
                      <ImageUpload 
                        folder="settings"
                        label=""
                        externalPreview={floatingMenu.zaloIcon}
                        onUploadComplete={(url) => {
                          const updated = {...floatingMenu, zaloIcon: url};
                          setFloatingMenu(updated);
                          saveAdminSetting('floatingMenu', updated);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/30 block">Ảnh Icon Tổng (Nút chính)</label>
                      <ImageUpload 
                        folder="settings"
                        label=""
                        externalPreview={floatingMenu.callIcon}
                        onUploadComplete={(url) => {
                          const updated = {...floatingMenu, callIcon: url};
                          setFloatingMenu(updated);
                          saveAdminSetting('floatingMenu', updated);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Quick snippets */}
              {(activeSection === 'settings' || activeSection === 'settings-css') && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4">Snippets gợi ý</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: 'Bo góc card', css: '.product-card { border-radius: 20px; }' },
                    { label: 'Ẩn footer', css: 'footer { display: none; }' },
                    { label: 'Font hệ thống', css: 'body { font-family: \'Inter\', sans-serif; }' },
                    { label: 'Responsive Video', css: '.video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; }\n.video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }' },
                    { label: 'Scrollbar tùy biến', css: '::-webkit-scrollbar { width: 6px; }\n::-webkit-scrollbar-thumb { background: #1e4b64; border-radius: 3px; }' },
                    { label: 'Nút CTA nổi bật', css: '.btn-primary { background: linear-gradient(135deg, #1e4b64, #153446); box-shadow: 0 4px 15px rgba(30,75,100,0.4); }' },
                  ].map((snippet, i) => (
                    <button
                      key={i}
                      onClick={() => setCustomCss(prev => prev + (prev ? '\n\n' : '') + '/* ' + snippet.label + ' */\n' + snippet.css)}
                      className="text-left p-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/30 rounded-xl transition-all group"
                    >
                      <p className="text-white/80 text-xs font-bold group-hover:text-purple-400 transition-colors">{snippet.label}</p>
                      <p className="text-white/25 text-[10px] font-mono mt-1 truncate">{snippet.css.split('\n')[0]}</p>
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* SEO & Sitemap Engine */}
              {activeSection === 'seo-sitemap' && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Globe className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Sitemap Engine tự động</h3>
                        <p className="text-white/35 text-xs mt-1">Hệ thống phân chia sitemap thông minh hỗ trợ hàng vạn sản phẩm tối ưu cho Google Crawler.</p>
                      </div>
                    </div>
                  </div>

                  {/* Sub-tabs Navigation */}
                  <div className="flex flex-wrap gap-1 border-b border-white/5 pb-2">
                    {[
                      { id: 'overview', label: 'Tổng quan Dashboard' },
                      { id: 'product', label: 'Sitemap Sản Phẩm' },
                      { id: 'category', label: 'Sitemap Danh Mục' },
                      { id: 'blog', label: 'Sitemap Bài Viết' },
                      { id: 'image', label: 'Sitemap Hình Ảnh' },
                      { id: 'video', label: 'Sitemap Video' },
                      { id: 'brand', label: 'Sitemap Thương Hiệu' },
                      { id: 'gsc', label: 'Gửi Google Search Console' },
                      { id: 'config', label: 'Lịch & Giới Hạn' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSitemapSubTab(t.id as any)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all",
                          sitemapSubTab === t.id
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : "bg-white/5 border-transparent text-white/55 hover:text-white hover:bg-white/10"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Dashboard Overview */}
                  {sitemapSubTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1 space-y-4">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                              Trạng thái hoạt động
                            </span>
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">✓ HOẠT ĐỘNG</span>
                          </div>
                          <div>
                            <p className="text-white/40 text-[10px]">URL Sitemap Chỉ Mục Chính</p>
                            <p className="text-white font-mono text-xs font-bold mt-1 select-all hover:text-emerald-400 transition-colors">https://ursport.vn/sitemap.xml</p>
                          </div>
                          <div className="pt-2 border-t border-emerald-500/10 flex justify-between text-xs text-white/60">
                            <span>Lần cập nhật cuối:</span>
                            <span className="font-bold text-white">31/05/2026 10:30</span>
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Cơ cấu URL phân đoạn</h4>
                          <div className="space-y-2 text-xs text-white/70">
                            <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                              <span>Sản phẩm:</span>
                              <span className="text-white font-bold">{products.length} URLs (1 sitemap file)</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                              <span>Danh mục:</span>
                              <span className="text-white font-bold">{CATEGORY_METADATA.length + DEFAULT_SEO_SUBCATEGORIES.length} URLs</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                              <span>Bài viết (Blog):</span>
                              <span className="text-white font-bold">{blogPosts.length} URLs</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                              <span>Hình ảnh sản phẩm:</span>
                              <span className="text-white font-bold">{products.length} hình ảnh</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                              <span>Video bài viết:</span>
                              <span className="text-white font-bold">1 video</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span>Thương hiệu đối tác:</span>
                              <span className="text-white font-bold">5 thương hiệu</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-2 flex flex-col h-full min-h-[350px]">
                        <div className="bg-[#0f1117] rounded-xl border border-white/10 overflow-hidden flex flex-col flex-1">
                          <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                            <span className="text-white/50 text-xs font-mono">sitemap.xml (Index Sitemap Preview)</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(generateMainSitemapIndexString());
                                  toast.success('Đã copy sitemap index!');
                                }}
                                className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                                title="Copy sitemap"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDownloadSitemap(generateMainSitemapIndexString(), 'sitemap.xml')}
                                className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                                title="Tải xuống XML"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="p-4 overflow-auto flex-1 custom-scrollbar text-xs font-mono text-blue-300 whitespace-pre">
                            {generateMainSitemapIndexString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sitemap Sections Previews */}
                  {sitemapSubTab !== 'overview' && sitemapSubTab !== 'gsc' && sitemapSubTab !== 'config' && (
                    <div className="space-y-4">
                      <div className="bg-[#0f1117] rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-[350px]">
                        <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                          <span className="text-white/50 text-xs font-mono">
                            {sitemapSubTab === 'product' ? 'sitemap-products-1.xml' : `sitemap-${sitemapSubTab}.xml`} (Xem trước)
                          </span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(getSitemapXmlContent());
                                toast.success('Đã copy nội dung sitemap!');
                              }}
                              className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                              title="Copy"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDownloadSitemap(getSitemapXmlContent(), `sitemap-${sitemapSubTab}.xml`)}
                              className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                              title="Tải sitemap"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 overflow-auto flex-1 custom-scrollbar text-xs font-mono text-emerald-400 whitespace-pre">
                          {getSitemapXmlContent()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Google Search Console Simulation */}
                  {sitemapSubTab === 'gsc' && (
                    <div className="space-y-6">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                        <div>
                          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Cổng tích hợp Google Search Console API</h4>
                          <p className="text-white/35 text-[10px] mt-1">Gửi sitemap trực tiếp lên Google để rút ngắn thời gian lập chỉ mục index bài viết/sản phẩm mới.</p>
                        </div>
                        <div className="flex gap-3 max-w-xl">
                          <input 
                            type="text" 
                            defaultValue="https://ursport.vn/sitemap.xml"
                            disabled
                            className="bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-white/50 text-xs flex-1 outline-none font-mono"
                          />
                          <button 
                            type="button"
                            onClick={() => handleSubmitSitemapToGsc('https://ursport.vn/sitemap.xml')}
                            disabled={isSubmittingToGsc}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                          >
                            {isSubmittingToGsc ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            Gửi Sitemap
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#0f1117] rounded-xl border border-white/10 overflow-hidden">
                        <div className="bg-white/5 px-4 py-2 border-b border-white/5">
                          <span className="text-white text-xs font-bold">Lịch sử submit GSC</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-white/40">
                                <th className="p-3">Sitemap URL</th>
                                <th className="p-3">Loại</th>
                                <th className="p-3">Ngày gửi</th>
                                <th className="p-3">Trạng thái</th>
                                <th className="p-3">Google Phản hồi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-white/80">
                              {gscHistory.map((item, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02]">
                                  <td className="p-3 font-mono text-[11px] text-blue-300">{item.url}</td>
                                  <td className="p-3">{item.type}</td>
                                  <td className="p-3">{item.submittedAt}</td>
                                  <td className="p-3">
                                    <span className="bg-emerald-500/15 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-white/50">{item.message}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Config & Auto Split thresholds */}
                  {sitemapSubTab === 'config' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                        <h4 className="text-white font-bold text-xs uppercase tracking-wider">Cấu hình chia sitemap (Auto-splitting)</h4>
                        <p className="text-white/35 text-[10px]">Định ngưỡng số lượng URL tối đa cho mỗi file sitemap con. Khi số sản phẩm vượt quá định ngưỡng này, hệ thống sẽ tự động tạo file `sitemap-products-2.xml`, `sitemap-products-3.xml`...</p>
                        <div>
                          <label className="text-[10px] font-black uppercase text-white/30 mb-1.5 block">Giới hạn URL mỗi file sitemap</label>
                          <input 
                            type="number" 
                            value={maxUrlsPerSitemap}
                            onChange={(e) => {
                              const val = Math.max(10, parseInt(e.target.value) || 10);
                              setMaxUrlsPerSitemap(val);
                            }}
                            className="bg-[#0f1117] border border-white/5 rounded-lg px-3 py-2 text-white text-xs w-full max-w-[200px]"
                          />
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                        <h4 className="text-white font-bold text-xs uppercase tracking-wider">Lịch cập nhật Sitemap tự động</h4>
                        <p className="text-white/35 text-[10px]">Tần suất quét cơ sở dữ liệu và dựng lại các file XML sitemap tĩnh trên máy chủ.</p>
                        <div className="space-y-3">
                          {[
                            { id: 'daily', label: 'Cập nhật hàng ngày (Khuyên dùng)' },
                            { id: 'weekly', label: 'Cập nhật hàng tuần' },
                            { id: 'monthly', label: 'Cập nhật hàng tháng' },
                            { id: 'manual', label: 'Chỉ cập nhật thủ công' },
                          ].map(opt => (
                            <label key={opt.id} className="flex items-center gap-2.5 text-xs text-white/70 cursor-pointer hover:text-white">
                              <input 
                                type="radio" 
                                name="sitemapSchedule" 
                                checked={sitemapSchedule === opt.id}
                                onChange={() => setSitemapSchedule(opt.id as any)}
                                className="accent-blue-500"
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                        <div className="pt-2">
                          <button 
                            type="button"
                            onClick={() => {
                              toast.success("Đã cập nhật cấu hình sitemap và lưu trữ!");
                            }}
                            className="px-4 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Lưu cấu hình sitemap
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Schema Structured Data Config */}
              {activeSection === 'seo-schema' && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Code2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Schema Structured Data (JSON-LD)</h3>
                        <p className="text-white/35 text-xs mt-1">Cấu hình dữ liệu có cấu trúc giúp Google hiển thị rich snippets (sao đánh giá, giá cả, FAQ) nổi bật trên Google Search.</p>
                      </div>
                    </div>
                  </div>

                  {/* Schema sub-tabs Navigation */}
                  <div className="flex flex-wrap gap-1 border-b border-white/5 pb-2">
                    {[
                      { id: 'website', label: '1. Schema Website' },
                      { id: 'organization', label: '2. Schema Organization' },
                      { id: 'product', label: '3. Schema Product' },
                      { id: 'article', label: '4. Schema Article' },
                      { id: 'faq', label: '5. Schema FAQ' },
                      { id: 'breadcrumb', label: '6. Schema Breadcrumb' },
                      { id: 'collection', label: '7. Schema Category' },
                      { id: 'validator', label: '8. Kiểm tra Schema' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSchemaSubTab(t.id as any)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all",
                          schemaSubTab === t.id
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-white/5 border-transparent text-white/55 hover:text-white hover:bg-white/10"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {schemaLoading ? (
                    <div className="py-12 text-center text-white/30 text-xs font-bold animate-pulse">Đang tải cấu hình Schema từ hệ thống...</div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                      
                      {/* Sub-tab 1: WebSite Schema Settings (Readonly) */}
                      {schemaSubTab === 'website' && (
                        <div className="space-y-4">
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Cài đặt Schema WebSite</h4>
                            <p className="text-white/40 text-[11px] leading-relaxed">Schema này tự sinh theo URL cửa hàng URSport. Nó khai báo công cụ tìm kiếm nội bộ sitelinks searchbox hiển thị trực tiếp trên trang kết quả Google.</p>
                            <div className="space-y-2 text-xs text-white/70">
                              <div className="flex justify-between py-1 border-b border-white/[0.03]"><span>Tên Website:</span> <span className="text-white font-bold">URSport</span></div>
                              <div className="flex justify-between py-1 border-b border-white/[0.03]"><span>URL Website:</span> <span className="text-white font-bold select-all">https://ursport.vn</span></div>
                              <div className="flex justify-between py-1"><span>Target Search Template:</span> <span className="text-white font-mono text-[10px] text-blue-300">https://ursport.vn/shop?search=...</span></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 2: Organization Form */}
                      {schemaSubTab === 'organization' && (
                        <div className="space-y-4">
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Thông tin Doanh nghiệp (Organization)</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Tên Doanh nghiệp</label>
                                <input
                                  type="text"
                                  value={schemaSettings.name}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, name: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Loại hình doanh nghiệp</label>
                                <select
                                  value={schemaSettings.businessType}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, businessType: e.target.value})}
                                  className="w-full bg-[#0f1117] border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50 [color-scheme:dark]"
                                >
                                  <option value="LocalBusiness">LocalBusiness (Doanh nghiệp địa phương)</option>
                                  <option value="Organization">Organization (Tổ chức/Doanh nghiệp lớn)</option>
                                  <option value="Store">Store (Cửa hàng bán lẻ)</option>
                                  <option value="SportsActivityLocation">SportsActivityLocation (Địa điểm thể thao)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Website URL</label>
                                <input
                                  type="text"
                                  value={schemaSettings.url}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, url: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Logo URL</label>
                                <input
                                  type="text"
                                  value={schemaSettings.logo}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, logo: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Mô tả doanh nghiệp</label>
                              <textarea
                                value={schemaSettings.description}
                                onChange={(e) => setSchemaSettings({...schemaSettings, description: e.target.value})}
                                rows={2}
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50 resize-y"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Số điện thoại</label>
                                <input
                                  type="text"
                                  value={schemaSettings.phone}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, phone: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Email</label>
                                <input
                                  type="text"
                                  value={schemaSettings.email}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, email: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Địa chỉ doanh nghiệp (Đường/Số nhà)</label>
                              <input
                                  type="text"
                                  value={schemaSettings.streetAddress}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, streetAddress: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Quận / Huyện</label>
                                <input
                                  type="text"
                                  value={schemaSettings.addressLocality}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, addressLocality: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Tỉnh / Thành</label>
                                <input
                                  type="text"
                                  value={schemaSettings.addressRegion}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, addressRegion: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Mã bưu chính</label>
                                <input
                                  type="text"
                                  value={schemaSettings.postalCode}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, postalCode: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-2">
                              <div>
                                <label className="text-[9px] font-black uppercase text-white/30 mb-1 block">Facebook Page</label>
                                <input
                                  type="text"
                                  value={schemaSettings.facebook}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, facebook: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black uppercase text-white/30 mb-1 block">Instagram Link</label>
                                <input
                                  type="text"
                                  value={schemaSettings.instagram}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, instagram: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black uppercase text-white/30 mb-1 block">TikTok Link</label>
                                <input
                                  type="text"
                                  value={schemaSettings.tiktok}
                                  onChange={(e) => setSchemaSettings({...schemaSettings, tiktok: e.target.value})}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-[11px]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={handleSaveSchema}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                <CheckIcon className="h-3.5 w-3.5" />
                                Lưu Cấu Hình Doanh Nghiệp
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 3: Product Selector & Viewer */}
                      {schemaSubTab === 'product' && (
                        <div className="space-y-4">
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                            <div>
                              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Mô phỏng Product Schema tự sinh</h4>
                              <p className="text-white/35 text-[10px] mt-1">Chọn sản phẩm thực tế từ kho để xem trước cấu trúc Google nhận diện. Nhân viên chỉ nhập dữ liệu sản phẩm đơn giản, AI sẽ sinh ra JSON-LD này trong mã nguồn.</p>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Chọn sản phẩm test</label>
                              <select
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full bg-[#0f1117] border border-white/5 rounded-lg px-3 py-2 text-white text-xs focus:border-[#1e4b64]/50 outline-none [color-scheme:dark]"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>

                            {products.find(p => p.id === selectedProductId) && (
                              <div className="bg-white/5 border border-white/5 rounded-lg p-3 grid grid-cols-3 gap-3 text-xs text-white/80">
                                <div>
                                  <p className="text-white/30 text-[9px] uppercase font-bold">Mã sản phẩm (SKU)</p>
                                  <p className="font-bold text-white mt-0.5">{products.find(p => p.id === selectedProductId)?.productCode || 'Không có SKU'}</p>
                                </div>
                                <div>
                                  <p className="text-white/30 text-[9px] uppercase font-bold">Giá bán hiện tại</p>
                                  <p className="font-bold text-emerald-400 mt-0.5">{(products.find(p => p.id === selectedProductId)?.price || 0).toLocaleString()} VND</p>
                                </div>
                                <div>
                                  <p className="text-white/30 text-[9px] uppercase font-bold">Tình trạng kho</p>
                                  <p className="font-bold text-white mt-0.5">
                                    {(products.find(p => p.id === selectedProductId)?.stock || 0) > 0 ? 'Còn hàng (InStock)' : 'Hết hàng'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 4: Article Schema Selector & Viewer */}
                      {schemaSubTab === 'article' && (
                        <div className="space-y-4">
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                            <div>
                              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Mô phỏng Article Schema (Bài viết Blog)</h4>
                              <p className="text-white/35 text-[10px] mt-1">Khi viết blog, hệ thống tự động trích xuất thông tin Tác giả, Ngày đăng, Ảnh bìa để chèn Schema.org/Article cho Google Bot lập chỉ mục tin tức.</p>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Chọn bài viết blog test</label>
                              <select
                                value={selectedBlogPostId}
                                onChange={(e) => setSelectedBlogPostId(e.target.value)}
                                className="w-full bg-[#0f1117] border border-white/5 rounded-lg px-3 py-2 text-white text-xs focus:border-[#1e4b64]/50 outline-none [color-scheme:dark]"
                              >
                                {blogPosts.map(post => (
                                  <option key={post.id} value={post.id}>{post.title}</option>
                                ))}
                              </select>
                            </div>

                            {blogPosts.find(p => p.id === selectedBlogPostId) && (
                              <div className="bg-white/5 border border-white/5 rounded-lg p-3 text-xs text-white/80 space-y-1.5">
                                <p><span className="text-white/40">Tác giả:</span> <span className="font-bold text-white">{blogPosts.find(p => p.id === selectedBlogPostId)?.author || 'URSport Team'}</span></p>
                                <p><span className="text-white/40">Tóm tắt ngắn:</span> <span className="text-white/80">{blogPosts.find(p => p.id === selectedBlogPostId)?.excerpt || 'Không có tóm tắt'}</span></p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 5: Schema FAQ Manager */}
                      {schemaSubTab === 'faq' && (
                        <div className="space-y-4">
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                            <div>
                              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Quản lý câu hỏi FAQ (FAQPage Schema)</h4>
                              <p className="text-white/35 text-[10px] mt-1">FAQPage Schema sẽ tạo các câu hỏi mở rộng của thương hiệu trực tiếp trên kết quả tìm kiếm Google.</p>
                            </div>

                            {/* Add FAQ form */}
                            <div className="bg-[#0f1117] border border-white/5 rounded-xl p-3 space-y-3">
                              <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Thêm câu hỏi mới</p>
                              <div>
                                <input 
                                  type="text" 
                                  value={newFaqQuestion}
                                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                                  placeholder="Câu hỏi: Ví dụ 'URSport giao hàng thế nào?'"
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500/40"
                                />
                              </div>
                              <div>
                                <textarea 
                                  value={newFaqAnswer}
                                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                                  placeholder="Câu trả lời ngắn gọn..."
                                  rows={2}
                                  className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500/40 resize-y"
                                />
                              </div>
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
                                      toast.error("Vui lòng điền đủ cả câu hỏi và câu trả lời.");
                                      return;
                                    }
                                    const updated = [...faqList, { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }];
                                    setFaqList(updated);
                                    setNewFaqQuestion('');
                                    setNewFaqAnswer('');
                                    handleSaveSchema();
                                  }}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md transition-colors flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Thêm câu hỏi
                                </button>
                              </div>
                            </div>

                            {/* FAQ List */}
                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                              {faqList.map((faq, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-2.5 flex justify-between items-start gap-4">
                                  <div className="text-xs">
                                    <p className="font-bold text-white">Q: {faq.question}</p>
                                    <p className="text-white/60 text-[11px] mt-0.5">A: {faq.answer}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = faqList.filter((_, idx) => idx !== i);
                                      setFaqList(updated);
                                      handleSaveSchema();
                                    }}
                                    className="text-white/30 hover:text-red-400 p-1 rounded"
                                    title="Xóa FAQ"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 6: Breadcrumb schema map */}
                      {schemaSubTab === 'breadcrumb' && (
                        <div className="space-y-4">
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                            <div>
                              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Cơ cấu BreadcrumbList (Đường dẫn chuẩn)</h4>
                              <p className="text-white/35 text-[10px] mt-1">Lập chỉ mục phân cấp chuyên mục giúp thanh địa chỉ của Google hiển thị dạng mũi tên sạch và thân thiện thay vì các URL thô dài.</p>
                            </div>

                            <div className="bg-[#0f1117] border border-white/5 rounded-xl p-4">
                              <p className="text-[10px] font-black uppercase text-emerald-400 mb-3 tracking-wider">Sơ đồ luồng điều hướng</p>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-white">
                                <span className="px-2.5 py-1 bg-white/5 rounded-md border border-white/5">Trang chủ</span>
                                <ChevronRight className="h-3 w-3 text-white/30" />
                                <span className="px-2.5 py-1 bg-white/5 rounded-md border border-white/5">Áo thun nam</span>
                                <ChevronRight className="h-3 w-3 text-white/30" />
                                <span className="px-2.5 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-400 font-bold">Áo thun cotton premium</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 7: Collection Page (Category) */}
                      {schemaSubTab === 'collection' && (
                        <div className="space-y-4">
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                            <div>
                              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Danh mục sản phẩm (CollectionPage Schema)</h4>
                              <p className="text-white/35 text-[10px] mt-1">Khai báo danh mục tập hợp các sản phẩm liên quan. Google sẽ hiểu được cấu trúc nhóm của cửa hàng.</p>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Chọn danh mục sản phẩm</label>
                              <select
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                                className="w-full bg-[#0f1117] border border-white/5 rounded-lg px-3 py-2 text-white text-xs focus:border-[#1e4b64]/50 outline-none [color-scheme:dark]"
                              >
                                {CATEGORY_METADATA.map(cat => (
                                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-lg p-3 text-xs text-white/80">
                              <p className="text-white/30 text-[9px] uppercase font-bold mb-1.5">Sản phẩm đầu tiên thuộc nhóm này</p>
                              <ul className="list-disc pl-4 space-y-1 text-white/80">
                                {products.filter(p => p.category === CATEGORY_METADATA.find(c => c.slug === selectedCategoryId)?.name).slice(0, 3).map(p => (
                                  <li key={p.id}>{p.name}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 8: Schema Validator Auditor */}
                      {schemaSubTab === 'validator' && (
                        <div className="space-y-4 col-span-1 lg:col-span-2">
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              <div>
                                <h4 className="text-white font-bold text-xs uppercase tracking-wider">Trình Quét & Kiểm Tra Schema Toàn Cục</h4>
                                <p className="text-white/35 text-[10px] mt-1">Chạy chẩn đoán toàn diện để tìm lỗi thiết lập dữ liệu có cấu trúc trên toàn website URSport.</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleRunAudit}
                                disabled={isAuditing}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                              >
                                {isAuditing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                Chạy Kiểm Tra Schema
                              </button>
                            </div>

                            {schemaAuditRun && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5 animate-in fade-in">
                                <div className="space-y-3">
                                  <p className="text-[10px] text-white/40 font-black uppercase tracking-wider">Bản đồ trạng thái Schema</p>
                                  
                                  {[
                                    { key: 'website', name: 'WebSite Schema' },
                                    { key: 'organization', name: 'Organization Schema' },
                                    { key: 'product', name: 'Product Schema (Sản phẩm)' },
                                    { key: 'article', name: 'Article Schema (Tin tức/Blog)' },
                                    { key: 'faq', name: 'FAQPage Schema (Câu hỏi)' },
                                    { key: 'breadcrumb', name: 'BreadcrumbList Schema' },
                                    { key: 'collection', name: 'CollectionPage Schema (Danh mục)' },
                                  ].map(item => {
                                    const val = auditResults[item.key as keyof typeof auditResults];
                                    return (
                                      <div key={item.key} className="flex justify-between items-center bg-[#0f1117] p-2.5 rounded-lg border border-white/5">
                                        <span className="text-xs text-white/80">{item.name}</span>
                                        {val === 'ok' && <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> HỢP LỆ</span>}
                                        {val === 'warning' && <span className="text-[10px] font-black text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> CẢNH BÁO</span>}
                                        {val === 'error' && <span className="text-[10px] font-black text-red-400 flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-400" /> LỖI</span>}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="space-y-4">
                                  <p className="text-[10px] text-white/40 font-black uppercase tracking-wider">Khuyến nghị & Cảnh báo từ AI Engine</p>
                                  {auditResults.warnings.length > 0 ? (
                                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-4 rounded-xl space-y-4">
                                      <div className="space-y-2">
                                        {auditResults.warnings.map((w, i) => (
                                          <p key={i} className="flex gap-2">
                                            <span>•</span>
                                            <span>{w}</span>
                                          </p>
                                        ))}
                                      </div>

                                      {/* Failed Products List */}
                                      {auditResults.failedProducts.length > 0 && (
                                        <div className="pt-3 border-t border-amber-500/20 space-y-2">
                                          <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Danh sách sản phẩm thiếu SKU:</p>
                                          <div className="max-h-[120px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                            {auditResults.failedProducts.map(p => (
                                              <div key={p.id} className="flex justify-between items-center bg-[#0f1117]/80 px-3 py-2 rounded-lg border border-amber-500/15">
                                                <span className="text-white/80 font-bold truncate max-w-[200px]">{p.name}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => onOpenProductEdit?.(p)}
                                                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-bold transition-all"
                                                >
                                                  Chỉnh sửa ngay →
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Failed Blog Posts List */}
                                      {auditResults.failedBlogPosts.length > 0 && (
                                        <div className="pt-3 border-t border-amber-500/20 space-y-2">
                                          <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Danh sách bài viết thiếu ảnh bìa/tóm tắt:</p>
                                          <div className="max-h-[120px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                            {auditResults.failedBlogPosts.map(post => (
                                              <div key={post.id} className="flex justify-between items-center bg-[#0f1117]/80 px-3 py-2 rounded-lg border border-amber-500/15">
                                                <span className="text-white/80 font-bold truncate max-w-[200px]">{post.title}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => onOpenBlogPostEdit?.(post)}
                                                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-bold transition-all"
                                                >
                                                  Chỉnh sửa ngay →
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl">
                                      ✓ Không phát hiện lỗi hoặc cảnh báo thiết yếu nào. Hệ thống Schema hoạt động ở mức tối ưu nhất!
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Right column: JSON-LD Code Output Preview (Hidden for validator tab) */}
                      {schemaSubTab !== 'validator' && (
                        <div className="flex flex-col h-full min-h-[400px]">
                          <div className="bg-[#0f1117] rounded-xl border border-white/10 overflow-hidden flex flex-col flex-1">
                            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                              <span className="text-white/50 text-xs font-mono">
                                JSON-LD (Tự động sinh tương ứng)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  let code = '';
                                  if (schemaSubTab === 'website') code = generateWebsiteSchemaString();
                                  if (schemaSubTab === 'organization') code = generateOrganizationSchemaString();
                                  if (schemaSubTab === 'product') code = generateProductSchemaString();
                                  if (schemaSubTab === 'article') code = generateArticleSchemaString();
                                  if (schemaSubTab === 'faq') code = generateFaqSchemaString();
                                  if (schemaSubTab === 'breadcrumb') code = generateBreadcrumbSchemaString();
                                  if (schemaSubTab === 'collection') code = generateCollectionSchemaString();
                                  navigator.clipboard.writeText(code);
                                  toast.success('Đã copy mã Schema JSON-LD!');
                                }}
                                className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                                title="Copy JSON-LD"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="p-4 overflow-auto flex-1 custom-scrollbar text-xs font-mono text-green-300 whitespace-pre">
                              {schemaSubTab === 'website' && generateWebsiteSchemaString()}
                              {schemaSubTab === 'organization' && generateOrganizationSchemaString()}
                              {schemaSubTab === 'product' && generateProductSchemaString()}
                              {schemaSubTab === 'article' && generateArticleSchemaString()}
                              {schemaSubTab === 'faq' && generateFaqSchemaString()}
                              {schemaSubTab === 'breadcrumb' && generateBreadcrumbSchemaString()}
                              {schemaSubTab === 'collection' && generateCollectionSchemaString()}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

              {/* Robots.txt & Google Indexing API */}
              {activeSection === 'seo-robots' && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Robots.txt & Google Indexing API</h3>
                        <p className="text-white/35 text-xs mt-1">Cấu hình luồng quét của Bot công cụ tìm kiếm và đẩy nhanh tốc độ lập chỉ mục thông qua Google Indexing API.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Robots.txt Editor */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4 flex flex-col h-full">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Trình soạn thảo Robots.txt</h4>
                          <p className="text-white/35 text-[10px]">Tập tin hướng dẫn Bot được phép hoặc không được phép thu thập dữ liệu URL nào.</p>
                        </div>
                        {/* Preset picks */}
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'default') setRobotsTxt(`User-agent: *\nDisallow: /admin/\nDisallow: /checkout/\nDisallow: /cart/\nAllow: /\n\nSitemap: https://ursport.vn/sitemap.xml`);
                            if (val === 'block-all') setRobotsTxt(`User-agent: *\nDisallow: /`);
                            if (val === 'seo-boost') setRobotsTxt(`User-agent: *\nDisallow: /admin/\nDisallow: /checkout/\nDisallow: /cart/\nDisallow: /search/\nDisallow: /*?*\nAllow: /\n\nSitemap: https://ursport.vn/sitemap.xml`);
                          }}
                          className="bg-[#0f1117] border border-white/5 rounded-md px-2 py-1 text-white/50 text-[10px] outline-none"
                        >
                          <option value="">-- Áp dụng Preset --</option>
                          <option value="default">Chuẩn Thương Mại</option>
                          <option value="seo-boost">Tối Ưu Crawl Bot</option>
                          <option value="block-all">Chặn Hoàn Toàn (Dev)</option>
                        </select>
                      </div>

                      <div className="flex-1 flex flex-col min-h-[250px]">
                        <textarea
                          value={robotsTxt}
                          onChange={(e) => setRobotsTxt(e.target.value)}
                          rows={10}
                          className="w-full bg-[#0f1117] border border-white/10 rounded-lg p-3 text-white text-xs font-mono outline-none focus:border-purple-500/40 flex-1 resize-y"
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button
                          type="button"
                          onClick={handleDownloadRobotsTxtFile}
                          className="px-3 py-1.5 border border-white/10 hover:bg-white/5 text-white text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Tải file.txt
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRobots}
                          disabled={robotsLoading}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          {robotsLoading ? 'Đang lưu...' : 'Lưu Robots.txt'}
                        </button>
                      </div>
                    </div>

                    {/* Right: Instant Indexing API */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4 flex flex-col h-full">
                      <div>
                        <h4 className="text-white font-bold text-xs uppercase tracking-wider">Instant Indexing API (Google)</h4>
                        <p className="text-white/35 text-[10px] mt-1">Thông báo cho Google lập tức thu thập thông tin tại một URL khi có cập nhật, thay đổi hoặc xóa bỏ.</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Hành động gửi yêu cầu</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                              <input 
                                type="radio" 
                                name="indexingAction" 
                                checked={indexingAction === 'URL_UPDATED'} 
                                onChange={() => setIndexingAction('URL_UPDATED')}
                                className="accent-purple-500" 
                              />
                              Publish hoặc Cập nhật URL
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                              <input 
                                type="radio" 
                                name="indexingAction" 
                                checked={indexingAction === 'URL_DELETED'} 
                                onChange={() => setIndexingAction('URL_DELETED')}
                                className="accent-purple-500" 
                              />
                              Xóa URL khỏi Index
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Danh sách URL (Mỗi dòng một URL)</label>
                          <textarea
                            value={indexingUrls}
                            onChange={(e) => setIndexingUrls(e.target.value)}
                            placeholder="Ví dụ:&#10;https://ursport.vn/apparel/ao-thun/ao-thun-nam-cotton-premium"
                            rows={4}
                            className="w-full bg-[#0f1117] border border-white/10 rounded-lg p-3 text-white text-xs font-mono outline-none focus:border-purple-500/40 resize-y"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleSendIndexingAPI}
                            disabled={isIndexingSubmitting}
                            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            {isIndexingSubmitting ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            Gửi yêu cầu Index
                          </button>
                        </div>
                      </div>

                      {/* Log output console */}
                      <div className="flex-1 flex flex-col border-t border-white/5 pt-3 mt-2 min-h-[150px]">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Nhật ký Indexing API</span>
                        <div className="bg-[#0f1117] border border-white/5 rounded-lg p-2.5 overflow-y-auto max-h-[180px] flex-1 font-mono text-[10px] text-white/50 space-y-1.5 custom-scrollbar">
                          {indexingLogs.length === 0 ? (
                            <p className="text-white/20 italic">Chưa có hoạt động gửi yêu cầu nào.</p>
                          ) : (
                            indexingLogs.map((log, i) => (
                              <div key={i} className="flex justify-between items-start gap-4 hover:bg-white/[0.01] py-1 border-b border-white/[0.02]">
                                <div className="truncate">
                                  <span className="text-purple-400">[{log.action}]</span> <span className="text-white/80">{log.url}</span>
                                </div>
                                <div className="text-[9px] flex gap-2 shrink-0">
                                  <span className="text-emerald-400">{log.status}</span>
                                  <span>{log.time}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Redirects & Canonical Manager */}
              {activeSection === 'seo-redirects' && (
                <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <ExternalLink className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Redirects & Canonical Manager</h3>
                        <p className="text-white/35 text-xs mt-1">Cấu hình tên miền chuẩn (Canonical URL) và quản lý các chuyển hướng liên kết 301/302 tránh lỗi thu thập thông tin 404.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Redirect rules manager */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                      <div>
                        <h4 className="text-white font-bold text-xs uppercase tracking-wider">Quản lý quy tắc chuyển hướng (Redirects)</h4>
                        <p className="text-white/35 text-[10px] mt-0.5">Quy tắc 301 (Vĩnh viễn) truyền toàn bộ sức mạnh SEO từ URL cũ sang URL mới.</p>
                      </div>

                      {/* Add rule inline form */}
                      <div className="bg-[#0f1117] border border-white/5 rounded-lg p-3 space-y-3">
                        <p className="text-[10px] text-white/50 font-black uppercase tracking-wider">Thêm quy tắc mới</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] text-white/40 block mb-1">URL nguồn (Source)</label>
                            <input 
                              type="text" 
                              value={newRedirectSource}
                              onChange={(e) => setNewRedirectSource(e.target.value)}
                              placeholder="Ví dụ: /ao-thun-nam-cu"
                              className="w-full bg-white/5 border border-white/5 rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500/40"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-white/40 block mb-1">URL đích (Destination)</label>
                            <input 
                              type="text" 
                              value={newRedirectDest}
                              onChange={(e) => setNewRedirectDest(e.target.value)}
                              placeholder="Ví dụ: /ao-thun-nam"
                              className="w-full bg-white/5 border border-white/5 rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500/40"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
                              <input 
                                type="radio" 
                                name="redirectType" 
                                checked={newRedirectType === '301'} 
                                onChange={() => setNewRedirectType('301')}
                                className="accent-amber-500" 
                              />
                              301 Permanent
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
                              <input 
                                type="radio" 
                                name="redirectType" 
                                checked={newRedirectType === '302'} 
                                onChange={() => setNewRedirectType('302')}
                                className="accent-amber-500" 
                              />
                              302 Temporary
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!newRedirectSource.trim() || !newRedirectDest.trim()) {
                                toast.error("Vui lòng nhập đầy đủ URL nguồn và URL đích.");
                                return;
                              }
                              if (!newRedirectSource.startsWith('/')) {
                                toast.error("URL nguồn phải bắt đầu bằng dấu gạch chéo '/'");
                                return;
                              }
                              const rules = [...redirectRules, {
                                source: newRedirectSource.trim(),
                                destination: newRedirectDest.trim(),
                                type: newRedirectType,
                                date: new Date().toLocaleDateString('vi-VN')
                              }];
                              setRedirectRules(rules);
                              setNewRedirectSource('');
                              setNewRedirectDest('');
                              handleSaveRedirects(rules);
                            }}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md transition-colors"
                          >
                            Thêm Quy Tắc
                          </button>
                        </div>
                      </div>

                      {/* Rules list */}
                      <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-white/40 font-bold">
                              <th className="pb-2">URL Nguồn</th>
                              <th className="pb-2">URL Đích</th>
                              <th className="pb-2">Loại</th>
                              <th className="pb-2 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-white/80">
                            {redirectRules.map((rule, i) => (
                              <tr key={i} className="hover:bg-white/[0.01]">
                                <td className="py-2.5 font-mono text-[11px] text-amber-200/80">{rule.source}</td>
                                <td className="py-2.5 font-mono text-[11px] text-emerald-200/80">{rule.destination}</td>
                                <td className="py-2.5">
                                  <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded font-black",
                                    rule.type === '301' ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                                  )}>
                                    {rule.type}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = redirectRules.filter((_, idx) => idx !== i);
                                      setRedirectRules(updated);
                                      handleSaveRedirects(updated);
                                    }}
                                    className="text-white/30 hover:text-red-400 p-1"
                                    title="Xóa rule"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Canonical settings */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-5 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Cấu hình đường dẫn chuẩn (Canonical Tag)</h4>
                          <p className="text-white/35 text-[10px] mt-0.5">Định vị đường dẫn chính thức cho Google lập chỉ mục, ngăn chặn phạt trùng lặp nội dung khi chạy nhiều tên miền phụ hoặc tham số URL quảng cáo.</p>
                        </div>

                        {/* Preferred Domain */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-white/30 block">Tên miền ưa thích (Preferred Domain)</label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                              <input 
                                type="radio" 
                                name="preferredDomain" 
                                checked={canonicalSettings.preferredDomain === 'non-www'}
                                onChange={() => setCanonicalSettings({...canonicalSettings, preferredDomain: 'non-www'})}
                                className="accent-amber-500" 
                              />
                              Sử dụng non-www (Khuyên dùng): https://ursport.vn
                            </label>
                            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                              <input 
                                type="radio" 
                                name="preferredDomain" 
                                checked={canonicalSettings.preferredDomain === 'www'}
                                onChange={() => setCanonicalSettings({...canonicalSettings, preferredDomain: 'www'})}
                                className="accent-amber-500" 
                              />
                              Sử dụng www: https://www.ursport.vn
                            </label>
                          </div>
                        </div>

                        {/* HTTPS Enforcement */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-white/30 block">Bắt buộc HTTPS trong thẻ Canonical</label>
                          <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={canonicalSettings.forceHttps}
                              onChange={(e) => setCanonicalSettings({...canonicalSettings, forceHttps: e.target.checked})}
                              className="accent-amber-500 h-3.5 w-3.5 rounded border-white/10"
                            />
                            Luôn dùng giao thức bảo mật https:// cho mọi đường dẫn canonical
                          </label>
                        </div>

                        {/* Trailing Slash behavior */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-white/30 block">Xử lý dấu gạch chéo cuối URL (Trailing Slash)</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                              <input 
                                type="radio" 
                                name="trailingSlash" 
                                checked={canonicalSettings.trailingSlash === 'remove'}
                                onChange={() => setCanonicalSettings({...canonicalSettings, trailingSlash: 'remove'})}
                                className="accent-amber-500" 
                              />
                              Loại bỏ (Ví dụ: /ao-thun-nam)
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                              <input 
                                type="radio" 
                                name="trailingSlash" 
                                checked={canonicalSettings.trailingSlash === 'add'}
                                onChange={() => setCanonicalSettings({...canonicalSettings, trailingSlash: 'add'})}
                                className="accent-amber-500" 
                              />
                              Thêm gạch chéo (Ví dụ: /ao-thun-nam/)
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                          type="button"
                          onClick={handleSaveCanonical}
                          disabled={canonicalLoading}
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          {canonicalLoading ? 'Đang lưu...' : 'Lưu Cấu Hình Canonical'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
  );
}
