import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { CATEGORY_METADATA, PRODUCTS, STATIC_BLOG_POSTS } from '../src/data';

// Tải cấu hình biến môi trường
dotenv.config();

// Định nghĩa kiểu dữ liệu báo cáo
type LinkIssue = {
  source: string; // Tên nguồn chứa link (file, sản phẩm, blog)
  link: string;   // Link gốc được phát hiện
  type: 'BROKEN' | 'REDIRECT' | 'OUTDATED_PREFIX'; // Loại vấn đề
  details: string; // Chi tiết mô tả
  suggestion?: string; // Gợi ý sửa đổi
  editUrl?: string;   // Đường dẫn/Link trực tiếp để chỉnh sửa nhanh
};

// ANSI color codes để in console đẹp mắt
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

const slugify = (value: string) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const getCategorySlug = (cat: string) => cat.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

// Bản đồ chuyển hướng/thay thế link kế thừa từ dailySeoSuggestions.ts
const LINK_REPLACEMENTS: Record<string, string> = {
  '/ao-thun-nam/cotton': '/ao-thun-cotton-nam',
  '/ao-thun-nam/the-thao': '/ao-thun-the-thao-nam',
  '/ao-gym-nam': '/ao-thun-the-thao-nam',
  '/do-tap-gym-nam': '/ao-thun-the-thao-nam',
  '/quan-gym-nam': '/quan-the-thao-nam',
  '/quan-the-thao-nam/jogger': '/quan-the-thao-nam',
  '/quan-the-thao-nam/short': '/quan-the-thao-nam',
  '/collection/mua-he': '/ao-thun-nam',
  '/collection/mac-hang-ngay': '/quan-the-thao-nam',
  '/collection/tap-gym': '/ao-thun-the-thao-nam',
  '/collection/best-seller': '/ao-thun-nam'
};

// Danh sách các trang redirects cố định trong React Router
const ROUTE_REDIRECTS: Record<string, string> = {
  '/ao-thun-nam-the-thao': '/ao-thun-the-thao-nam',
  '/ao-thun-nam-cotton': '/ao-thun-cotton-nam'
};

// Hàm tải dữ liệu Firestore động nếu được cấu hình
const loadFirestoreData = async (): Promise<{ products: any[]; blogPosts: any[] } | null> => {
  if (process.env.SITEMAP_USE_FIRESTORE !== 'true') return null;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const appId = process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || 'link-checker';

  if (!projectId || !apiKey) {
    return null;
  }

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, collection, getDocs } = await import('firebase/firestore');

    const app = getApps().length
      ? getApps()[0]
      : initializeApp({
          apiKey,
          projectId,
          appId,
          authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
        });
    const db = getFirestore(app);

    const [productsSnap, blogSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'blogPosts')),
    ]);

    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
    const blogPosts = blogSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);

    return { products, blogPosts };
  } catch (error: any) {
    console.warn(`${colors.yellow}[Firestore] Không thể tải dữ liệu sitemap/link: ${error.message}. Sử dụng dữ liệu tĩnh.${colors.reset}`);
    return null;
  }
};

// Hàm trích xuất toàn bộ các link nội bộ từ nội dung HTML hoặc Markdown
const extractInternalLinks = (text: string): string[] => {
  if (!text) return [];
  const links: string[] = [];
  let match;

  // 1. Trích xuất HTML anchor tags: href="..."
  const htmlHrefRegex = /href=["'](https?:\/\/(?:www\.)?ursport\.vn)?(\/[^"']*)["']/gi;
  while ((match = htmlHrefRegex.exec(text)) !== null) {
    links.push(match[2]);
  }

  // 2. Trích xuất Markdown links: [text](/path)
  const mdLinkRegex = /\[[^\]]*\]\((https?:\/\/(?:www\.)?ursport\.vn)?(\/[^)]*)\)/gi;
  while ((match = mdLinkRegex.exec(text)) !== null) {
    links.push(match[2]);
  }

  // 3. Trích xuất các nhãn chỉ định link trong các file hoạch định SEO .md
  // Ví dụ: Category: /ao-thun-nam hoặc Product target: /san-pham/ao-thun-nam-the-thao-quick-dry
  const labelPathRegex = /(?:Category|Subcategory|Collection|Related blog|Commercial page|Product target|Link|URL|Path):\s*(https?:\/\/(?:www\.)?ursport\.vn)?(\/[a-zA-Z0-9-_\/]+)/gi;
  while ((match = labelPathRegex.exec(text)) !== null) {
    links.push(match[2]);
  }

  // Chuẩn hóa và làm sạch link
  return links
    .map(link => {
      let clean = link.split('?')[0]; // Loại bỏ query parameters
      clean = clean.split('#')[0];    // Loại bỏ hash anchors
      clean = clean.replace(/\/$/, ''); // Loại bỏ trailing slash
      if (clean === '') clean = '/';
      return clean;
    })
    .filter(link => {
      // Bỏ qua các file tài nguyên tĩnh
      const isAsset = /\.(png|jpg|jpeg|gif|svg|pdf|css|js|map|xml|txt|ico|json|webp)$/i.test(link);
      const isAssetDir = link.startsWith('/images') || link.startsWith('/assets') || link.startsWith('/public');
      return !isAsset && !isAssetDir;
    });
};

// Hàm chính chạy Broken Link Checker
const runBrokenLinkChecker = async () => {
  console.log(`\n${colors.bold}${colors.cyan}======================================================================`);
  console.log(`  ___   ____  ____  _  _  ____ _  _    _    _ _  _ _  _    ___ _  _ ____ ____ _  _ ____ ____ `);
  console.log(`  |__]  |__/  |  |  |_/   |___ |\\ |    |    | |\\ | |_/     |    |__| |___ |    |_/  |___ |__/ `);
  console.log(`  |__]  |  \\  |__|  | \\_  |___ | \\|    |___ | | \\| | \\_    |___ |  | |___ |___ | \\_ |___ |  \\ `);
  console.log(`======================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}🕒 Bắt đầu quét kiểm tra liên kết gãy (Broken Link Checker)...${colors.reset}\n`);

  // 1. Tải dữ liệu (Firestore hoặc Static)
  const firestoreData = await loadFirestoreData();
  const activeProducts = firestoreData?.products || PRODUCTS;
  const activeBlogs = firestoreData?.blogPosts || STATIC_BLOG_POSTS;

  console.log(`  • Tổng số sản phẩm cần đối chiếu: ${colors.bold}${activeProducts.length}${colors.reset}`);
  console.log(`  • Tổng số bài viết blog cần đối chiếu: ${colors.bold}${activeBlogs.length}${colors.reset}\n`);

  // 2. Thu thập toàn bộ Route hợp lệ của website
  const validRoutes = new Set<string>();

  // Thêm các trang core tĩnh
  const coreRoutes = [
    '/',
    '/shop',
    '/blog',
    '/checkout',
    '/tra-cuu-don-hang',
    '/so-sanh',
    '/tai-khoan',
    '/yeu-thich',
    '/da-xem',
    '/chinh-sach-giao-hang',
    '/chinh-sach-doi-tra',
    '/quan-tri',
    '/quantri',
    '/admin'
  ];
  coreRoutes.forEach(r => validRoutes.add(r));

  // Thêm các danh mục và trang danh mục blog
  CATEGORY_METADATA.forEach(cat => {
    validRoutes.add(`/${cat.slug}`);
    validRoutes.add(`/blog/category/${slugify(cat.name)}`);
  });

  // Thêm các subcategory SEO
  const subcategoryRoutes = [
    '/ao-thun-cotton-nam',
    '/ao-thun-nam-form-rong',
    '/ao-thun-the-thao-nam'
  ];
  subcategoryRoutes.forEach(r => validRoutes.add(r));

  // Thêm các sản phẩm (cả dạng /slug và dạng /apparel/category/slug)
  const productSlugToInfo = new Map<string, { name: string; categorySlug: string }>();
  activeProducts.forEach(prod => {
    if (!prod.slug) return;
    const catSlug = getCategorySlug(prod.category);
    validRoutes.add(`/${prod.slug}`);
    validRoutes.add(`/apparel/${catSlug}/${prod.slug}`);
    productSlugToInfo.set(prod.slug, { name: prod.name, categorySlug: catSlug });
  });

  // Thêm các bài viết blog và category của blog
  const blogSlugToTitle = new Map<string, string>();
  activeBlogs.forEach(post => {
    const slug = post.slug || post.id;
    if (!slug) return;
    validRoutes.add(`/blog/${slug}`);
    validRoutes.add(`/blog/category/${slugify(post.category)}`);
    blogSlugToTitle.set(slug, post.title);
  });

  const issues: LinkIssue[] = [];

  // Hàm kiểm thử một liên kết nội bộ
  const verifyLink = (sourceName: string, link: string, editUrl?: string) => {
    if (validRoutes.has(link)) {
      return; // Link hoàn toàn hợp lệ!
    }

    // 1. Kiểm tra nếu link nằm trong danh sách Redirects/Replacements cố định
    if (LINK_REPLACEMENTS[link]) {
      issues.push({
        source: sourceName,
        link,
        type: 'REDIRECT',
        details: `Trỏ đến trang thay thế/tối ưu cấu trúc`,
        suggestion: `Thay thế trực tiếp bằng '${LINK_REPLACEMENTS[link]}' để giảm redirect`,
        editUrl
      });
      return;
    }

    if (ROUTE_REDIRECTS[link]) {
      issues.push({
        source: sourceName,
        link,
        type: 'REDIRECT',
        details: `Trỏ đến route tự động chuyển hướng`,
        suggestion: `Thay thế trực tiếp bằng '${ROUTE_REDIRECTS[link]}'`,
        editUrl
      });
      return;
    }

    // 2. Kiểm tra nếu link sử dụng tiền tố cũ /san-pham/:slug
    if (link.startsWith('/san-pham/')) {
      const slug = link.replace('/san-pham/', '');
      if (productSlugToInfo.has(slug)) {
        const info = productSlugToInfo.get(slug)!;
        issues.push({
          source: sourceName,
          link,
          type: 'OUTDATED_PREFIX',
          details: `Dùng tiền tố cũ '/san-pham/slug' cho sản phẩm tồn tại`,
          suggestion: `Thay thế bằng '/${slug}' hoặc '/apparel/${info.categorySlug}/${slug}'`,
          editUrl
        });
        return;
      }
    }

    // 3. Kiểm tra nếu link sử dụng tiền tố cũ /danh-muc/:slug
    if (link.startsWith('/danh-muc/')) {
      const slug = link.replace('/danh-muc/', '');
      const matchedCat = CATEGORY_METADATA.find(c => c.slug === slug || getCategorySlug(c.name) === slug);
      if (matchedCat) {
        issues.push({
          source: sourceName,
          link,
          type: 'OUTDATED_PREFIX',
          details: `Dùng tiền tố cũ '/danh-muc/slug' cho danh mục tồn tại`,
          suggestion: `Thay thế trực tiếp bằng '/${matchedCat.slug}'`,
          editUrl
        });
        return;
      }
    }

    // 4. Kiểm tra các route động (Ví dụ chính sách, đặt hàng thành công)
    if (/^\/chinh-sach\/[a-zA-Z0-9-_]+$/.test(link)) return;
    if (/^\/dat-hang-thanh-cong\/[a-zA-Z0-9-_]+$/.test(link)) return;
    if (/^\/blog\/category\/[a-zA-Z0-9-_]+$/.test(link)) return;

    // Nếu không khớp bất kỳ điều kiện nào, xác định đây là Link Gãy (404)
    issues.push({
      source: sourceName,
      link,
      type: 'BROKEN',
      details: 'Liên kết không tồn tại (404 Not Found)',
      editUrl
    });
  };

  // 3. Tiến hành quét Database sản phẩm
  activeProducts.forEach(prod => {
    const sourceName = `Sản phẩm: '${prod.name}' (${prod.slug || prod.id})`;
    const editUrl = `http://localhost:5173/admin?tab=products&edit=${prod.slug || prod.id}`;
    const links = [
      ...extractInternalLinks(prod.description || ''),
      ...extractInternalLinks(prod.metaDescription || ''),
      ...extractInternalLinks(prod.specifications || ''),
      ...extractInternalLinks(prod.careInstructions || '')
    ];
    links.forEach(l => verifyLink(sourceName, l, editUrl));
  });

  // 4. Tiến hành quét Database bài viết blog
  activeBlogs.forEach(post => {
    const sourceName = `Bài viết: '${post.title}' (${post.slug || post.id})`;
    const editUrl = `http://localhost:5173/admin?tab=blog&edit=${post.slug || post.id}`;
    const links = [
      ...extractInternalLinks(post.content || ''),
      ...extractInternalLinks(post.excerpt || ''),
      ...extractInternalLinks(post.metaDescription || '')
    ];
    links.forEach(l => verifyLink(sourceName, l, editUrl));
  });

  // 5. Tiến hành quét các file Markdown kế hoạch SEO trong thư mục gốc
  try {
    const workspaceFiles = fs.readdirSync(process.cwd());
    const mdFiles = workspaceFiles.filter(file => file.endsWith('.md') && file !== 'README.md' && file !== 'FAQ_FORMAT_RULES.md' && file !== 'PRODUCT_SKILL.md');
    
    mdFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceName = `File Markdown: '${file}'`;
      const editUrl = `file:///${filePath.replace(/\\/g, '/')}`;
      const links = extractInternalLinks(content);
      links.forEach(l => verifyLink(sourceName, l, editUrl));
    });
  } catch (err: any) {
    console.warn(`${colors.yellow}⚠️ Không thể quét các file Markdown ở thư mục gốc: ${err.message}${colors.reset}`);
  }

  // 6. In báo cáo tổng kết
  const brokenIssues = issues.filter(i => i.type === 'BROKEN');
  const redirectIssues = issues.filter(i => i.type === 'REDIRECT');
  const outdatedPrefixIssues = issues.filter(i => i.type === 'OUTDATED_PREFIX');

  if (issues.length === 0) {
    console.log(`┌────────────────────────────────────────────────────────────────────────┐`);
    console.log(`│ ${colors.bold}${colors.green}🎉 HOÀN THÀNH KIỂM TRA: KHÔNG CÓ LIÊN KẾT GÃY NÀO!                      ${colors.reset}│`);
    console.log(`│ Tất cả các liên kết nội bộ đều hoạt động hoàn hảo và chuẩn cấu trúc SEO. │`);
    console.log(`└────────────────────────────────────────────────────────────────────────┘\n`);
  } else {
    console.log(`┌────────────────────────────────────────────────────────────────────────┐`);
    console.log(`│ ${colors.bold}${colors.red}🚨 CẢNH BÁO: PHÁT HIỆN VẤN ĐỀ VỀ LIÊN KẾT TRÊN WEBSITE!                 ${colors.reset}│`);
    console.log(`│ Phát hiện thấy:                                                        │`);
    console.log(`│   • ${colors.bold}${colors.red}${brokenIssues.length.toString().padStart(2)} liên kết bị gãy hoàn toàn (404 Broken)${colors.reset}                       │`);
    console.log(`│   • ${colors.bold}${colors.yellow}${outdatedPrefixIssues.length.toString().padStart(2)} liên kết chứa tiền tố cũ cần đổi (${colors.yellow}Outdated Prefix${colors.reset})           │`);
    console.log(`│   • ${colors.bold}${colors.cyan}${redirectIssues.length.toString().padStart(2)} liên kết đang chuyển hướng cần tối ưu (${colors.cyan}Redirect${colors.reset})               │`);
    console.log(`└────────────────────────────────────────────────────────────────────────┘\n`);

    // In chi tiết từng nhóm lỗi
    if (brokenIssues.length > 0) {
      console.log(`${colors.bold}${colors.bgRed}${colors.white}  DANH SÁCH LIÊN KẾT GÃY (CẦN SỬA GẤP - 404 ERRORS)  ${colors.reset}\n`);
      brokenIssues.forEach((issue, idx) => {
        console.log(`  ${colors.bold}${idx + 1}. Nguồn:${colors.reset} ${colors.magenta}${issue.source}${colors.reset}`);
        console.log(`     ${colors.bold}Link lỗi:${colors.reset} ${colors.red}${issue.link}${colors.reset} → ${colors.bold}Lỗi:${colors.reset} ${issue.details}`);
        if (issue.editUrl) {
          console.log(`     ${colors.bold}👉 Link chỉnh sửa:${colors.reset} ${colors.cyan}${issue.editUrl}${colors.reset}`);
        }
        console.log(`  --------------------------------------------------`);
      });
      console.log();
    }

    if (outdatedPrefixIssues.length > 0) {
      console.log(`${colors.bold}${colors.bgYellow}${colors.white}  DANH SÁCH LIÊN KẾT SAI TIỀN TỐ (OUTDATED PREFIX)  ${colors.reset}\n`);
      outdatedPrefixIssues.forEach((issue, idx) => {
        console.log(`  ${colors.bold}${idx + 1}. Nguồn:${colors.reset} ${colors.magenta}${issue.source}${colors.reset}`);
        console.log(`     ${colors.bold}Link lỗi:${colors.reset} ${colors.yellow}${issue.link}${colors.reset}`);
        console.log(`     ${colors.bold}Gợi ý:${colors.reset} Thay thế bằng ${colors.green}'${issue.suggestion}'${colors.reset}`);
        if (issue.editUrl) {
          console.log(`     ${colors.bold}👉 Link chỉnh sửa:${colors.reset} ${colors.cyan}${issue.editUrl}${colors.reset}`);
        }
        console.log(`  --------------------------------------------------`);
      });
      console.log();
    }

    if (redirectIssues.length > 0) {
      console.log(`${colors.bold}${colors.bgGreen}${colors.white}  DANH SÁCH LIÊN KẾT CẦN TỐI ƯU HÓA (REDIRECTS)  ${colors.reset}\n`);
      redirectIssues.forEach((issue, idx) => {
        console.log(`  ${colors.bold}${idx + 1}. Nguồn:${colors.reset} ${colors.magenta}${issue.source}${colors.reset}`);
        console.log(`     ${colors.bold}Link hiện tại:${colors.reset} ${colors.cyan}${issue.link}${colors.reset}`);
        console.log(`     ${colors.bold}Gợi ý:${colors.reset} ${colors.green}${issue.suggestion}${colors.reset}`);
        if (issue.editUrl) {
          console.log(`     ${colors.bold}👉 Link chỉnh sửa:${colors.reset} ${colors.cyan}${issue.editUrl}${colors.reset}`);
        }
        console.log(`  --------------------------------------------------`);
      });
      console.log();
    }

    // Nếu cấu hình STRICT_LINK_CHECK=true thì dừng quy trình build
    if (process.env.STRICT_LINK_CHECK === 'true' && brokenIssues.length > 0) {
      console.error(`${colors.bold}${colors.red}❌ Quy trình bị dừng do phát hiện link gãy ở chế độ STRICT MODE!${colors.reset}\n`);
      process.exit(1);
    }
  }
};

// Chạy Broken Link Checker
runBrokenLinkChecker().catch(err => {
  console.error(`${colors.red}❌ Đã có lỗi xảy ra trong quá trình chạy Broken Link Checker: ${err.message}${colors.reset}`);
  process.exit(1);
});
