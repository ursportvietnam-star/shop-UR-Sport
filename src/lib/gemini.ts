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

export const getGeminiApiKey = () => {
  return localStorage.getItem('gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
};

export const setGeminiApiKey = (key: string) => {
  localStorage.setItem('gemini_api_key', key);
};

export const getDeepSeekApiKey = () => {
  return localStorage.getItem('deepseek_api_key') || 'sk-f24bb51d84ee4fda8f9221e07842ef33';
};

export const setDeepSeekApiKey = (key: string) => {
  localStorage.setItem('deepseek_api_key', key);
};

export type AIProvider = 'gemini' | 'deepseek';

export async function generateProductSEO(prompt: string, provider: AIProvider = 'gemini'): Promise<AIProductData> {
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
    if (provider === 'deepseek') {
      return await callDeepSeek(systemPrompt, prompt);
    }
    return await callGemini(systemPrompt, prompt);
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid')) {
      throw new Error('API Key Gemini của bạn chưa đúng hoặc hết hạn. Vui lòng bấm vào bánh răng ⚙️ để cập nhật Key miễn phí.');
    }
    throw error;
  }
}

export async function generateBlogSEO(prompt: string, provider: AIProvider = 'gemini'): Promise<AIBlogData> {
  const systemPrompt = `Bạn là một Content Creator chuyên nghiệp về thời trang nam.
Viết bài blog chuyên sâu (>1000 từ) cho UR Sport. Nội dung cần hữu ích, chia sẻ kiến thức phối đồ, chọn vải, hoặc xu hướng.
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
    if (provider === 'deepseek') {
      return await callDeepSeek(systemPrompt, prompt);
    }
    return await callGemini(systemPrompt, prompt);
  } catch (error: any) {
    if (error.message.includes('API Key') || error.message.includes('not valid')) {
      throw new Error('API Key Gemini chưa chính xác. Hãy lấy Key miễn phí từ Google AI Studio.');
    }
    throw error;
  }
}

async function callDeepSeek(systemInstruction: string, userPrompt: string) {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) throw new Error('DeepSeek API Key chưa được cấu hình.');

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Lỗi kết nối DeepSeek API');
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    return JSON.parse(text);
  } catch (error: any) {
    console.error('DeepSeek error:', error);
    throw new Error(error.message || 'Lỗi xử lý DeepSeek AI');
  }
}

async function callGemini(systemInstruction: string, userPrompt: string) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API Key chưa được cấu hình.');

  // Sử dụng bản v1 ổn định tuyệt đối
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      { role: 'user', parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER PROMPT]\n${userPrompt}` }] }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 404) {
        throw new Error('Model Gemini 1.5 Flash không tìm thấy. Vui lòng kiểm tra lại API Key.');
      }
      throw new Error(errorData.error?.message || 'Lỗi từ Gemini API');
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
