import { BlogPost, Product } from '../types';
import { cleanSeoText } from './seo';

export type SeoIssueSeverity = 'critical' | 'warning' | 'good';

export interface SeoIssue {
  id: string;
  label: string;
  detail: string;
  severity: SeoIssueSeverity;
}

export interface ProductSeoAudit {
  score: number;
  status: 'good' | 'warning' | 'critical';
  issues: SeoIssue[];
  quickWins: SeoIssue[];
}

export interface ContentMapCluster {
  id: string;
  label: string;
  intent: string;
  score: number;
  products: Product[];
  blogs: BlogPost[];
  weakProducts: Array<{ product: Product; audit: ProductSeoAudit }>;
  issues: SeoIssue[];
}

const lengthInRange = (value: string | undefined, min: number, max: number) => {
  const length = String(value || '').trim().length;
  return length >= min && length <= max;
};

const hasKeywordSignal = (product: Product) => {
  const haystack = [
    product.name,
    product.category,
    product.seoTitle,
    product.metaDescription,
    product.keywords,
    product.material,
    product.style,
    product.fashionStyle
  ].join(' ').toLowerCase();

  return ['ao', 'áo', 'thun', 'polo', 'the thao', 'thể thao', 'nam'].some(term => haystack.includes(term));
};

const pushIssue = (issues: SeoIssue[], issue: SeoIssue) => {
  issues.push(issue);
};

export const auditProductSeo = (product: Product): ProductSeoAudit => {
  const issues: SeoIssue[] = [];
  let score = 100;
  const cleanDescription = cleanSeoText(product.description, 1000);

  if (!product.slug || product.slug.length < 5) {
    score -= 12;
    pushIssue(issues, {
      id: 'slug',
      label: 'Thiếu slug SEO',
      detail: 'Slug nên ngắn, có từ khóa và dùng dấu gạch ngang.',
      severity: 'critical'
    });
  }

  if (!lengthInRange(product.seoTitle, 35, 65)) {
    score -= 12;
    pushIssue(issues, {
      id: 'seo-title',
      label: 'Title chưa tối ưu',
      detail: 'Title nên khoảng 35-65 ký tự để đủ ý và ít bị cắt trên Google.',
      severity: 'warning'
    });
  }

  if (!lengthInRange(product.metaDescription, 110, 170)) {
    score -= 12;
    pushIssue(issues, {
      id: 'meta-description',
      label: 'Meta description yếu',
      detail: 'Meta description nên 110-170 ký tự, có lợi ích, chất liệu và lý do mua.',
      severity: 'warning'
    });
  }

  if (cleanDescription.length < 350) {
    score -= 14;
    pushIssue(issues, {
      id: 'description-depth',
      label: 'Mô tả còn mỏng',
      detail: 'Mô tả sản phẩm nên có chất liệu, form, dịp mặc, hướng dẫn chọn size và chăm sóc.',
      severity: 'critical'
    });
  }

  if (!product.images || product.images.length < 2) {
    score -= 10;
    pushIssue(issues, {
      id: 'images',
      label: 'Thiếu ảnh sản phẩm',
      detail: 'Nên có ít nhất 2-4 ảnh: mặt trước, chi tiết chất liệu, ảnh mặc thật, màu/variant.',
      severity: 'warning'
    });
  }

  if (!product.colors?.length || !product.sizes?.length) {
    score -= 8;
    pushIssue(issues, {
      id: 'variants',
      label: 'Thiếu biến thể màu/size',
      detail: 'Màu và size giúp Google hiểu biến thể, đồng thời tăng chuyển đổi.',
      severity: 'warning'
    });
  }

  if (!product.material) {
    score -= 7;
    pushIssue(issues, {
      id: 'material',
      label: 'Thiếu chất liệu',
      detail: 'Chất liệu là tín hiệu quan trọng cho truy vấn áo thun cotton, thun lạnh, thể thao.',
      severity: 'warning'
    });
  }

  if (!product.features?.length) {
    score -= 6;
    pushIssue(issues, {
      id: 'features',
      label: 'Thiếu điểm nổi bật',
      detail: 'Nên có 3-5 bullet về thoáng mát, co giãn, giữ form, phối đồ hoặc tập luyện.',
      severity: 'warning'
    });
  }

  if (!hasKeywordSignal(product)) {
    score -= 6;
    pushIssue(issues, {
      id: 'keyword-signal',
      label: 'Tín hiệu từ khóa chưa rõ',
      detail: 'Tên, title, mô tả nên chứa cụm mô tả sản phẩm thật như áo thun nam, áo polo nam.',
      severity: 'warning'
    });
  }

  if ((product.stock || 0) <= 0) {
    score -= 5;
    pushIssue(issues, {
      id: 'stock',
      label: 'Hết hàng',
      detail: 'Sản phẩm hết hàng vẫn index được, nhưng nên có sản phẩm thay thế hoặc ngày về hàng.',
      severity: 'warning'
    });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const criticalCount = issues.filter(issue => issue.severity === 'critical').length;

  return {
    score: finalScore,
    status: criticalCount > 0 || finalScore < 65 ? 'critical' : finalScore < 85 ? 'warning' : 'good',
    issues,
    quickWins: issues.slice(0, 3)
  };
};

export const summarizeProductSeo = (products: Product[]) => {
  const audits = products.map(product => ({ product, audit: auditProductSeo(product) }));
  const averageScore = audits.length
    ? Math.round(audits.reduce((sum, item) => sum + item.audit.score, 0) / audits.length)
    : 0;
  const critical = audits.filter(item => item.audit.status === 'critical');
  const warning = audits.filter(item => item.audit.status === 'warning');
  const good = audits.filter(item => item.audit.status === 'good');

  return {
    audits,
    averageScore,
    critical,
    warning,
    good,
    topIssues: audits
      .flatMap(item => item.audit.issues)
      .reduce<Record<string, { issue: SeoIssue; count: number }>>((acc, issue) => {
        acc[issue.id] = acc[issue.id] || { issue, count: 0 };
        acc[issue.id].count += 1;
        return acc;
      }, {})
  };
};

const CONTENT_CLUSTERS = [
  {
    id: 'ao-thun-nam',
    label: 'Áo thun nam',
    intent: 'Pillar cho áo thun nam, áo cotton, áo form rộng và áo mặc hằng ngày.',
    terms: ['áo thun', 'ao thun', 'áo phông', 'ao phong', 'cotton', 'form rộng', 'oversize']
  },
  {
    id: 'ao-the-thao-nam',
    label: 'Áo thể thao nam',
    intent: 'Cụm nội dung cho áo tập gym, chạy bộ, đá bóng và chất liệu thấm hút.',
    terms: ['thể thao', 'the thao', 'tập gym', 'tap gym', 'chạy bộ', 'chay bo', 'training', 'compression']
  },
  {
    id: 'ao-polo-nam',
    label: 'Áo polo nam',
    intent: 'Cụm áo polo nam cao cấp, polo thể thao, polo đi làm/đi chơi.',
    terms: ['polo', 'có cổ', 'co co', 'zipper']
  },
  {
    id: 'quan-the-thao-nam',
    label: 'Quần thể thao nam',
    intent: 'Cụm quần short, jogger, quần tập gym và quần chạy bộ.',
    terms: ['quần', 'quan', 'short', 'jogger']
  },
  {
    id: 'phu-kien-the-thao',
    label: 'Phụ kiện thể thao',
    intent: 'Cụm phụ kiện gym, túi, bình nước, găng tay và vật dụng tập luyện.',
    terms: ['phụ kiện', 'phu kien', 'túi', 'tui', 'găng', 'gang', 'bình', 'binh']
  }
];

const normalizeContent = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');

const productContentHaystack = (product: Product) => normalizeContent([
  product.name,
  product.category,
  product.seoTitle,
  product.metaDescription,
  product.keywords,
  product.description,
  product.material,
  product.style,
  product.fashionStyle
].join(' '));

const blogContentHaystack = (post: BlogPost) => normalizeContent([
  post.title,
  post.category,
  post.excerpt,
  post.content,
  post.seoTitle,
  post.metaDescription
].join(' '));

const matchesCluster = (haystack: string, terms: string[]) =>
  terms.some(term => haystack.includes(normalizeContent(term).trim()));

const buildContentMapIssues = (
  cluster: typeof CONTENT_CLUSTERS[number],
  products: Product[],
  blogs: BlogPost[],
  weakProducts: Array<{ product: Product; audit: ProductSeoAudit }>
) => {
  const issues: SeoIssue[] = [];

  if (products.length === 0) {
    issues.push({
      id: `${cluster.id}-missing-product`,
      label: 'Thiếu sản phẩm trụ cột',
      detail: `Cụm ${cluster.label} chưa có sản phẩm rõ ràng để làm landing/pillar.`,
      severity: 'critical'
    });
  }

  if (blogs.length === 0) {
    issues.push({
      id: `${cluster.id}-missing-blog`,
      label: 'Thiếu blog hỗ trợ',
      detail: `Nên có 1-3 bài blog hướng dẫn, so sánh hoặc chọn size để đẩy cụm ${cluster.label}.`,
      severity: 'warning'
    });
  }

  if (products.length > 0 && blogs.length > 0 && products.length > blogs.length * 8) {
    issues.push({
      id: `${cluster.id}-thin-support`,
      label: 'Content hỗ trợ còn mỏng',
      detail: 'Số sản phẩm nhiều hơn blog hỗ trợ khá xa, nên thêm bài tư vấn để tăng liên kết nội bộ.',
      severity: 'warning'
    });
  }

  if (weakProducts.length > 0) {
    issues.push({
      id: `${cluster.id}-weak-products`,
      label: 'Có sản phẩm SEO yếu',
      detail: `${weakProducts.length} sản phẩm trong cụm này cần tối ưu title, meta hoặc mô tả.`,
      severity: weakProducts.length >= 3 ? 'critical' : 'warning'
    });
  }

  return issues;
};

export const buildContentMap = (products: Product[], blogs: BlogPost[] = []): ContentMapCluster[] =>
  CONTENT_CLUSTERS.map(cluster => {
    const matchedProducts = products.filter(product => matchesCluster(productContentHaystack(product), cluster.terms));
    const matchedBlogs = blogs.filter(post => matchesCluster(blogContentHaystack(post), cluster.terms));
    const weakProducts = matchedProducts
      .map(product => ({ product, audit: auditProductSeo(product) }))
      .filter(item => item.audit.status !== 'good');
    const issues = buildContentMapIssues(cluster, matchedProducts, matchedBlogs, weakProducts);
    const score = Math.max(0, Math.min(100, 100 - issues.reduce((total, issue) => (
      total + (issue.severity === 'critical' ? 22 : 12)
    ), 0)));

    return {
      id: cluster.id,
      label: cluster.label,
      intent: cluster.intent,
      score,
      products: matchedProducts,
      blogs: matchedBlogs,
      weakProducts,
      issues
    };
  });
