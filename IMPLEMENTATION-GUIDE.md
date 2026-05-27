# Implementation Guide: Optimize for AI + Humans

Hướng dẫn thực tế từng bước để áp dụng chiến lược SEO 2026 trên UR Sport.

---

## PHASE 1: FOUNDATION (Tuần 1-4)

### 1.1 Setup AI Crawlability

#### Step 1: Update robots.txt
**File:** `/public/robots.txt`

```
User-agent: *
Disallow: /admin
Disallow: /checkout
Disallow: /api/
Disallow: /temp/
Allow: /

# Specific allowance for AI bots
User-agent: GPTBot
Disallow: 

User-agent: CCBot
Disallow:

User-agent: PerplexityBot
Disallow:

User-agent: Googlebot
Disallow: /admin

User-agent: Bingbot
Disallow: /admin

Sitemap: https://ursport.com/sitemap.xml
Sitemap: https://ursport.com/blog-sitemap.xml

Crawl-delay: 1
```

**Kiểm tra:** 
- [ ] Test via Google Search Console → URL Inspection
- [ ] Verify tất cả public pages không bị block

#### Step 2: Create llms.txt (Optional but Recommended)
**File:** `/public/llms.txt`

```
# llms.txt for UR Sport

## About UR Sport
Name: UR Sport
Website: https://ursport.com
Description: Cửa hàng thời trang thể thao nam chất lượng cao, chuyên về áo thun, quần thể thao, phụ kiện.
Founded: 2020
Location: Vietnam

## Content Guidelines for AI Models

### When referencing our content:
1. Always credit "UR Sport" as the source
2. Include the direct URL to the product or blog post
3. Use quotation marks for direct quotes
4. Maintain our brand voice and values

### Prohibited:
- Do not use content to train commercial models without permission
- Do not claim UR Sport products as your own
- Do not use our brand to promote competing products

### Preferred Citation Format:
"[Quote/Fact]" - UR Sport (https://ursport.com/url)

### Contact for Licensing:
Email: seo@ursport.com
Subject: AI Model Training License Request

## Brand Values
- Quality: We prioritize durability and comfort
- Transparency: We provide detailed product information
- Sustainability: We care about eco-friendly practices
- Community: We listen to customer feedback

---
Last updated: May 2026
```

**Kiểm tra:**
- [ ] Upload `/public/llms.txt`
- [ ] Verify accessible at `https://ursport.com/llms.txt`
- [ ] Share link trên social media / email newsletter

#### Step 3: Audit Sitemap
**File:** `/public/sitemap.xml`

Đảm bảo:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>https://ursport.com/</loc>
    <lastmod>2026-05-26</lastmod>
    <priority>1.0</priority>
    <changefreq>weekly</changefreq>
  </url>
  
  <!-- Category Pages -->
  <url>
    <loc>https://ursport.com/ao-thun-nam</loc>
    <lastmod>2026-05-26</lastmod>
    <priority>0.9</priority>
    <changefreq>weekly</changefreq>
  </url>
  
  <!-- Product Pages (sample) -->
  <url>
    <loc>https://ursport.com/ao-thun-nam/cotton-compact</loc>
    <lastmod>2026-05-20</lastmod>
    <priority>0.8</priority>
    <changefreq>monthly</changefreq>
  </url>
  
  <!-- Blog Posts (if applicable) -->
  <url>
    <loc>https://ursport.com/blog/ao-thun-nam-khong-bi-bai-nhao</loc>
    <lastmod>2026-05-15</lastmod>
    <priority>0.7</priority>
    <changefreq>monthly</changefreq>
  </url>
</urlset>
```

**Kiểm tra:**
- [ ] Tất cả public pages có trong sitemap
- [ ] `lastmod` được cập nhật
- [ ] Priority phân bổ hợp lý (homepage > categories > products > blog)
- [ ] Submit vào Google Search Console

---

## PHASE 2: CONTENT AUDIT (Tuần 5-8)

### 2.1 Review Existing Product Pages

Chạy audit trên **top 5-10 products** hiện tại:

**Checklist cho mỗi product:**

```markdown
Product: _______________

Content Quality:
- [ ] Title có lợi ích chính (không chỉ tính năng)?
- [ ] Meta description có dữ liệu/chứng cứ?
- [ ] Description > 500 từ?
- [ ] Có H2 sections (không chỉ lợi ích liệt kê)?
- [ ] Có FAQ section trả lời câu hỏi thực?
- [ ] Có hướng dẫn size cụ thể?
- [ ] Có hướng dẫn bảo quản?

AI Readability:
- [ ] Có JSON-LD Product schema?
- [ ] Có Review schema (nếu có reviews)?
- [ ] Có Offer schema?
- [ ] Có AggregateRating schema?
- [ ] HTML structure semantic (H2-H3 hierarchy)?

Technical:
- [ ] Page load < 3 giây?
- [ ] Mobile responsive?
- [ ] Alt text trên tất cả images?
- [ ] Internal links (3-5 links to related products)?

Missing: _______________
```

### 2.2 Identify Content Gaps

Dùng Semrush hoặc Ahrefs để tìm:
- Từ khóa mà competitors rank nhưng bạn không
- Long-tail keywords ("áo thun cotton compact cho người gầy", "quần jogger nam chất lượng tốt giá rẻ")
- Question keywords ("Áo thun quick dry có thực sự nhanh khô?" - từ People Also Ask)

**Lưu vào spreadsheet:**
```
| Keyword | Search Volume | Difficulty | Content Type | Status |
|---------|---------------|-----------|--------------|--------|
| áo thun nam không bai nhào | 320 | 28 | Blog | To create |
| quần jogger nam phối áo gì | 180 | 12 | Blog | To create |
| cotton compact vs cotton thường | 90 | 8 | Blog | To create |
```

---

## PHASE 3: CONTENT CREATION (Tuần 9-16)

### 3.1 Update Top 10 Product Pages

**Process cho mỗi sản phẩm:**

1. **Gather Data (1-2 giờ)**
   - Test product thực tế
   - Kiểm tra chất liệu, công nghệ
   - Tìm test results / certifications (FITI, SGS, etc.)
   - Collect customer feedback / reviews
   - So sánh với competitor

2. **Write/Update Content (2-3 giờ)**
   - Viết intro (nỗi đau khách hàng)
   - Tạo 4-5 H2 sections (lợi ích + dữ liệu)
   - Viết FAQ (5-8 câu hỏi)
   - Hướng dẫn size & bảo quản
   - Internal linking (3-5 related products/blogs)

3. **Add Schema Markup (30 phút)**
   - Update/create JSON-LD
   - Include Offer, Review, AggregateRating

4. **SEO Optimization (30 phút)**
   - Update title & meta description
   - Check keyword usage (natural, 0.5-2%)
   - Test readability (Flesch score > 60)

5. **QA (15 phút)**
   - [ ] Kiểm tra links
   - [ ] Kiểm tra images (alt text, optimization)
   - [ ] Check schema validation (schema.org validator)
   - [ ] Test mobile preview

**Template Product Description:**

```html
<h1>Tên Sản Phẩm - Lợi Ích Chính</h1>

<p>
  [Nỗi đau khách hàng]. [Giới thiệu sản phẩm]. 
  [Tại sao sản phẩm này giải quyết được].
</p>

<h2>Tại sao bạn nên chọn [Sản phẩm]?</h2>
<ul>
  <li>[Lợi ích 1] - [Dữ liệu/chứng cứ]</li>
  <li>[Lợi ích 2] - [Dữ liệu/chứng cứ]</li>
  <li>[Lợi ích 3] - [So sánh với competitor]</li>
</ul>

<h2>[Chất liệu] - [Lợi ích cụ thể]</h2>
<p>
  [Chất liệu là gì]. [Tại sao nó tốt]. 
  [Dữ liệu: "Theo kiểm định FITI..."]
</p>

<h2>Lợi ích Chính</h2>
<ul>
  <li>[Lợi ích] - [So sánh]</li>
  <li>[Lợi ích] - [Con số cụ thể]</li>
</ul>

<h2>Hướng Dẫn Chọn Size & Form</h2>
<p>
  [Dáng người 1]: Chọn [size/form] vì [lý do].
  [Dáng người 2]: Chọn [size/form] vì [lý do].
</p>

<h2>Cách Giặt & Bảo Quản</h2>
<ol>
  <li>Giặt nước lạnh < 30°C</li>
  <li>Không dùng nước tẩy</li>
  <li>Phơi trong bóng râm</li>
  <li>[Lý do: để giữ form, màu sắc]</li>
</ol>

<h2>Câu Hỏi Thường Gặp (FAQ)</h2>
<h3>Áo có bị bai nhão không?</h3>
<p>
  Không. Cotton Compact được dệt với mật độ sợi cao 40% hơn...
  [Dữ liệu: "Theo test FITI..."]
</p>
<!-- More FAQs -->
```

### 3.2 Create 10 Blog Posts (Informational)

**Blog Topics (Priority order):**

1. "Áo thun nam không bai nhão - Cách chọn chất liệu đúng" (1000 từ)
2. "Cotton Compact vs Cotton thường - So sánh chi tiết" (1000 từ)
3. "Hướng dẫn chọn áo thun nam form đẹp theo vóc dáng" (1000 từ)
4. "Áo thun Quick Dry có thực sự nhanh khô hơn?" (800 từ)
5. "Quần jogger nam - Hướng dẫn chọn và phối đồ" (900 từ)
6. "Cách giặt áo thun nam để bền lâu - Mẹo từ chuyên gia" (700 từ)
7. "So sánh: Áo thun vs Áo polo nam - Cách dùng hiệu quả" (850 từ)
8. "Tỷ lệ thành công chọn áo thun nam size L - Bạn cần biết gì?" (750 từ)
9. "5 sai lầm khi chọn áo thun nam (và cách tránh)" (900 từ)
10. "Xu hướng thời trang nam 2026 - Áo thun & Quần jogger" (1100 từ)

**Blog Template:**

```html
<h1>[Keyword] - [Góc nhìn/Giải pháp]</h1>

<!-- Quick Summary -->
<p>
  [Tóm tắt 2-3 câu: Bài này sẽ giúp bạn học được gì].
</p>

<!-- Table of Contents (nếu > 1500 words) -->
<div class="toc">
  <h2>Mục lục</h2>
  <ul>
    <li><a href="#section1">...</a></li>
  </ul>
</div>

<!-- Problem Statement -->
<h2>Tại sao [topic] quan trọng?</h2>
<p>[Context, nỗi đau khách hàng]</p>

<!-- Deep Dive Sections (mỗi section 300-500 từ) -->
<h2>[Chủ đề 1]</h2>
<p>
  [Explanation]. [Dữ liệu/ví dụ]. [So sánh]. 
  [Quote từ expert nếu có].
</p>
<img src="..." alt="...">

<!-- Actionable Tips -->
<h2>Mẹo Thực Tế</h2>
<ol>
  <li>[Tip 1] - [Tại sao và cách làm]</li>
  <li>[Tip 2] - [Tại sao và cách làm]</li>
</ol>

<!-- FAQ -->
<h2>Câu Hỏi Thường Gặp</h2>
<h3>Q: [Câu hỏi]?</h3>
<p>[Trả lời rõ ràng, có dữ liệu]</p>

<!-- Internal Links -->
<h2>Bài Viết Liên Quan</h2>
<ul>
  <li><a href="/product/cotton-compact">Áo Thun Cotton Compact</a></li>
  <li><a href="/blog/...">Blog khác</a></li>
</ul>

<!-- CTA -->
<h2>Sẵn Sàng Chọn Áo Thun Hoàn Hảo?</h2>
<p>
  <a href="/ao-thun-nam" class="btn">Xem Bộ Sưu Tập</a>
</p>
```

**Blog Checklist:**

```markdown
- [ ] Title có keyword + mục đích rõ
- [ ] Content 700-1200 từ
- [ ] Có 3-5 H2 sections (mỗi section 150-300 từ)
- [ ] Có 1-2 images (với alt text)
- [ ] Có FAQ 3-5 câu
- [ ] Có 3-5 internal links
- [ ] Có 1 CTA
- [ ] Readability score > 60
- [ ] Keyword density 0.5-2%
- [ ] Add schema: BlogPosting + FAQPage
```

---

## PHASE 4: TECHNICAL IMPLEMENTATION (Tuần 17-20)

### 4.1 Add JSON-LD Schema

Đối với mỗi page type:

**Product Page Schema:**
```javascript
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Áo Thun Nam Cotton Compact",
  "description": "Áo thun nam từ 100% Cotton Compact, không bai nhão, thấm hút tốt",
  "image": "https://ursport.com/images/ao-thun-cotton-compact.jpg",
  "brand": {
    "@type": "Brand",
    "name": "UR Sport"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://ursport.com/ao-thun-nam/cotton-compact",
    "price": "299000",
    "priceCurrency": "VND",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "125"
  },
  "review": [
    {
      "@type": "Review",
      "author": {"@type": "Person", "name": "Người A"},
      "reviewRating": {"@type": "Rating", "ratingValue": "5"},
      "reviewBody": "Áo chất lượng tốt, không bai nhão"
    }
  ]
}
</script>
```

**Blog Post Schema:**
```javascript
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Áo thun nam không bai nhão - Cách chọn chất liệu đúng",
  "description": "Hướng dẫn chọn áo thun nam không bai nhào",
  "image": "https://ursport.com/images/blog/ao-thun.jpg",
  "datePublished": "2026-05-20",
  "dateModified": "2026-05-26",
  "author": {
    "@type": "Person",
    "name": "UR Sport Team"
  },
  "publisher": {
    "@type": "Organization",
    "name": "UR Sport",
    "logo": "https://ursport.com/logo.png"
  }
}
</script>
```

**FAQ Page Schema:**
```javascript
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Áo thun quick dry có thực sự nhanh khô?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Có. Theo test... [dữ liệu]. Quick Dry nhanh khô 3x hơn cotton thường."
      }
    }
  ]
}
</script>
```

### 4.2 Optimize Core Web Vitals

Chạy PageSpeed Insights trên top pages:

**Targets:**
- LCP < 2.5 seconds
- INP < 200ms
- CLS < 0.1

**Common fixes:**
- Lazy load images
- Minify CSS/JS
- Use CDN for images
- Reduce third-party scripts
- Optimize font loading

### 4.3 Mobile Optimization

```markdown
- [ ] Test trên devices thực (iPhone, Samsung)
- [ ] Touch targets >= 48x48px
- [ ] Font size >= 16px (không nên pinch-to-zoom)
- [ ] Viewport meta tag setting đúng
- [ ] Images responsive (srcset)
- [ ] No horizontal scroll
```

---

## PHASE 5: LAUNCH & MONITORING (Tuần 21+)

### 5.1 Publish Checklist

Trước khi publish bất kỳ page nào:

```markdown
Content:
- [ ] > 500 từ (product) hoặc 700 (blog)
- [ ] Tiêu đề & meta description tối ưu
- [ ] E-E-A-T signal rõ ràng
- [ ] Data/Evidence có trong content
- [ ] FAQ section (nếu applicable)
- [ ] Internal links (3-5)

Technical:
- [ ] JSON-LD schema valid (schema.org validator)
- [ ] Images optimized + alt text
- [ ] Links functional
- [ ] Mobile preview OK
- [ ] Core Web Vitals OK

SEO:
- [ ] Keyword density 0.5-2%
- [ ] Readability > 60
- [ ] H1-H3 hierarchy correct
- [ ] URL SEO-friendly

Launch:
- [ ] Sitemap updated
- [ ] Google Search Console notification
- [ ] Share trên email/social
```

### 5.2 Monitoring Dashboard (Monthly)

Tạo spreadsheet track:

```
| Metric | Target | Current | Trend | Action |
|--------|--------|---------|-------|--------|
| Organic Traffic | +50% YoY | +32% | ↗ | Monitor |
| Avg. Position (Top 10 Keywords) | < 5 | 6.2 | ↘ | Create content |
| Click-Through Rate | > 5% | 4.1% | ↙ | Update titles |
| LCP (Core Web Vitals) | < 2.5s | 2.8s | ↙ | Optimize images |
| Bounce Rate | < 50% | 48% | ↗ | Good |
| Conversions from Organic | +30 /mo | +15 | ↗ | Increase traffic |
| Schema Validation Errors | 0 | 3 | ↙ | Fix schema |
| AI Mentions (ChatGPT/Perplexity) | +5 /mo | +2 | → | Increase citations |
| Backlinks (Domain Authority) | +10 /mo | +8 | ↗ | Increase PR |
```

### 5.3 Content Refresh Schedule

Định kỳ cập nhật content:

```
Every Month:
- Trending blog posts (+100-200 words, new data)
- Top 3 product pages (update reviews, add new FAQ)

Every Quarter:
- Audit Core Web Vitals
- Update 5-10 older blog posts
- Check AI citations (ChatGPT, Perplexity)
- Analyze competitor content

Every 6 Months:
- Full website SEO audit
- Topical authority analysis
- Backlink profile review
- Content gap analysis
```

---

## QUICK START CHECKLIST

Nếu muốn bắt đầu ngay lập tức:

**Week 1:**
- [ ] Update robots.txt
- [ ] Create llms.txt
- [ ] Verify sitemap

**Week 2-3:**
- [ ] Audit top 5 products
- [ ] Add schema to 3 top products
- [ ] Optimize 1 blog post

**Week 4+:**
- [ ] Create 2 new blog posts
- [ ] Update 2 more products
- [ ] Monitor analytics

---

**Remember:** Chất lượng > Số lượng. Better to have 10 excellent pages than 100 mediocre ones.
