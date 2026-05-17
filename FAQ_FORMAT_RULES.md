# FAQ Format Rules

Khi thêm nội dung câu hỏi và câu trả lời cho SEO danh mục, blog, hoặc nội dung mô tả có FAQ, luôn dùng đúng cấu trúc sau:

```html
<h2>Câu hỏi thường gặp</h2>
<h3>Câu hỏi 1?</h3>
<p>Nhập câu trả lời 1 tại đây.</p>
<h3>Câu hỏi 2?</h3>
<p>Nhập câu trả lời 2 tại đây.</p>
<h3>Câu hỏi 3?</h3>
<p>Nhập câu trả lời 3 tại đây.</p>
```

Quy tắc bắt buộc:

- Tiêu đề khu vực FAQ phải là `Câu hỏi thường gặp` hoặc `FAQ`.
- Mỗi câu hỏi dùng thẻ `h3`.
- Mỗi câu trả lời đặt ngay sau câu hỏi, ưu tiên dùng thẻ `p`.
- Không dùng lại block FAQ hard-code bên ngoài nội dung SEO danh mục.
- Không tạo FAQ trùng lặp ở cuối trang nếu FAQ đã nằm trong nội dung SEO.
- Frontend sẽ tự nhận diện cấu trúc này và chuyển thành accordion xổ xuống.
- Schema FAQPage sẽ được tạo từ chính các câu hỏi/câu trả lời trong nội dung này.

Cấu trúc cũ vẫn được hỗ trợ nếu cần nhập HTML thủ công:

```html
<div class="faq">
  <h3 class="question">Đây là câu hỏi?</h3>
  <div class="answer">
    <p>Đây là câu trả lời.</p>
  </div>
</div>
```

Tuy nhiên, format khuyến nghị là `h2 + h3 + p` vì dễ chỉnh sửa trong toolbar editor hơn.
