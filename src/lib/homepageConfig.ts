export type HomepageSectionType =
  | 'top-panel'
  | 'hero'
  | 'promo'
  | 'recommend'
  | 'flashsale'
  | 'featured'
  | 'bestseller'
  | 'sport-products'
  | 'polo-products'
  | 'tshirt-products'
  | 'news'
  | 'trust-badges'
  | 'footer'
  | 'custom';

export type HomepageSectionConfig = {
  id: string;
  type: HomepageSectionType;
  name: string;
  enabled: boolean;
  content?: string;
  settings?: {
    topPanelLocationLabel?: string;
    topPanelLocationHref?: string;
    topPanelItems?: TopPanelItem[];
    newsMode?: 'auto' | 'manual';
    selectedPostIds?: string[];
    customLayout?: 'html' | 'products';
    productMode?: 'category' | 'manual';
    productCategory?: string;
    selectedProductIds?: string[];
    productLimit?: number;
    subtitle?: string;
    cta?: string;
    href?: string;
  };
};

export type TopPanelItem = {
  label: string;
  href?: string;
  hasDropdown?: boolean;
};

export const DEFAULT_TOP_PANEL_SETTINGS = {
  topPanelLocationLabel: 'TP. Hồ Chí Minh',
  topPanelLocationHref: '/chinh-sach/lien-he',
  topPanelItems: [
    { label: 'Giao hàng và thanh toán', href: '/chinh-sach-giao-hang' },
    { label: 'Đổi trả', href: '/chinh-sach-doi-tra' },
    { label: 'Cửa hàng', href: '/chinh-sach/he-thong-cua-hang' },
    { label: 'Liên hệ', href: '/chinh-sach/lien-he' },
    { label: 'Thông tin', href: '/chinh-sach', hasDropdown: true },
    { label: '₫', href: '#', hasDropdown: true },
    { label: 'Tiếng Việt', href: '#', hasDropdown: true },
  ] as TopPanelItem[],
};

export const HOMEPAGE_CONFIG_STORAGE_KEY = 'ursport_homepage_config_v1';
export const HOMEPAGE_BANNERS_STORAGE_KEY = 'ursport_homepage_banners_v1';
export const HOMEPAGE_MOBILE_BANNERS_STORAGE_KEY = 'ursport_homepage_mobile_banners_v1';

export const HOMEPAGE_SECTION_TYPES: { value: HomepageSectionType; label: string }[] = [
  { value: 'top-panel', label: 'Top panel' },
  { value: 'hero', label: 'Banner' },
  { value: 'promo', label: 'Mã giảm giá' },
  { value: 'recommend', label: 'Gợi ý dành riêng cho bạn' },
  { value: 'flashsale', label: 'Flash Sale' },
  { value: 'featured', label: 'Mua theo nhu cầu' },
  { value: 'bestseller', label: 'Sản phẩm - sản phẩm bán chạy' },
  { value: 'sport-products', label: 'Sản phẩm Áo thể thao nổi bật' },
  { value: 'polo-products', label: 'Bộ sưu tập Áo Polo Nam' },
  { value: 'tshirt-products', label: 'Áo Thun Nam Thời Trang' },
  { value: 'news', label: 'Stay updated with UR NEWS' },
  { value: 'trust-badges', label: 'Cam kết dịch vụ' },
  { value: 'footer', label: 'Chân trang' },
  { value: 'custom', label: 'Block tùy chỉnh' },
];

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
  {
    id: 'top-panel',
    type: 'top-panel',
    name: 'Top panel',
    enabled: true,
    settings: DEFAULT_TOP_PANEL_SETTINGS,
  },
  { id: 'hero', type: 'hero', name: 'Banner', enabled: true },
  { id: 'promo', type: 'promo', name: 'Mã giảm giá', enabled: true },
  { id: 'recommend', type: 'recommend', name: 'Gợi ý dành riêng cho bạn', enabled: true },
  { id: 'flashsale', type: 'flashsale', name: 'Flash Sale', enabled: true },
  { id: 'featured', type: 'featured', name: 'Mua theo nhu cầu', enabled: true },
  { id: 'bestseller', type: 'bestseller', name: 'Sản phẩm - sản phẩm bán chạy', enabled: true },
  { id: 'sport-products', type: 'sport-products', name: 'Sản phẩm Áo thể thao nổi bật', enabled: true },
  { id: 'polo-products', type: 'polo-products', name: 'Bộ sưu tập Áo Polo Nam', enabled: true },
  { id: 'tshirt-products', type: 'tshirt-products', name: 'Áo Thun Nam Thời Trang', enabled: true },
  { id: 'news', type: 'news', name: 'Stay updated with UR NEWS', enabled: true },
  { id: 'trust-badges', type: 'trust-badges', name: 'Cam kết dịch vụ', enabled: true },
  { id: 'footer', type: 'footer', name: 'Chân trang', enabled: true },
];

export const getHomepageSectionLabel = (type: HomepageSectionType) =>
  HOMEPAGE_SECTION_TYPES.find(section => section.value === type)?.label || 'Block mới';

export const isLocalhost = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const inferSectionType = (section: Partial<HomepageSectionConfig> & { id?: string; type?: string }): HomepageSectionType => {
  const candidate = section.type || '';
  if (HOMEPAGE_SECTION_TYPES.some(item => item.value === candidate)) return candidate as HomepageSectionType;

  const id = section.id || '';
  if (id.startsWith('top-panel')) return 'top-panel';
  if (id.startsWith('hero')) return 'hero';
  if (id.startsWith('promo')) return 'promo';
  if (id.startsWith('recommend')) return 'recommend';
  if (id.startsWith('flashsale')) return 'flashsale';
  if (id.startsWith('featured')) return 'featured';
  if (id.startsWith('bestseller')) return 'bestseller';
  if (id.startsWith('sport-products')) return 'sport-products';
  if (id.startsWith('polo-products')) return 'polo-products';
  if (id.startsWith('tshirt-products')) return 'tshirt-products';
  if (id.startsWith('news')) return 'news';
  if (id.startsWith('trust-badges')) return 'trust-badges';
  if (id.startsWith('footer')) return 'footer';
  return 'custom';
};

export const normalizeHomepageSection = (
  section: Partial<HomepageSectionConfig> & { id?: string; type?: string },
): HomepageSectionConfig => {
  const type = inferSectionType(section);
  return {
    id: section.id || `${type}-${Date.now()}`,
    type,
    name: section.name || getHomepageSectionLabel(type),
    enabled: section.enabled !== false,
    content: section.content || '',
    settings: section.settings || {},
  };
};

export const mergeHomepageSections = (sections: HomepageSectionConfig[]) => {
  const normalized = sections.map(normalizeHomepageSection);
  const ids = new Set(normalized.map(section => section.id));
  return DEFAULT_HOMEPAGE_SECTIONS
    .map(normalizeHomepageSection)
    .filter(section => !ids.has(section.id))
    .reduce((result, defaultSection) => {
      if (defaultSection.id === 'top-panel') {
        result.unshift(defaultSection);
        return result;
      }

      if (defaultSection.id === 'trust-badges') {
        const footerIndex = result.findIndex(section => section.id === 'footer');
        if (footerIndex >= 0) {
          result.splice(footerIndex, 0, defaultSection);
          return result;
        }
      }

      result.push(defaultSection);
      return result;
    }, [...normalized]);
};

export const getHomepageTopPanelSection = (sections: HomepageSectionConfig[]) =>
  mergeHomepageSections(sections).find(section => section.type === 'top-panel' && section.enabled !== false);

export const getTopPanelSettings = (section?: HomepageSectionConfig | null) => {
  const settings = section?.settings || {};
  const savedItems = Array.isArray(settings.topPanelItems) ? settings.topPanelItems : [];

  return {
    ...DEFAULT_TOP_PANEL_SETTINGS,
    ...settings,
    topPanelLocationHref:
      typeof settings.topPanelLocationHref === 'string' && settings.topPanelLocationHref.trim()
        ? settings.topPanelLocationHref
        : DEFAULT_TOP_PANEL_SETTINGS.topPanelLocationHref,
    topPanelItems: savedItems.length > 0
      ? savedItems.map((item, index) => {
          const defaultItem = DEFAULT_TOP_PANEL_SETTINGS.topPanelItems[index];
          if (!defaultItem) return item;

          return {
            ...defaultItem,
            ...item,
            href: typeof item.href === 'string' && item.href.trim() ? item.href : defaultItem.href,
          };
        })
      : DEFAULT_TOP_PANEL_SETTINGS.topPanelItems,
  };
};

export const readLocalHomepageSections = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(HOMEPAGE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const sections = Array.isArray(parsed?.sections) ? parsed.sections : parsed;
    return Array.isArray(sections) ? mergeHomepageSections(sections) : null;
  } catch {
    return null;
  }
};

export const writeLocalHomepageSections = (sections: HomepageSectionConfig[]) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    HOMEPAGE_CONFIG_STORAGE_KEY,
    JSON.stringify({
      sections: sections.map(normalizeHomepageSection),
      updatedAt: new Date().toISOString(),
    }),
  );
};

export type LocalHomepageBanner = {
  id: number | string;
  image: string;
  title: string;
  subtitle?: string;
  link?: string;
};

export const readLocalHomepageBanners = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(HOMEPAGE_BANNERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : parsed;
    return Array.isArray(items) ? items as LocalHomepageBanner[] : null;
  } catch {
    return null;
  }
};

export const writeLocalHomepageBanners = (items: LocalHomepageBanner[]) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    HOMEPAGE_BANNERS_STORAGE_KEY,
    JSON.stringify({
      items,
      updatedAt: new Date().toISOString(),
    }),
  );
};

export const readLocalHomepageMobileBanners = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(HOMEPAGE_MOBILE_BANNERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : parsed;
    return Array.isArray(items) ? items as LocalHomepageBanner[] : null;
  } catch {
    return null;
  }
};

export const writeLocalHomepageMobileBanners = (items: LocalHomepageBanner[]) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    HOMEPAGE_MOBILE_BANNERS_STORAGE_KEY,
    JSON.stringify({
      items,
      updatedAt: new Date().toISOString(),
    }),
  );
};
