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

export async function generateProductSEO(prompt: string): Promise<AIProductData> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('API Key chưa được cấu hình. Vui lòng thêm vào phần cài đặt.');

  const systemPrompt = `Bạn là một chuyên gia thương mại điện tử và chuyên gia SEO hàng đầu, đặc biệt trong mảng thời trang thể thao nam (UR Sport). 
Nhiệm vụ của bạn là nhận một yêu cầu ngắn và tạo ra toàn bộ dữ liệu cần thiết để đăng một sản phẩm chuẩn SEO và tối ưu chuyển đổi cao. 
TRẢ VỀ ĐÚNG FORMAT JSON DƯỚI ĐÂY, KHÔNG CÓ MARKDOWN HAY CHỮ NÀO KHÁC BÊN NGOÀI JSON:
{
  "name": "Tên sản phẩm bán hàng mạnh mẽ (có độ dài tối ưu cho SEO)",
  "slug": "slug-seo-khong-dau-va-gach-ngang",
  "shortDescription": "Mô tả ngắn gọn, thu hút, tập trung vào lợi ích lớn nhất để tăng chuyển đổi",
  "descriptionHtml": "Mô tả dài định dạng HTML (>500 từ). Bắt buộc dùng các thẻ <h2>, <h3>, <ul>, <li>, <strong>. Nội dung đi sâu vào công năng, chất liệu, cách phối đồ, lợi ích.",
  "bulletBenefits": ["Lợi ích 1", "Lợi ích 2", "Lợi ích 3"],
  "metaTitle": "Title chuẩn SEO (dưới 60 ký tự)",
  "metaDescription": "Meta description hấp dẫn, chứa keyword (dưới 160 ký tự)",
  "seoKeywords": "keyword 1, keyword 2, keyword 3",
  "tags": ["tag1", "tag2"],
  "faqSchema": "<script type=\"application/ld+json\">{...FAQ_SCHEMA...}</script>",
  "facebookCaption": "Caption Facebook kèm hashtag, emoji",
  "tiktokCaption": "Caption TikTok ngắn, trending kèm hashtag",
  "shopeeTitle": "Tên sản phẩm tối ưu cho Shopee (đủ giật tít, chứa đặc tính)",
  "lazadaTitle": "Tên sản phẩm tối ưu cho Lazada"
}`;

  return callGemini(systemPrompt, prompt);
}

export async function generateBlogSEO(prompt: string): Promise<AIBlogData> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('API Key chưa được cấu hình. Vui lòng thêm vào phần cài đặt.');

  const systemPrompt = `Bạn là một chuyên gia Content Marketing & SEO thời trang nam.
Nhận chủ đề bài viết và trả về đúng một object JSON chuẩn, KHÔNG có markdown bên ngoài.
{
  "title": "Tiêu đề CTR cao, giật tít tinh tế",
  "slug": "slug-bai-viet-chuan-seo",
  "contentHtml": "Nội dung bài viết HTML (>1000 từ). Dùng <h2>, <h3> cho các ý chính. Khai thác sâu vấn đề, mang lại giá trị thực tế.",
  "keywordCluster": ["keyword chính", "keyword phụ 1", "keyword phụ 2"],
  "metaTitle": "Meta title dưới 60 ký tự",
  "metaDescription": "Meta description hấp dẫn dưới 160 ký tự",
  "internalLinkMap": ["Gợi ý link nội bộ: Áo polo nam", "Gợi ý link: Phối đồ thể thao"],
  "cta": "Câu Call To Action bán hàng tự nhiên",
  "faqSchema": "<script type=\"application/ld+json\">{...FAQ_SCHEMA...}</script>",
  "socialCaption": "Đoạn giới thiệu chia sẻ lên mạng xã hội"
}`;

  return callGemini(systemPrompt, prompt);
}

async function callGemini(systemInstruction: string, userPrompt: string) {
  const apiKey = getGeminiApiKey();
  // Using gemini-1.5-flash which is stable and supports JSON mode
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      { role: 'user', parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER PROMPT]\n${userPrompt}` }] }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API Error:", errorData);
    throw new Error(errorData.error?.message || 'Có lỗi xảy ra khi gọi Gemini API');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) throw new Error('Không nhận được dữ liệu từ AI');
  
  // Clean up any potential markdown formatting even with responseMimeType
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error('AI trả về sai định dạng JSON. Vui lòng thử lại.');
  }
}
