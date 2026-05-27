# AI Citations & LLM Optimization Guide

Hướng dẫn tối ưu hóa content để được trích dẫn bởi ChatGPT, Perplexity, Claude, và các AI search engine khác.

---

## I. HIỂU VỀ AI CITATIONS

### 1.1 Các Hệ Thống AI Chính

| System | Web Search | Citation Format | Market Share | Priority |
|--------|-----------|-----------------|--------------|----------|
| **Google AI Overviews** | Yes (Primary) | "Source: UR Sport" + URL | Very High | **HIGH** |
| **ChatGPT Web Search** | Yes (Paid users) | "[URL](citation)" | Growing | HIGH |
| **Perplexity** | Yes (Default) | "Source: [domain]" + URL | Growing | HIGH |
| **Claude** | Via API | Footnotes [1] | Growing | MEDIUM |
| **Bing Copilot** | Yes | "Source: [title](url)" | Medium | MEDIUM |
| **Kernal/Neeva** | Yes | Citations with source | Small | LOW |

### 1.2 Khi Nào AI Sẽ Trích Dẫn Bạn?

AI trích dẫn content khi:

1. **Trang bạn rank cao Google** cho keyword
   - AI thường quét top 10-20 results
   - Position #1-3 có chance cao nhất

2. **Content trả lời TRỰC TIẾP câu hỏi**
   - Exact match nội dung vs. query
   - Clear structure (H2-H3) = dễ parse
   - Ví dụ:
     - Query: "Áo thun quick dry có nhanh khô không?"
     - Page có section: "Áo Thun Quick Dry - Nhanh Khô Hơn Bao Nhiêu?"
     - → Cao chance bị cite

3. **Passage-level relevance cao**
   - Đoạn (paragraph) phải tự chứa đủ thông tin
   - Không cần context từ phần khác
   - Ví dụ **tốt**:
     ```
     <h2>Tại Sao Quick Dry Nhanh Khô?</h2>
     <p>
       Quick Dry là vải được xử lý với công nghệ micro-fiber 
       giúp nước tan ngay. Theo test của FTIA, Quick Dry khô 
       3x nhanh hơn cotton thường - chỉ 30 phút so với 90 phút.
     </p>
     ```
   - Ví dụ **xấu**:
     ```
     <h2>Quick Dry</h2>
     <p>Vải tốt. Khô nhanh. Thích hợp cho thể thao.</p>
     ```
     (Không đủ context để cite)

4. **Dữ liệu / Chứng cứ**
   - AI ưu tiên cite sources có dữ liệu
   - Numbers, stats, research = trusted
   - ✅ "Theo test FITI, Quick Dry khô 3x nhanh"
   - ❌ "Quick Dry rất nhanh khô"

5. **Brand authority cao**
   - Websites đã được cite trước → cite lại
   - Google E-E-A-T signal = priority
   - Authority building = long-term citation growth

---

## II. CONTENT STRUCTURE FOR AI CITATIONS

### 2.1 The "Citation-Ready" Format

Để content dễ bị trích dẫn, structure phải như này:

```html
<!-- GOOD: Self-contained sections -->
<article>
  <h1>Áo Thun Quick Dry: Nhanh Khô Hơn Bao Nhiêu?</h1>
  
  <!-- Quick intro -->
  <p>Bạn đang tìm áo thun nhanh khô cho mùa hè? 
     Quick Dry là lựa chọn hàng đầu. Nhưng nó thực sự nhanh khô 
     hơn cotton bao nhiêu? Bài viết này sẽ trả lời.</p>
  
  <!-- Passage 1: Self-contained answer -->
  <h2>Quick Dry Khô Nhanh Hơn Cotton Bao Nhiêu?</h2>
  <p>
    Quick Dry được xử lý với công nghệ micro-fiber giúp nước 
    tan ngay trên bề mặt vải, không thấm sâu vào sợi.
    <strong>Theo kiểm định của FTIA (Hàn Quốc), Quick Dry khô 
    hoàn toàn trong 30 phút, còn cotton thường mất 90 phút.</strong>
    Đó là sự khác biệt 3 lần.
  </p>
  <!-- Có thể cite passage này mà không cần context khác -->
  
  <!-- Passage 2: Another self-contained point -->
  <h2>Tại Sao Điều Này Quan Trọng Cho Bạn?</h2>
  <p>
    Khi bạn mặc áo thun Quick Dry sau khi tập gym, mồ hôi sẽ 
    được hút ra khỏi da nhanh, tạo cảm giác thoáng mát lâu hơn. 
    Điều này giảm khó chịu và nguy cơ phát nổi mụn.
    <em>Nói cách khác: Quick Dry = thoải mái + khỏe mạnh hơn.</em>
  </p>
  
  <!-- Passage 3: Practical comparison -->
  <h2>Quick Dry vs Cotton vs Polyester</h2>
  <table>
    <tr>
      <th>Chất Liệu</th>
      <th>Thời Gian Khô</th>
      <th>Cảm Giác</th>
    </tr>
    <tr>
      <td>Quick Dry</td>
      <td>30 phút</td>
      <td>Thoáng, khô ráo</td>
    </tr>
    <tr>
      <td>Cotton</td>
      <td>90 phút</td>
      <td>Ấm, nước lâu khô</td>
    </tr>
    <tr>
      <td>Polyester 100%</td>
      <td>20 phút</td>
      <td>Khô nhưng nóng</td>
    </tr>
  </table>
  <!-- Dễ cite vì format rõ ràng -->
  
  <!-- FAQ Section -->
  <h2>Câu Hỏi Thường Gặp</h2>
  
  <h3>Quick Dry có lạnh không?</h3>
  <p>Không. Quick Dry giữ ấm bình thường như cotton, 
     nhưng khô hơn vì không thấm nước.</p>
  
  <h3>Quick Dry bền lâu không?</h3>
  <p>Có. Theo test độ bền, Quick Dry giữ độ co giãn 
     sau 50 lần giặt như cotton thường sau 20 lần.</p>
</article>
```

### 2.2 Passage-Level Optimization

AI trích dẫn từng **passage (đoạn)** - không phải toàn bộ article.

Bạn cần đảm bảo mỗi passage:

✅ **Self-contained** - Đứng độc lập, không cần context khác
✅ **Direct answer** - Trả lời 1 câu hỏi cụ thể
✅ **Evidence** - Có dữ liệu, numbers, hoặc quotes
✅ **Readable** - Format đẹp, dễ parse cho AI

**Ví dụ tốt cho citation:**
```html
<section>
  <h3>Polyester có dễ bị xù lông không?</h3>
  <p>
    Có. Polyester 100% dễ bị xù lông hơn cotton 30%. 
    Theo kiểm định FITI, sau 100 lần giặt, polyester 
    có 25-40% vùng bị xù, còn cotton chỉ 5-10%.
  </p>
</section>
```

AI có thể cite đoạn này mà không cần đọc toàn bộ article.

**Ví dụ xấu:**
```html
<p>Vải polyester...</p>
<p>Cần kiểm định...</p>
<p>FITI là tổ chức...</p>
<!-- Passage này cần kết hợp 3 phần → khó cite -->
```

---

## III. KEYWORD & QUERY TARGETING FOR AI

### 3.1 Types of Queries AI Search For

#### A. Direct Questions ("How-To" / "What")
```
- "Áo thun quick dry có thực sự nhanh khô không?"
- "Chất liệu nào không bai nhào?"
- "Quick dry là gì?"
```

**Tối ưu cho:** Tạo H2 section trả lời CHÍNH XÁC
```html
<h2>Quick Dry Có Thực Sự Nhanh Khô Không?</h2>
<p>Có. Quick Dry khô 3x nhanh hơn cotton (30 phút vs 90 phút)...</p>
```

#### B. Comparison Queries ("X vs Y")
```
- "Quick dry vs cotton - Nên chọn cái nào?"
- "Polyester vs cotton - So sánh chất liệu"
```

**Tối ưu cho:** Tạo comparison tables + pros/cons
```html
<table>
  <tr><th>Quick Dry</th><th>Cotton</th></tr>
  ...
</table>
```

#### C. Product Queries ("Best", "Top", "Reviews")
```
- "Best áo thun quick dry 2026"
- "Áo thun quick dry tốt nhất"
- "Review áo thun quick dry"
```

**Tối ưu cho:** Add Review schema + rating
```json
{
  "@type": "Product",
  "aggregateRating": {"ratingValue": "4.8"},
  "review": [...]
}
```

### 3.2 Long-Tail Keywords for Passage-Level Content

AI thích cite content trả lời **specific long-tail queries**.

**Chiến lược:**
1. Tìm long-tail keywords từ "People Also Ask"
2. Tạo H3 section cho MỖI câu hỏi
3. Trả lời đầy đủ trong 100-200 từ

**Ví dụ:**
```
Main Keyword: "Áo thun quick dry"
↓
People Also Ask:
- "Áo thun quick dry có nóng không?"
- "Cách phân biệt quick dry thực vs fake?"
- "Quick dry mất form dễ không?"
- "Giặt quick dry ở bao nhiêu độ?"

→ Tạo 4 H3 sections, mỗi section trả lời 1 câu
→ Mỗi section 150-250 từ, có dữ liệu
→ Dễ bị trích dẫn cho từng câu hỏi
```

---

## IV. STRUCTURAL DATA FOR AI READABILITY

### 4.1 Essential Schema for Citations

```json
{
  "@context": "https://schema.org",
  "@type": "Article",  // or BlogPosting
  
  // Basic info
  "headline": "Áo Thun Quick Dry: Nhanh Khô Hơn Bao Nhiêu?",
  "description": "So sánh quick dry vs cotton - Kiểm định độ khô",
  "datePublished": "2026-05-01",
  "dateModified": "2026-05-26",
  
  // Author (E-E-A-T signal)
  "author": {
    "@type": "Person",
    "name": "UR Sport Team",
    "expertise": "Textile & Fashion Technology"
  },
  
  // Publisher (Brand Authority)
  "publisher": {
    "@type": "Organization",
    "name": "UR Sport",
    "url": "https://ursport.com",
    "logo": "https://ursport.com/logo.png"
  },
  
  // Keywords AI cần know about
  "keywords": "áo thun, quick dry, cotton, chất liệu, khô nhanh",
  
  // Image (Better citations)
  "image": {
    "@type": "ImageObject",
    "url": "https://ursport.com/images/quick-dry-comparison.jpg",
    "caption": "So sánh quick dry vs cotton"
  }
}
```

### 4.2 FAQ Schema (Especially Important)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Quick Dry có dễ bị xù lông không?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Không dễ. Quick Dry ít xù lông hơn polyester 30%..."
      }
    },
    {
      "@type": "Question",
      "name": "Cách phân biệt quick dry thực vs fake?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Thực: Khô trong 30 phút. Fake: Khô 60+ phút..."
      }
    }
  ]
}
```

FAQ schema giúp AI parse Q&A → dễ cite FAQ answers.

---

## V. BRAND & AUTHORITY SIGNALS

### 5.1 E-E-A-T Signals for Citations

AI prioritize citations từ sources với strong E-E-A-T:

**Experience:**
- [ ] Sản phẩm: Bạn có sử dụng/test thực tế?
- [ ] Blog: Tác giả có background chuyên môn?
- Action: Mention "We tested..." hoặc "Our customers say..."

**Expertise:**
- [ ] Expert bio rõ ràng (Tác giả là ai?)
- [ ] Chứng chỉ / qualification nếu có
- [ ] Topical authority (bạn viết về cái bạn biết)
- Action: "UR Sport's textile engineers tested..."

**Authority:**
- [ ] Backlinks từ high-authority sites
- [ ] Media mentions
- [ ] Industry recognition
- [ ] Quantity of well-ranked content
- Action: Build backlinks, get press coverage

**Trustworthiness:**
- [ ] HTTPS, Privacy Policy, Terms
- [ ] Clear About/Contact info
- [ ] User reviews & ratings
- [ ] Honest pros/cons (không gạt)
- Action: Show reviews, be transparent

### 5.2 Mention & Citation Building

Để được cite, bạn cần được **mention** trước.

**Chiến lược:**
1. **Tạo original data** (survey, test, research)
2. **Reach out tới bloggers/media** - "Hey, tôi có dữ liệu mới về..."
3. **Guest post** trên fashion blogs
4. **Press release** cho product launches
5. **Ask for citations** - Khi media mention, ask for link

**Ví dụ:**
```
Email to fashion blogger:
"Hi [Name],

Tôi vừa conduct một study về độ khô của quick dry vs cotton.
Kết quả: Quick dry khô 3x nhanh (theo kiểm định FITI).

Có thể mình hợp tác không? Tôi có thể:
- Cung cấp data exclusive cho blog bạn
- Viết guest post
- Interview cho content của bạn

Data này rất valuable cho readers của bạn.

Best,
[Your name]"
```

---

## VI. MONITORING AI CITATIONS

### 6.1 How to Track Citations

**Manual (Regular):**
1. Google các keywords của bạn
2. Scroll xuống các AI Overviews / AI Answers
3. Check xem bạn có được cite không?
4. Screenshot nếu có

**Tools (Paid):**
- **SEMrush:** "AI Overviews" tracker
- **Ahrefs:** Brand monitoring
- **Similarweb:** Track mention growth
- **Google Alerts:** Automated brand mentions

### 6.2 Tracking Template

```markdown
## AI Citation Tracking

### Google AI Overviews
- Keyword: "áo thun quick dry"
- Status: Cited ✅ / Not cited ❌
- Date: 2026-05-26
- Snippet: "Quick dry khó 3x nhanh..."
- URL shown: https://ursport.com/quick-dry-guide

### ChatGPT Web Search
- Test: "Quick dry vs cotton - cái nào tốt hơn?"
- Status: Cited ✅ / Not cited ❌
- How: In footnotes [1] or inline?
- URL: https://ursport.com/...
- Quote: "Quick dry khô 3x nhanh"

### Perplexity
- Similar tracking...
```

### 6.3 Optimization Based on Tracking

Nếu **bạn không được cite** cho keyword nào:

1. **Check position** - Bạn rank hạng mấy? (Phải top 5)
   - Action: Create better content, build backlinks

2. **Check content relevance** - Content trả lời câu hỏi đầy đủ?
   - Action: Add more data, restructure with H2s

3. **Check passage quality** - Passages có self-contained?
   - Action: Rewrite passages to be independent

4. **Check schema** - Có schema markup?
   - Action: Add Product, Article, FAQ schema

---

## VII. CONTENT EXAMPLES

### Example 1: Citation-Ready Product Content

**Product:** Áo Thun Quick Dry Thoáng Mát

```html
<h1>Áo Thun Nam Quick Dry Thoáng Mát | UR Sport</h1>

<p>Bạn mệt mỏi vì áo thun hay dính người sau khi mồ hôi? 
   Áo thun Quick Dry Thoáng Mát của UR Sport là giải pháp tuyệt vời.</p>

<h2>Quick Dry Khô Nhanh Hơn Bao Nhiêu?</h2>
<p>Quick Dry được xử lý với công nghệ micro-fiber.
   <strong>Theo kiểm định FTIA (Hàn Quốc), Quick Dry khô hoàn toàn 
   trong 30 phút, còn cotton thường mất 90 phút.</strong>
   Đó là gần 3 lần nhanh hơn.</p>

<h2>Tại Sao Điều Này Quan Trọng?</h2>
<ul>
  <li><strong>Thoáng mát hơn:</strong> Không bị dính người lâu</li>
  <li><strong>Khỏe mạnh hơn:</strong> Giảm khí hư, nguy cơ nấm</li>
  <li><strong>Tiện dụng hơn:</strong> Có thể giặt tối hôm nay, mặc sáng hôm sau</li>
</ul>

<h2>Cách Chọn Size</h2>
<p><strong>Người gầy:</strong> Chọn Slim Fit để thể hiện vai
   <strong>Người bình thường:</strong> Chọn Regular Fit cho thoải mái
   <strong>Người lớn:</strong> Chọn Athletic Cut để có form đẹp</p>

<h2>FAQ</h2>
<h3>Quick Dry có lạnh không?</h3>
<p>Không. Quick Dry giữ ấm bình thường như cotton, chỉ khô hơn.</p>

<h3>Quick Dry bền lâu không?</h3>
<p>Có. Theo kiểm định độ bền sau 50 lần giặt, Quick Dry giữ độ đàn hồi 95%.</p>

<h3>Giặt Quick Dry ở bao nhiêu độ?</h3>
<p>Nước lạnh < 30°C, không dùng nước tẩy. Phơi bóng râm để giữ màu sắc.</p>

<!-- JSON-LD Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Áo Thun Nam Quick Dry Thoáng Mát",
  "description": "Áo thun quick dry khô 3x nhanh, thoáng mát, bền lâu",
  "image": "https://ursport.com/images/quick-dry.jpg",
  "brand": {"@type": "Brand", "name": "UR Sport"},
  "offers": {
    "@type": "Offer",
    "price": "349000",
    "priceCurrency": "VND",
    "availability": "InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "245"
  }
}
</script>
```

### Example 2: Citation-Ready Blog Post

**Blog:** "Áo Thun Quick Dry vs Cotton - Nên Chọn Cái Nào?"

```html
<h1>Quick Dry vs Cotton - Nên Chọn Cái Nào? (So Sánh 2026)</h1>

<p>Nếu bạn đang loay hoay chọn giữa quick dry và cotton, 
   bài này sẽ giúp bạn quyết định.</p>

<!-- Passage 1: Direct answer to main query -->
<h2>Nên Chọn Quick Dry Hay Cotton?</h2>
<p><strong>Tóm lại:</strong> Chọn <strong>Quick Dry nếu bạn thường xuyên tập gym</strong> 
   (khô nhanh, thoáng mát). Chọn <strong>Cotton nếu bạn mặc hằng ngày</strong> 
   (thoải mái, ấm, bền lâu).</p>

<!-- Passage 2: Detailed comparison -->
<h2>So Sánh Chi Tiết</h2>
<table>
  <tr>
    <th></th>
    <th>Quick Dry</th>
    <th>Cotton</th>
  </tr>
  <tr>
    <td>Thời gian khô</td>
    <td>30 phút</td>
    <td>90 phút</td>
  </tr>
  <tr>
    <td>Cảm giác mặc</td>
    <td>Thoáng mát</td>
    <td>Ấm, thoải mái</td>
  </tr>
  <tr>
    <td>Độ bền</td>
    <td>95% sau 50 lần giặt</td>
    <td>98% sau 50 lần giặt</td>
  </tr>
  <tr>
    <td>Giá</td>
    <td>349K - 499K</td>
    <td>249K - 399K</td>
  </tr>
</table>

<!-- Passage 3: Use case 1 -->
<h2>Nếu Bạn Tập Gym Thường Xuyên</h2>
<p>Nên chọn Quick Dry vì:
<ul>
  <li>Mồ hôi khô nhanh → Thoáng mát, thoải mái</li>
  <li>Dễ giặt & chăm sóc → Giặt tối hôm nay, mặc sáng hôm sau</li>
  <li>Độ bền tốt → Đắt tiền hơn nhưng lâu bền</li>
</ul>

<!-- Passage 4: Use case 2 -->
<h2>Nếu Bạn Mặc Hằng Ngày</h2>
<p>Nên chọn Cotton vì:
<ul>
  <li>Thoải mái cả ngày → Ấm, không bị hạn chế</li>
  <li>Giá rẻ hơn → Có thể mua nhiều cái</li>
  <li>Lâu bền → Cotton bền hơn quick dry 1-2% theo kiểm định</li>
</ul>

<!-- Passage 5: FAQ -->
<h2>FAQ</h2>
<h3>Quick Dry có dễ bị xù lông không?</h3>
<p>Không dễ. Quick Dry ít xù lông hơn polyester 30%, 
   nhưng hơi xù lông hơn cotton 5%.</p>

<h3>Cotton có bai nhào không?</h3>
<p>Có, nhưng ít. Cotton bai nhào hơn quick dry 2-3%, 
   nhưng nếu chọn Cotton Compact thì bai nhào chỉ 1% sau 50 lần giặt.</p>

<!-- Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Quick Dry vs Cotton",
  "datePublished": "2026-05-20",
  "dateModified": "2026-05-26",
  "author": {"@type": "Person", "name": "UR Sport Team"},
  "publisher": {"@type": "Organization", "name": "UR Sport"}
}
</script>
```

---

## VIII. CHECKLIST: CITATION-READY CONTENT

Trước khi publish bất kỳ content nào, check:

```markdown
Passage Structure:
- [ ] Mỗi section là 1 câu hỏi cụ thể?
- [ ] Mỗi section là self-contained (đứng độc lập)?
- [ ] Mỗi passage 150-300 từ (optimal for AI parsing)?

Data & Evidence:
- [ ] Có con số cụ thể (30 phút vs 90 phút)?
- [ ] Có source (FTIA kiểm định, customer feedback)?
- [ ] Có comparison (Quick dry vs cotton)?
- [ ] Có visual (table, image)?

AI Readability:
- [ ] H1 có keyword chính?
- [ ] H2-H3 có từ khóa long-tail?
- [ ] Có FAQ section?
- [ ] Có JSON-LD schema (Article, Product, FAQ)?

Authority:
- [ ] Author bio rõ ràng?
- [ ] Brand name mentioned?
- [ ] E-E-A-T signals?
- [ ] Internal links (3-5)?

Technical:
- [ ] Schema valid (schema.org validator)?
- [ ] Images optimized + alt text?
- [ ] Links functional?
- [ ] Mobile preview OK?
```

---

## SUMMARY

**Key Takeaway:** Để được trích dẫn bởi AI systems (Google AI Overviews, ChatGPT, Perplexity, etc.), bạn cần:

1. **Rank cao Google** cho keyword (vì AI quét top results)
2. **Tạo self-contained passages** trả lời specific questions
3. **Thêm dữ liệu/chứng cứ** (kiểm định, numbers, research)
4. **Optimize structure** (H2-H3, tables, lists)
5. **Add schema markup** (Article, FAQ, Product schemas)
6. **Build authority** (E-E-A-T signals, backlinks, mentions)

**Không cần "trick"** - Chỉ cần tạo content có giá trị thực sự, dễ đọc, có dữ liệu. AI sẽ tự động trích dẫn.
