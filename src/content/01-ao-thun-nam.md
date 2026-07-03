# 01 - Áo Thun Nam SEO Content Plan

80 bài SEO xoay quanh áo thun nam, xây dựng topical authority cho danh mục `/ao-thun-nam`.



## QUY TẮC DÀNH CHO AI VIẾT BÀI (SYSTEM PROMPT)
Khi nhận nội dung từ file này để sinh bài viết, AI bắt buộc phải tuân thủ nghiêm ngặt các quy tắc sau:

### 1. Giọng văn và Thương hiệu URSport (Brand Voice)
- **Đại từ:** Xưng hô "bạn".
- **Văn phong:** Chuyên gia tư vấn thể thao: thực tế, thân thiện, rõ ràng và hữu ích. Không nói sáo rỗng, không phóng đại ("tốt nhất thị trường", "số 1", "cam kết 100%").
- **Tỷ lệ nội dung:** 70% tư vấn giải pháp thực tế, 30% gợi ý danh mục/sản phẩm URSport tự nhiên.
- **Từ ngữ khuyên dùng:** phù hợp, bền bỉ, thoải mái, thoáng mát, co giãn, thấm hút, dễ phối, tập luyện, linh hoạt.
- **Quy tắc claim sản phẩm:** Tuyệt đối không tự bịa chất liệu, giá cả, công nghệ độc quyền, tính năng y tế nếu dữ liệu không cung cấp. Nếu thiếu, hãy tư vấn chung và note để admin bổ sung.

### 2. Yêu cầu Cấu trúc bài viết & Chất lượng
- **Độ dài và Cấu trúc:** Bài viết không lan man, không nhồi nhét keyword. Mỗi bài có H1 duy nhất. Dùng `<p>, <h2>, <h3>, <ul>, <li>, <strong>` đúng ngữ cảnh.
- **Không dùng Markdown:** Kết quả trả về (contentHtml) BẮT BUỘC chỉ dùng thẻ HTML thuần túy, tuyệt đối không bọc nội dung HTML bằng Markdown (không dùng \`\`\`html ... \`\`\`).
- **FAQ:** Luôn có phần FAQ cuối bài (dùng thẻ `<h2>Câu hỏi thường gặp</h2>`, câu hỏi dùng `<h3>`, câu trả lời dùng `<p>` ngay dưới).
- **Internal Links:** Chèn tự nhiên 4-7 link theo danh sách cung cấp (vd: `<a href="/ao-thun-nam">áo thun nam</a>`).
- **So sánh:** Nếu có so sánh, BẮT BUỘC dùng cấu trúc HTML sau: `<div class="table-wrap"><table class="compare-table"><thead><tr><th>Tiêu chí</th><th>Lựa chọn 1</th><th>Lựa chọn 2</th></tr></thead><tbody><tr><td>...</td><td><span class="badge-good">Điểm mạnh</span></td><td><span class="badge-normal">Hạn chế</span></td></tr></tbody></table></div>`

### 3. Yêu cầu Xử lý Ảnh (Image & imagePrompts)
- **Trong HTML (contentHtml):** BẮT BUỘC chèn đúng 3 block `<figure>`: 1 ảnh hero/ngữ cảnh, 1 ảnh chi tiết sản phẩm, 1 ảnh so sánh/lifestyle.
- **Format:** `<figure><img src="CLOUDINARY_OR_UPLOADED_IMAGE_URL" alt="Mô tả tự nhiên có keyword" height="800" width="1200" title="Title ngắn gọn"><figcaption>Ghi chú hữu ích.</figcaption></figure>`. Không tự bịa URL thật.
- **Đầu ra imagePrompts:** BẮT BUỘC trả về kèm 1 mảng JSON `imagePrompts` chứa đúng 3 object với cấu trúc: `{"filename": "...", "alt": "...", "title": "...", "caption": "...", "prompt": "..."}`. Mọi prompt tạo ảnh (tiếng Anh) phải yêu cầu tỉ lệ 3:2, không có text trên ảnh, phong cách nam giới Việt Nam.

### 4. Định dạng Đầu ra Cuối cùng (Output Format)
AI trả về kết quả dưới dạng JSON theo đúng cấu trúc sau (hoặc chia 2 phần rõ rệt nếu trả trên chat):
```json
{
  "contentHtml": "<h1>Tiêu đề</h1><p>Nội dung HTML sạch...</p>",
  "imagePrompts": [
    {
      "filename": "ao-thun-nam-hero",
      "alt": "Nam giới mặc áo thun...",
      "title": "Áo thun nam",
      "caption": "Mô tả ảnh...",
      "prompt": "Premium ecommerce lifestyle photography..."
    }
  ]
}
```
## 001. Áo thun nam mặc có nóng không? Cách chọn áo mát cho mùa hè

1. SEO CORE
Title: Áo thun nam mặc có nóng không? Cách chọn áo mát
SEO Title: Áo thun nam mặc có nóng không? Bí quyết chọn áo cực mát
Meta Description: Giải đáp thắc mắc áo thun nam mặc có nóng không. Hướng dẫn chi tiết cách chọn áo thun thoáng mát, thấm hút mồ hôi tốt cho nam giới vào mùa hè.
Slug: ao-thun-nam-mac-co-nong-khong
Primary keyword: cách chọn áo mát cho mùa hè
Secondary keywords: thời trang nam thể thao, áo thun nam mặc hằng ngày, áo thun nam thoáng mát, áo thun nam URSport
Search intent: Informational
Funnel: TOFU
Priority: HIGH
Canonical URL: https://shop-ur-sport.vercel.app/blog/ao-thun-nam-mac-co-nong-khong

2. INTERNAL LINK MAP
Category: /ao-thun-nam
Subcategory: /ao-thun-cotton-nam, /ao-thun-the-thao-nam
Collection: /ao-thun-nam
Related blog: /blog/ao-thun-nam-loai-nao-tham-hut-mo-hoi-tot
Commercial page: /ao-thun-nam
Product target: /san-pham/ao-thun-the-thao-in-hoa-tiet-camo

3. CONTENT BLUEPRINT
H2 #1: Sự thật: Áo thun nam mặc có nóng không?
Content brief: Giải thích trực tiếp vấn đề cốt lõi. Khẳng định áo thun không hề nóng nếu chọn đúng chất liệu và form dáng. Phân tích nguyên nhân khiến nam giới thường cảm thấy bí bách khi mặc áo thun (do chất liệu nilon, form quá ôm).
Image filename: ao-thun-nam-mac-co-nong-khong-giai-dap.webp
Alt text: Chàng trai Việt Nam mặc áo thun nam URSport thoải mái trong ngày hè nắng nóng
AI image prompt: Premium ecommerce photography, Vietnamese male model wearing a comfortable light-colored t-shirt walking outdoors in summer, URSport sporty casual style, natural sunlight, realistic fabric texture, modern minimal background, 4k.

H2 #2: So sánh các chất liệu áo thun mát nhất cho mùa hè Việt Nam
Content brief: Lập bảng so sánh trực quan giữa Cotton 100%, Cotton Compact và Polyester Quick Dry (thể thao). Giải thích ưu nhược điểm từng loại. Gợi ý chất liệu phù hợp nhất cho thời tiết nóng ẩm của Việt Nam để thấm hút mồ hôi tốt.
Image filename: so-sanh-chat-lieu-ao-thun-nam-mua-he.webp
Alt text: Bảng phân tích và so sánh các chất liệu áo thun nam thoáng mát cho mùa hè
AI image prompt: Premium infographic style photography showing different fabric textures (Cotton vs Quick Dry polyester) side by side, highly detailed, realistic fabric macro shot, clean studio lighting, luxury brand aesthetic, 4k.

H2 #3: 3 Bí quyết chọn áo mát cho mùa hè giúp nam giới luôn tự tin
Content brief: Hướng dẫn thực tế cách chọn áo thun theo form dáng (ưu tiên regular hoặc loose fit để thoát nhiệt), màu sắc (chọn màu sáng để ít bắt nắng) và công nghệ dệt. Gợi ý các dòng sản phẩm URSport phù hợp để mặc đi làm hoặc chơi thể thao mùa hè.
Image filename: bi-quyet-chon-ao-thun-nam-thoang-mat.webp
Alt text: Nam giới tự tin dạo phố với chiếc áo thun thể thao thoáng mát và phong cách
AI image prompt: Premium ecommerce photography, Vietnamese male model stretching comfortably in a breathable activewear t-shirt, URSport sporty casual style, clean studio lighting, modern minimal background, 4k.

4. FAQ
Q: Áo thun 100% cotton có phải là loại mát nhất không?
A: Cotton 100% cực kỳ mát và thấm hút mồ hôi rất tốt. Tuy nhiên, nếu bạn vận động nhiều, áo sẽ dễ bị ẩm và lâu khô. Lúc này, áo thun ứng dụng công nghệ Quick Dry sẽ là lựa chọn hoàn hảo hơn giúp cơ thể luôn khô thoáng.

Q: Làm sao để chọn áo thun mặc không bị hầm bí vào ngày hè?
A: Bạn nên ưu tiên chọn áo có form dáng rộng vừa phải (regular fit) thay vì ôm sát cơ thể. Về màu sắc, hãy chọn gam màu sáng như trắng, xám nhạt để hạn chế hấp thụ nhiệt.

Q: Mặc áo thun thể thao đi làm có bị thiếu lịch sự không?
A: Hoàn toàn không nếu bạn biết cách phối. Hãy chọn áo thun thể thao basic, màu trung tính và phối cùng quần kaki hoặc quần âu để có phong cách sporty casual vừa thoải mái vừa thanh lịch.

5. CTA
Khám phá áo thun nam thoáng mát URSport

6. SCHEMA
Informational: Article, FAQPage, BreadcrumbList