import fs from 'fs';

// ⚠️  KHÔNG hardcode API key trực tiếp trong file này!
// Chạy: GEMINI_KEY=AIza... node upgrade_seo.mjs
const key = process.env.GEMINI_KEY || '';
if (!key) {
  console.error('❌ Thiếu GEMINI_KEY! Chạy: GEMINI_KEY=AIza... node upgrade_seo.mjs');
  process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

const promptTemplate = `Bạn là Senior SEO Content Strategist + Ecommerce Content Architect + Fashion SEO Expert cho thương hiệu thời trang nam URSport.

NHIỆM VỤ:
Nâng cấp nội dung bài viết dưới đây để đạt chuẩn SEO enterprise production-ready.

YÊU CẦU CHUNG
- Tiếng Việt tự nhiên, phù hợp người dùng Việt Nam
- Tone: chuyên gia thời trang nam, thân thiện, đáng tin, human-first, conversational, không robotic, không nhồi keyword
- SEO style: helpful content first, search intent driven, conversion-aware, ecommerce SEO optimized

CHUẨN FORMAT
1. SEO CORE
Title: 
SEO Title: (<= 60 ký tự)
Meta Description: (140-160 ký tự)
Slug: (sạch chuẩn SEO)
Primary keyword: (KHÔNG được là nguyên title)
Secondary keywords: (tự nhiên, không spam)
Search intent: 
Funnel: 
Priority: 
Canonical URL: 

2. INTERNAL LINK MAP
Category: 
Subcategory: 
Collection: 
Related blog: 
Commercial page: 
Product target: 

3. CONTENT BLUEPRINT
Mỗi bài bắt buộc có CHÍNH XÁC 3 H2. H2 #1: search intent aligned. H2 #2: comparison / education. H2 #3: practical recommendation / conversion bridge.
Mỗi H2 phải có:
H2 Heading
Content brief (cụ thể, actionable, aligned với keyword, human helpful)
Image filename (lowercase, hyphen-separated, chuẩn SEO, .webp)
Alt text (tự nhiên, mô tả đúng ảnh)
AI image prompt (premium ecommerce quality, realistic, Vietnamese male model, 4k)

4. FAQ
3 câu hỏi và 3 câu trả lời. Câu trả lời tự nhiên, hữu ích.

5. CTA
Theo funnel (TOFU: soft, MOFU: mid, BOFU: strong)

6. SCHEMA
Informational: Article, FAQPage, BreadcrumbList
Commercial: Article, FAQPage, BreadcrumbList, Product
Buyer: Product, Review, Offer, AggregateRating, BreadcrumbList

OUTPUT:
Chỉ trả về phần nội dung markdown đã được nâng cấp hoàn chỉnh cho bài này (Bắt đầu bằng ## <STT>. <Title>).
KHÔNG giải thích. KHÔNG commentary.

DỮ LIỆU BÀI VIẾT HIỆN TẠI:
`;

async function processArticle(articleText) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: promptTemplate + articleText }] }],
    generationConfig: { temperature: 0.7 }
  };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.candidates && data.candidates.length > 0) {
      let txt = data.candidates[0].content.parts[0].text.trim();
      if (txt.startsWith('```markdown')) {
          txt = txt.replace(/^```markdown\n/, '').replace(/\n```$/, '');
      }
      return txt;
    }
    console.error('Lỗi API:', JSON.stringify(data));
    return articleText;
  } catch (err) {
    console.error('Lỗi fetch:', err);
    return articleText;
  }
}

async function main() {
  const fileToProcess = '01-ao-thun-nam.md';
  const content = fs.readFileSync(fileToProcess, 'utf8');
  
  const parts = content.split('\n## ');
  let outContent = parts[0];
  
  console.log(`Tìm thấy ${parts.length - 1} bài viết. Đang xử lý mẫu 2 bài đầu tiên...`);
  
  for (let i = 1; i <= 2; i++) {
    console.log(`Đang xử lý bài ${i}...`);
    const article = '## ' + parts[i];
    const upgraded = await processArticle(article);
    outContent += '\n\n' + upgraded;
  }
  
  for (let i = 3; i < parts.length; i++) {
    outContent += '\n\n## ' + parts[i];
  }
  
  fs.writeFileSync('01-ao-thun-nam.md', outContent);
  console.log('Đã cập nhật trực tiếp vào file 01-ao-thun-nam.md');
}

main();
