import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { BadgePercent, Edit2, Eye, EyeOff, Flame, GripVertical, LayoutTemplate, Newspaper, Package, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { CATEGORY_METADATA } from '../data';
import {
  getNavigationSubcategories,
  isSameCategoryLabel,
  type NavigationItem,
} from '../lib/categoryConfig';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ImageUpload } from './ImageUpload';
import type { BannerItem } from '../types/admin';
import type { BlogPost, Product } from '../types';
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  getHomepageSectionLabel,
  HOMEPAGE_SECTION_TYPES,
  isLocalhost,
  mergeHomepageSections,
  normalizeHomepageSection,
  readLocalHomepageBanners,
  readLocalHomepageMobileBanners,
  readLocalHomepageSections,
  writeLocalHomepageBanners,
  writeLocalHomepageMobileBanners,
  writeLocalHomepageSections,
  type HomepageSectionConfig,
  type HomepageSectionType,
} from '../lib/homepageConfig';

type HomepageConfigManagerProps = {
  blogPosts?: BlogPost[];
  products?: Product[];
  navigation?: NavigationItem[];
};

type ReadyBlockTemplate = {
  id: string;
  type: HomepageSectionType;
  name: string;
  description: string;
  settings?: HomepageSectionConfig['settings'];
  content?: string;
};

const READY_BLOCK_TEMPLATES: ReadyBlockTemplate[] = [
  {
    id: 'custom-products',
    type: 'custom',
    name: 'Sản phẩm mới',
    description: 'Danh sách sản phẩm tùy chỉnh theo danh mục hoặc chọn thủ công.',
    settings: { customLayout: 'products', productMode: 'category' }
  },
  {
    id: 'flashsale',
    type: 'flashsale',
    name: 'Flash Sale',
    description: 'Khối ưu đãi nhanh lấy dữ liệu từ phần Flash Sale.'
  },
  {
    id: 'trust-badges',
    type: 'trust-badges',
    name: 'Cam kết dịch vụ',
    description: 'Miễn phí vận chuyển, thanh toán an toàn, đổi trả và hotline.'
  },
  {
    id: 'footer',
    type: 'footer',
    name: 'Chân trang',
    description: 'Thông tin liên hệ, danh mục, mạng xã hội và thanh toán.'
  },
  {
    id: 'bestseller',
    type: 'bestseller',
    name: 'Sản phẩm bán chạy',
    description: 'Tự lấy sản phẩm đang được đánh dấu bán chạy.'
  },
  {
    id: 'news',
    type: 'news',
    name: 'Tin tức',
    description: 'Hiển thị bài viết mới nhất hoặc tự chọn bài viết.'
  },
  {
    id: 'promo',
    type: 'promo',
    name: 'Mã giảm giá',
    description: 'Hiển thị voucher đang bật trên storefront.'
  },
  {
    id: 'custom-html',
    type: 'custom',
    name: 'Nội dung HTML',
    description: 'Một block trống để nhập HTML hoặc nội dung ngắn.',
    settings: { customLayout: 'html' },
    content: ''
  }
];

const readyBlockIcons: Partial<Record<HomepageSectionType | ReadyBlockTemplate['id'], typeof LayoutTemplate>> = {
  'custom-products': Package,
  custom: LayoutTemplate,
  flashsale: Flame,
  'trust-badges': ShieldCheck,
  footer: LayoutTemplate,
  bestseller: Package,
  news: Newspaper,
  promo: BadgePercent,
  'custom-html': LayoutTemplate
};

export function HomepageConfigManager({ blogPosts = [], products = [], navigation = [] }: HomepageConfigManagerProps) {
  const { isAdmin, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<HomepageSectionConfig[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [newSectionType, setNewSectionType] = useState<HomepageSectionType>('custom');
  const [newSectionName, setNewSectionName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [mobileBanners, setMobileBanners] = useState<BannerItem[]>([]);
  const [activeBannerTab, setActiveBannerTab] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBanners, setSavingBanners] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadSections = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'settings', 'homepage'));
        const data = snap.exists() ? snap.data() : null;
        const localSections = readLocalHomepageSections();
        const next = localSections || mergeHomepageSections((data?.sections || DEFAULT_HOMEPAGE_SECTIONS) as HomepageSectionConfig[]);
        if (mounted) setSections(next);
      } catch (error) {
        console.error('Failed to load homepage config:', error);
        const localSections = readLocalHomepageSections();
        if (mounted) setSections(localSections || mergeHomepageSections(DEFAULT_HOMEPAGE_SECTIONS));
        if (!localSections) toast.error('Không thể tải cấu hình trang chủ');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSections();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadBanners = async () => {
      try {
        const localBanners = readLocalHomepageBanners();
        const localMobileBanners = readLocalHomepageMobileBanners();
        if (localBanners?.length) {
          if (mounted) setBanners(localBanners);
        }
        if (localMobileBanners?.length) {
          if (mounted) setMobileBanners(localMobileBanners);
        }

        if (localBanners?.length && localMobileBanners?.length) {
          return;
        }

        const snap = await getDoc(doc(db, 'settings', 'banners'));
        if (snap.exists()) {
          const data = snap.data();
          const items = Array.isArray(data.items) ? data.items : [];
          const mobileItems = Array.isArray(data.mobileItems) ? data.mobileItems : [];
          if (mounted) {
            if (!localBanners?.length) setBanners(items);
            if (!localMobileBanners?.length) setMobileBanners(mobileItems);
          }
        }
      } catch (error) {
        console.error('Failed to load homepage banners:', error);
        const localBanners = readLocalHomepageBanners();
        const localMobileBanners = readLocalHomepageMobileBanners();
        if (mounted) {
          setBanners(localBanners || []);
          setMobileBanners(localMobileBanners || []);
        }
      }
    };

    loadBanners();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDragStart = (event: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    const from = dragIndexRef.current;
    if (from == null || from === index) return;

    setSections(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
  };

  const updateSection = (index: number, patch: Partial<HomepageSectionConfig>) => {
    setSections(prev => prev.map((section, itemIndex) => itemIndex === index ? { ...section, ...patch } : section));
  };

  const updateSectionSettings = (index: number, settings: NonNullable<HomepageSectionConfig['settings']>) => {
    setSections(prev => prev.map((section, itemIndex) => (
      itemIndex === index
        ? { ...section, settings: { ...(section.settings || {}), ...settings } }
        : section
    )));
  };

  const applyReadyBlock = (index: number, template: ReadyBlockTemplate) => {
    updateSection(index, {
      id: `${template.id}-${Date.now()}`,
      type: template.type,
      name: template.name,
      content: template.content || '',
      settings: template.settings || {}
    });
  };

  const handleReadyBlockDragStart = (event: React.DragEvent, template: ReadyBlockTemplate) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-homepage-block', template.id);
  };

  const handleReadyBlockDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    const templateId = event.dataTransfer.getData('application/x-homepage-block');
    const template = READY_BLOCK_TEMPLATES.find(item => item.id === templateId);
    if (!template) return;
    applyReadyBlock(index, template);
  };

  const subcategoryLinks = getNavigationSubcategories(navigation);
  const productCategoryGroups = CATEGORY_METADATA.map(category => ({
    ...category,
    children: subcategoryLinks.filter(child => isSameCategoryLabel(child.parentLabel, category.name))
  }));

  const addSection = () => {
    const type = newSectionType;
    setSections(prev => [
      ...prev,
      {
        id: `${type}-${Date.now()}`,
        type,
        name: newSectionName.trim() || getHomepageSectionLabel(type),
        enabled: true,
        content: ''
      }
    ]);
    setEditingIndex(sections.length);
    setNewSectionName('');
  };

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    setEditingIndex(null);
  };

  const saveSections = async () => {
    if (!isAdmin) {
      toast.error('Bạn cần quyền admin để lưu cấu hình trang chủ.');
      return false;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'homepage'), {
        sections: sections.map(normalizeHomepageSection),
        updatedAt: serverTimestamp()
      }, { merge: true });
      writeLocalHomepageSections(sections);
      toast.success('Đã lưu cấu hình trang chủ');
      return true;
    } catch (error) {
      console.error('Error saving homepage config:', error);
      if (isLocalhost()) {
        writeLocalHomepageSections(sections);
        toast.success('Đã lưu cấu hình trang chủ trên local');
        return true;
      } else {
        toast.error('Lưu cấu hình trang chủ thất bại');
        return false;
      }
    } finally {
      setSaving(false);
    }
  };

  const saveSectionAndClose = async () => {
    const saved = await saveSections();
    if (saved) setEditingIndex(null);
  };

  const updateBanner = (index: number, patch: Partial<BannerItem>) => {
    if (activeBannerTab === 'mobile') {
      setMobileBanners(prev => prev.map((banner, itemIndex) => itemIndex === index ? { ...banner, ...patch } : banner));
    } else {
      setBanners(prev => prev.map((banner, itemIndex) => itemIndex === index ? { ...banner, ...patch } : banner));
    }
  };

  const addBanner = () => {
    const newBanner: BannerItem = {
      id: Date.now(),
      image: '',
      title: activeBannerTab === 'mobile' ? 'Banner mobile mới' : 'Banner mới',
      subtitle: '',
      link: ''
    };
    if (activeBannerTab === 'mobile') {
      setMobileBanners(prev => [...prev, newBanner]);
    } else {
      setBanners(prev => [...prev, newBanner]);
    }
  };

  const removeBanner = (index: number) => {
    if (activeBannerTab === 'mobile') {
      setMobileBanners(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    } else {
      setBanners(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    }
  };

  const saveBanners = async () => {
    const nextBanners = banners.map((banner, index) => ({
      ...banner,
      id: banner.id || `${Date.now()}-${index}`,
      image: banner.image || '',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || ''
    }));

    const nextMobileBanners = mobileBanners.map((banner, index) => ({
      ...banner,
      id: banner.id || `${Date.now()}-${index}-m`,
      image: banner.image || '',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || ''
    }));

    setSavingBanners(true);
    try {
      await setDoc(doc(db, 'settings', 'banners'), {
        items: nextBanners,
        mobileItems: nextMobileBanners,
        updatedAt: serverTimestamp()
      }, { merge: true });
      writeLocalHomepageBanners(nextBanners);
      writeLocalHomepageMobileBanners(nextMobileBanners);
      toast.success('Đã lưu banner trang chủ');
    } catch (error) {
      console.error('Error saving homepage banners:', error);
      if (isLocalhost()) {
        writeLocalHomepageBanners(nextBanners);
        writeLocalHomepageMobileBanners(nextMobileBanners);
        toast.success('Đã lưu banner trang chủ trên local');
      } else {
        toast.error('Lưu banner thất bại');
      }
    } finally {
      setSavingBanners(false);
    }
  };

  const renderSectionEditor = (section: HomepageSectionConfig, index: number) => {
    const relatedAction: Partial<Record<HomepageSectionType, { title: string; body: string }>> = {
      promo: {
        title: 'Mã giảm giá',
        body: 'Block này lấy danh sách mã đang bật trong mục Marketing & Khuyến mãi > Mã giảm giá.'
      },
      recommend: {
        title: 'Gợi ý dành riêng cho bạn',
        body: 'Block này tự tính từ giỏ hàng, sản phẩm đã xem và yêu thích của khách.'
      },
      flashsale: {
        title: 'Flash Sale',
        body: 'Block này lấy cấu hình sản phẩm, giá sale và thời gian trong mục Marketing & Khuyến mãi > Flash Sale.'
      },
      bestseller: {
        title: 'Sản phẩm bán chạy',
        body: 'Block này lấy các sản phẩm đang được đánh dấu bán chạy trong quản lý sản phẩm.'
      },
      'sport-products': {
        title: 'Áo thể thao nổi bật',
        body: 'Block này tự lấy 6 sản phẩm thuộc danh mục Áo thun thể thao nam.'
      },
      'polo-products': {
        title: 'Bộ sưu tập Áo Polo Nam',
        body: 'Block này tự lấy 6 sản phẩm thuộc danh mục Áo polo nam.'
      },
      'tshirt-products': {
        title: 'Áo Thun Nam Thời Trang',
        body: 'Block này tự lấy 6 sản phẩm thuộc danh mục Áo thun nam.'
      },
      news: {
        title: 'UR NEWS',
        body: 'Chọn tự động 5 bài mới nhất hoặc tự chọn 5 bài viết chính để hiển thị.'
      },
      'trust-badges': {
        title: 'Cam kết dịch vụ',
        body: 'Block này hiển thị các cam kết miễn phí vận chuyển, thanh toán an toàn, đổi trả 30 ngày và hotline hỗ trợ.'
      },
      footer: {
        title: 'Chân trang',
        body: 'Block chân trang dùng cấu hình menu, liên hệ và chính sách hiện có của website.'
      }
    };

    return (
      <div className="space-y-4 border-t border-white/5 p-4">
        <div>
          <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Tên block</label>
          <input
            value={section.name}
            onChange={event => updateSection(index, { name: event.target.value })}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none"
          />
        </div>

        {section.type === 'hero' && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">Banner trang chủ</p>
                <p className="mt-1 text-xs font-semibold text-white/35">Thêm nhiều banner để hero tự chạy slide.</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={addBanner} className="gap-2 rounded-xl bg-white/10 text-white hover:bg-white/15">
                  <Plus className="h-4 w-4" />
                  Thêm banner
                </Button>
                <Button type="button" onClick={saveBanners} disabled={savingBanners} className="gap-2 rounded-xl bg-[#1e4b64] text-white hover:bg-[#153446]">
                  <Save className="h-4 w-4" />
                  {savingBanners ? 'Đang lưu...' : 'Lưu banner'}
                </Button>
              </div>
            </div>

            {/* Viewport tabs for Banners */}
            <div className="flex gap-2 border-b border-white/5 pb-2 mb-2">
              <button
                type="button"
                onClick={() => setActiveBannerTab('desktop')}
                className={cn(
                  "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                  activeBannerTab === 'desktop'
                    ? "bg-[#1e4b64] text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                )}
              >
                Banner máy tính ({banners.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveBannerTab('mobile')}
                className={cn(
                  "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                  activeBannerTab === 'mobile'
                    ? "bg-[#1e4b64] text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                )}
              >
                Banner điện thoại ({mobileBanners.length})
              </button>
            </div>

            {(activeBannerTab === 'mobile' ? mobileBanners : banners).length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm font-bold text-white/35">
                Chưa có banner {activeBannerTab === 'mobile' ? 'mobile' : 'máy tính'}. Bấm Thêm banner để tạo banner đầu tiên.
              </div>
            ) : (
              <div className="space-y-4">
                {(activeBannerTab === 'mobile' ? mobileBanners : banners).map((banner, bannerIndex) => (
                  <div key={banner.id || bannerIndex} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[180px_1fr_auto]">
                    <div className="space-y-3">
                      <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {banner.image ? (
                          <img src={banner.image} alt={banner.title || 'Banner'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-bold text-white/30">Chưa có ảnh</div>
                        )}
                      </div>
                      <ImageUpload
                        compact
                        folder="banners"
                        label="Upload ảnh"
                        externalPreview={banner.image}
                        onUploadComplete={(url) => updateBanner(bannerIndex, { image: url })}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={banner.title || ''}
                        onChange={event => updateBanner(bannerIndex, { title: event.target.value })}
                        placeholder="Tiêu đề banner"
                        className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
                      />
                      <input
                        value={banner.link || ''}
                        onChange={event => updateBanner(bannerIndex, { link: event.target.value })}
                        placeholder="Link khi bấm banner, VD: /shop"
                        className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
                      />
                      <input
                        value={banner.image || ''}
                        onChange={event => updateBanner(bannerIndex, { image: event.target.value })}
                        placeholder="URL ảnh banner"
                        className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 md:col-span-2"
                      />
                      <textarea
                        value={banner.subtitle || ''}
                        onChange={event => updateBanner(bannerIndex, { subtitle: event.target.value })}
                        placeholder="Mô tả phụ"
                        className="h-20 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/25 md:col-span-2"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeBanner(bannerIndex)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-black text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section.type === 'custom' && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div
              onDragOver={event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={event => handleReadyBlockDrop(event, index)}
              className="rounded-2xl border border-dashed border-[#1e4b64]/60 bg-[#1e4b64]/10 p-5 text-center"
            >
              <p className="text-sm font-black text-white">Thả block sẵn vào đây</p>
              <p className="mt-1 text-xs font-semibold text-white/45">
                Kéo một block bên dưới vào khung này để đổi Block tùy chỉnh thành block có cài đặt sẵn.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <p className="text-sm font-black text-white">Kho block sẵn</p>
                <p className="mt-1 text-xs font-semibold text-white/35">Kéo thả hoặc bấm chọn một block để cài đặt tùy biến.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {READY_BLOCK_TEMPLATES.map(template => {
                  const Icon = readyBlockIcons[template.id] || readyBlockIcons[template.type] || LayoutTemplate;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      draggable
                      onClick={() => applyReadyBlock(index, template)}
                      onDragStart={event => handleReadyBlockDragStart(event, template)}
                      className="group flex min-h-[118px] cursor-grab flex-col rounded-2xl border border-white/10 bg-[#151923] p-4 text-left transition-colors hover:border-[#1e4b64]/70 hover:bg-[#1e4b64]/10 active:cursor-grabbing"
                    >
                      <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-[#78badb] ring-1 ring-white/10 group-hover:bg-[#1e4b64] group-hover:text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-black text-white">{template.name}</span>
                      <span className="mt-1 text-xs font-semibold leading-5 text-white/40">{template.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {section.settings?.customLayout && (
              <>
                <div>
                  <p className="text-sm font-black text-white">Nội dung block mới</p>
                  <p className="mt-1 text-xs font-semibold text-white/35">Cấu hình nhanh dạng sản phẩm hoặc HTML nếu bạn muốn giữ block này là block tùy chỉnh.</p>
                </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { value: 'products', label: 'Danh sách sản phẩm' },
                { value: 'html', label: 'Nội dung HTML' }
              ].map(option => {
                const active = section.settings?.customLayout === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSectionSettings(index, { customLayout: option.value as 'products' | 'html' })}
                    className={cn(
                      "h-11 rounded-xl border px-4 text-sm font-black transition-colors",
                      active
                        ? "border-[#1e4b64] bg-[#1e4b64] text-white"
                        : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {section.settings.customLayout === 'products' ? (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Tiêu đề phụ</label>
                    <input
                      value={section.settings?.subtitle || ''}
                      onChange={event => updateSectionSettings(index, { subtitle: event.target.value })}
                      placeholder="VD: Performance Collection"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Nút xem thêm</label>
                    <input
                      value={section.settings?.cta || ''}
                      onChange={event => updateSectionSettings(index, { cta: event.target.value })}
                      placeholder="VD: Xem thêm"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Link nút</label>
                    <input
                      value={section.settings?.href || ''}
                      onChange={event => updateSectionSettings(index, { href: event.target.value })}
                      placeholder="VD: /ao-thun-the-thao-nam"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Số sản phẩm</label>
                    <input
                      type="number"
                      min={1}
                      value={section.settings?.productLimit ?? ''}
                      onChange={event => updateSectionSettings(index, {
                        productLimit: event.target.value === ''
                          ? undefined
                          : Math.max(1, Number(event.target.value) || 1)
                      })}
                      placeholder="Tất cả"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { value: 'category', label: 'Lấy theo danh mục' },
                    { value: 'manual', label: 'Tự chọn sản phẩm' }
                  ].map(option => {
                    const active = (section.settings?.productMode || 'category') === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSectionSettings(index, { productMode: option.value as 'category' | 'manual' })}
                        className={cn(
                          "h-11 rounded-xl border px-4 text-sm font-black transition-colors",
                          active
                            ? "border-[#1e4b64] bg-[#1e4b64] text-white"
                            : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {(section.settings?.productMode || 'category') === 'category' ? (
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Danh mục sản phẩm</label>
                    <select
                      value={section.settings?.productCategory || productCategoryGroups[0]?.name || ''}
                      onChange={event => updateSectionSettings(index, { productCategory: event.target.value })}
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#11141d] px-4 text-sm font-bold text-white outline-none [color-scheme:dark]"
                    >
                      {productCategoryGroups.map(category => (
                        <React.Fragment key={category.name}>
                          <option value={category.name} className="bg-[#11141d] text-white">
                            {category.name}
                          </option>
                          {category.children.length > 0 && (
                            <optgroup label={`Danh mục con của ${category.name}`} className="bg-[#11141d] text-white">
                              {category.children.map(child => (
                                <option key={child.id} value={child.label} className="bg-[#11141d] text-white">
                                  {'  '}• {child.label}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </React.Fragment>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {products.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white/40">
                        Chưa có dữ liệu sản phẩm để chọn.
                      </div>
                    ) : products.map(product => {
                      const selectedIds = section.settings?.selectedProductIds || [];
                      const checked = selectedIds.includes(product.id);
                      return (
                        <label
                          key={product.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors",
                            checked && "border-[#1e4b64]/60 bg-[#1e4b64]/10"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const nextIds = checked
                                ? selectedIds.filter(id => id !== product.id)
                                : [...selectedIds, product.id];
                              updateSectionSettings(index, {
                                productMode: 'manual',
                                selectedProductIds: nextIds
                              });
                            }}
                          />
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{product.name}</p>
                            <p className="mt-1 text-xs font-semibold text-white/35">{product.category} · {product.price.toLocaleString('vi-VN')}đ</p>
                          </div>
                        </label>
                      );
                    })}
                    <p className="text-xs font-bold text-white/35">
                      Đã chọn {(section.settings?.selectedProductIds || []).length} sản phẩm.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={section.content || ''}
                onChange={event => updateSection(index, { content: event.target.value })}
                placeholder="Nhập HTML hoặc nội dung ngắn cho block tùy chỉnh."
                className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-white/25"
              />
            )}
              </>
            )}
          </div>
        )}

        {section.type !== 'hero' && section.type !== 'custom' && relatedAction[section.type] && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-black text-white">{relatedAction[section.type]?.title}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-white/45">{relatedAction[section.type]?.body}</p>
          </div>
        )}

        {section.type === 'news' && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div>
              <p className="text-sm font-black text-white">Kiểu hiển thị bài viết</p>
              <p className="mt-1 text-xs font-semibold text-white/35">Auto lấy 5 bài mới nhất hoặc tự chọn tối đa 5 bài.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { value: 'auto', label: 'Tự động bài mới nhất' },
                { value: 'manual', label: 'Tự chọn 5 bài chính' }
              ].map(option => {
                const active = (section.settings?.newsMode || 'auto') === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSectionSettings(index, { newsMode: option.value as 'auto' | 'manual' })}
                    className={cn(
                      "h-11 rounded-xl border px-4 text-sm font-black transition-colors",
                      active
                        ? "border-[#1e4b64] bg-[#1e4b64] text-white"
                        : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {(section.settings?.newsMode || 'auto') === 'manual' && (
              <div className="space-y-2">
                {blogPosts.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white/40">
                    Chưa có dữ liệu bài viết để chọn.
                  </div>
                ) : blogPosts.map(post => {
                  const selectedIds = section.settings?.selectedPostIds || [];
                  const checked = selectedIds.includes(post.id);
                  const disabled = !checked && selectedIds.length >= 5;
                  return (
                    <label
                      key={post.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors",
                        checked && "border-[#1e4b64]/60 bg-[#1e4b64]/10",
                        disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          const nextIds = checked
                            ? selectedIds.filter(id => id !== post.id)
                            : [...selectedIds, post.id].slice(0, 5);
                          updateSectionSettings(index, {
                            newsMode: 'manual',
                            selectedPostIds: nextIds
                          });
                        }}
                      />
                      {post.image && (
                        <img src={post.image} alt={post.title} className="h-12 w-16 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{post.title}</p>
                        <p className="mt-1 text-xs font-semibold text-white/35">{post.category} · {post.date}</p>
                      </div>
                    </label>
                  );
                })}
                <p className="text-xs font-bold text-white/35">
                  Đã chọn {(section.settings?.selectedPostIds || []).length}/5 bài.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            onClick={saveSectionAndClose}
            disabled={saving || loading || authLoading || !isAdmin}
            className="h-11 gap-2 rounded-xl bg-[#1e4b64] px-5 text-white hover:bg-[#153446]"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu block này'}
          </Button>
          <button
            type="button"
            onClick={() => setEditingIndex(null)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-black text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
            Đóng
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Cấu hình trang chủ</h2>
            <p className="mt-1 text-sm font-medium text-white/40">
              Kéo thả để đổi thứ tự block, bật/tắt block đang hiển thị trên trang chủ.
            </p>
          </div>
          <Button
            onClick={saveSections}
            disabled={saving || loading || authLoading || !isAdmin}
            className="gap-2 rounded-full bg-[#1e4b64] px-6 text-white hover:bg-[#153446]"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto]">
          <select
            value={newSectionType}
            onChange={event => setNewSectionType(event.target.value as HomepageSectionType)}
            className="h-11 rounded-xl border border-white/10 bg-[#11141d] px-3 text-sm font-bold text-white outline-none [color-scheme:dark]"
          >
            {HOMEPAGE_SECTION_TYPES.map(section => (
              <option key={section.value} value={section.value} className="bg-[#11141d] text-white">
                {section.label}
              </option>
            ))}
          </select>
          <input
            value={newSectionName}
            onChange={event => setNewSectionName(event.target.value)}
            placeholder="Tên block mới, có thể để trống"
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
          />
          <Button onClick={addSection} className="h-11 gap-2 rounded-xl bg-white/10 text-white hover:bg-white/15">
            <Plus className="h-4 w-4" />
            Thêm block
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-[#13161f] p-10 text-center text-sm font-bold text-white/40">
            Đang tải cấu hình trang chủ...
          </div>
        ) : sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={event => handleDragStart(event, index)}
            onDragOver={event => event.preventDefault()}
            onDrop={event => handleDrop(event, index)}
            className={cn(
              "rounded-2xl border bg-[#13161f] transition-colors",
              section.enabled ? "border-white/10" : "border-white/5 opacity-60"
            )}
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <button type="button" className="cursor-move rounded-xl bg-white/5 p-2 text-white/40 hover:text-white">
                  <GripVertical className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-sm font-black text-white">{section.name}</p>
                  <p className="mt-1 text-xs font-semibold text-white/35">{getHomepageSectionLabel(section.type)} · {section.id}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSection(index, { enabled: !section.enabled })}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black",
                    section.enabled
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/45"
                  )}
                >
                  {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {section.enabled ? 'Đang hiện' : 'Đang ẩn'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-white/70 hover:text-white"
                >
                  {editingIndex === index ? <X className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                  {editingIndex === index ? 'Đóng' : 'Sửa'}
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-black text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              </div>
            </div>

            {editingIndex === index && renderSectionEditor(section, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
