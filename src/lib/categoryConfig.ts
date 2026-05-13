import { CATEGORY_METADATA } from '../data';
import { Category } from '../types';

export type NavigationItem = {
  id: number | string;
  label: string;
  link: string;
  icon?: string;
  group: 'main' | 'category' | 'subcategory' | string;
  parentLabel?: string;
};

export type ProductCategoryOption = {
  label: Category;
  parent?: Category;
  slug?: string;
  link?: string;
};

export const DEFAULT_SEO_SUBCATEGORIES = [
  {
    label: 'Áo thun nam cotton',
    slug: 'ao-thun-cotton-nam',
    link: '/ao-thun-cotton-nam',
    parentLabel: 'Áo thun nam'
  },
  {
    label: 'Áo thun nam form rộng',
    slug: 'ao-thun-nam-form-rong',
    link: '/ao-thun-nam-form-rong',
    parentLabel: 'Áo thun nam'
  },
  {
    label: 'Áo thun nam thể thao',
    slug: 'ao-thun-the-thao-nam',
    link: '/ao-thun-the-thao-nam',
    parentLabel: 'Áo thun nam'
  }
] as const;

export const PRODUCT_SUBCATEGORY_PARENT: Record<string, string> = {
  'Áo thun nam thể thao': 'Áo thun thể thao nam',
  'Áo thun nam cotton': 'Áo thun nam',
  'Áo thun nam form rộng': 'Áo thun nam'
};

export const CATEGORY_PRODUCT_MATCH_TERMS: Record<string, string[]> = {
  'ao-thun-the-thao-nam': ['thể thao', 'the thao', 'gym', 'chạy bộ', 'chay bo', 'thoáng khí', 'thoang khi'],
  'ao-thun-nam-form-rong': ['form rộng', 'form rong', 'oversize'],
  'ao-thun-cotton-nam': ['cotton']
};

export const normalizeMenuLabel = (value?: string) => String(value || '').trim().toLowerCase();

export const slugifyVietnamese = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const categorySlugByName = (name?: string) =>
  CATEGORY_METADATA.find(cat => normalizeMenuLabel(cat.name) === normalizeMenuLabel(name))?.slug;

export const linkForCategoryLabel = (label: string) => {
  const slug = categorySlugByName(label);
  return slug ? `/${slug}` : `/${slugifyVietnamese(label)}`;
};

export const linkForSubcategoryLabel = (label: string) => {
  const preset = DEFAULT_SEO_SUBCATEGORIES.find(
    item => normalizeMenuLabel(item.label) === normalizeMenuLabel(label)
  );
  return preset?.link || `/${slugifyVietnamese(label)}`;
};

export const normalizeNavigationItem = (item: NavigationItem): NavigationItem => {
  if (item.group === 'category') {
    return {
      ...item,
      link: linkForCategoryLabel(item.label),
      parentLabel: ''
    };
  }

  if (item.group === 'subcategory') {
    return {
      ...item,
      link: linkForSubcategoryLabel(item.label),
      parentLabel: item.parentLabel || 'Áo thun nam'
    };
  }

  return item;
};

export const defaultNavigationItems = (): NavigationItem[] => [
  { id: 1, label: 'Cửa hàng', link: '/shop', icon: '', group: 'main' },
  { id: 2, label: 'Blog', link: '/blog', icon: '', group: 'main' },
  ...CATEGORY_METADATA.map((cat, i) => ({
    id: 100 + i,
    label: cat.name,
    link: `/${cat.slug}`,
    icon: cat.icon,
    group: 'category'
  })),
  ...DEFAULT_SEO_SUBCATEGORIES.map((item, i) => ({
    id: 200 + i,
    label: item.label,
    link: item.link,
    icon: '',
    group: 'subcategory',
    parentLabel: item.parentLabel
  }))
];

export const getNavigationSubcategories = (items: NavigationItem[] = []) => {
  const fromNavigation = items.filter(item => item.group === 'subcategory');
  const merged = [...DEFAULT_SEO_SUBCATEGORIES, ...fromNavigation];
  const map = new Map<string, NavigationItem | typeof DEFAULT_SEO_SUBCATEGORIES[number]>();

  merged.forEach(item => {
    map.set(normalizeMenuLabel(item.label), item);
  });

  return Array.from(map.values()).map(item => normalizeNavigationItem({
    id: 'id' in item ? item.id : item.slug,
    label: item.label,
    link: item.link,
    icon: 'icon' in item ? item.icon : '',
    group: 'subcategory',
    parentLabel: item.parentLabel
  }));
};

export const getProductCategoryOptions = (items: NavigationItem[] = []): ProductCategoryOption[] => {
  const mainOptions = CATEGORY_METADATA.map(cat => ({
    label: cat.name,
    slug: cat.slug,
    link: `/${cat.slug}`
  })) as ProductCategoryOption[];

  const subOptions = getNavigationSubcategories(items).map(item => ({
    label: item.label as Category,
    parent: item.parentLabel as Category,
    slug: slugifyVietnamese(item.link.replace(/^\//, '')),
    link: item.link
  }));

  const map = new Map<string, ProductCategoryOption>();
  [...mainOptions, ...subOptions].forEach(option => {
    map.set(normalizeMenuLabel(option.label), option);
  });

  return Array.from(map.values());
};

export const belongsToCategory = (productCategory: string, category: string) =>
  productCategory === category || PRODUCT_SUBCATEGORY_PARENT[productCategory] === category;
