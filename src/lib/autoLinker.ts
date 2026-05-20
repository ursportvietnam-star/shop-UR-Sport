import { BlogPost } from '../types';

export interface KeywordRule {
  keyword: string;
  url: string;
  categoryName: string;
}

export const STATIC_KEYWORD_RULES: KeywordRule[] = [
  // 1. Blog posts cụ thể (đã có trong dữ liệu)
  { keyword: 'bí quyết chọn áo thun thể thao nam', url: '/blog/bi-quyet-chon-ao-thun-the-thao-nam', categoryName: 'Bài viết Blog' },
  { keyword: 'top 5 mẫu áo polo nam', url: '/blog/top-5-ao-polo-nam-cao-cap', categoryName: 'Bài viết Blog' },
  { keyword: 'phối đồ với áo thun thể thao', url: '/blog/cach-phoi-do-voi-ao-thun-the-thao-nam', categoryName: 'Bài viết Blog' },
  { keyword: 'thời trang nam athleisure', url: '/blog/phong-cach-thoi-trang-the-thao-nam-athleisure', categoryName: 'Bài viết Blog' },
  { keyword: 'bảo quản áo polo', url: '/blog/bao-quan-ao-polo-va-ao-thun-the-thao', categoryName: 'Bài viết Blog' },

  // 2. Áo thun thể thao nam
  { keyword: 'áo thun thể thao nam', url: '/ao-thun-the-thao-nam', categoryName: 'Áo thun thể thao nam' },
  { keyword: 'áo thun thể thao', url: '/ao-thun-the-thao-nam', categoryName: 'Áo thun thể thao nam' },
  { keyword: 'áo thun nam thể thao', url: '/ao-thun-the-thao-nam', categoryName: 'Áo thun thể thao nam' },
  { keyword: 'đồ tập gym nam', url: '/ao-thun-the-thao-nam', categoryName: 'Áo thun thể thao nam' },
  { keyword: 'áo tập gym nam', url: '/ao-thun-the-thao-nam', categoryName: 'Áo thun thể thao nam' },
  { keyword: 'đồ tập gym', url: '/ao-thun-the-thao-nam', categoryName: 'Áo thun thể thao nam' },
  { keyword: 'đồ gym nam', url: '/ao-thun-the-thao-nam', categoryName: 'Áo thun thể thao nam' },
  { keyword: 'áo gym nam', url: '/ao-thun-the-thao-nam', categoryName: 'Áo thun thể thao nam' },

  // 3. Áo thun cotton nam
  { keyword: 'áo thun nam cotton', url: '/ao-thun-cotton-nam', categoryName: 'Áo thun nam cotton' },
  { keyword: 'áo thun cotton nam', url: '/ao-thun-cotton-nam', categoryName: 'Áo thun nam cotton' },
  { keyword: 'áo thun cotton', url: '/ao-thun-cotton-nam', categoryName: 'Áo thun nam cotton' },

  // 4. Áo thun nam form rộng
  { keyword: 'áo thun nam form rộng', url: '/ao-thun-nam-form-rong', categoryName: 'Áo thun nam form rộng' },
  { keyword: 'áo thun form rộng nam', url: '/ao-thun-nam-form-rong', categoryName: 'Áo thun nam form rộng' },
  { keyword: 'áo thun form rộng', url: '/ao-thun-nam-form-rong', categoryName: 'Áo thun nam form rộng' },
  { keyword: 'áo thun oversize', url: '/ao-thun-nam-form-rong', categoryName: 'Áo thun nam form rộng' },

  // 5. Áo polo nam
  { keyword: 'áo polo nam', url: '/ao-polo-nam', categoryName: 'Áo polo nam' },
  { keyword: 'áo polo', url: '/ao-polo-nam', categoryName: 'Áo polo nam' },
  { keyword: 'áo thun polo', url: '/ao-polo-nam', categoryName: 'Áo polo nam' },

  // 6. Quần thể thao nam
  { keyword: 'quần thể thao nam', url: '/quan-the-thao-nam', categoryName: 'Quần thể thao nam' },
  { keyword: 'quần thể thao', url: '/quan-the-thao-nam', categoryName: 'Quần thể thao nam' },
  { keyword: 'quần short thể thao', url: '/quan-the-thao-nam', categoryName: 'Quần thể thao nam' },
  { keyword: 'quần short nam', url: '/quan-the-thao-nam', categoryName: 'Quần thể thao nam' },
  { keyword: 'quần jogger nam', url: '/quan-the-thao-nam', categoryName: 'Quần thể thao nam' },
  { keyword: 'quần jogger thể thao', url: '/quan-the-thao-nam', categoryName: 'Quần thể thao nam' },
  { keyword: 'quần jogger', url: '/quan-the-thao-nam', categoryName: 'Quần thể thao nam' },

  // 7. Phụ kiện thể thao
  { keyword: 'phụ kiện thể thao', url: '/phu-kien-the-thao', categoryName: 'Phụ kiện thể thao' },
  { keyword: 'phụ kiện gym', url: '/phu-kien-the-thao', categoryName: 'Phụ kiện thể thao' },
  { keyword: 'túi thể thao', url: '/phu-kien-the-thao', categoryName: 'Phụ kiện thể thao' },

  // 8. Áo thun nam chung
  { keyword: 'áo thun nam', url: '/ao-thun-nam', categoryName: 'Áo thun nam' },
  { keyword: 'áo thun', url: '/ao-thun-nam', categoryName: 'Áo thun nam' },
  { keyword: 'áo phông', url: '/ao-thun-nam', categoryName: 'Áo thun nam' },
];

const isBrowser = () => typeof DOMParser !== 'undefined' && typeof document !== 'undefined';

// Sắp xếp các quy tắc theo độ dài từ khóa giảm dần (Longest Match First)
const getSortedRules = (blogPosts: BlogPost[] = []): KeywordRule[] => {
  const dynamicBlogRules: KeywordRule[] = blogPosts.map(post => ({
    keyword: post.title.toLowerCase().trim(),
    url: `/blog/${post.slug || post.id}`,
    categoryName: 'Bài viết Blog'
  }));

  const allRules = [...dynamicBlogRules, ...STATIC_KEYWORD_RULES];
  
  // Lọc trùng từ khóa (ưu tiên quy tắc có trước)
  const seenKeywords = new Set<string>();
  const uniqueRules = allRules.filter(rule => {
    const key = rule.keyword.toLowerCase().trim();
    if (seenKeywords.has(key)) return false;
    seenKeywords.add(key);
    return true;
  });

  return uniqueRules.sort((a, b) => b.keyword.length - a.keyword.length);
};

export interface DetectedLink {
  keyword: string;
  url: string;
  categoryName: string;
  status: 'already_linked' | 'suggested';
}

/**
 * Quét HTML để phát hiện các từ khóa đã liên kết và các từ khóa có thể chèn liên kết.
 */
export const analyzeInternalLinks = (html: string, blogPosts: BlogPost[] = []): DetectedLink[] => {
  if (!html || !isBrowser()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const wrapper = doc.body.firstElementChild;
  if (!wrapper) return [];

  const detected: DetectedLink[] = [];
  const rules = getSortedRules(blogPosts);

  // 1. Quét các link đã có sẵn trong bài viết
  const existingLinks = wrapper.querySelectorAll('a');
  const linkedUrls = new Set<string>();
  const linkedTextMap = new Set<string>();

  existingLinks.forEach(a => {
    const href = a.getAttribute('href') || '';
    const text = a.textContent?.trim().toLowerCase() || '';
    if (href) linkedUrls.add(href);
    if (text) linkedTextMap.add(text);
  });

  // Ghi nhận các link đã có sẵn
  rules.forEach(rule => {
    const isUrlLinked = linkedUrls.has(rule.url);
    const isTextLinked = linkedTextMap.has(rule.keyword.toLowerCase());

    if (isUrlLinked || isTextLinked) {
      // Đã được liên kết
      const exists = detected.some(d => d.url === rule.url);
      if (!exists) {
        detected.push({
          keyword: rule.keyword,
          url: rule.url,
          categoryName: rule.categoryName,
          status: 'already_linked'
        });
      }
    }
  });

  // 2. Tìm kiếm các text nodes để phát hiện từ khóa chưa liên kết
  const textNodes: Text[] = [];
  
  const collectTextNodes = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = (node as Element).tagName.toUpperCase();
      // Skip if already in an <a> tag or heading tag
      if (tagName === 'A' || tagName.match(/^H[1-6]$/)) {
        return;
      }
    }

    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text);
      return;
    }

    const children = Array.from(node.childNodes);
    for (const child of children) {
      collectTextNodes(child);
    }
  };

  collectTextNodes(wrapper);

  // Đếm các URL/từ khóa đã được đề xuất hoặc đã liên kết trong phiên quét này
  const activeLinkedUrls = new Set<string>(linkedUrls);
  const activeLinkedKeywords = new Set<string>(
    Array.from(linkedTextMap).map(k => k.toLowerCase())
  );

  textNodes.forEach(node => {
    const text = node.nodeValue || '';
    if (!text.trim()) return;

    rules.forEach(rule => {
      // Bỏ qua nếu URL hoặc từ khóa đã có liên kết rồi
      if (activeLinkedUrls.has(rule.url) || activeLinkedKeywords.has(rule.keyword.toLowerCase())) {
        return;
      }

      // Khớp từ khóa case-insensitively
      const escaped = rule.keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'i');
      
      if (regex.test(text)) {
        // Ghi nhận đề xuất chèn link
        detected.push({
          keyword: rule.keyword,
          url: rule.url,
          categoryName: rule.categoryName,
          status: 'suggested'
        });

        // Chỉ gợi ý chèn 1 lần duy nhất cho mỗi URL/từ khóa
        activeLinkedUrls.add(rule.url);
        activeLinkedKeywords.add(rule.keyword.toLowerCase());
      }
    });
  });

  return detected;
};

/**
 * Tự động chèn liên kết nội bộ an toàn vào HTML.
 */
export const injectInternalLinks = (html: string, blogPosts: BlogPost[] = []): { updatedHtml: string; changesCount: number } => {
  if (!html || !isBrowser()) return { updatedHtml: html, changesCount: 0 };

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const wrapper = doc.body.firstElementChild;
  if (!wrapper) return { updatedHtml: html, changesCount: 0 };

  const rules = getSortedRules(blogPosts);

  // Lấy danh sách URL đã có sẵn link để tránh trùng lặp
  const existingLinks = wrapper.querySelectorAll('a');
  const linkedUrls = new Set<string>();
  const linkedKeywords = new Set<string>();

  existingLinks.forEach(a => {
    const href = a.getAttribute('href') || '';
    const text = a.textContent?.trim().toLowerCase() || '';
    if (href) linkedUrls.add(href);
    if (text) linkedKeywords.add(text);
  });

  let changesCount = 0;

  // Hàm đệ quy xử lý văn bản và chèn link
  const processTextNode = (node: Text, rulesList: KeywordRule[]): Node[] | null => {
    const text = node.nodeValue || '';
    if (!text.trim()) return null;

    for (const rule of rulesList) {
      if (linkedUrls.has(rule.url) || linkedKeywords.has(rule.keyword.toLowerCase())) {
        continue;
      }

      const escaped = rule.keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'i');
      const match = text.match(regex);

      if (match && match.index !== undefined) {
        const matchedText = match[0];
        const index = match.index;

        const beforeText = text.substring(0, index);
        const afterText = text.substring(index + matchedText.length);

        const nodes: Node[] = [];

        if (beforeText) {
          nodes.push(doc.createTextNode(beforeText));
        }

        const a = doc.createElement('a');
        a.setAttribute('href', rule.url);
        // Thiết kế class premium tương ứng với style chung
        a.className = 'hover:underline text-purple-600 font-semibold transition-all';
        a.appendChild(doc.createTextNode(matchedText));
        nodes.push(a);

        changesCount++;
        linkedUrls.add(rule.url);
        linkedKeywords.add(rule.keyword.toLowerCase());

        if (afterText) {
          const afterNode = doc.createTextNode(afterText);
          const subsequentNodes = processTextNode(afterNode, rulesList);
          if (subsequentNodes) {
            nodes.push(...subsequentNodes);
          } else {
            nodes.push(afterNode);
          }
        }

        return nodes;
      }
    }

    return null;
  };

  // Hàm duyệt toàn bộ cây DOM và thay thế các Text nodes thích hợp
  const walkAndInject = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = (node as Element).tagName.toUpperCase();
      // Bỏ qua các thẻ <a> và thẻ tiêu đề H1-H6
      if (tagName === 'A' || tagName.match(/^H[1-6]$/)) {
        return;
      }
    }

    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        const newNodes = processTextNode(child as Text, rules);
        if (newNodes) {
          const parent = child.parentNode;
          if (parent) {
            newNodes.forEach(newNode => {
              parent.insertBefore(newNode, child);
            });
            parent.removeChild(child);
          }
        }
      } else {
        walkAndInject(child);
      }
    }
  };

  walkAndInject(wrapper);

  return {
    updatedHtml: wrapper.innerHTML,
    changesCount
  };
};
