export const SEO_GUIDE_CONTEXT = `
URSport SEO rules:
- Model: Ecommerce SEO + Blog Silo + Collection Landing Page.
- Funnel: TOFU blog guides -> MOFU category/subcategory -> BOFU collection/product.
- Blog internal links: 3-5 related blog links, 2-3 category links, 1-2 collection links, 1-3 product links.
- Category page needs: H1, 100-150 word intro, product grid, USP/benefits, material/form/size guidance, related collections, FAQ, links to related blog.
- Product page needs: keyword H1, image alt text, price, size/color variants, short description, detailed description, material, size guide, care guide, FAQ, related products, Product Schema, Breadcrumb Schema.
- Blog page needs: SEO title, meta description, H1, intro, table of contents, H2/H3 sections, image alt, FAQ, CTA to category/product, internal links, Article Schema and FAQ Schema when relevant.
- Image SEO: use descriptive webp filenames and natural alt text with product + keyword.
`;

export const SEO_BLOG_ROADMAP = [
  {
    title: 'Áo thun nam mặc không nóng: chọn chất liệu nào để luôn thoáng mát?',
    slug: 'ao-thun-nam-mac-khong-nong',
    seoTitle: 'Áo Thun Nam Mặc Không Nóng: Cách Chọn Áo Thoáng Mát',
    seoDescription: 'Tìm hiểu cách chọn áo thun nam mặc không nóng, chất liệu thoáng mát, thấm hút tốt và dễ mặc hằng ngày cùng URSport.',
    cluster: 'Áo thun nam',
    funnel: 'TOFU',
    keyword: 'áo thun nam mặc không nóng',
    links: ['/ao-thun-nam/cotton', '/ao-thun-nam/the-thao', '/collection/mua-he']
  },
  {
    title: 'Cotton compact là gì? Vì sao phù hợp với áo thun nam cao cấp?',
    slug: 'cotton-compact-la-gi',
    seoTitle: 'Cotton Compact Là Gì? Chất Liệu Áo Thun Nam Cao Cấp',
    seoDescription: 'Cotton compact là gì, có ưu điểm gì và vì sao phù hợp với áo thun nam cao cấp, thoáng mát, bền form tại URSport.',
    cluster: 'Chất liệu vải',
    funnel: 'TOFU',
    keyword: 'cotton compact là gì',
    links: ['/ao-thun-nam/cotton', '/ao-thun-nam']
  },
  {
    title: 'Cotton vs polyester: nên chọn chất liệu nào cho áo thể thao nam?',
    slug: 'cotton-vs-polyester',
    seoTitle: 'Cotton vs Polyester: Nên Chọn Chất Liệu Áo Nam Nào?',
    seoDescription: 'So sánh cotton và polyester để chọn áo thể thao nam thoáng mát, dễ vận động, phù hợp tập luyện và mặc hằng ngày.',
    cluster: 'Chất liệu vải',
    funnel: 'TOFU',
    keyword: 'cotton vs polyester',
    links: ['/ao-thun-nam/cotton', '/ao-thun-nam/the-thao']
  },
  {
    title: 'Vải quick dry là gì? Cách chọn áo nhanh khô cho nam tập luyện',
    slug: 'vai-quick-dry-la-gi',
    seoTitle: 'Vải Quick Dry Là Gì? Cách Chọn Áo Nhanh Khô Cho Nam',
    seoDescription: 'Tìm hiểu vải quick dry là gì, ưu điểm nhanh khô, thoáng khí và cách chọn áo thể thao nam phù hợp khi tập luyện.',
    cluster: 'Chất liệu vải',
    funnel: 'TOFU',
    keyword: 'vải quick dry là gì',
    links: ['/ao-thun-nam/quick-dry', '/do-tap-gym-nam']
  },
  {
    title: 'Cách chọn size áo thun nam theo chiều cao, cân nặng và form dáng',
    slug: 'cach-chon-size-ao-thun-nam',
    seoTitle: 'Cách Chọn Size Áo Thun Nam Theo Chiều Cao Cân Nặng',
    seoDescription: 'Hướng dẫn cách chọn size áo thun nam theo chiều cao, cân nặng, vai ngực và form dáng để mặc vừa đẹp hơn.',
    cluster: 'Chọn size',
    funnel: 'TOFU',
    keyword: 'cách chọn size áo thun nam',
    links: ['/bang-size', '/ao-thun-nam']
  },
  {
    title: 'Bảng size áo thun nam URSport: hướng dẫn đo vai, ngực và chiều dài áo',
    slug: 'bang-size-ao-thun-nam',
    seoTitle: 'Bảng Size Áo Thun Nam URSport Và Cách Đo Chuẩn',
    seoDescription: 'Xem bảng size áo thun nam URSport, cách đo vai, ngực, chiều dài áo và chọn size phù hợp với dáng người.',
    cluster: 'Chọn size',
    funnel: 'MOFU',
    keyword: 'bảng size áo thun nam',
    links: ['/bang-size', '/ao-thun-nam']
  },
  {
    title: 'Quần thể thao nam mặc hằng ngày được không? Gợi ý chọn form dễ phối',
    slug: 'quan-the-thao-nam-mac-hang-ngay',
    seoTitle: 'Quần Thể Thao Nam Mặc Hằng Ngày Được Không?',
    seoDescription: 'Giải đáp quần thể thao nam có mặc hằng ngày được không, cách chọn form thoải mái, nam tính và dễ phối đồ.',
    cluster: 'Quần thể thao nam',
    funnel: 'TOFU',
    keyword: 'quần thể thao nam mặc hằng ngày',
    links: ['/quan-the-thao-nam', '/collection/mac-hang-ngay']
  },
  {
    title: 'Áo gym nam nên chọn loại nào để thoáng mát và dễ vận động?',
    slug: 'ao-gym-nam-nen-chon-loai-nao',
    seoTitle: 'Áo Gym Nam Nên Chọn Loại Nào Để Thoáng Mát?',
    seoDescription: 'Gợi ý cách chọn áo gym nam thoáng mát, co giãn, thấm hút tốt và phù hợp nhiều kiểu tập luyện.',
    cluster: 'Đồ tập gym nam',
    funnel: 'MOFU',
    keyword: 'áo gym nam nên chọn loại nào',
    links: ['/do-tap-gym-nam', '/ao-thun-nam/the-thao']
  },
  {
    title: 'Phối áo thun nam với quần jogger: công thức năng động dễ mặc',
    slug: 'phoi-ao-thun-nam-voi-quan-jogger',
    seoTitle: 'Phối Áo Thun Nam Với Quần Jogger Đẹp Và Năng Động',
    seoDescription: 'Cách phối áo thun nam với quần jogger để mặc đi chơi, tập nhẹ hoặc dạo phố theo phong cách thể thao nam.',
    cluster: 'Phối đồ nam',
    funnel: 'TOFU',
    keyword: 'phối áo thun nam với quần jogger',
    links: ['/ao-thun-nam', '/quan-the-thao-nam/jogger']
  },
  {
    title: 'Phối đồ nam mùa hè: chọn áo thun, quần short và chất liệu mát',
    slug: 'phoi-do-nam-mua-he',
    seoTitle: 'Phối Đồ Nam Mùa Hè Với Áo Thun Và Quần Short',
    seoDescription: 'Gợi ý phối đồ nam mùa hè với áo thun, quần short, chất liệu thoáng mát và phong cách thể thao dễ mặc.',
    cluster: 'Phối đồ nam',
    funnel: 'TOFU',
    keyword: 'phối đồ nam mùa hè',
    links: ['/collection/mua-he', '/ao-thun-nam', '/quan-the-thao-nam/short']
  }
];

export const SEO_CONTENT_CHECKLIST = [
  'Mỗi trang có title riêng',
  'Mỗi trang có meta description riêng',
  'Có canonical URL',
  'Có sitemap.xml',
  'Có robots.txt',
  'Có breadcrumb visible và Breadcrumb Schema',
  'Product page có Product Schema',
  'Blog có Article Schema',
  'FAQ có FAQ Schema nếu có FAQ',
  'Ảnh dùng .webp và có alt text',
  'URL không dùng query id',
  'Internal link rõ ràng giữa blog, category, collection và product',
  'Không index admin, cart, checkout',
  'Có trang chính sách, đổi trả, giao hàng, bảng size'
];
