# Image Format Rules cho Blog SEO URSport

File này là chuẩn dùng chung cho AI Blog, AI SEO Report và đội nội dung khi tạo bài blog SEO.

## Mục tiêu

- Mỗi bài blog phải có 3 ảnh minh họa đúng ngữ cảnh, hỗ trợ người đọc hiểu nhanh nội dung.
- Ảnh phải có cấu trúc HTML thống nhất để tối ưu SEO image, accessibility và bố cục bài viết.
- AI phải trả thêm prompt tạo ảnh để có thể sản xuất ảnh WebP theo đúng chủ đề bài.

## Cấu trúc HTML bắt buộc

```html
<figure>
  <img src="/images/blog/chat-lieu-vai-ao-thun-nam-ursport.webp" alt="Chất liệu vải áo thun nam URSport mềm mại thoáng mát co giãn tốt" height="800" width="1200" title="Chất liệu vải áo thun nam URSport">
  <figcaption>Chất liệu áo thun nam nên ưu tiên sự thoáng mát, co giãn, mềm mại và giữ form tốt.</figcaption>
</figure>
```

## Quy tắc cho mỗi bài viết

- Chèn đúng 3 block `<figure>` trong `contentHtml`.
- Ảnh 1: hero hoặc ngữ cảnh đầu bài, đặt sau đoạn mở bài hoặc sau H2 đầu tiên.
- Ảnh 2: chi tiết sản phẩm, chất liệu, form dáng, đường may hoặc cận cảnh tình huống sử dụng.
- Ảnh 3: so sánh, checklist, lifestyle hoặc tình huống mua hàng theo search intent.
- Chỉ dùng đường dẫn nội bộ `/images/blog/ten-file.webp`.
- Tên file viết thường, không dấu, dùng dấu gạch ngang, đuôi `.webp`.
- Luôn có `alt`, `title`, `height="800"`, `width="1200"` và `<figcaption>`.
- Alt text dưới 125 ký tự, mô tả đúng ảnh, có keyword tự nhiên nhưng không nhồi từ khóa.
- Title ngắn hơn alt, ưu tiên cụm chính của ảnh.
- Figcaption là một câu hữu ích cho người đọc, không lặp y nguyên alt.
- Không dùng markdown image, không dùng ảnh ngoài domain, không thêm style inline.

## Output AI cần trả thêm

Ngoài việc chèn 3 block `<figure>` trong `contentHtml`, AI phải trả thêm `imagePrompts`:

```json
[
  {
    "filename": "slug-bai-viet-hero.webp",
    "alt": "Mô tả ảnh tự nhiên có keyword và đúng ngữ cảnh",
    "title": "Title ảnh ngắn gọn",
    "caption": "Ghi chú ảnh một câu hữu ích.",
    "prompt": "Ảnh lifestyle ecommerce cho nam Việt Nam, chủ đề ..., sản phẩm rõ, ánh sáng tự nhiên, không chữ trên ảnh, tỉ lệ 3:2."
  },
  {
    "filename": "slug-bai-viet-detail.webp",
    "alt": "Mô tả ảnh cận cảnh chất liệu hoặc chi tiết sản phẩm",
    "title": "Title ảnh chi tiết",
    "caption": "Ghi chú ảnh giải thích lợi ích thực tế.",
    "prompt": "Ảnh cận cảnh chất liệu/form/đường may, nền sạch, rõ texture, không chữ trên ảnh, tỉ lệ 3:2."
  },
  {
    "filename": "slug-bai-viet-checklist.webp",
    "alt": "Mô tả ảnh so sánh hoặc checklist theo intent bài viết",
    "title": "Title ảnh so sánh",
    "caption": "Ghi chú ảnh giúp người đọc chọn nhanh hơn.",
    "prompt": "Ảnh lifestyle hoặc checklist trực quan cho nam Việt Nam, bố cục gọn, không chữ nhỏ khó đọc, không chữ trên ảnh, tỉ lệ 3:2."
  }
]
```

## Prompt mẫu cho AI tạo 3 ảnh

```text
Tạo 3 prompt ảnh WebP cho bài blog SEO URSport:
- Chủ đề bài: {{title}}
- Primary keyword: {{primary_keyword}}
- Slug: {{slug}}
- Search intent: {{intent}}

Yêu cầu output:
1. Ảnh hero/ngữ cảnh: nam Việt Nam mặc đồ URSport trong bối cảnh đời thường hoặc tập luyện, sản phẩm rõ, ánh sáng tự nhiên, không chữ trên ảnh, tỉ lệ 3:2.
2. Ảnh detail/close-up: cận cảnh chất liệu, form, đường may hoặc chi tiết sản phẩm liên quan keyword, nền sạch, rõ texture, không chữ trên ảnh, tỉ lệ 3:2.
3. Ảnh comparison/checklist/lifestyle: minh họa cách chọn, so sánh hoặc tình huống mua hàng theo intent bài viết, bố cục gọn, không chữ nhỏ khó đọc, không chữ trên ảnh, tỉ lệ 3:2.

Với mỗi ảnh trả:
- filename trong /images/blog/
- alt dưới 125 ký tự
- title ngắn gọn
- figcaption một câu hữu ích
- prompt tạo ảnh chi tiết
- block HTML <figure> đúng cấu trúc chuẩn URSport
```
