export type BlogPageSectionType =
  | 'hero'
  | 'category-tabs'
  | 'featured'
  | 'category-sections'
  | 'article-list';

export type BlogPageSectionConfig = {
  id: string;
  type: BlogPageSectionType;
  name: string;
  enabled: boolean;
  settings?: {
    title?: string;
    subtitle?: string;
    selectedTabLinks?: string[];
    featuredMode?: 'latest' | 'manual';
    selectedPostIds?: string[];
    featuredCategorySlug?: string;
    categoryMode?: 'all' | 'single';
    categorySlug?: string;
    postMode?: 'latest' | 'manual';
    postLimit?: number;
  };
};

export const BLOG_PAGE_CONFIG_STORAGE_KEY = 'ursport_blog_page_config_v1';

export const isLocalhost = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const BLOG_PAGE_SECTION_TYPES: { value: BlogPageSectionType; label: string; description: string }[] = [
  { value: 'hero', label: 'Hero Blog', description: 'Tiêu đề H1, mô tả và ô tìm kiếm đầu trang blog.' },
  { value: 'category-tabs', label: 'Tab danh mục', description: 'Thanh chuyển nhanh giữa Tất cả và các hub blog.' },
  { value: 'featured', label: 'Bài Viết Nổi Bật', description: 'Khối tiêu điểm chỉ hiển thị ở tab Tất cả.' },
  { value: 'category-sections', label: 'Cụm bài theo danh mục', description: 'Áo thun nam, áo thun thể thao, quần thể thao, chất liệu và phối đồ.' },
  { value: 'article-list', label: 'Danh sách bài viết', description: 'Danh sách bài viết khi xem danh mục hoặc tìm kiếm.' },
];

export const DEFAULT_BLOG_PAGE_SECTIONS: BlogPageSectionConfig[] = [
  { id: 'hero', type: 'hero', name: 'Hero Blog', enabled: true },
  { id: 'category-tabs', type: 'category-tabs', name: 'Tab danh mục', enabled: true },
  { id: 'featured', type: 'featured', name: 'Bài Viết Nổi Bật', enabled: true },
  { id: 'category-sections', type: 'category-sections', name: 'Cụm bài theo danh mục', enabled: true },
  { id: 'article-list', type: 'article-list', name: 'Danh sách bài viết', enabled: true },
];

export const getBlogPageSectionLabel = (type: BlogPageSectionType) =>
  BLOG_PAGE_SECTION_TYPES.find(section => section.value === type)?.label || 'Block Blog';

const inferBlogSectionType = (section: Partial<BlogPageSectionConfig> & { id?: string; type?: string }): BlogPageSectionType => {
  const candidate = section.type || '';
  if (BLOG_PAGE_SECTION_TYPES.some(item => item.value === candidate)) return candidate as BlogPageSectionType;

  const id = section.id || '';
  if (id.startsWith('hero')) return 'hero';
  if (id.startsWith('category-tabs')) return 'category-tabs';
  if (id.startsWith('featured')) return 'featured';
  if (id.startsWith('category-sections')) return 'category-sections';
  if (id.startsWith('article-list')) return 'article-list';
  return 'article-list';
};

export const normalizeBlogPageSection = (
  section: Partial<BlogPageSectionConfig> & { id?: string; type?: string },
): BlogPageSectionConfig => {
  const type = inferBlogSectionType(section);
  return {
    id: section.id || `${type}-${Date.now()}`,
    type,
    name: section.name || getBlogPageSectionLabel(type),
    enabled: section.enabled !== false,
    settings: section.settings || {},
  };
};

export const mergeBlogPageSections = (sections: BlogPageSectionConfig[]) => {
  const normalized = sections.map(normalizeBlogPageSection);
  const ids = new Set(normalized.map(section => section.id));
  const types = new Set(normalized.map(section => section.type));
  const missingDefaults = DEFAULT_BLOG_PAGE_SECTIONS
    .map(normalizeBlogPageSection)
    .filter(section => !ids.has(section.id) && !types.has(section.type));

  return [...normalized, ...missingDefaults];
};

export const readLocalBlogPageSections = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(BLOG_PAGE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const sections = Array.isArray(parsed?.sections) ? parsed.sections : parsed;
    return Array.isArray(sections) ? mergeBlogPageSections(sections) : null;
  } catch {
    return null;
  }
};

export const writeLocalBlogPageSections = (sections: BlogPageSectionConfig[]) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    BLOG_PAGE_CONFIG_STORAGE_KEY,
    JSON.stringify({
      sections: sections.map(normalizeBlogPageSection),
      updatedAt: new Date().toISOString(),
    }),
  );
};
