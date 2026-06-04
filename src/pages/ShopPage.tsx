import React from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { SlidersHorizontal, ChevronDown, ChevronRight, ArrowRight, Check } from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { useProducts } from '../ProductsContext';
import { useSEO } from '../hooks/useSEO';
import { db, isFirebaseConfigured } from '../firebase';
import { CATEGORY_METADATA, CATEGORIES } from '../data';
import { Product, Category } from '../types';
import { DEFAULT_SEO_SUBCATEGORIES, CATEGORY_PRODUCT_MATCH_TERMS } from '../lib/categoryConfig';
import { getProductPath } from '../lib/productUrls';
import { SITE_URL, absoluteUrl, buildBreadcrumbSchema, buildSeoGraph, offerShippingDetailsSchema, merchantReturnPolicySchema } from '../lib/seo';
import { parseSeoFaqs, formatSeoContentHtml } from '../utils/seoContentFormatter';
import { getCategoryLandingContent, CATEGORY_DEFAULT_SEO } from '../data/categoryLandingContent';
import { sanitizeRichHtml } from '../lib/htmlContent';
import { buildFaqSchema } from '../lib/faqSchema';

const SEO_LANDING_PAGES = DEFAULT_SEO_SUBCATEGORIES
  .map(page => ({
    slug: page.slug,
    label: page.label,
    parentCategory: page.parentLabel,
    matchTerms: CATEGORY_PRODUCT_MATCH_TERMS[page.slug] || []
  }));

type SeoLandingPage = typeof SEO_LANDING_PAGES[number];

const belongsToCategory = (product: Product, category: string) => {
  return product.category.toLowerCase().includes(category.toLowerCase());
};

const productMatchesTerms = (product: Product, terms: readonly string[]) => {
  const haystack = [
    product.name,
    product.description,
    product.seoTitle,
    product.metaDescription,
    product.keywords,
    product.specifications,
    product.material,
    product.style,
    product.fashionStyle,
    ...(product.features || [])
  ].join(' ').toLowerCase();

  return terms.some(term => haystack.includes(term.toLowerCase()));
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getProductUrl = (product: Product) => {
  return getProductPath(product);
};

function CategoryLandingBlocks({ config, productCount }: { config: any; productCount: number }) {
  return (
    <section className="mb-10 space-y-5">
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {config.quickLinks.map((link: any) => (
          <Link
            key={link.href}
            to={link.href}
            className="group min-w-[82%] snap-start rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1e4b64]/30 hover:shadow-md sm:min-w-0"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-zinc-950">{link.label}</span>
              <ArrowRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-[#1e4b64]" />
            </div>
            <p className="text-xs font-medium leading-5 text-zinc-500">{link.description}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-3xl border border-zinc-100 bg-zinc-50/60 p-5 sm:grid sm:grid-cols-[0.8fr_1.2fr] sm:gap-4 sm:p-6">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#1e4b64]">Gợi ý chọn nhanh</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-950">Chọn sản phẩm theo nhu cầu mặc</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-zinc-500">
            Có {productCount} sản phẩm phù hợp. Dùng các gợi ý này để chọn nhanh theo chất liệu, form dáng và hoàn cảnh sử dụng.
          </p>
        </div>
        <div className="-mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:mt-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {config.buyingGuides.map((item: any) => (
            <div key={item.title} className="min-w-[82%] snap-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 sm:min-w-0">
              <Check className="mb-3 h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-black text-zinc-950">{item.title}</h3>
              <p className="mt-2 text-xs font-medium leading-5 text-zinc-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ShopPage({
  activeCategory,
  setActiveCategory,
  isLoading,
  onProductSelect,
  categoryName,
  seoLanding
}: {
  activeCategory: any;
  setActiveCategory: (c: any) => void;
  isLoading: boolean;
  onProductSelect: (p: Product) => void;
  categoryName?: string;
  seoLanding?: SeoLandingPage;
}) {
  const navigate = useNavigate();
  const { categorySlug, productSlug } = useParams<{ categorySlug?: string, productSlug?: string }>();
  const categoryNameSlug = categoryName ? CATEGORY_METADATA.find(c => c.name === categoryName)?.slug : undefined;
  const currentSlug = seoLanding?.slug || categorySlug || productSlug || categoryNameSlug;
  const { products, loading: productsLoading } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seoContent, setSeoContent] = React.useState<string>('');
  const [seoMeta, setSeoMeta] = React.useState<{title:string,description:string,keywords:string,canonical:string,robots:string,heading:string}>({title:'',description:'',keywords:'',canonical:'',robots:'',heading:''});
  const [isSeoExpanded, setIsSeoExpanded] = React.useState(false);
  const [openFilterMenu, setOpenFilterMenu] = React.useState<string | null>(null);
  const filtersRef = React.useRef<HTMLDivElement>(null);
  
  const categoryFilter = searchParams.get('category');
  const brandFilter = searchParams.get('brand');
  const priceFilter = searchParams.get('price');
  const colorFilter = searchParams.get('color');
  const sizeFilter = searchParams.get('size');
  const sortFilter = searchParams.get('sort') || 'newest';
  const searchQuery = searchParams.get('q')?.trim() || '';
  const [searchInput, setSearchInput] = React.useState(searchQuery);
  const showLoading = isLoading || productsLoading;

  // Derive current category from URL params, prop or state instantly during render
  const currentCategory = React.useMemo(() => {
    if (seoLanding) return seoLanding.parentCategory;
    if (categoryName) return categoryName;
    if (currentSlug) {
      return CATEGORY_METADATA.find(c => c.slug === currentSlug)?.name || 'All';
    }
    return categoryFilter || activeCategory;
  }, [seoLanding, categoryName, currentSlug, categoryFilter, activeCategory]);

  // Extract unique values for filters and normalize them
  const brands = Array.from(new Set(
    products.map(p => p.brand?.trim())
      .filter(Boolean)
  )) as string[];
  
  const colors = Array.from(new Set(
    products.flatMap(p => p.colors || [])
      .map(c => c.trim().toLowerCase())
      .filter(Boolean)
  )).map(c => c.charAt(0).toUpperCase() + c.slice(1)) as string[];

  const sizes = Array.from(new Set(
    products.flatMap(p => p.sizes || [])
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
  )) as string[];

  const priceRanges = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Dưới 100.000đ', value: '0-100000' },
    { label: '100.000đ - 200.000đ', value: '100000-200000' },
    { label: '200.000đ - 500.000đ', value: '200000-500000' },
    { label: 'Trên 500.000đ', value: '500000-10000000' },
  ];

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
    setOpenFilterMenu(null);
  };

  React.useEffect(() => {
    if (searchInput !== searchQuery) {
      setSearchInput(searchQuery);
    }
  }, [searchQuery]);

  const dropdownClass = (menuId: string, align: 'left' | 'right' = 'left') => cn(
    "absolute top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-[80] transition-all duration-200 transform max-h-80 overflow-y-auto",
    align === 'right' ? "right-0 origin-top-right" : "left-0 origin-top-left",
    openFilterMenu === menuId
      ? "opacity-100 visible translate-y-0 pointer-events-auto"
      : "opacity-0 invisible translate-y-2 pointer-events-none"
  );

  const toggleFilterMenu = (menuId: string) => {
    setOpenFilterMenu(prev => prev === menuId ? null : menuId);
  };

  const selectCategoryFromMenu = (category: Category | 'All') => {
    setActiveCategory(category);
    setOpenFilterMenu(null);
    const catMetadata = CATEGORY_METADATA.find(c => c.name === category);
    navigate(catMetadata ? `/${catMetadata.slug}` : '/shop');
  };

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setOpenFilterMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  React.useEffect(() => {
    setSearchInput(searchQuery);
    if (currentSlug) {
      const catMetadata = CATEGORY_METADATA.find(c => c.slug === currentSlug);
      if (catMetadata && catMetadata.name !== activeCategory) {
        setActiveCategory(catMetadata.name);
      }
    } else if (categoryFilter) {
      if (categoryFilter !== activeCategory) {
        setActiveCategory(categoryFilter);
      }
    } else if (!brandFilter && !priceFilter && !colorFilter && !sizeFilter && activeCategory !== 'All') {
      setActiveCategory('All');
    }
    window.scrollTo(0, 0);
  }, [currentSlug, categoryFilter, setActiveCategory, activeCategory, brandFilter, priceFilter, colorFilter, sizeFilter]);

  React.useEffect(() => {
    const fetchSeo = async () => {
      if (currentCategory === 'All') {
        setSeoContent('');
        setSeoMeta({
          title: 'Shop Đồ Thể Thao Nam Cao Cấp | Áo Thun, Áo Polo, Quần Gym | UR Sport',
          description: 'Khám phá toàn bộ bộ sưu tập thời trang thể thao nam tại UR Sport. Áo thun thể thao, áo polo, quần jogger, phụ kiện gym chính hãng. Giao hàng nhanh.',
          keywords: 'ur sport shop, đồ thể thao nam, quần áo gym nam, thời trang thể thao nam, áo thun thể thao, áo polo nam',
          canonical: '',
          robots: '',
          heading: ''
        });
        return;
      }
      const catMetadata = CATEGORY_METADATA.find(c => c.name === currentCategory);
      const seoDocSlug = seoLanding?.slug || catMetadata?.slug;
      if (seoDocSlug) {
        const fallback = CATEGORY_DEFAULT_SEO[seoDocSlug] || CATEGORY_DEFAULT_SEO[catMetadata?.slug || ''] || {
          title: `${seoLanding?.label || currentCategory} Chính Hãng, Giá Tốt | UR Sport`,
          description: `Mua ${seoLanding?.label || currentCategory} chính hãng, chất lượng cao tại UR Sport. Đa dạng mẫu mã, giao hàng toàn quốc, đổi trả dễ dàng.`,
          keywords: `${seoLanding?.label || currentCategory}, đồ thể thao nam, ur sport`,
        };
        try {
          if (!db || !isFirebaseConfigured) {
            setSeoContent('');
            setSeoMeta({
              title: fallback.title,
              description: fallback.description,
              keywords: fallback.keywords,
              canonical: '',
              robots: 'index, follow',
              heading: seoLanding?.label || ''
            });
            return;
          }
          const docRef = doc(db, 'categorySeo', seoDocSlug);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSeoContent(data.content || '');
            setSeoMeta({
              title: data.seoTitle || fallback.title,
              description: data.seoDescription || fallback.description,
              keywords: data.seoKeywords || fallback.keywords,
              canonical: data.seoCanonical || '',
              robots: data.seoRobots || 'index, follow',
              heading: data.heading || seoLanding?.label || '',
            });
          } else {
            setSeoContent('');
            setSeoMeta({
              title: fallback.title,
              description: fallback.description,
              keywords: fallback.keywords,
              canonical: '',
              robots: 'index, follow',
              heading: seoLanding?.label || ''
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchSeo();
  }, [currentCategory, seoLanding]);

  let filteredProducts = currentCategory === 'All' 
    ? [...products]
    : products.filter(p => belongsToCategory(p, currentCategory));

  if (seoLanding?.matchTerms?.length) {
    filteredProducts = filteredProducts.filter(product => productMatchesTerms(product, seoLanding.matchTerms));
  }

  if (brandFilter) {
    filteredProducts = filteredProducts.filter(p => p.brand?.trim().toLowerCase() === brandFilter.trim().toLowerCase());
  }

  if (colorFilter) {
    filteredProducts = filteredProducts.filter(p => 
      p.colors?.some(c => c.trim().toLowerCase() === colorFilter.toLowerCase())
    );
  }

  if (sizeFilter) {
    filteredProducts = filteredProducts.filter(p => 
      p.sizes?.some(s => s.trim().toUpperCase() === sizeFilter.toUpperCase())
    );
  }

  if (priceFilter) {
    const [min, max] = priceFilter.split('-').map(Number);
    filteredProducts = filteredProducts.filter(p => {
      const price = p.discountPrice || p.price;
      return price >= min && price <= max;
    });
  }

  if (searchQuery) {
    const normalizedQuery = normalizeSearchText(searchQuery);
    filteredProducts = filteredProducts.filter(product => {
      const haystack = normalizeSearchText([
        product.name,
        product.description,
        product.category,
        product.brand,
        product.material,
        product.style,
        product.keywords,
        product.seoTitle,
        product.metaDescription,
        ...(product.colors || []),
        ...(product.sizes || []),
        ...(product.features || [])
      ].filter(Boolean).join(' '));

      return normalizedQuery
        .split(/\s+/)
        .filter(Boolean)
        .every(term => haystack.includes(term));
    });
  }

  // Sorting
  if (sortFilter === 'price-asc') {
    filteredProducts.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
  } else if (sortFilter === 'price-desc') {
    filteredProducts.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
  } else if (sortFilter === 'rating') {
    filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    // Newest first by default
    filteredProducts.sort((a, b) => {
       const dateA = a.createdAt?.seconds || 0;
       const dateB = b.createdAt?.seconds || 0;
       return dateB - dateA;
     });
  }

  const hasActiveFacetedParams = Boolean(
    categoryFilter ||
    brandFilter ||
    priceFilter ||
    colorFilter ||
    sizeFilter ||
    searchQuery ||
    searchParams.has('sort')
  );
  const finalRobots = currentSlug && filteredProducts.length === 0
    ? 'noindex, follow'
    : hasActiveFacetedParams
      ? 'noindex, follow'
      : seoMeta.robots;

  const shopCanonical = currentSlug ? `/${currentSlug}` : '/shop';
  const categoryIntro = !searchQuery && !brandFilter ? seoMeta.description : '';
  const landingConfig = React.useMemo(
    () => !hasActiveFacetedParams ? getCategoryLandingContent(currentSlug, String(currentCategory)) : null,
    [hasActiveFacetedParams, currentSlug, currentCategory]
  );
  const formattedSeoContent = React.useMemo(() => sanitizeRichHtml(formatSeoContentHtml(seoContent)), [seoContent]);
  const seoContentFaqs = React.useMemo(() => parseSeoFaqs(seoContent), [seoContent]);
  const combinedFaqs = React.useMemo(() => {
    const list = [...seoContentFaqs];
    if (landingConfig?.faqs) {
      landingConfig.faqs.forEach(item => {
        if (!list.some(existing => existing.question.toLowerCase().trim() === item.question.toLowerCase().trim())) {
          list.push(item);
        }
      });
    }
    return list;
  }, [seoContentFaqs, landingConfig]);
  const faqSchema = React.useMemo(() => {
    const schema = buildFaqSchema(combinedFaqs);
    if (schema) {
      return {
        ...schema,
        '@id': `${absoluteUrl(shopCanonical)}#faq`
      };
    }
    return null;
  }, [combinedFaqs, shopCanonical]);
  const shopSchema = React.useMemo(() => buildSeoGraph(
    {
      '@type': 'CollectionPage',
      '@id': `${absoluteUrl(shopCanonical)}#collection`,
      url: absoluteUrl(shopCanonical),
      name: seoMeta.title || 'UR Sport Shop',
      description: seoMeta.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      inLanguage: 'vi-VN',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: filteredProducts.length,
        itemListElement: filteredProducts.slice(0, 24).map((product, index) => {
          const productUrl = absoluteUrl(getProductPath(product));
          return {
            '@type': 'ListItem',
            position: index + 1,
            url: productUrl,
            name: product.name,
            item: {
              '@type': 'Product',
              '@id': `${productUrl}#product`,
              name: product.name,
              url: productUrl,
              image: (product.images || []).slice(0, 3).map(absoluteUrl),
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
                hasMerchantReturnPolicy: merchantReturnPolicySchema
              }
            }
          };
        })
      }
    },
    buildBreadcrumbSchema([
      { name: 'Trang chủ', url: '/' },
      { name: currentCategory === 'All' ? 'Shop' : String(currentCategory), url: shopCanonical }
    ]),
    faqSchema
  ), [filteredProducts, seoMeta.title, seoMeta.description, shopCanonical, currentCategory, faqSchema]);

  useSEO({
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    canonical: seoMeta.canonical || shopCanonical,
    robots: finalRobots,
    type: "website",
    schema: shopSchema
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-sm text-zinc-400 mb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link 
          to="/"
          className="shrink-0 hover:text-black transition-colors"
        >
          Trang chủ
        </Link>
        <span className="shrink-0">/</span>
        <Link 
          to="/shop"
          onClick={() => {
            setActiveCategory('All');
            setSearchParams({});
          }}
          className="shrink-0 hover:text-black transition-colors"
        >
          Cửa hàng
        </Link>
        {brandFilter && (
          <>
            <span className="shrink-0">/</span>
            <span className="shrink-0 text-zinc-500 font-medium">Thương hiệu: {brandFilter}</span>
          </>
        )}
        {searchQuery && (
          <>
            <span className="shrink-0">/</span>
            <span className="shrink-0 text-zinc-500 font-medium">Tìm kiếm: {searchQuery}</span>
          </>
        )}
        {currentCategory !== 'All' && !brandFilter && (
          <>
            <span className="shrink-0">/</span>
            <span className="shrink-0 text-zinc-500 font-medium">{currentCategory}</span>
          </>
        )}
      </nav>

      <header className="mb-8">
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-[28px] sm:text-[40px] font-black text-black leading-tight tracking-tight">
            {searchQuery
              ? `Kết quả tìm kiếm "${searchQuery}"`
              : brandFilter
                ? `Sản phẩm thương hiệu ${brandFilter}`
                : (seoMeta.heading ? seoMeta.heading : (currentCategory === 'All' ? 'Tất cả sản phẩm' : currentCategory))}
          </h1>
          {categoryIntro && (
            <p className="max-w-3xl text-sm font-medium leading-7 text-zinc-600 sm:text-base">
              {categoryIntro}
            </p>
          )}
          
          {landingConfig && (
            <CategoryLandingBlocks config={landingConfig} productCount={filteredProducts.length} />
          )}

          <div ref={filtersRef} className="flex flex-col gap-4 pt-4 border-t border-zinc-100">
            <div className="relative z-30 flex items-center gap-2 w-full overflow-x-auto pb-4 xl:pb-0 xl:flex-wrap xl:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              
              <div className="relative min-w-0 shrink-0">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('all')} className="flex h-9 w-auto items-center justify-center gap-1.5 rounded-full border-zinc-200 px-4 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 sm:h-10 sm:px-5">
                  <SlidersHorizontal className="h-4 w-4" /> Bộ lọc <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('all'), 'py-3')}>
                  <div className="px-4 pb-2 mb-2 border-b border-zinc-50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tất cả bộ lọc</span>
                    <button onClick={() => { setSearchParams({}); setOpenFilterMenu(null); }} className="text-[10px] text-blue-600 font-bold hover:underline">Xóa tất cả</button>
                  </div>
                  <div className="px-2 space-y-1">
                    <div className="p-2 text-xs text-zinc-400 italic">Chọn các tùy chọn bên cạnh để lọc sản phẩm</div>
                  </div>
                </div>
              </div>

              <div className="relative min-w-0 shrink-0">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('price')} className={cn("flex h-9 w-auto items-center justify-center gap-1.5 rounded-full border-zinc-200 px-4 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 sm:h-10 sm:px-5", priceFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Giá {priceFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('price'), 'py-2')}>
                  {priceRanges.map(range => (
                    <button 
                      key={range.value}
                      onClick={() => updateFilter('price', range.value)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        priceFilter === range.value ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative min-w-0 shrink-0">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('brand')} className={cn("flex h-9 w-auto items-center justify-center gap-1.5 rounded-full border-zinc-200 px-4 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 sm:h-10 sm:px-5", brandFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Thương hiệu {brandFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('brand'), 'py-2')}>
                  <button onClick={() => updateFilter('brand', null)} className={cn("w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50", !brandFilter ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600")}>Tất cả</button>
                  {brands.map(brand => (
                    <button 
                      key={brand}
                      onClick={() => updateFilter('brand', brand)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        brandFilter === brand ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative min-w-0 shrink-0">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('color')} className={cn("flex h-9 w-auto items-center justify-center gap-1.5 rounded-full border-zinc-200 px-4 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 sm:h-10 sm:px-5", colorFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Màu sắc {colorFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('color'), 'py-2')}>
                  <button onClick={() => updateFilter('color', null)} className={cn("w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50", !colorFilter ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600")}>Tất cả</button>
                  {colors.map(color => (
                    <button 
                      key={color}
                      onClick={() => updateFilter('color', color)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        colorFilter === color ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative min-w-0 shrink-0">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('size')} className={cn("flex h-9 w-auto items-center justify-center gap-1.5 rounded-full border-zinc-200 px-4 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 sm:h-10 sm:px-5", sizeFilter && "border-[#1e4b64] bg-blue-50/50 text-[#1e4b64]")}>
                  Kích cỡ {sizeFilter && <span className="h-1.5 w-1.5 rounded-full bg-[#1e4b64]" />} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <div className={cn(dropdownClass('size'), 'py-2')}>
                  <button onClick={() => updateFilter('size', null)} className={cn("w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50", !sizeFilter ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600")}>Tất cả</button>
                  {sizes.map(size => (
                    <button 
                      key={size}
                      onClick={() => updateFilter('size', size)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        sizeFilter === size ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative min-w-0 shrink-0">
                <Button type="button" variant="outline" onClick={() => toggleFilterMenu('category')} className="flex h-9 w-auto items-center justify-center gap-1.5 rounded-full border-zinc-200 px-4 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 sm:h-10 sm:px-5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col gap-[3px]">
                      <div className="w-3.5 h-[2px] bg-zinc-900 rounded-full" />
                      <div className="w-2.5 h-[2px] bg-zinc-900 rounded-full ml-auto" />
                    </div>
                    Danh mục
                  </div>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                
                <div className={cn(dropdownClass('category', 'left'), 'py-3 sm:right-0 sm:left-auto')}>
                  <div className="px-4 pb-2 mb-2 border-b border-zinc-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Danh mục</span>
                  </div>
                  <button 
                     onClick={() => selectCategoryFromMenu('All')}
                     className={cn(
                       "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                       currentCategory === 'All' ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                     )}
                  >
                    Tất cả sản phẩm
                  </button>
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => selectCategoryFromMenu(cat)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50",
                        currentCategory === cat ? "text-[#1e4b64] bg-blue-50/50" : "text-zinc-600"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort & View Option Group */}
              <div className="flex items-center gap-6 shrink-0 ml-auto border-l border-zinc-200 pl-4 xl:border-none xl:pl-0">
                <div className="flex items-center gap-4 text-[12px] font-medium text-zinc-500 sm:text-[13px]">
                  <div className="relative">
                    <button type="button" onClick={() => toggleFilterMenu('sort')} className="flex items-center gap-1.5 cursor-pointer">
                      <span className="shrink-0">Sắp xếp:</span> <span className="font-bold text-[#1e4b64] hover:underline">
                        {sortFilter === 'newest' ? 'Mới nhất' : 
                         sortFilter === 'price-asc' ? 'Giá thấp đến cao' :
                         sortFilter === 'price-desc' ? 'Giá cao đến thấp' :
                         sortFilter === 'rating' ? 'Đánh giá cao' : 'Nổi bật'}
                      </span> <ChevronDown className="h-3 w-3" />
                    </button>
                    <div className={cn(dropdownClass('sort', 'right'), 'w-56 rounded-xl py-2')}>
                      <button onClick={() => updateFilter('sort', 'newest')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-zinc-50">Mới nhất</button>
                      <button onClick={() => updateFilter('sort', 'price-asc')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-zinc-50">Giá thấp đến cao</button>
                      <button onClick={() => updateFilter('sort', 'price-desc')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-zinc-50">Giá cao đến thấp</button>
                      <button onClick={() => updateFilter('sort', 'rating')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-zinc-50">Đánh giá cao</button>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5">
                    Hiển thị: <span className="font-bold text-[#1e4b64] cursor-pointer hover:underline">30</span> <ChevronDown className="h-3 w-3" />
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-zinc-50 p-1">
                  <button className="h-8 w-8 flex items-center justify-center text-[#1e4b64] bg-white rounded shadow-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  </button>
                  <button className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {showLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onClick={() => navigate(getProductUrl(product))} 
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 mb-6">
            <SlidersHorizontal className="h-8 w-8 text-zinc-300" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-2">Không tìm thấy sản phẩm</h3>
          <p className="text-zinc-500 mb-8">
            {searchQuery ? `Không có sản phẩm phù hợp với "${searchQuery}".` : 'Thử thay đổi bộ lọc hoặc tìm kiếm theo danh mục khác.'}
          </p>
          <Button 
            onClick={() => {
              setSearchParams({});
              setActiveCategory('All');
            }}
            className="bg-[#1e4b64] hover:bg-[#153a4d] text-white font-bold rounded-full px-8"
          >
            Xóa tất cả bộ lọc
          </Button>
        </div>
      )}

      {seoContent && (
        <div className="relative mt-16 w-full border-t border-zinc-100 pt-12">
          <div className="relative w-full overflow-x-hidden">
            <div 
              className={cn(
                "product-description-container notranslate w-full text-zinc-600 transition-[max-height] duration-700 ease-in-out overflow-x-hidden",
                !isSeoExpanded ? "max-h-[118px] overflow-y-hidden sm:max-h-[132px]" : "max-h-none overflow-y-visible"
              )}
            >
              <div dangerouslySetInnerHTML={{ 
                __html: formattedSeoContent
              }} />
            </div>
            
            {!isSeoExpanded && (
              <>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-16 bg-gradient-to-t from-white via-white/90 to-transparent" />
                <div className="pointer-events-none absolute bottom-1 left-0 right-0 z-20 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsSeoExpanded(true)}
                    className="pointer-events-auto flex items-center gap-1.5 bg-white/95 px-2 py-1 text-sm font-bold text-[#1e4b64] transition-colors hover:text-[#153446]"
                  >
                    Xem thêm
                    <ChevronDown className="h-4 w-4 transition-transform duration-300" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={cn("flex justify-center", isSeoExpanded ? "pt-6 mb-12" : "hidden")}>
            <button
              type="button"
              onClick={() => setIsSeoExpanded(!isSeoExpanded)}
              className="pointer-events-auto flex items-center gap-1.5 bg-white/95 px-2 py-1 text-sm font-bold text-[#1e4b64] transition-colors hover:text-[#153446]"
            >
              {isSeoExpanded ? 'Thu gọn' : 'Xem thêm'}
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isSeoExpanded && "rotate-180")} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default ShopPage;
