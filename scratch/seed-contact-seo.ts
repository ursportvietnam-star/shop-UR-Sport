import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBZYqAg_mDmqTjhu1_DWWVsLZWNISQS1W4',
  authDomain: 'shop-ursport.firebaseapp.com',
  projectId: 'shop-ursport',
  storageBucket: 'shop-ursport.firebasestorage.app',
  messagingSenderId: '980330324717',
  appId: '1:980330324717:web:3814444e6a5da2c09822e4',
  measurementId: 'G-FTNSBF8B5N'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEO_CONTENT_HTML = `<div class="contact-seo-article py-8 border-t border-zinc-100 mt-10">
  <article class="prose max-w-4xl mx-auto prose-slate">
    <h2 class="text-2xl font-black text-zinc-950 mb-4 uppercase tracking-tight">UR Sport - Hệ Thống Thời Trang Thể Thao Nam Cao Cấp</h2>
    <p class="text-zinc-600 leading-8 mb-6 font-medium">
      Chào mừng bạn đến với <strong>UR Sport</strong>, thương hiệu hàng đầu cung cấp các dòng sản phẩm quần áo thể thao nam chất lượng cao. Chúng tôi luôn mong muốn lắng nghe mọi phản hồi, thắc mắc và đóng góp ý kiến từ khách hàng để cải thiện dịch vụ mỗi ngày. Dù bạn cần tư vấn chọn size áo thun nam, mua sỉ quần áo thể thao hay có thắc mắc về chính sách vận chuyển, đội ngũ UR Sport luôn sẵn sàng phục vụ.
    </p>

    <h3 class="text-lg font-black text-zinc-900 mb-3 uppercase tracking-wide">Quy trình xử lý phản hồi & hỗ trợ khách hàng</h3>
    <p class="text-zinc-500 text-sm leading-relaxed mb-6 font-semibold">
      Chúng tôi tối ưu hóa quy trình để đảm bảo mọi liên hệ gửi về đều được phản hồi nhanh nhất. Dưới đây là sơ đồ quy trình tiếp nhận thông tin hỗ trợ 4 bước của UR Sport:
    </p>

    <!-- Sơ đồ quy trình bằng SVG cực đẹp -->
    <div class="w-full max-w-2xl mx-auto mb-8 bg-zinc-50 p-6 rounded-2xl border border-zinc-200/60 shadow-inner">
      <svg viewBox="0 0 600 120" class="w-full h-auto">
        <!-- Step 1 -->
        <rect x="10" y="25" width="110" height="70" rx="8" fill="#1e4b64" />
        <text x="65" y="55" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">Bước 1</text>
        <text x="65" y="75" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.9">Gửi thông tin</text>
        
        <!-- Arrow 1 -->
        <path d="M 130 60 L 155 60 M 150 55 L 157 60 L 150 65" stroke="#1e4b64" stroke-width="2" fill="none" />
        
        <!-- Step 2 -->
        <rect x="165" y="25" width="110" height="70" rx="8" fill="#1e4b64" />
        <text x="220" y="55" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">Bước 2</text>
        <text x="220" y="75" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.9">Phân loại hỗ trợ</text>
        
        <!-- Arrow 2 -->
        <path d="M 285 60 L 310 60 M 305 55 L 312 60 L 305 65" stroke="#1e4b64" stroke-width="2" fill="none" />
        
        <!-- Step 3 -->
        <rect x="320" y="25" width="110" height="70" rx="8" fill="#1e4b64" />
        <text x="375" y="55" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">Bước 3</text>
        <text x="375" y="75" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.9">Xử lý & Giải đáp</text>
        
        <!-- Arrow 3 -->
        <path d="M 440 60 L 465 60 M 460 55 L 467 60 L 460 65" stroke="#1e4b64" stroke-width="2" fill="none" />
        
        <!-- Step 4 -->
        <rect x="475" y="25" width="110" height="70" rx="8" fill="#10b981" />
        <text x="530" y="55" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">Bước 4</text>
        <text x="530" y="75" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.9">Hoàn tất / Đánh giá</text>
      </svg>
    </div>

    <h2 class="text-xl font-black text-zinc-950 mb-3 uppercase tracking-tight">Các Kênh Tư Vấn Trực Tuyến & Mua Sắm Nhẹ Nhàng</h2>
    <p class="text-zinc-600 leading-8 mb-6 font-medium">
      Ngoài việc điền form liên hệ nhanh và ghé trực tiếp shop đồ thể thao của chúng tôi tại trung tâm Quận 1, TP.HCM, quý khách có thể kết nối ngay với chúng tôi qua các kênh chat trực tuyến tiện lợi:
    </p>
    
    <ul class="list-none pl-0 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <li class="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex items-start gap-3">
        <span class="text-[#1e4b64] font-black text-lg">✓</span>
        <div>
          <strong class="text-zinc-800 block">Zalo Official Account</strong>
          <span class="text-sm text-zinc-500 leading-normal font-semibold">Hỗ trợ trả lời tư vấn trong 5 phút. Giải quyết các thắc mắc về đơn hàng nhanh chóng.</span>
        </div>
      </li>
      <li class="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex items-start gap-3">
        <span class="text-[#1e4b64] font-black text-lg">✓</span>
        <div>
          <strong class="text-zinc-800 block">Facebook Messenger</strong>
          <span class="text-sm text-zinc-500 leading-normal font-semibold">Kênh tư vấn lựa chọn chất liệu vải (Cotton Compact, Polyester) và phối đồ thể thao cực kỳ năng động.</span>
        </div>
      </li>
    </ul>

    <!-- FAQ Accordions using details/summary -->
    <h2 class="text-xl font-black text-zinc-950 mb-4 uppercase tracking-tight">Các Câu Hỏi Thường Gặp (FAQ)</h2>
    <div class="space-y-4 mb-8">
      <details class="group bg-zinc-50 p-5 rounded-2xl border border-zinc-150 outline-none cursor-pointer" open>
        <summary class="flex justify-between items-center font-bold text-zinc-800 text-sm sm:text-base list-none">
          <span>1. Tôi có thể đổi hàng nếu không vừa size hoặc không thích màu không?</span>
          <span class="text-[#1e4b64] font-black group-open:rotate-180 transition-transform duration-300">▼</span>
        </summary>
        <p class="text-sm text-zinc-500 leading-8 mt-3 font-semibold cursor-default">
          Hoàn toàn được! UR Sport áp dụng chính sách đổi trả hàng linh hoạt trong vòng 30 ngày cho tất cả các sản phẩm áo thun, áo polo và quần thể thao. Yêu cầu sản phẩm còn nguyên tem mác, chưa qua giặt tẩy và không có dấu hiệu đã qua sử dụng. Vui lòng liên hệ Hotline hoặc chat Zalo để được nhân viên hỗ trợ giữ size đổi.
        </p>
      </details>

      <details class="group bg-zinc-50 p-5 rounded-2xl border border-zinc-150 outline-none cursor-pointer">
        <summary class="flex justify-between items-center font-bold text-zinc-800 text-sm sm:text-base list-none">
          <span>2. Đơn hàng từ bao nhiêu tiền thì được miễn phí vận chuyển?</span>
          <span class="text-[#1e4b64] font-black group-open:rotate-180 transition-transform duration-300">▼</span>
        </summary>
        <p class="text-sm text-zinc-500 leading-8 mt-3 font-semibold cursor-default">
          UR Sport miễn phí vận chuyển toàn quốc cho tất cả các đơn đặt hàng có tổng giá trị thanh toán từ 500.000₫ trở lên. Đối với đơn hàng dưới 500.000₫, phí ship đồng giá toàn quốc chỉ từ 25.000₫ - 30.000₫ tùy thuộc vào đơn vị giao nhận.
        </p>
      </details>

      <details class="group bg-zinc-50 p-5 rounded-2xl border border-zinc-150 outline-none cursor-pointer">
        <summary class="flex justify-between items-center font-bold text-zinc-800 text-sm sm:text-base list-none">
          <span>3. UR Sport có bán sỉ hoặc sản xuất áo thể thao đồng phục không?</span>
          <span class="text-[#1e4b64] font-black group-open:rotate-180 transition-transform duration-300">▼</span>
        </summary>
        <p class="text-sm text-zinc-500 leading-8 mt-3 font-semibold cursor-default">
          Có, chúng tôi cung cấp chính sách chiết khấu giá sỉ cực tốt cho các phòng gym, đội nhóm, câu lạc bộ hoặc đối tác đại lý. Đồng thời, UR Sport nhận thiết kế và may in áo thun thể thao đồng phục theo yêu cầu với chất liệu cao cấp riêng. Vui lòng gửi email đến support@ursport.vn hoặc liên hệ trực tiếp hotline để thảo luận chi tiết.
        </p>
      </details>
    </div>

    <!-- Stats Section -->
    <div class="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl">
      <h3 class="text-lg font-black text-[#1e4b64] mb-2 uppercase tracking-wider">Thống kê phản hồi tin nhắn trong tuần qua</h3>
      <p class="text-slate-500 mb-6 text-sm font-semibold">Đội ngũ chăm sóc khách hàng luôn hoạt động năng nổ. Dưới đây là thời gian phản hồi trung bình các ngày trong tuần.</p>
      
      <div class="w-full max-w-md mx-auto py-2">
        <svg viewBox="0 0 400 200" class="w-full h-auto">
          <!-- Trục toạ độ -->
          <line x1="40" y1="20" x2="40" y2="170" stroke="#cbd5e1" stroke-width="2" />
          <line x1="40" y1="170" x2="380" y2="170" stroke="#cbd5e1" stroke-width="2" />
          
          <!-- Cột thứ 2 -->
          <rect x="70" y="70" width="30" height="100" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="85" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T2</text>
          <text x="85" y="60" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">15p</text>
          
          <!-- Cột thứ 3 -->
          <rect x="130" y="50" width="30" height="120" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="145" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T3</text>
          <text x="145" y="40" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">10p</text>
          
          <!-- Cột thứ 4 -->
          <rect x="190" y="90" width="30" height="80" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="205" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T4</text>
          <text x="205" y="80" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">20p</text>
          
          <!-- Cột thứ 5 -->
          <rect x="250" y="40" width="30" height="130" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="265" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T5</text>
          <text x="265" y="30" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">8p</text>
          
          <!-- Cột thứ 6 -->
          <rect x="310" y="60" width="30" height="110" rx="4" fill="#1e4b64" opacity="0.9" />
          <text x="325" y="185" font-size="10" text-anchor="middle" fill="#64748b" font-weight="bold">T6</text>
          <text x="325" y="50" font-size="10" text-anchor="middle" fill="#1e4b64" font-weight="bold">12p</text>
        </svg>
      </div>
    </div>
  </article>
</div>`;

async function run() {
  console.log('🔄 Đang kết nối tới Firestore để cập nhật cấu hình SEO trang Liên hệ...');
  try {
    const docRef = doc(db, 'settings', 'supportPolicies');
    const snap = await getDoc(docRef);
    let existingData = snap.exists() ? snap.data() : {};
    
    const contactData = {
      slug: 'lien-he',
      title: 'Trang liên hệ',
      description: 'Thông tin liên hệ của UR Sport, biểu đồ hỗ trợ và các kênh gửi tin nhắn nhanh.',
      robots: 'index, follow',
      isHtmlOnly: false,
      htmlContent: SEO_CONTENT_HTML,
      sections: [],
      // SEO Tags
      seoTitle: 'Liên hệ UR Sport | Cửa hàng Đồ Thể Thao Nam Cao Cấp tại TPHCM',
      seoDescription: 'Địa chỉ cửa hàng đồ thể thao nam UR Sport tại TPHCM. Hỗ trợ nhanh chóng qua Hotline, Zalo. Xem vị trí bản đồ chỉ đường Google Maps tại đây.',
      // Info details
      address: '72 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
      phone: '+84 917 722 425',
      phoneSub: 'Miễn phí tư vấn mua hàng',
      email: 'support@ursport.vn',
      workingHours: '8h30 - 22h00',
      workingHoursSub: 'Thứ 2 - Chủ Nhật (Kể cả ngày lễ)',
      formTitle: 'Gửi tin nhắn cho chúng tôi',
      mapTitle: 'Bản đồ vị trí cửa hàng',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.5165147814986!2d106.6908953147489!3d10.771705992324734!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f3e5fa3d623%3A0xc4a19cf7b0f0b4d4!2zNzIgTmd1eeG7hW4gVHLDo2ksIFBoxrDhu51uZyBQaOG6oW0gTmdmathCBMw6NvLCBRdeG6rW4gMSwgVGjDoG5oIHBo4buRIEjhu5MgQ2jDrCBNaW5oLCBWaeG7hHQgTmFt!5e0!3m2!1svi!2s!4v1680000000000!5m2!1svi!2s'
    };

    existingData.contact = contactData;

    await setDoc(docRef, existingData);
    console.log('✅ Cập nhật thành công cấu hình SEO và bài viết HTML cho trang Liên hệ trên Firestore!');
  } catch (error) {
    console.error('❌ Thất bại khi ghi lên Firestore:', error);
  }
}

run();
