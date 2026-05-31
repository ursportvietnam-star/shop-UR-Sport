# 10 - AI Automation SEO System cho URSport

## Mục tiêu
Tự động hóa quy trình SEO từ Google Sheet → AI Content → Review → Publish → Monitor.

## 1. Google Sheet Content Database

### Cột đề xuất
```text
id
cluster
title
slug
primary_keyword
secondary_keywords
intent
funnel
priority
target_url
internal_links
cta
status
writer
reviewer
published_url
last_updated
gsc_clicks
gsc_impressions
ctr
avg_position
```

## 2. AI Blog Writer Prompt

```text
Bạn là SEO Content Strategist cho URSport.
Viết bài blog tiếng Việt chuẩn SEO theo dữ liệu sau:
- Title: {{title}}
- Primary keyword: {{primary_keyword}}
- Secondary keywords: {{secondary_keywords}}
- Search intent: {{intent}}
- Funnel: {{funnel}}
- Internal links: {{internal_links}}
- CTA: {{cta}}

Yêu cầu:
- 1200–1800 từ.
- H1 duy nhất.
- Có mục lục.
- H2/H3 rõ ràng.
- Không nhồi keyword.
- Có FAQ 4–6 câu.
- Có CTA tự nhiên.
- Có đúng 3 ảnh trong `contentHtml` theo chuẩn `IMAGE_FORMAT_RULES.md`.
- Mỗi ảnh dùng cấu trúc `<figure><img src="/images/blog/ten-file.webp" alt="..." height="800" width="1200" title="..."><figcaption>...</figcaption></figure>`.
- Trả thêm `imagePrompts` gồm 3 prompt tạo ảnh: hero/ngữ cảnh, detail/close-up, comparison/checklist/lifestyle.
- Xuất HTML chuẩn SEO.
```

## 3. AI Product SEO Prompt

```text
Tạo mô tả sản phẩm ecommerce chuẩn SEO cho URSport:
- Tên sản phẩm: {{product_name}}
- Chất liệu: {{material}}
- Màu sắc: {{color}}
- Size: {{sizes}}
- Nhu cầu: {{use_case}}
- Giá: {{price}}

Output:
- SEO title
- Meta description
- Slug
- Short description
- Long description HTML
- Bullet benefits
- FAQ
- Product schema JSON-LD
- Alt text ảnh
```

## 4. AI SEO QA Checklist

AI kiểm tra mỗi ngày:
- Missing title/meta.
- Duplicate title/meta.
- URL slug quá dài.
- Bài không có internal link.
- Bài không có CTA.
- Bài không có FAQ.
- Ảnh thiếu alt.
- Bài thiếu 3 block `<figure>` chuẩn URSport.
- Ảnh thiếu `title`, `height`, `width` hoặc `figcaption`.
- `imagePrompts` thiếu 3 prompt tạo ảnh.
- Broken links.
- Thin content dưới 800 từ.
- Schema JSON-LD lỗi.
- Orphan page.
- Cannibalization cùng keyword.

## 5. AI Analytics Daily Report

Nguồn dữ liệu:
- Google Search Console
- GA4
- Database orders
- Sitemap

Report mỗi ngày:
```text
1. Hôm nay organic traffic tăng/giảm bao nhiêu?
2. Trang nào tăng trưởng tốt?
3. Trang nào tụt traffic?
4. Keyword nào đang lên?
5. Keyword nào CTR thấp?
6. Bài nào cần update?
7. Category nào cần thêm internal links?
8. Có lỗi kỹ thuật nào không?
```

## 6. Publishing Workflow

```text
Google Sheet idea
→ AI generate brief
→ AI write draft
→ Human edit
→ AI SEO QA
→ Publish
→ Submit indexing
→ Monitor 7/14/30 ngày
→ Refresh nếu cần
```

## 7. Next.js Integration Notes

- Dùng `generateMetadata()` cho từng page.
- Dùng dynamic sitemap từ database.
- Dùng JSON-LD component riêng.
- Blog content nên render server-side hoặc static generation.
- Ảnh dùng `next/image`, tên file chuẩn SEO và alt text rõ ràng.

## 8. Automation Priority

### Phase 1
- Auto meta title/description
- Auto slug
- Auto FAQ
- Auto schema

### Phase 2
- Auto internal link suggestion
- Auto blog draft
- Auto image prompt

### Phase 3
- Auto performance report
- Auto content refresh suggestion
- Auto cannibalization detection
