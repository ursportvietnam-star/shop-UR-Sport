import { SEO_GUIDE_CONTEXT } from './seoGuide';
import PRODUCT_SEO_GUIDE_CONTEXT from '../../PRODUCT_SKILL.md?raw';
import IMAGE_FORMAT_RULES_CONTEXT from '../../IMAGE_FORMAT_RULES.md?raw';
import { auth } from '../firebase';

export interface AIProductData {
  name: string;
  slug: string;
  shortDescription: string;
  descriptionHtml: string;
  bulletBenefits: string[];
  metaTitle: string;
  metaDescription: string;
  seoKeywords: string;
  tags: string[];
  faqSchema: string;
  facebookCaption: string;
  tiktokCaption: string;
  shopeeTitle: string;
  lazadaTitle: string;
}

export interface AIBlogData {
  title: string;
  slug: string;
  contentHtml: string;
  keywordCluster: string[];
  metaTitle: string;
  metaDescription: string;
  internalLinkMap: string[];
  imagePrompts?: Array<{
    filename: string;
    alt: string;
    title: string;
    caption: string;
    prompt: string;
  }>;
  cta: string;
  faqSchema: string;
  socialCaption: string;
}

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return [];
};

const normalizeAIBlogData = (data: any): AIBlogData => ({
  ...data,
  title: String(data?.title || data?.blogTitle || data?.headline || '').trim(),
  slug: String(data?.slug || data?.urlSlug || '').trim(),
  contentHtml: String(
    data?.contentHtml ||
    data?.content ||
    data?.html ||
    data?.body ||
    data?.articleHtml ||
    data?.article ||
    ''
  ).trim(),
  keywordCluster: normalizeStringArray(data?.keywordCluster || data?.keywords),
  metaTitle: String(data?.metaTitle || data?.seoTitle || data?.title || '').trim(),
  metaDescription: String(data?.metaDescription || data?.seoDescription || data?.description || data?.excerpt || '').trim(),
  internalLinkMap: normalizeStringArray(data?.internalLinkMap || data?.internalLinks),
  imagePrompts: Array.isArray(data?.imagePrompts) ? data.imagePrompts : [],
  cta: String(data?.cta || '').trim(),
  faqSchema: String(data?.faqSchema || data?.schema || '').trim(),
  socialCaption: String(data?.socialCaption || '').trim(),
});

const DEV_ADMIN_KEY = 'ursport_dev_admin';

const isLocalDevAdmin = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' && window.localStorage.getItem(DEV_ADMIN_KEY) === '1';
};

const buildAIHeaders = async (initialMessage: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (isLocalDevAdmin()) {
    headers['x-dev-admin'] = '1';
    return headers;
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error(initialMessage);
  }

  headers.Authorization = `Bearer ${token}`;
  return headers;
};

export interface AIProductSeoFix {
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  shortDescription: string;
  descriptionHtml: string;
  features: string[];
}

export interface AISeoActionPlan {
  page: string;
  query: string;
  problem: string;
  action: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  suggestedTitle: string;
  suggestedMeta: string;
  suggestedH2: string[];
  suggestedFaq: Array<{
    question: string;
    answer: string;
  }>;
  internalLinks: Array<{
    anchor: string;
    href: string;
    reason: string;
  }>;
  imageSeo: Array<{
    filename: string;
    alt: string;
    title: string;
  }>;
  schemaType: string;
  schemaJsonLd: string;
  blogIdea: {
    needed: boolean;
    title: string;
    slug: string;
    outline: string[];
  };
  landingPageIdea: {
    needed: boolean;
    title: string;
    slug: string;
    sections: string[];
  };
  checklist: string[];
}

export interface AISeoContentDraft {
  page: string;
  slug: string;
  query: string;
  seoTitle: string;
  seoDescription: string;
  heading: string;
  contentHtml: string;
  changeSummary: string[];
  reviewChecklist: string[];
}

export const getAIProvider = () => {
  return localStorage.getItem('ai_provider') || 'gemini';
};

export const setAIProvider = (provider: 'gemini' | 'local') => {
  localStorage.setItem('ai_provider', provider);
};

export async function generateProductSEO(prompt: string): Promise<AIProductData> {
  const systemPrompt = `Bạn là một chuyên gia bán hàng (Copywriter) và chuyên gia SEO hàng đầu cho thương mại điện tử Việt Nam.
Nhiệm vụ: Tạo nội dung sản phẩm cho shop đồ thể thao nam UR Sport. Văn phong cần mạnh mẽ, chuyên nghiệp, tập trung vào lợi ích người dùng.

Tuân thủ hướng dẫn chuẩn SEO của URSport (Product Skill File):
${PRODUCT_SEO_GUIDE_CONTEXT}

TRẢ VỀ ĐÚNG FORMAT JSON, KHÔNG CÓ MARKDOWN:
{
  "name": "Tên sản phẩm chuẩn SEO, giật tít, thu hút khách bấm vào",
  "slug": "slug-seo-khong-dau",
  "shortDescription": "2-3 câu mô tả cực kỳ hấp dẫn, nêu bật ưu điểm lớn nhất",
  "descriptionHtml": "Mô tả chi tiết (>700 từ) chuẩn HTML. Chia làm các mục <h2>: Đặc điểm nổi bật, Chất liệu cao cấp, Hướng dẫn chọn size, Cam kết từ UR Sport. Dùng <ul>, <li>, <strong>.",
  "bulletBenefits": ["Lợi ích 1", "Lợi ích 2", "Lợi ích 3", "Lợi ích 4"],
  "metaTitle": "SEO Title (dưới 60 ký tự, chứa từ khóa chính)",
  "metaDescription": "Meta desc thu hút (dưới 160 ký tự)",
  "seoKeywords": "keyword 1, keyword 2, keyword 3",
  "tags": ["thời trang nam", "đồ thể thao", "ur sport"],
  "faqSchema": "Script FAQ Schema chuẩn SEO",
  "facebookCaption": "Caption FB kèm hashtag & emoji bắt mắt",
  "tiktokCaption": "Caption TikTok ngắn gọn, viral",
  "shopeeTitle": "Tên chuẩn Shopee kèm từ khóa hot",
  "lazadaTitle": "Tên chuẩn Lazada"
}`;

  try {
    return await callGemini(systemPrompt, prompt);
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid') || error.message.includes('unauthorized') || error.message.includes('Bearer')) {
      throw new Error('Lỗi cấu hình AI hoặc chưa đăng nhập Admin. Vui lòng kiểm tra lại.');
    }
    throw error;
  }
}

export async function generateProductSeoFix(prompt: string): Promise<AIProductSeoFix> {
  const systemPrompt = `Bạn là chuyên gia SEO thương mại điện tử cho UR Sport.
Nhiệm vụ: Tối ưu lại SEO cho một sản phẩm đang có sẵn, KHÔNG đổi giá, KHÔNG bịa tồn kho, KHÔNG đổi thương hiệu.

Tuân thủ hướng dẫn chuẩn SEO của URSport (Product Skill File):
${PRODUCT_SEO_GUIDE_CONTEXT}

Trả về đúng JSON, không markdown:
{
  "seoTitle": "Title SEO 45-65 ký tự, có từ khóa chính và thương hiệu nếu tự nhiên",
  "metaDescription": "Meta description 120-165 ký tự, nêu lợi ích, chất liệu/form và lời mời mua tự nhiên",
  "keywords": "8-14 từ khóa tiếng Việt, phân tách bằng dấu phẩy",
  "shortDescription": "2 câu mô tả ngắn, dễ đọc, dùng được làm đoạn mở đầu",
  "descriptionHtml": "HTML mô tả sản phẩm 350-650 từ, có <p>, <h2>, <ul><li>, tập trung chất liệu, form, hoàn cảnh sử dụng, chọn size, chăm sóc. Nội dung tuân thủ đúng chuẩn Product Page của URSport.",
  "features": ["4-6 điểm nổi bật ngắn gọn, mỗi điểm dưới 70 ký tự"]
}`;

  try {
    return await callGemini(systemPrompt, prompt);
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid') || error.message.includes('unauthorized') || error.message.includes('Bearer')) {
      throw new Error('Lỗi cấu hình AI hoặc chưa đăng nhập Admin. Vui lòng kiểm tra lại.');
    }
    throw error;
  }
}

export async function generateProductDescriptionFromMd(markdownContent: string, productName: string, keywords: string): Promise<{ contentHtml: string }> {
  const systemPrompt = `Bạn là một chuyên gia Copywriter và SEO thương mại điện tử hàng đầu tại Việt Nam, chuyên về thời trang nam thể thao & casual cho thương hiệu UR Sport.
Nhiệm vụ: Dựa vào Tên sản phẩm, Từ khóa SEO và nội dung tài liệu tham khảo (Markdown/Brief), hãy viết một bài mô tả sản phẩm hoàn chỉnh, chuẩn SEO và AEO (tối ưu cho Google, người dùng và các AI tìm kiếm như các mô hình ngôn ngữ lớn ChatGPT, Perplexity, Gemini).

Sản phẩm: ${productName}
Từ khóa SEO mục tiêu: ${keywords || 'Tự đề xuất từ khóa phù hợp với sản phẩm'}
Tài liệu tham khảo/Brief:
${markdownContent || 'Không có tài liệu tham khảo. Hãy tự viết bài mô tả dựa trên Tên sản phẩm và Từ khóa SEO.'}

Bạn phải tuân thủ nghiêm ngặt 2 bộ quy tắc sau:

1. HƯỚNG DẪN SEO SẢN PHẨM (PRODUCT SKILL):
${PRODUCT_SEO_GUIDE_CONTEXT}

2. QUY TẮC CHÈN ẢNH CHUẨN SEO (IMAGE FORMAT RULES):
${IMAGE_FORMAT_RULES_CONTEXT}

YÊU CẦU CỤ THỂ:
1. Trả về định dạng JSON thuần túy (không bọc trong markdown): { "contentHtml": "Nội dung bài viết HTML" }
2. YÊU CẦU ĐỘ DÀI BẮT BUỘC: Bài viết HTML phải chi tiết và đạt độ dài từ 500 đến 800 từ. Nếu tài liệu tham khảo/Brief do người dùng cung cấp ngắn, bạn bắt buộc phải chủ động phân tích sâu rộng, viết chi tiết thêm để đạt độ dài này. Hãy mở rộng bằng cách giải thích sâu về lợi ích của sợi Cotton Premium/Compact, lập luận tại sao công nghệ dệt này giúp giữ form lâu bền và thấm hút mồ hôi, gợi ý chi tiết các cách phối đồ (mix & match), phân tích dáng người mặc (Slim Fit vs Regular Fit), hướng dẫn chăm sóc bảo quản quần áo tỉ mỉ, và đưa ra các cam kết dịch vụ/chất lượng từ UR Sport để thuyết phục khách hàng.
3. Mã HTML trả về:
   - Phải bám sát CẤU TRÚC BÀI VIẾT chuẩn trong hướng dẫn SEO sản phẩm ở trên. 
   - Chia thành nhiều phần bằng các thẻ <h2>, <h3> hợp lý (VD: Đặc điểm nổi bật, Chất liệu & Form dáng, Hoành cảnh sử dụng, Hướng dẫn chọn size, Cam kết từ UR Sport).
   - Văn phong thu hút, thuyết phục khách hàng, mạnh mẽ và chân thực (dựa trên dữ liệu thực tế, tránh hoa mỹ/sáo rỗng).
   - Sử dụng <ul>, <li> để trình bày danh sách dễ nhìn.
   - Bắt buộc chèn đúng 3 ảnh minh họa dạng <figure class="image-figure"> trong chi tiết bài viết theo cấu trúc chuẩn. Các đường dẫn ảnh (src) phải có định dạng: "/images/products/[slug-ten-san-pham]-hero.webp", "/images/products/[slug-ten-san-pham]-detail.webp", "/images/products/[slug-ten-san-pham]-lifestyle.webp" (viết thường không dấu, phân tách bằng dấu gạch ngang, ví dụ: "/images/products/ao-thun-nam-cotton-compact-hero.webp").
   - Mỗi ảnh phải có đầy đủ thuộc tính: alt (dưới 125 ký tự, mô tả ảnh tự nhiên chứa từ khóa chính), width="1200", height="800", title (ngắn gọn), và thẻ <figcaption> giải thích lợi ích thực tế cho người đọc.
   - Tuyệt đối KHÔNG dùng markdown (như **bold**) trong nội dung HTML, phải dùng thẻ <strong>. KHÔNG dùng thẻ <style> hay style inline. Không chứa class lạ ngoài class "image-figure" và "image-caption".`;

  try {
    return await callGemini(systemPrompt, markdownContent);
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid') || error.message.includes('unauthorized') || error.message.includes('Bearer')) {
      throw new Error('Lỗi cấu hình AI hoặc chưa đăng nhập Admin. Vui lòng kiểm tra lại.');
    }
    throw error;
  }
}

export async function generateSeoActionPlan(prompt: string): Promise<AISeoActionPlan> {
  const systemPrompt = `You are an ecommerce SEO strategist for URSport Vietnam.
Create a practical AI Action Generator output from Google Search Console data.

Rules:
- Do not auto-publish anything.
- Focus on mens sportswear ecommerce: ao thun nam, quick dry, cotton, ao gym, quan the thao.
- Prefer category/product revenue keywords over pure informational keywords.
- Do not invent impossible stock, prices, guarantees, or technical material claims.
- Write Vietnamese copy naturally.
- Return valid JSON only, no markdown.
- suggestedTitle should be 45-65 characters when possible.
- suggestedMeta should be 120-165 characters when possible.
- Use internal links with site-relative hrefs.
- schemaJsonLd must be a JSON string, not an object.

Return exactly this shape:
{
  "page": "URL",
  "query": "keyword",
  "problem": "short diagnosis",
  "action": "rewrite_title | rewrite_meta | add_faq | expand_content | internal_link | new_blog | merge_pages | canonical_fix | refresh_content | commercial_boost",
  "priority": "Critical | High | Medium | Low",
  "suggestedTitle": "SEO title",
  "suggestedMeta": "SEO meta description",
  "suggestedH2": ["H2 suggestion 1", "H2 suggestion 2"],
  "suggestedFaq": [
    { "question": "Question", "answer": "Answer" }
  ],
  "internalLinks": [
    { "anchor": "Anchor text", "href": "/duong-dan", "reason": "Why this link helps" }
  ],
  "imageSeo": [
    { "filename": "ten-file.webp", "alt": "Natural image alt", "title": "Short image title" }
  ],
  "schemaType": "Product | CollectionPage | Article | FAQPage | BreadcrumbList",
  "schemaJsonLd": "{\\"@context\\":\\"https://schema.org\\"}",
  "blogIdea": {
    "needed": false,
    "title": "",
    "slug": "",
    "outline": []
  },
  "landingPageIdea": {
    "needed": false,
    "title": "",
    "slug": "",
    "sections": []
  },
  "checklist": ["Task 1", "Task 2", "Task 3"]
}`;

  try {
    const data = await callGemini(systemPrompt, prompt);
    return {
      page: String(data?.page || '').trim(),
      query: String(data?.query || '').trim(),
      problem: String(data?.problem || '').trim(),
      action: String(data?.action || '').trim(),
      priority: String(data?.priority || 'Medium').trim() as AISeoActionPlan['priority'],
      suggestedTitle: String(data?.suggestedTitle || '').trim(),
      suggestedMeta: String(data?.suggestedMeta || '').trim(),
      suggestedH2: normalizeStringArray(data?.suggestedH2),
      suggestedFaq: Array.isArray(data?.suggestedFaq) ? data.suggestedFaq.map((item: any) => ({
        question: String(item?.question || '').trim(),
        answer: String(item?.answer || '').trim(),
      })).filter((item: { question: string; answer: string }) => item.question && item.answer) : [],
      internalLinks: Array.isArray(data?.internalLinks) ? data.internalLinks.map((item: any) => ({
        anchor: String(item?.anchor || '').trim(),
        href: String(item?.href || '').trim(),
        reason: String(item?.reason || '').trim(),
      })).filter((item: { anchor: string; href: string }) => item.anchor && item.href) : [],
      imageSeo: Array.isArray(data?.imageSeo) ? data.imageSeo.map((item: any) => ({
        filename: String(item?.filename || '').trim(),
        alt: String(item?.alt || '').trim(),
        title: String(item?.title || '').trim(),
      })).filter((item: { filename: string; alt: string }) => item.filename && item.alt) : [],
      schemaType: String(data?.schemaType || '').trim(),
      schemaJsonLd: typeof data?.schemaJsonLd === 'string' ? data.schemaJsonLd.trim() : JSON.stringify(data?.schemaJsonLd || {}),
      blogIdea: {
        needed: Boolean(data?.blogIdea?.needed),
        title: String(data?.blogIdea?.title || '').trim(),
        slug: String(data?.blogIdea?.slug || '').trim(),
        outline: normalizeStringArray(data?.blogIdea?.outline),
      },
      landingPageIdea: {
        needed: Boolean(data?.landingPageIdea?.needed),
        title: String(data?.landingPageIdea?.title || '').trim(),
        slug: String(data?.landingPageIdea?.slug || '').trim(),
        sections: normalizeStringArray(data?.landingPageIdea?.sections),
      },
      checklist: normalizeStringArray(data?.checklist),
    };
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid') || error.message.includes('unauthorized') || error.message.includes('Bearer')) {
      throw new Error('Lỗi cấu hình AI hoặc chưa đăng nhập Admin. Vui lòng kiểm tra lại.');
    }
    throw error;
  }
}

export async function generateSeoContentDraft(prompt: string): Promise<AISeoContentDraft> {
  const systemPrompt = `You are the Auto Content Optimizer for URSport.
Create an optimized draft for admin review. Never publish automatically.

Rules:
- Return valid JSON only, no markdown.
- Optimize ecommerce category/landing content for Vietnamese mens sportswear.
- Keep claims realistic. Do not invent prices, stock, medical claims, or guarantees.
- Preserve the page intent and URL.
- contentHtml must be clean HTML, no <script>, no inline <style>.
- Include useful H2/H3, FAQ, CTA, and internal links when relevant.
- seoTitle should be 45-65 characters when possible.
- seoDescription should be 120-165 characters when possible.

Return exactly:
{
  "page": "URL",
  "slug": "page-slug",
  "query": "primary keyword",
  "seoTitle": "SEO title",
  "seoDescription": "Meta description",
  "heading": "H1/heading",
  "contentHtml": "<section>...</section>",
  "changeSummary": ["Change 1", "Change 2"],
  "reviewChecklist": ["Check 1", "Check 2"]
}`;

  try {
    const data = await callGemini(systemPrompt, prompt);
    return {
      page: String(data?.page || '').trim(),
      slug: String(data?.slug || '').trim(),
      query: String(data?.query || '').trim(),
      seoTitle: String(data?.seoTitle || data?.suggestedTitle || '').trim(),
      seoDescription: String(data?.seoDescription || data?.suggestedMeta || '').trim(),
      heading: String(data?.heading || '').trim(),
      contentHtml: String(data?.contentHtml || data?.html || data?.content || '').trim(),
      changeSummary: normalizeStringArray(data?.changeSummary),
      reviewChecklist: normalizeStringArray(data?.reviewChecklist),
    };
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid') || error.message.includes('unauthorized') || error.message.includes('Bearer')) {
      throw new Error('Lỗi cấu hình AI hoặc chưa đăng nhập Admin. Vui lòng kiểm tra lại.');
    }
    throw error;
  }
}

export async function generateBlogSEO(prompt: string): Promise<AIBlogData> {
  const systemPrompt = `Bạn là một Content Strategist SEO cho URSport, chuyên thời trang nam thể thao/casual tại Việt Nam.
Viết 1 bài blog chuyên sâu, hữu ích và có khả năng chuyển đổi mềm cho URSport. Nội dung phải bám đúng brief, không viết hàng loạt, không tự đổi chủ đề.
Tuân thủ SEO.md của URSport:
${SEO_GUIDE_CONTEXT}

Yêu cầu bắt buộc:
- Nếu prompt có slug bắt buộc, phải trả về đúng slug đó, không tự rút gọn hoặc đổi URL.
- Nếu prompt có primary keyword, intent, funnel, internal links, outline H2/H3 thì phải bám sát các dữ liệu đó.
- SEO title nên 45-65 ký tự. Meta description nên 120-165 ký tự.
- contentHtml dài khoảng 900-1400 từ, không mỏng nội dung, không lặp ý.
- Bắt buộc chèn đúng 3 block ảnh trong contentHtml theo cấu trúc:
  <figure><img src="CLOUDINARY_OR_UPLOADED_IMAGE_URL" alt="Mô tả ảnh tự nhiên có keyword và ngữ cảnh" height="800" width="1200" title="Title ảnh ngắn gọn"><figcaption>Ghi chú ảnh một câu hữu ích cho người đọc.</figcaption></figure>
- 3 ảnh phải gồm: 1 ảnh hero/ngữ cảnh đầu bài, 1 ảnh chi tiết sản phẩm/chất liệu/form, 1 ảnh so sánh/checklist/lifestyle theo chủ đề. Không dùng markdown image, không dùng ảnh ngoài domain, không thêm style inline.
- Không tự bịa đường dẫn /images/blog/. Chỉ dùng URL ảnh đã upload trực tiếp lên Cloudinary/thư viện ảnh, hoặc giữ placeholder CLOUDINARY_OR_UPLOADED_IMAGE_URL để admin thay bằng ảnh upload. Alt dưới 125 ký tự, mô tả đúng ảnh, không nhồi keyword. Title ngắn hơn alt. Figcaption phải bổ sung ý nghĩa thực tế, không lặp y nguyên alt.
- Trả thêm imagePrompts gồm đúng 3 mục, mỗi mục có filename, alt, title, caption, prompt để tạo ảnh. Prompt tạo ảnh phải yêu cầu ảnh tỉ lệ 3:2, không chữ trên ảnh, phong cách ecommerce/lifestyle nam Việt Nam, sản phẩm rõ.
- Khi bài có phần so sánh, khác nhau, ưu/nhược điểm, chọn giữa 2-4 lựa chọn hoặc prompt có các từ "so sánh", "vs", "khác gì", phải chèn 1 bảng HTML trong contentHtml theo đúng cấu trúc:
  <div class="table-wrap"><table class="compare-table"><thead><tr><th>Tiêu chí</th><th>Lựa chọn 1</th><th>Lựa chọn 2</th></tr></thead><tbody><tr><td>Tiêu chí cụ thể</td><td><span class="badge-good">Điểm mạnh</span></td><td><span class="badge-normal">Hạn chế</span></td></tr></tbody></table></div>
- Bảng so sánh phải đặt ngay sau đoạn giới thiệu phần so sánh, dùng class table-wrap, compare-table, badge-good, badge-normal. Không dùng markdown table, không tự thêm thẻ <style>.
- Tạo nội dung theo phễu TOFU/MOFU/BOFU phù hợp với chủ đề.
- Có mở bài trả lời nhanh intent, H2/H3 rõ ràng, phần chọn/so sánh/checklist thực tế, FAQ và CTA về category/product.
- Internal links phải chèn tự nhiên trong HTML bằng thẻ <a href="/duong-dan">anchor text</a>, ưu tiên đúng link prompt cung cấp.
- FAQ cuối bài dùng đúng format: <h2>Câu hỏi thường gặp</h2>, mỗi câu hỏi là <h3>, câu trả lời ngay sau bằng <p>.
- Không nhồi từ khóa, không viết chung chung, ưu tiên ý định tìm kiếm của người mua nam tại Việt Nam.
- Không bịa thông tin kỹ thuật quá mức; nếu nói về chất liệu, chỉ mô tả theo trải nghiệm phổ biến và tiêu chí chọn.
TRẢ VỀ JSON CHUẨN:
{
  "title": "Tiêu đề Blog cực kỳ thu hút, chuẩn SEO",
  "slug": "slug-bai-viet-seo",
  "contentHtml": "Nội dung bài viết HTML đầy đủ, chuyên sâu. Dùng <h2>, <h3> để chia bố cục. Nội dung cần tự nhiên, hữu ích.",
  "keywordCluster": ["từ khóa 1", "từ khóa 2", "từ khóa 3"],
  "metaTitle": "Meta title SEO",
  "metaDescription": "Mô tả bài viết hấp dẫn",
  "internalLinkMap": ["Link: Áo polo", "Link: Quần short"],
  "imagePrompts": [
    {
      "filename": "slug-bai-viet-hero.webp",
      "alt": "Mô tả ảnh tự nhiên, có keyword chính và đúng ngữ cảnh",
      "title": "Title ảnh ngắn gọn",
      "caption": "Ghi chú ảnh một câu hữu ích.",
      "prompt": "Prompt tạo ảnh tỉ lệ 3:2, không chữ trên ảnh, phong cách ecommerce/lifestyle nam Việt Nam, sản phẩm rõ."
    }
  ],
  "cta": "Lời kêu gọi mua hàng khéo léo",
  "faqSchema": "FAQ Schema cho bài viết",
  "socialCaption": "Caption chia sẻ lên mạng xã hội"
}`;

  try {
    return normalizeAIBlogData(await callGemini(systemPrompt, prompt));
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid') || error.message.includes('unauthorized') || error.message.includes('Bearer')) {
      throw new Error('Lỗi cấu hình AI hoặc chưa đăng nhập Admin. Vui lòng kiểm tra lại.');
    }
    throw error;
  }
}

async function callGemini(systemInstruction: string, userPrompt: string) {
  const provider = getAIProvider();

  if (provider === 'local') {
    const url = '/api/local-ai';
    const payload = {
      model: "qwen2.5",
      systemInstruction,
      userPrompt,
    };

    try {
      const headers = await buildAIHeaders('Ban can dang nhap admin de dung Local AI.');

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body?.error || `Local AI proxy error (${response.status})`;
        throw new Error(message);
      }

      const data = await response.json();
      const text = data.text;
      if (!text) throw new Error('Không nhận được phản hồi từ Local AI');

      return JSON.parse(text);
    } catch (error: any) {
      console.error('Local AI error:', error);
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('Không kết nối được Local AI. Hãy chắc chắn bạn đã bật Ollama và tải model qwen2.5');
      }
      if (error.name === 'SyntaxError') {
        throw new Error('AI trả về định dạng không hợp lệ. Vui lòng thử lại.');
      }
      throw new Error(error.message || 'Lỗi xử lý Local AI');
    }
  }

  // --- GEMINI via server proxy ---
  try {
    const headers = await buildAIHeaders('Ban can dang nhap admin de dung AI.');

    const response = await fetch('/api/gemini-json', {
      method: 'POST',
      headers,
      body: JSON.stringify({ systemInstruction, userPrompt })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI proxy error (${response.status})`);
    }

    const data = await response.json();
    const text = data.text;
    if (!text) throw new Error('Khong nhan duoc phan hoi tu AI');

    const cleanText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error('Gemini proxy error:', error);
    if (error.name === 'SyntaxError') {
      throw new Error('AI tra ve dinh dang khong hop le. Vui long thu lai.');
    }
    throw new Error(error.message || 'Loi xu ly Gemini AI');
  }

}
