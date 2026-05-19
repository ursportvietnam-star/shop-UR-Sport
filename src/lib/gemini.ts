import { SEO_GUIDE_CONTEXT } from './seoGuide';

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
  cta: string;
  faqSchema: string;
  socialCaption: string;
}

export interface AIProductSeoFix {
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  shortDescription: string;
  descriptionHtml: string;
  features: string[];
}

export const getGeminiApiKey = () => {
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '';
};

export const setGeminiApiKey = (key: string) => {
  localStorage.setItem('gemini_api_key', key);
};

export async function generateProductSEO(prompt: string): Promise<AIProductData> {
  const systemPrompt = `Bạn là một chuyên gia bán hàng (Copywriter) và chuyên gia SEO hàng đầu cho thương mại điện tử Việt Nam.
Nhiệm vụ: Tạo nội dung sản phẩm cho shop đồ thể thao nam UR Sport. Văn phong cần mạnh mẽ, chuyên nghiệp, tập trung vào lợi ích người dùng.
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
    if (error.message.includes('API Key') || error.message.includes('not valid')) {
      throw new Error('API Key Gemini của bạn chưa đúng hoặc hết hạn. Vui lòng bấm vào bánh răng ⚙️ để cập nhật Key miễn phí.');
    }
    throw error;
  }
}

export async function generateProductSeoFix(prompt: string): Promise<AIProductSeoFix> {
  const systemPrompt = `Bạn là chuyên gia SEO thương mại điện tử cho UR Sport.
Nhiệm vụ: Tối ưu lại SEO cho một sản phẩm đang có sẵn, KHÔNG đổi giá, KHÔNG bịa tồn kho, KHÔNG đổi thương hiệu.
Trả về đúng JSON, không markdown:
{
  "seoTitle": "Title SEO 45-65 ký tự, có từ khóa chính và thương hiệu nếu tự nhiên",
  "metaDescription": "Meta description 120-165 ký tự, nêu lợi ích, chất liệu/form và lời mời mua tự nhiên",
  "keywords": "8-14 từ khóa tiếng Việt, phân tách bằng dấu phẩy",
  "shortDescription": "2 câu mô tả ngắn, dễ đọc, dùng được làm đoạn mở đầu",
  "descriptionHtml": "HTML mô tả sản phẩm 350-650 từ, có <p>, <h2>, <ul><li>, tập trung chất liệu, form, hoàn cảnh sử dụng, chọn size, chăm sóc",
  "features": ["4-6 điểm nổi bật ngắn gọn, mỗi điểm dưới 70 ký tự"]
}`;

  try {
    return await callGemini(systemPrompt, prompt);
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid')) {
      throw new Error('API Key AI chưa đúng hoặc chưa được cấu hình. Vui lòng cập nhật trong mục AI Sản Phẩm.');
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
  "cta": "Lời kêu gọi mua hàng khéo léo",
  "faqSchema": "FAQ Schema cho bài viết",
  "socialCaption": "Caption chia sẻ lên mạng xã hội"
}`;

  try {
    return await callGemini(systemPrompt, prompt);
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid')) {
      throw new Error('API Key Gemini chưa chính xác. Hãy lấy Key miễn phí từ Google AI Studio.');
    }
    throw error;
  }
}

async function callGemini(systemInstruction: string, userPrompt: string) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API Key chưa được cấu hình.');

  // Sử dụng bản v1beta để hỗ trợ đầy đủ response_mime_type
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      { role: 'user', parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER PROMPT]\n${userPrompt}` }] }
    ],
    generationConfig: {
      response_mime_type: "application/json"
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini Raw Error:", errorData);
      
      const googleMessage = errorData.error?.message || 'Unknown Google Error';
      const googleStatus = errorData.error?.status || 'Unknown Status';
      
      throw new Error(`Google AI Error: ${googleMessage} (${googleStatus}). Vui lòng kiểm tra lại Key trong phần cài đặt.`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error('Không nhận được phản hồi từ AI');
    
    // Xử lý làm sạch chuỗi JSON nếu AI trả về kèm markdown
    const cleanText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error('Gemini error:', error);
    if (error.name === 'SyntaxError') {
      throw new Error('AI trả về định dạng không hợp lệ. Vui lòng thử lại.');
    }
    throw new Error(error.message || 'Lỗi xử lý Gemini AI');
  }
}
