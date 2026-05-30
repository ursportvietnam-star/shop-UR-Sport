import { CATEGORY_METADATA } from '../data';

export type CategoryLandingConfig = {
  quickLinks: { label: string; href: string; description: string }[];
  buyingGuides: { title: string; body: string }[];
  faqs: { question: string; answer: string }[];
};

export const CATEGORY_LANDING_CONTENT: Record<string, CategoryLandingConfig> = {
  'ao-thun-nam': {
    quickLinks: [
      {
        label: 'Áo thun cotton nam',
        href: '/ao-thun-cotton-nam',
        description: 'Mềm, thoáng, dễ mặc hằng ngày'
      },
      {
        label: 'Áo thun form rộng',
        href: '/ao-thun-nam-form-rong',
        description: 'Thoải mái, trẻ trung, dễ phối streetwear'
      },
      {
        label: 'Áo thun thể thao nam',
        href: '/ao-thun-the-thao-nam',
        description: 'Co giãn, thấm hút, hợp tập luyện'
      }
    ],
    buyingGuides: [
      {
        title: 'Chọn theo chất liệu',
        body: 'Cotton phù hợp mặc hằng ngày, thun lạnh và polyester phù hợp vận động vì nhanh khô, nhẹ và ít bám mồ hôi.'
      },
      {
        title: 'Chọn theo form dáng',
        body: 'Slim-fit gọn người, regular dễ mặc với nhiều dáng, oversize tạo cảm giác thoải mái và hợp phong cách đường phố.'
      },
      {
        title: 'Chọn theo hoàn cảnh',
        body: 'Đi làm hoặc đi chơi nên ưu tiên màu trơn; tập gym, chạy bộ nên chọn áo co giãn, thoáng khí và ít nhăn.'
      }
    ],
    faqs: [
      {
        question: 'Nên chọn áo thun nam cotton hay áo thun thể thao?',
        answer: 'Nếu mặc hằng ngày, cotton là lựa chọn dễ chịu và tự nhiên. Nếu tập luyện hoặc vận động nhiều, áo thun thể thao với chất liệu nhanh khô, co giãn sẽ phù hợp hơn.'
      },
      {
        question: 'Áo thun nam form rộng hợp với dáng người nào?',
        answer: 'Form rộng hợp với người thích cảm giác thoải mái, vai ngang hoặc muốn phối theo phong cách streetwear. Người thấp nên chọn độ dài vừa phải để tránh bị nuốt dáng.'
      },
      {
        question: 'Làm sao chọn size áo thun nam online?',
        answer: 'Bạn nên đo ngang vai, vòng ngực và chiều dài áo đang mặc vừa nhất, sau đó đối chiếu bảng size của sản phẩm. Nếu ở giữa hai size, hãy chọn size lớn hơn khi thích mặc thoải mái.'
      },
      {
        question: 'Áo thun nam màu nào dễ phối đồ nhất?',
        answer: 'Trắng, đen, xám và xanh navy là các màu dễ phối nhất. Các màu này đi tốt với jean, kaki, jogger, quần short và áo khoác nhẹ.'
      }
    ]
  }
};

export const buildDefaultLandingContent = (category: string): CategoryLandingConfig => ({
  quickLinks: CATEGORY_METADATA
    .filter(item => item.name !== category)
    .slice(0, 3)
    .map(item => ({
      label: String(item.name),
      href: `/${item.slug}`,
      description: `Xem thêm ${String(item.name).toLowerCase()} tại UR Sport`
    })),
  buyingGuides: [
    {
      title: 'Chọn đúng nhu cầu',
      body: 'Ưu tiên sản phẩm phù hợp hoàn cảnh sử dụng: mặc hằng ngày, đi làm, đi chơi hoặc tập luyện.'
    },
    {
      title: 'Kiểm tra chất liệu và size',
      body: 'Chất liệu, độ co giãn và bảng size là ba yếu tố quan trạng giúp sản phẩm mặc thoải mái hơn.'
    },
    {
      title: 'Ưu tiên sản phẩm còn hàng',
      body: 'Các sản phẩm còn đủ size và màu giúp bạn dễ chọn biến thể phù hợp hơn trước khi đặt hàng.'
    }
  ],
  faqs: [
    {
      question: `Nên chọn ${category.toLowerCase()} như thế nào?`,
      answer: 'Hãy chọn theo nhu cầu sử dụng, chất liệu, form dáng và size. Với đồ thể thao nam, độ thoáng mát và khả năng co giãn là hai yếu tố nên ưu tiên.'
    },
    {
      question: 'UR Sport có hỗ trợ đổi trả không?',
      answer: 'UR Sport hỗ trợ đổi trả theo chính sách của shop, giúp bạn yên tâm hơn khi chọn size hoặc mẫu sản phẩm.'
    },
    {
      question: 'Có thể đặt hàng online toàn quốc không?',
      answer: 'Bạn có thể đặt hàng online trên website, chọn sản phẩm, màu, size và hoàn tất thông tin giao hàng.'
    }
  ]
});

export const getCategoryLandingContent = (slug: string | undefined, category: string) => {
  if (!slug || category === 'All') return null;
  return CATEGORY_LANDING_CONTENT[slug] || buildDefaultLandingContent(category);
};

export const CATEGORY_DEFAULT_SEO: Record<string, { title: string; description: string; keywords: string }> = {
  'ao-thun-nam': {
    title: 'Áo Thun Nam Đẹp, Oversize, Cotton Cao Cấp 2026 | UR Sport',
    description: 'Mua áo thun nam đẹp tại UR Sport. Đa dạng mẫu áo thun oversize, slim-fit, cotton 100%, form chuẩn. Miễn phí vận chuyển toàn quốc.',
    keywords: 'áo thun nam, áo thun nam đẹp, áo thun oversize nam, áo thun cotton nam, áo phông nam',
  },
  'ao-thun-the-thao-nam': {
    title: 'Áo Thun Thể Thao Nam Thoáng Mát, Tập Gym & Chạy Bộ | UR Sport',
    description: 'Áo thun thể thao nam cao cấp tại UR Sport. Co giãn 4 chiều, thấm hút mồ hôi, kháng khuẩn. Phù hợp tập gym, chạy bộ, cầu lông. Chính hãng, giá tốt.',
    keywords: 'áo thun thể thao nam, áo thể thao nam, áo tập gym nam, áo chạy bộ nam, áo thể thao nam cao cấp',
  },
  'ao-thun-cotton-nam': {
    title: 'Áo Thun Cotton Nam Mềm Mát, Thoáng Khí | UR Sport',
    description: 'Khám phá áo thun cotton nam mềm mát tại UR Sport. Chất vải dễ chịu, thoáng khí, dễ phối đồ, phù hợp mặc hằng ngày trong thời tiết nóng.',
    keywords: 'áo thun cotton nam, áo thun nam cotton, áo cotton nam, áo thun nam thoáng mát',
  },
  'ao-thun-nam-form-rong': {
    title: 'Áo Thun Nam Form Rộng, Oversize Cá Tính | UR Sport',
    description: 'Mua áo thun nam form rộng tại UR Sport. Kiểu dáng oversize thoải mái, trẻ trung, dễ phối streetwear, phù hợp đi chơi và mặc hằng ngày.',
    keywords: 'áo thun nam form rộng, áo thun oversize nam, áo form rộng nam, áo thun nam streetwear',
  },
  'ao-polo-nam': {
    title: 'Áo Polo Nam Cao Cấp, Thể Thao & Lịch Sự 2026 | UR Sport',
    description: 'Khám phá bộ sưu tập áo polo nam cao cấp tại UR Sport. Vải cá sấu Pique Cotton, chống nhăn, form chuẩn. Phù hợp đi làm, chơi golf và dạo phố.',
    keywords: 'áo polo nam, áo polo nam cao cấp, áo thun có cổ nam, áo polo thể thao nam, áo polo nam đẹp',
  },
  'quan-the-thao-nam': {
    title: 'Quần Thể Thao Nam Jogger & Short Gym Chất Lượng Cao | UR Sport',
    description: 'Mua quần thể thao nam chất lượng cao tại UR Sport. Đủ loại quần jogger, quần short chạy bộ, quần gym co giãn 4 chiều. Giao hàng nhanh toàn quốc.',
    keywords: 'quần thể thao nam, quần short thể thao nam, quần jogger nam, quần tập gym nam, quần chạy bộ nam',
  },
  'phu-kien-the-thao': {
    title: 'Phụ Kiện Thể Thao Chính Hãng: Bình Nước, Găng Tay, Túi Gym | UR Sport',
    description: 'Mua phụ kiện thể thao chính hãng tại UR Sport. Bình nước, găng tay gym, túi duffel, thảm yoga, dây nhảy và nhiều hơn nữa. Giá tốt nhất.',
    keywords: 'phụ kiện thể thao, bình nước thể thao, găng tay tập gym, túi thể thao, phụ kiện gym nam',
  },
};
