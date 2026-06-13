import type { Language } from '../LanguageContext';
import type { Product } from '../types';

type LocalizedProduct = Product & {
  nameEn?: string;
  descriptionEn?: string;
  categoryEn?: string;
  enName?: string;
  enDescription?: string;
  enCategory?: string;
  name_en?: string;
  description_en?: string;
  category_en?: string;
  translations?: {
    en?: Partial<Record<'name' | 'description' | 'category', string>>;
  };
};

const CATEGORY_EN: Record<string, string> = {
  'Áo thun nam': "Men's T-Shirts",
  'Áo thun thể thao nam': "Men's Performance T-Shirts",
  'Áo thun nam thể thao': "Men's Performance T-Shirts",
  'Áo thun nam cotton': "Men's Cotton T-Shirts",
  'Áo thun nam form rộng': "Men's Oversized T-Shirts",
  'Áo polo nam': "Men's Polo Shirts",
  'Quần thể thao nam': "Men's Sports Bottoms",
  'Phụ kiện thể thao': 'Sports Accessories',
  All: 'All',
};

const PRODUCT_NAME_EN_BY_ID: Record<string, string> = {
  'ao-thun-cotton-starship-premium': 'Starship Premium Cotton T-Shirt',
  'ao-thun-graphic-run-fast': 'Run Fast Graphic T-Shirt',
  'ao-thun-oversize-urstyle': 'UrStyle Oversized T-Shirt',
  'ao-thun-henley-co-nut': 'Henley Button T-Shirt',
  'ao-thun-soc-ngang-urban': 'Urban Striped T-Shirt',
  'ao-thun-pocket-tee': 'Pocket Tee',
  'ao-thun-longline-modern': 'Modern Longline T-Shirt',
  'ao-thun-in-chim-stealth': 'Stealth Tonal Print T-Shirt',
  'ao-thun-the-thao-nam-chay-bo-gym-pro-dry-khang-khuan': 'Pro-Dry Antibacterial Running and Gym T-Shirt',
  'ao-tanktop-nam-tap-gym-khoe-co-bap-urarmor': 'UrArmor Deep-Cut Gym Tank Top',
  'ao-compression-nam-dai-tay-giu-nhiet-tap-gym-da-bong': 'Long-Sleeve Compression Base Layer',
  'ao-chay-bo-nam-phan-quang-cao-cap-nightrun': 'NightRun Reflective Running T-Shirt',
  'ao-thun-the-thao-nam-co-v-tre-trung-v-neck-sport': 'V-Neck Sport Performance T-Shirt',
  'ao-thun-the-thao-in-hoa-tiet-camo': 'Camo Performance T-Shirt',
  'ao-khoac-gio-the-thao-windbreaker': 'Sport Windbreaker Jacket',
  'ao-thun-sat-nach-stringer': 'Stringer Sleeveless Gym Top',
  'ao-polo-nam-the-thao-golf-classic-lux-cao-cap': 'Classic Lux Golf Polo Shirt',
  'ao-polo-nam-the-thao-sporty-mesh-thoang-khi': 'Sporty Mesh Performance Polo Shirt',
  'ao-polo-nam-phoi-bo-tay-stripe-thoi-trang': 'Stripe Trim Polo Shirt',
  'ao-polo-nam-zipper-tech-khoa-keo': 'Zipper Tech Polo Shirt',
  'ao-polo-nam-det-kim-knit-texture': 'Knit Texture Polo Shirt',
  'ao-polo-active-dri-fit': 'Active Dri-Fit Polo Shirt',
  'ao-polo-pattern-dot': 'Dot Pattern Polo Shirt',
  'ao-polo-long-sleeve-winter': 'Long-Sleeve Winter Polo Shirt',
  'quan-short-chay-bo-elite-night': 'Elite Night Running Shorts',
  'quan-jogger-training-urfocus': 'UrFocus Training Joggers',
  'quan-dui-tap-gym-2-lop': 'Two-Layer Gym Shorts',
  'quan-long-pants-the-thao-pro': 'Pro Sports Training Pants',
  'quan-short-basketball-legend': 'Legend Basketball Shorts',
  'quan-legging-tap-gym-nam': "Men's Gym Leggings",
  'quan-cargo-sport-da-nang': 'Multi-Pocket Sport Cargo Pants',
  'quan-short-boi-urbeach': 'UrBeach Swim Shorts',
  'binh-nuoc-the-thao-tritan-1l': 'Tritan 1L Sports Bottle',
  'tham-yoga-tpe-8mm-sieu-bam': '8mm Non-Slip TPE Yoga Mat',
  'tui-the-thao-gym-bag-duffel': 'Duffel Gym Bag',
  'gang-tay-tap-gym-pro-grip': 'Pro Grip Gym Gloves',
  'non-ket-the-thao-performance': 'Performance Sports Cap',
  'day-nhay-the-luc-speed-rope': 'Speed Rope',
  'tat-the-thao-cotton-cushioned': 'Cushioned Cotton Sports Socks',
  'bo-5-day-mini-band-khang-luc': '5-Piece Resistance Mini Band Set',
};

const getEnglishCustomField = (
  product: Partial<LocalizedProduct>,
  field: 'name' | 'description' | 'category'
) => {
  const pascal = field.charAt(0).toUpperCase() + field.slice(1);
  const candidates = [`${field}En`, `en${pascal}`, `${field}_en`];
  for (const key of candidates) {
    const value = product[key as keyof LocalizedProduct];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return product.translations?.en?.[field]?.trim() || '';
};

const translateProductName = (product: Partial<LocalizedProduct>) => {
  const id = String(product.slug || product.id || '');
  if (PRODUCT_NAME_EN_BY_ID[id]) return PRODUCT_NAME_EN_BY_ID[id];

  return String(product.name || '')
    .replace(/Áo Thun Thể Thao Nam/gi, "Men's Performance T-Shirt")
    .replace(/Áo Thun Nam/gi, "Men's T-Shirt")
    .replace(/Áo Thun/gi, 'T-Shirt')
    .replace(/Áo Polo Nam/gi, "Men's Polo Shirt")
    .replace(/Quần Thể Thao Nam/gi, "Men's Sports Bottoms")
    .replace(/Quần Short/gi, 'Shorts')
    .replace(/Quần Đùi/gi, 'Shorts')
    .replace(/Quần/gi, 'Pants')
    .replace(/Nam/gi, "Men's")
    .replace(/Cổ Tròn/gi, 'Crew Neck')
    .replace(/Tay Ngắn/gi, 'Short-Sleeve')
    .replace(/Cổ bẻ/gi, 'Polo Collar')
    .replace(/Cá Tính/gi, 'Stylish')
    .replace(/Lịch Lãm/gi, 'Smart')
    .replace(/Vải dầy dặn/gi, 'Substantial Fabric')
    .replace(/co giãn tốt/gi, 'Good Stretch')
    .replace(/con giãn tốt/gi, 'Good Stretch')
    .replace(/Đen/gi, 'Black')
    .replace(/Trắng/gi, 'White')
    .replace(/Xanh Đen/gi, 'Navy')
    .replace(/Xám/gi, 'Gray')
    .replace(/Chuẩn Form/gi, 'True Fit')
    .replace(/Chuẩn Fit/gi, 'True Fit')
    .replace(/Form(?=\s|$|,|-)/gi, 'Fit')
    .replace(/Nam Tính/gi, 'Masculine')
    .replace(/Thể Thao/gi, 'Performance')
    .replace(/4 Chiều/gi, '4-Way Stretch')
    .replace(/Cao Cấp/gi, 'Premium')
    .replace(/Thoáng Mát/gi, 'Breathable')
    .replace(/Thoáng Khí/gi, 'Breathable')
    .replace(/Khô Nhanh/gi, 'Quick-Dry')
    .replace(/Mềm Mại/gi, 'Soft')
    .replace(/Kháng Khuẩn/gi, 'Antibacterial')
    .replace(/Chạy Bộ/gi, 'Running')
    .replace(/Tập Gym/gi, 'Gym')
    .replace(/Vải Thun Lạnh/gi, 'Cool-Touch Fabric')
    .replace(/Thời Trang/gi, 'Fashion')
    .replace(/\s+/g, ' ')
    .trim();
};

const translateProductAttribute = (value = '') => value
  .replace(/Việt Nam/gi, 'Vietnam')
  .replace(/Thể thao/gi, 'Sport')
  .replace(/Cơ bản/gi, 'Basic')
  .replace(/Hàn Quốc/gi, 'Korean')
  .replace(/Đường phố/gi, 'Streetwear')
  .replace(/Công sở/gi, 'Office')
  .replace(/Cổ tròn/gi, 'Crew neck')
  .replace(/Cổ bẻ/gi, 'Polo collar')
  .replace(/Thun lạnh/gi, 'Cool-touch knit')
  .replace(/Thoáng mát/gi, 'Breathable')
  .replace(/Co giãn/gi, 'Stretch')
  .replace(/Kháng khuẩn/gi, 'Antibacterial')
  .replace(/Mềm mại/gi, 'Soft')
  .replace(/Cao cấp/gi, 'Premium')
  .trim();

const buildEnglishProductDescription = (product: Partial<LocalizedProduct>) => {
  const name = getEnglishCustomField(product, 'name') || translateProductName(product);
  const category = getEnglishCustomField(product, 'category') || CATEGORY_EN[String(product.category || '')] || 'sportswear';
  const material = translateProductAttribute(String(product.material || 'premium performance fabric'));
  const style = translateProductAttribute(String(product.style || product.fashionStyle || 'modern athletic fit'));
  const lower = `${product.name || ''} ${product.category || ''} ${product.slug || ''}`.toLowerCase();
  const isBottom = lower.includes('quần') || lower.includes('quan-');
  const isPolo = lower.includes('polo');

  return `
    <h2>${name}</h2>
    <p>${name} is designed for men who want ${category.toLowerCase()} that feels comfortable, looks clean and works well for daily movement.</p>
    <h3>Highlights</h3>
    <ul>
      <li>Material: ${material}</li>
      <li>Fit: ${style}</li>
      <li>Comfortable for ${isBottom ? 'training, travel and casual outfits' : isPolo ? 'smart casual looks, light activity and everyday wear' : 'daily wear, gym sessions and active days'}</li>
      <li>Easy to pair with T-shirts, polo shirts, shorts, joggers or sports bottoms from UR Sport</li>
    </ul>
    <h3>Why you will like it</h3>
    <p>The fabric is selected for a balanced feel: soft enough for all-day wear, practical enough for movement and durable enough for repeated use. The silhouette keeps the outfit neat without feeling stiff.</p>
    <h3>Styling suggestion</h3>
    <p>${isBottom ? 'Pair these sports bottoms with a clean performance T-shirt or polo shirt for a simple athletic look.' : 'Pair this top with black sports bottoms, shorts or joggers for a sharp active outfit.'}</p>
    <h3>Care instructions</h3>
    <p>Wash with similar colors, avoid harsh bleach and dry in a shaded area to help preserve fabric quality and shape.</p>
  `;
};

export const getLocalizedProductName = (product: Partial<LocalizedProduct>, language: Language) => {
  if (language !== 'en') return product.name || '';
  return getEnglishCustomField(product, 'name') || translateProductName(product);
};

export const getLocalizedProductCategory = (product: Partial<LocalizedProduct>, language: Language) => {
  const category = String(product.category || '');
  if (language !== 'en') return category;
  return getEnglishCustomField(product, 'category') || CATEGORY_EN[category] || category;
};

export const getLocalizedCategoryLabel = (category: string, language: Language) => {
  if (language !== 'en') return category;
  return CATEGORY_EN[category] || category;
};

export const getLocalizedProductDescription = (product: Partial<LocalizedProduct>, language: Language) => {
  if (language !== 'en') return product.description || '';
  return getEnglishCustomField(product, 'description') || buildEnglishProductDescription(product);
};

export const getLocalizedProductAttribute = (value: string | undefined, language: Language) => {
  if (language !== 'en') return value || '';
  return translateProductAttribute(value || '');
};
