# Mẫu sửa Blog URSport

File này là luật viết bài cho AI. Chỉ dùng để hiểu cấu trúc và tiêu chuẩn tối ưu. Không copy nguyên bất kỳ dòng mẫu nào vào kết quả cuối.

## Dữ liệu bắt buộc AI phải đọc trước

- Tiêu đề gốc người dùng đã nhập trong form.
- Từ khóa chính cho AI đọc.
- Từ khóa phụ cho AI đọc.
- Slug URL hiện tại nếu đã có.
- SEO Title và SEO Description hiện tại nếu đã có.
- Nội dung bài viết hiện tại trong editor.
- Ảnh đại diện và danh sách ảnh bài viết đang có.

## Pipeline bắt buộc trước khi trả kết quả

AI phải xử lý bài theo đúng thứ tự bên dưới. Không được bỏ qua các bước cuối như Internal Link, Quality Audit và Publish Gate.

1. **AI Vision**
   - Đọc tiêu đề, keyword, ảnh và nội dung hiện tại.
   - Xác định intent chính, đối tượng đọc và mục tiêu chuyển đổi.

2. **Product Blueprint**
   - Xác định sản phẩm, category hoặc nhu cầu mua hàng liên quan.
   - Giữ đúng ngữ cảnh URSport, không viết chung chung như blog thời trang bất kỳ.

3. **Rule Engine**
   - Áp dụng luật giữ đúng tiêu đề gốc, không copy placeholder, không đổi chủ đề.
   - Nếu tiêu đề là câu hỏi, mở bài phải trả lời thẳng câu hỏi.

4. **SEO Engine**
   - Tối ưu title, slug, meta description, H2/H3 và keyword coverage.
   - Không nhồi từ khóa, ưu tiên tự nhiên và đúng intent.

5. **Content Engine**
   - Viết lại `contentHtml` theo cấu trúc blog hoàn chỉnh.
   - Đoạn văn ngắn, dễ đọc, có ví dụ, checklist hoặc bảng nếu phù hợp.

6. **Image SEO**
   - Giữ ảnh thật đang có nếu phù hợp.
   - Mỗi ảnh phải có `alt`, `title`, `width`, `height` và `figcaption`.
   - Không dùng `CLOUDINARY_OR_UPLOADED_IMAGE_URL`.

7. **Schema**
   - Tạo Article schema.
   - Tạo FAQ schema nếu bài có FAQ.
   - Tạo HowTo schema nếu bài có hướng dẫn từng bước rõ ràng.

8. **Internal Link**
   - Thêm 3-5 internal link tự nhiên đến category, sản phẩm hoặc bài blog liên quan.
   - Thêm ít nhất 1 external link đến nguồn uy tín nếu bài có số liệu, năm, xu hướng hoặc nhận định cần dẫn nguồn.
   - Dùng đúng dạng `<a href="/duong-dan">anchor text</a>`.
   - Anchor text phải liên quan ngữ cảnh, không nhồi link trong một đoạn.

9. **Quality Audit**
   - Tự kiểm lại title, meta, slug, H2/H3, ảnh, FAQ, schema, internal link và readability.
   - Loại bỏ placeholder, nội dung lặp, đoạn quá dài, link giả và ảnh giả.
   - Kiểm tra tiếng Việt có dấu, không lỗi font, không câu văn máy móc.

10. **Publish Gate**
   - Chỉ trả kết quả cuối khi bài đã qua các tiêu chí publish.
   - SEO Score theo checklist phải đạt 90-100 điểm, ưu tiên 100 điểm.
   - Không trả bản nháp nếu còn placeholder, thiếu keyword chính, thiếu meta description, nội dung dưới 2500 ký tự hoặc sai intent tiêu đề.
   - Kết quả cuối phải sạch, sẵn sàng lưu vào bài viết.

## Luật giữ đúng ý bài

- Giữ đúng chủ đề, sản phẩm, thông tin cốt lõi và ý định tìm kiếm của bài viết gốc.
- Không tự đổi tiêu đề sang một hướng khác.
- Nếu tiêu đề là câu hỏi, đoạn mở bài phải trả lời thẳng câu hỏi trong 1-2 câu đầu.
- Nếu tiêu đề có phần sau như "Mẹo phối", "Cách chọn", "Checklist", "Kinh nghiệm", hãy xem đó là hướng triển khai chính.
- Văn phong tự nhiên cho nam giới Việt Nam, dễ hiểu, thực tế, có chuyên môn vừa đủ.
- Không dùng markdown trong kết quả cuối. Chỉ trả HTML trong trường `contentHtml`.

## Cấu trúc bài viết đề xuất

1. Mở bài có hook hấp dẫn trong 3 dòng đầu.
2. Trả lời nhanh intent chính của tiêu đề.
3. 3-5 mục H2 chính, mỗi mục có định nghĩa hoặc câu trả lời rõ ràng ở đầu.
4. Dùng H3 cho ý phụ, mẹo, lỗi thường gặp hoặc ví dụ.
5. Thêm checklist, bullet points hoặc bảng so sánh khi có liệt kê.
6. Thêm internal link tự nhiên đến category hoặc sản phẩm URSport.
7. Thêm FAQ cuối bài.
8. Kết luận ngắn và CTA tự nhiên.

## Mẫu bố cục hoàn chỉnh AI nên bám theo

Lưu ý: Đây là khung cấu trúc, không phải nội dung để copy. AI phải thay toàn bộ phần mô tả bằng nội dung thật dựa trên tiêu đề, từ khóa và bài viết hiện tại.

```html
<p><strong>Mở bài:</strong> Viết hook 100-150 từ. Nêu vấn đề thực tế, bối cảnh hoặc số liệu nếu có nguồn, sau đó đưa ra hướng giải pháp. Nếu tiêu đề là câu hỏi, trả lời thẳng câu hỏi trong 1-2 câu đầu.</p>

<h2>Mục lục</h2>
<ol>
  <li>Ý chính 1 liên quan trực tiếp đến từ khóa chính</li>
  <li>Ý chính 2 giải quyết nhu cầu hoặc nỗi đau của người đọc</li>
  <li>Ý chính 3 đưa ra mẹo, checklist hoặc ví dụ thực tế</li>
</ol>

<h2>Ý chính 1 chứa từ khóa phụ phù hợp</h2>
<p>Mở đầu mục bằng một định nghĩa hoặc câu trả lời rõ ràng trong 40-60 từ.</p>

<h3>Chi tiết 1.1</h3>
<p>Viết đoạn văn 3-5 câu, có ví dụ thực tế và có thể chèn hình ảnh thật nếu brief cung cấp URL ảnh.</p>

<h3>Chi tiết 1.2</h3>
<ul>
  <li>Ý liệt kê 1, ngắn và dễ đọc.</li>
  <li>Ý liệt kê 2, có lợi ích hoặc tiêu chí cụ thể.</li>
  <li>Ý liệt kê 3, tránh viết chung chung.</li>
</ul>

<h2>Ý chính 2</h2>
<p>Triển khai nội dung theo intent tìm kiếm, có internal link tự nhiên nếu phù hợp.</p>

<h2>Tóm tắt chính</h2>
<ul>
  <li>Ý quan trọng 1.</li>
  <li>Ý quan trọng 2.</li>
  <li>Ý quan trọng 3.</li>
</ul>

<h2>Câu hỏi thường gặp</h2>
<h3>Câu hỏi 1?</h3>
<p>Trả lời ngắn 40-60 từ, rõ ý, có thể được AI Search trích dẫn độc lập.</p>
<h3>Câu hỏi 2?</h3>
<p>Trả lời ngắn 40-60 từ, tự nhiên và đúng ngữ cảnh.</p>
<h3>Câu hỏi 3?</h3>
<p>Trả lời ngắn 40-60 từ, ưu tiên lời khuyên thực tế.</p>

<h2>Kết luận</h2>
<p>Tóm tắt giá trị chính của bài và thêm CTA tự nhiên đến sản phẩm, category hoặc bài liên quan của URSport.</p>
```

## Checklist tối ưu Google 2025

- Title và SEO Title nên dài 60-65 ký tự, chứa từ khóa chính và giữ đúng ý tiêu đề gốc.
- Meta description nên dài 100-160 ký tự, tóm tắt đúng lợi ích của bài.
- URL ngắn gọn, không dấu, có từ khóa chính.
- Chỉ có một H1. Trong `contentHtml` không tạo thêm H1 nếu form đã có tiêu đề bài viết.
- H2/H3 phải logic, dễ quét, không nhảy cấp lung tung.
- Có 3-5 internal link phù hợp.
- Có external link đến nguồn uy tín nếu bài có số liệu, năm hoặc nhận định cần kiểm chứng.
- Hình ảnh phải có `alt`, `title`, `width`, `height` và `figcaption`.
- Có schema phù hợp: Article, FAQ, HowTo nếu bài có hướng dẫn từng bước.

## Checklist tối ưu cho AI Search

Áp dụng cho ChatGPT, Perplexity, Google AI Overview và các công cụ trả lời bằng AI.

- Mỗi H2 nên mở đầu bằng một định nghĩa hoặc câu trả lời rõ ràng.
- Câu trả lời quan trọng nên gói gọn trong 40-60 từ.
- Khi nêu số liệu, xu hướng hoặc năm, phải có nguồn hoặc ngữ cảnh rõ.
- FAQ ở cuối phải viết theo cấu trúc Q&A rõ ràng.
- Câu hỏi FAQ dùng thẻ `<h3>`, câu trả lời ngay sau bằng thẻ `<p>`.
- Dùng ngôn ngữ tự nhiên, conversational, giống người tư vấn thật.
- Tránh jargon phức tạp. Nếu bắt buộc dùng thuật ngữ, phải giải thích ngắn.
- Ưu tiên các đoạn có thể được AI trích dẫn độc lập.

## Checklist cho người đọc

- Mỗi đoạn văn tối đa 5 câu.
- Dùng bullet points khi liệt kê từ 3 ý trở lên.
- Mỗi 300-500 từ nên có hình ảnh, video, checklist hoặc ví dụ thực tế nếu có dữ liệu.
- Highlight thông tin quan trọng bằng `<strong>`.
- Nội dung phải dễ đọc trên mobile.
- Không viết lan man, không lặp ý để kéo dài bài.
- CTA phải tự nhiên, không ép mua quá sớm.

## Internal link

- Dùng thẻ HTML đúng dạng: `<a href="/duong-dan">anchor text</a>`.
- Anchor text phải tự nhiên, liên quan đến ngữ cảnh câu.
- Không nhồi quá nhiều link trong một đoạn.
- Ưu tiên link đến category, sản phẩm hoặc bài blog liên quan của URSport.

## Liên kết Internal & External Link

- Internal link: trỏ sang các bài viết liên quan, category hoặc sản phẩm khác trên website URSport.
- External link: dẫn nguồn tới trang uy tín khi có số liệu, năm, xu hướng hoặc thông tin cần kiểm chứng.
- Bài đạt publish nên có 3-5 internal link và ít nhất 1 external link uy tín.
- External link phải mở ra nguồn thật, không dùng link giả hoặc domain không liên quan.
- Không đặt quá nhiều link trong một đoạn văn; link phải phục vụ người đọc.

## FAQ cuối bài

Cấu trúc bắt buộc:

```html
<h2>Câu hỏi thường gặp</h2>
<h3>Câu hỏi 1?</h3>
<p>Câu trả lời ngắn, rõ, có ích.</p>
<h3>Câu hỏi 2?</h3>
<p>Câu trả lời ngắn, rõ, có ích.</p>
```

## Ảnh trong bài

- Giữ lại ảnh đã có nếu phù hợp.
- Không dùng `CLOUDINARY_OR_UPLOADED_IMAGE_URL` trong kết quả cuối.
- Nếu brief có danh sách ảnh thật, chỉ dùng đúng các URL ảnh đó.
- Nếu chưa có ảnh thật, bỏ qua figure ảnh thay vì tạo đường dẫn giả.
- Không tự bịa đường dẫn `/images/products/...` nếu brief không cung cấp ảnh đó.
- Alt text mô tả đúng ảnh, có thể chứa keyword nhưng không nhồi từ khóa.
- Figcaption phải bổ sung ý nghĩa thực tế cho người đọc, không lặp y nguyên alt.

Cấu trúc ảnh đúng:

```html
<figure>
  <img src="/images/products/ten-anh-san-pham.webp"
       alt="Mô tả ảnh tự nhiên, đúng nội dung ảnh"
       title="Title ảnh ngắn gọn"
       width="1200"
       height="1600">
  <figcaption>Chú thích ảnh hữu ích cho người đọc.</figcaption>
</figure>
```

## Kết quả cuối AI phải trả

- `title`: giữ đúng ý tiêu đề gốc, không trả placeholder.
- `slug`: URL ngắn, không dấu, có từ khóa.
- `contentHtml`: HTML sạch, đúng cấu trúc bài blog.
- `keywordCluster`: gồm từ khóa chính và các từ khóa phụ liên quan.
- `metaTitle`: SEO title tối ưu, không đổi sai chủ đề.
- `metaDescription`: mô tả 100-160 ký tự, dễ hiểu, có lợi ích.
- `imagePrompts`: chỉ dùng để gợi ý ảnh nếu cần, không chèn ảnh giả vào bài.
- `faqSchema`: JSON-LD FAQ nếu có FAQ.

## Những lỗi tuyệt đối không được có

- Không trả `[Tieu de chua tu khoa + loi ich]`.
- Không trả `[url-than-thien-seo]`.
- Không trả `tu khoa 1`, `tu khoa 2`, `tu khoa 3`.
- Không trả `CLOUDINARY_OR_UPLOADED_IMAGE_URL`.
- Không mở bài kiểu: "`[tiêu đề]` là chủ đề nhiều người quan tâm...".
- Không đổi câu hỏi trong tiêu đề thành một chủ đề khác.
