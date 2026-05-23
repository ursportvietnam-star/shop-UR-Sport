import { BlogPost } from '../types';

import aoThunPlan from '../../01-ao-thun-nam.md?raw';
import quanTheThaoPlan from '../../02-quan-the-thao.md?raw';
import doGymPlan from '../../03-do-gym.md?raw';
import chatLieuPlan from '../../04-chat-lieu.md?raw';
import sizePlan from '../../05-size.md?raw';
import phoiDoPlan from '../../06-phoi-do.md?raw';
import buyerPlan from '../../07-buyer.md?raw';
import keywordMasterPlan from '../../08-keyword-master.md?raw';
import roadmapPlan from '../../09-roadmap.md?raw';
import aiAutomationPlan from '../../10-ai-automation.md?raw';

export type SeoSuggestion = {
  id: string;
  sourceFile: string;
  order: number;
  title: string;
  slug: string;
  keyword: string;
  secondaryKeywords: string;
  intent: string;
  funnel: string;
  cluster: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  url: string;
  seoTitle: string;
  seoDescription: string;
  internalLinks: string[];
  reason: string;
  sourceMarkdownContext: string;
  outline: Array<{
    h2: string;
    h3: string[];
  }>;
};

const SEO_PLAN_FILES = [
  { sourceFile: '01-ao-thun-nam.md', raw: aoThunPlan },
  { sourceFile: '02-quan-the-thao.md', raw: quanTheThaoPlan },
  { sourceFile: '03-do-gym.md', raw: doGymPlan },
  { sourceFile: '04-chat-lieu.md', raw: chatLieuPlan },
  { sourceFile: '05-size.md', raw: sizePlan },
  { sourceFile: '06-phoi-do.md', raw: phoiDoPlan },
  { sourceFile: '07-buyer.md', raw: buyerPlan }
];

const SEO_GLOBAL_CONTEXT_FILES = [
  { sourceFile: '08-keyword-master.md', raw: keywordMasterPlan },
  { sourceFile: '09-roadmap.md', raw: roadmapPlan },
  { sourceFile: '10-ai-automation.md', raw: aiAutomationPlan }
];

const SOURCE_CLUSTER: Record<string, string> = {
  '01-ao-thun-nam.md': 'Áo thun nam',
  '02-quan-the-thao.md': 'Quần thể thao nam',
  '03-do-gym.md': 'Đồ tập gym nam',
  '04-chat-lieu.md': 'Chất liệu vải',
  '05-size.md': 'Size & bảng size',
  '06-phoi-do.md': 'Phối đồ nam',
  '07-buyer.md': 'Buyer / Commercial'
};

const FUNNEL_SCORE: Record<string, number> = {
  TOFU: 0,
  MOFU: 1,
  BOFU: 2
};

const PRIORITY_SCORE: Record<SeoSuggestion['priority'], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

const CLUSTER_LINKS: Record<string, string[]> = {
  'Áo thun nam': ['/ao-thun-nam', '/ao-thun-the-thao-nam'],
  'Quần thể thao nam': ['/quan-the-thao-nam', '/ao-thun-nam'],
  'Đồ tập gym nam': ['/ao-thun-the-thao-nam', '/quan-the-thao-nam'],
  'Chất liệu vải': ['/ao-thun-nam', '/ao-thun-the-thao-nam'],
  'Size & bảng size': ['/ao-thun-nam', '/quan-the-thao-nam'],
  'Phối đồ nam': ['/ao-thun-nam', '/quan-the-thao-nam'],
  'Buyer / Commercial': ['/ao-thun-nam', '/quan-the-thao-nam']
};

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

const normalizeText = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const cleanInline = (value: string) =>
  value
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+$/g, '')
    .trim();

const cleanSlug = (value: string) => value.replace(/`/g, '').trim();

const stripQuestionMark = (value: string) => value.replace(/\?+$/g, '').trim();

const compactMarkdownContext = (value: string, maxLength = 4200) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);

const extractSuggestionMarkdownContext = (raw: string, order?: number) => {
  if (!order) return compactMarkdownContext(raw, 3000);
  const pattern = new RegExp(`(^##\\s+${order}\\.\\s+[\\s\\S]*?)(?=^##\\s+\\d+\\.\\s+|$)`, 'm');
  const match = raw.match(pattern);
  return compactMarkdownContext(match?.[1] || raw, 3200);
};

const getGlobalMarkdownContext = () =>
  SEO_GLOBAL_CONTEXT_FILES
    .map(file => {
      const lines = file.raw
        .split(/\r?\n/)
        .filter(line =>
          /^#{1,3}\s+/.test(line)
          || /keyword|intent|funnel|roadmap|automation|internal link|content|SEO/i.test(line)
        )
        .slice(0, 42)
        .join('\n');

      return `### ${file.sourceFile}\n${compactMarkdownContext(lines || file.raw, 1800)}`;
    })
    .join('\n\n');

const compactTitle = (title: string, maxLength = 58) => {
  const cleanTitle = stripQuestionMark(title);
  if (cleanTitle.length <= maxLength) return cleanTitle;
  const beforeColon = cleanTitle.split(':')[0]?.trim();
  if (beforeColon && beforeColon.length >= 28 && beforeColon.length <= maxLength) return beforeColon;
  return `${cleanTitle.slice(0, maxLength - 1).trim()}…`;
};

const buildMetaDescription = (suggestion: Pick<SeoSuggestion, 'title' | 'keyword' | 'cluster'>) => {
  const base = `Tìm hiểu ${suggestion.keyword}, tiêu chí chọn đúng và gợi ý phối/mua phù hợp cho nam giới cùng URSport.`;
  if (base.length >= 130 && base.length <= 165) return base;
  return `Hướng dẫn ${suggestion.keyword} theo nhu cầu thực tế, giúp chọn ${suggestion.cluster.toLowerCase()} thoải mái, dễ mặc và hợp phong cách URSport.`;
};

const buildOutline = (suggestion: Pick<SeoSuggestion, 'title' | 'keyword' | 'cluster' | 'intent' | 'funnel'>) => {
  const subject = stripQuestionMark(suggestion.title).toLowerCase();
  const isBuyer = suggestion.funnel === 'BOFU' || /mua|giá|review|ở đâu/i.test(suggestion.keyword);
  const isComparison = / vs |khác|so sánh|hay/i.test(suggestion.keyword);

  return [
    {
      h2: `${stripQuestionMark(suggestion.title)}: hiểu đúng nhu cầu`,
      h3: ['Người đọc đang cần giải quyết điều gì?', `Khi nào nên quan tâm đến ${subject}?`]
    },
    {
      h2: isComparison ? 'So sánh các lựa chọn phổ biến' : 'Tiêu chí chọn đúng',
      h3: ['Chất liệu, form dáng và độ thoải mái', 'Lỗi thường gặp khi chọn mua']
    },
    {
      h2: isBuyer ? 'Gợi ý mua tại URSport' : 'Cách ứng dụng trong thực tế',
      h3: ['Sản phẩm hoặc danh mục nên tham khảo', 'Checklist nhanh trước khi quyết định']
    },
    {
      h2: 'Câu hỏi thường gặp',
      h3: ['Nên chọn loại nào?', 'Có phù hợp mặc hằng ngày không?', 'Mua sản phẩm liên quan ở đâu?']
    }
  ];
};

const parsePlanFile = (raw: string, sourceFile: string): SeoSuggestion[] => {
  const lines = raw.split(/\r?\n/);
  const suggestions: SeoSuggestion[] = [];
  let current: Partial<SeoSuggestion> | null = null;

  const pushCurrent = () => {
    if (!current?.title || !current.slug || !current.keyword) return;
    const cluster = current.cluster || '';
    const baseSuggestion = {
      ...current,
      id: `${sourceFile}:${current.order}`,
      sourceFile,
      cluster,
      priority: current.priority || 'MEDIUM',
      intent: current.intent || 'Informational',
      funnel: current.funnel || 'TOFU',
      secondaryKeywords: current.secondaryKeywords || '',
      url: current.url || `https://shop-ur-sport.vercel.app/blog/${current.slug}`,
      seoTitle: current.seoTitle || `${compactTitle(current.title)} | URSport`,
      seoDescription: current.seoDescription || buildMetaDescription({
        title: current.title,
        keyword: current.keyword,
        cluster
      }),
      internalLinks: current.internalLinks || [],
      reason: '',
      sourceMarkdownContext: extractSuggestionMarkdownContext(raw, current.order),
      outline: []
    } as SeoSuggestion;

    baseSuggestion.outline = buildOutline(baseSuggestion);
    suggestions.push(baseSuggestion);
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(\d+)\.\s+(.+)/);
    if (headingMatch) {
      pushCurrent();
      current = {
        order: Number(headingMatch[1]),
        title: cleanInline(headingMatch[2]),
        internalLinks: []
      };
      continue;
    }

    if (!current) continue;

    const fieldMatch = line.match(/^\*\*(.+?):\*\*\s*(.+?)\s*$/);
    if (fieldMatch) {
      const [, label, rawValue] = fieldMatch;
      const value = cleanInline(rawValue);
      if (label === 'Slug') current.slug = cleanSlug(value);
      if (label === 'Primary keyword') current.keyword = value;
      if (label === 'Secondary keywords') current.secondaryKeywords = value;
      if (label === 'Search intent') current.intent = value;
      if (label === 'Funnel stage') current.funnel = value;
      if (label === 'Content silo') current.cluster = SOURCE_CLUSTER[sourceFile] || value.replace(/^\d+\s+-\s+/, '');
      if (label === 'Priority') current.priority = value as SeoSuggestion['priority'];
      if (label === 'Recommended URL') current.url = cleanSlug(value);
      continue;
    }

    if (/^-\s+`?\//.test(line)) {
      current.internalLinks = [
        ...(current.internalLinks || []),
        cleanSlug(line.replace(/^-\s+/, ''))
      ];
    }
  }

  pushCurrent();
  return suggestions;
};

export const SEO_DAILY_SUGGESTIONS = SEO_PLAN_FILES.flatMap(file => parsePlanFile(file.raw, file.sourceFile));

const getPublishedSlugs = (blogPosts: BlogPost[]) =>
  new Set(blogPosts.map(post => normalizeText(post.slug || post.id || post.title)));

const getLatestPost = (blogPosts: BlogPost[]) =>
  [...blogPosts].sort((a, b) => {
    const bDate = new Date(String(b.createdAt?.toDate?.() || b.createdAt || b.date || 0)).getTime();
    const aDate = new Date(String(a.createdAt?.toDate?.() || a.createdAt || a.date || 0)).getTime();
    return bDate - aDate;
  })[0];

const isSameTopic = (suggestion: SeoSuggestion, latestPost?: BlogPost) => {
  if (!latestPost) return false;
  const latestText = normalizeText(`${latestPost.title} ${latestPost.slug} ${latestPost.category}`);
  const clusterText = normalizeText(suggestion.cluster);
  const keywordTokens = normalizeText(suggestion.keyword).split(' ').filter(token => token.length > 3);
  const sharedTokens = keywordTokens.filter(token => latestText.includes(token)).length;
  return Boolean(clusterText && latestText.includes(clusterText)) || sharedTokens >= 3;
};

const normalizeInternalLinks = (links: string[]) =>
  [...new Set(links.map(link => LINK_REPLACEMENTS[link] || link))]
    .filter(link => !link.startsWith('/collection/'))
    .slice(0, 5);

const buildRecommendedLinks = (
  suggestion: SeoSuggestion,
  blogPosts: BlogPost[],
  publishedSlugs: Set<string>
) => {
  const relatedPublishedBlogs = blogPosts
    .filter(post => normalizeText(post.slug) !== normalizeText(suggestion.slug))
    .filter(post => matchesSuggestion(post, suggestion))
    .slice(0, 2)
    .map(post => `/blog/${post.slug || post.id}`);

  const clusterLinks = CLUSTER_LINKS[suggestion.cluster] || ['/ao-thun-nam', '/quan-the-thao-nam'];
  const plannedBlogLinks = SEO_DAILY_SUGGESTIONS
    .filter(item => item.cluster === suggestion.cluster && item.slug !== suggestion.slug)
    .filter(item => publishedSlugs.has(normalizeText(item.slug)))
    .slice(0, 2)
    .map(item => `/blog/${item.slug}`);

  return [
    ...relatedPublishedBlogs,
    ...plannedBlogLinks,
    ...normalizeInternalLinks(suggestion.internalLinks),
    ...clusterLinks
  ].filter((link, index, arr) => arr.indexOf(link) === index).slice(0, 6);
};

const matchesSuggestion = (post: BlogPost, suggestion: SeoSuggestion) => {
  const postText = normalizeText(`${post.title} ${post.slug} ${post.category} ${post.excerpt}`);
  const clusterText = normalizeText(suggestion.cluster);
  if (clusterText && postText.includes(clusterText)) return true;
  return normalizeText(suggestion.keyword)
    .split(' ')
    .filter(token => token.length > 3)
    .some(token => postText.includes(token));
};

const withReasonAndLinks = (
  suggestion: SeoSuggestion,
  blogPosts: BlogPost[],
  publishedSlugs: Set<string>,
  latestPost?: BlogPost
): SeoSuggestion => {
  const avoidsLatestTopic = latestPost && !isSameTopic(suggestion, latestPost);
  const reasonParts = [
    `Priority ${suggestion.priority}`,
    `${suggestion.intent} / ${suggestion.funnel}`,
    `cụm ${suggestion.cluster}`,
    avoidsLatestTopic ? 'không trùng chủ đề với bài gần nhất' : 'phù hợp làm bài tiếp theo trong cụm'
  ];

  return {
    ...suggestion,
    internalLinks: buildRecommendedLinks(suggestion, blogPosts, publishedSlugs),
    reason: reasonParts.join(', ')
  };
};

export const getDailySeoSuggestions = (blogPosts: BlogPost[], limit = 4) => {
  const publishedSlugs = getPublishedSlugs(blogPosts);
  const latestPost = getLatestPost(blogPosts);
  const unpublished = SEO_DAILY_SUGGESTIONS.filter(item => !publishedSlugs.has(normalizeText(item.slug)));
  const differentTopic = unpublished.filter(item => !isSameTopic(item, latestPost));
  const candidatePool = differentTopic.length > 0 ? differentTopic : unpublished;

  return candidatePool
    .sort((a, b) =>
      PRIORITY_SCORE[a.priority] - PRIORITY_SCORE[b.priority]
      || FUNNEL_SCORE[a.funnel] - FUNNEL_SCORE[b.funnel]
      || a.sourceFile.localeCompare(b.sourceFile)
      || a.order - b.order
    )
    .slice(0, limit)
    .map(item => withReasonAndLinks(item, blogPosts, publishedSlugs, latestPost));
};

export const buildSeoBlogPrompt = (suggestion: SeoSuggestion) => {
  const outlineText = suggestion.outline
    .map(section => [
      `H2: ${section.h2}`,
      ...section.h3.map(item => `- H3: ${item}`)
    ].join('\n'))
    .join('\n\n');

  return [
    'Dựa trên kế hoạch SEO hằng ngày của URSport, viết 1 bài blog hoàn chỉnh theo thông tin sau.',
    '',
    `Tiêu đề: ${suggestion.title}`,
    `Slug bắt buộc: ${suggestion.slug}`,
    `SEO title đề xuất: ${suggestion.seoTitle}`,
    `Meta description đề xuất: ${suggestion.seoDescription}`,
    `Primary keyword: ${suggestion.keyword}`,
    `Secondary keywords: ${suggestion.secondaryKeywords || 'từ khóa phụ liên quan tự nhiên'}`,
    `Search intent: ${suggestion.intent}`,
    `Funnel: ${suggestion.funnel}`,
    `Content silo: ${suggestion.cluster}`,
    `Lý do chọn bài hôm nay: ${suggestion.reason}`,
    'Bat buoc doc va bam sat Markdown context ben duoi. Neu context .md mau thuan voi outline tu dong, uu tien context .md.',
    '',
    'Internal links bắt buộc chèn tự nhiên trong bài:',
    ...suggestion.internalLinks.map(link => `- ${link}`),
    '',
    'Outline H2/H3 nên bám sát:',
    outlineText,
    '',
    `Nguon file .md cua goi y: ${suggestion.sourceFile}`,
    'Trich doan .md lien quan den bai nay:',
    '```md',
    suggestion.sourceMarkdownContext || 'Khong tim thay doan .md rieng cho goi y nay.',
    '```',
    '',
    'Ngu canh tong hop tu 08-keyword-master.md, 09-roadmap.md va 10-ai-automation.md:',
    '```md',
    getGlobalMarkdownContext(),
    '```',
    '',
    'Yêu cầu chất lượng:',
    '- Không đổi slug.',
    '- Không viết lan man, không nhồi keyword.',
    '- Bài viết phải hữu ích cho nam giới Việt Nam đang chọn đồ thể thao/casual.',
    '- Nội dung HTML dùng <p>, <h2>, <h3>, <ul>, <li>, <strong> khi cần.',
    '- Bắt buộc chèn đúng 3 block <figure> trong contentHtml: 1 ảnh hero/ngữ cảnh, 1 ảnh chi tiết sản phẩm/chất liệu/form, 1 ảnh so sánh/checklist/lifestyle theo chủ đề.',
    '- Cấu trúc ảnh phải đúng format: <figure><img src="CLOUDINARY_OR_UPLOADED_IMAGE_URL" alt="Mô tả ảnh tự nhiên có keyword và ngữ cảnh" height="800" width="1200" title="Title ảnh ngắn gọn"><figcaption>Ghi chú ảnh một câu hữu ích cho người đọc.</figcaption></figure>.',
    `- Không tự bịa đường dẫn /images/blog/. Chỉ dùng URL ảnh đã upload trực tiếp lên Cloudinary/thư viện ảnh, hoặc giữ placeholder CLOUDINARY_OR_UPLOADED_IMAGE_URL để admin thay bằng ảnh upload. Tên file gợi ý nên bắt đầu bằng "${suggestion.slug}" hoặc keyword không dấu.`,
    '- Alt dưới 125 ký tự, mô tả đúng nội dung ảnh, không nhồi keyword. Title ngắn hơn alt. Figcaption bổ sung ý nghĩa thực tế, không lặp y nguyên alt.',
    '- Đồng thời trả imagePrompts gồm đúng 3 mục: filename, alt, title, caption, prompt. Prompt tạo ảnh yêu cầu tỉ lệ 3:2, không chữ trên ảnh, phong cách ecommerce/lifestyle nam Việt Nam, sản phẩm rõ.',
    `- Gợi ý prompt ảnh 1: Hero/context cho "${suggestion.keyword}", nam Việt Nam mặc đồ URSport trong bối cảnh đời thường hoặc tập luyện, ánh sáng tự nhiên, sản phẩm rõ, không chữ trên ảnh, tỉ lệ 3:2.`,
    `- Gợi ý prompt ảnh 2: Detail/close-up cho "${suggestion.keyword}", cận cảnh chất liệu, form, đường may hoặc chi tiết sản phẩm, nền sạch, rõ texture, không chữ trên ảnh, tỉ lệ 3:2.`,
    `- Gợi ý prompt ảnh 3: Comparison/checklist/lifestyle cho "${suggestion.title}", bố cục thực tế dễ hiểu, phù hợp nam giới Việt Nam, không text nhỏ khó đọc, không chữ trên ảnh, tỉ lệ 3:2.`,
    '- Có phần FAQ cuối bài theo cấu trúc <h2>Câu hỏi thường gặp</h2>, mỗi câu hỏi là <h3>, câu trả lời ngay sau bằng <p>.',
    '- CTA phải tự nhiên về URSport và các link nội bộ ở trên.',
    '- Nếu bài có phần so sánh, khác nhau, ưu/nhược điểm hoặc chọn giữa 2-4 lựa chọn, phải chèn bảng HTML đúng format: <div class="table-wrap"><table class="compare-table"><thead><tr><th>Tiêu chí</th><th>Lựa chọn 1</th><th>Lựa chọn 2</th></tr></thead><tbody><tr><td>Tiêu chí cụ thể</td><td><span class="badge-good">Điểm mạnh</span></td><td><span class="badge-normal">Hạn chế</span></td></tr></tbody></table></div>. Không dùng markdown table, không thêm thẻ <style>.',
    '- Không thêm markdown trong contentHtml.'
  ].join('\n');
};
