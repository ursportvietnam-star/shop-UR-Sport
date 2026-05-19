import { BlogPost } from '../types';

import aoThunPlan from '../../01-ao-thun-nam.md?raw';
import quanTheThaoPlan from '../../02-quan-the-thao.md?raw';
import doGymPlan from '../../03-do-gym.md?raw';
import chatLieuPlan from '../../04-chat-lieu.md?raw';
import sizePlan from '../../05-size.md?raw';
import phoiDoPlan from '../../06-phoi-do.md?raw';
import buyerPlan from '../../07-buyer.md?raw';

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
      url: current.url || `https://ursport.vn/blog/${current.slug}`,
      seoTitle: current.seoTitle || `${compactTitle(current.title)} | URSport`,
      seoDescription: current.seoDescription || buildMetaDescription({
        title: current.title,
        keyword: current.keyword,
        cluster
      }),
      internalLinks: current.internalLinks || [],
      reason: '',
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
    '',
    'Internal links bắt buộc chèn tự nhiên trong bài:',
    ...suggestion.internalLinks.map(link => `- ${link}`),
    '',
    'Outline H2/H3 nên bám sát:',
    outlineText,
    '',
    'Yêu cầu chất lượng:',
    '- Không đổi slug.',
    '- Không viết lan man, không nhồi keyword.',
    '- Bài viết phải hữu ích cho nam giới Việt Nam đang chọn đồ thể thao/casual.',
    '- Nội dung HTML dùng <p>, <h2>, <h3>, <ul>, <li>, <strong> khi cần.',
    '- Có phần FAQ cuối bài theo cấu trúc <h2>Câu hỏi thường gặp</h2>, mỗi câu hỏi là <h3>, câu trả lời ngay sau bằng <p>.',
    '- CTA phải tự nhiên về URSport và các link nội bộ ở trên.',
    '- Không thêm markdown trong contentHtml.'
  ].join('\n');
};
