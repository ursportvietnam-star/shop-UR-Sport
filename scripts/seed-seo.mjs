// Script: seed-seo.mjs
// Chạy: node scripts/seed-seo.mjs
// Mục đích: Tự động điền SEO Tier-1 vào Firestore cho tất cả danh mục

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBZYqAg_mDmqTjhu1_DWWVsLZWNISQS1W4",
  authDomain: "shop-ursport.firebaseapp.com",
  projectId: "shop-ursport",
  storageBucket: "shop-ursport.firebasestorage.app",
  messagingSenderId: "980330324717",
  appId: "1:980330324717:web:3814444e6a5da2c09822e4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SITE_URL = 'https://shop-ursport.web.app';

const SEO_DATA = [
  {
    slug: 'ao-thun-nam',
    seoTitle: 'Áo Thun Nam Đẹp, Oversize, Cotton Cao Cấp | UR Sport',
    seoDescription: 'Mua áo thun nam đẹp tại UR Sport. Đa dạng mẫu oversize, slim-fit, cotton 100%, form chuẩn. Chất lượng cao, giá tốt, miễn phí vận chuyển toàn quốc.',
    seoKeywords: 'áo thun nam, áo thun nam đẹp, áo thun oversize nam, áo thun cotton nam, áo phông nam, áo thun nam cao cấp',
    seoCanonical: `${SITE_URL}/apparel/ao-thun-nam`,
    seoRobots: 'index, follow',
    content: `<h2>Áo Thun Nam Đẹp - Bộ Sưu Tập Đa Dạng Tại UR Sport</h2>
<p>Áo thun nam luôn là item không thể thiếu trong tủ đồ của bất kỳ chàng trai nào. Tại UR Sport, chúng tôi mang đến bộ sưu tập <strong>áo thun nam đẹp</strong> với đa dạng kiểu dáng, từ <strong>áo thun oversize</strong> phong cách đường phố đến áo thun slim-fit tôn dáng.</p>
<h3>Tại Sao Chọn Áo Thun Nam Tại UR Sport?</h3>
<ul>
  <li><strong>Chất liệu cao cấp:</strong> 100% Cotton tự nhiên hoặc Cotton pha Spandex co giãn 4 chiều</li>
  <li><strong>Đa dạng mẫu mã:</strong> Áo thun trơn, graphic, sọc ngang, oversize, longline...</li>
  <li><strong>Form dáng chuẩn:</strong> Áo không bai giãn, giữ form đẹp sau nhiều lần giặt</li>
  <li><strong>Giá cả hợp lý:</strong> Từ 250.000đ - 390.000đ, phù hợp mọi túi tiền</li>
</ul>
<h3>Hướng Dẫn Chọn Size Áo Thun Nam</h3>
<p>Để chọn được size áo thun nam phù hợp, bạn cần đo vòng ngực và chiều cao. Size S phù hợp cho người cao 160-165cm, size M cho 165-170cm, size L cho 170-175cm và size XL cho 175-180cm.</p>`
  },
  {
    slug: 'ao-thun-the-thao-nam',
    seoTitle: 'Áo Thun Thể Thao Nam Thoáng Mát, Tập Gym & Chạy Bộ | UR Sport',
    seoDescription: 'Áo thun thể thao nam cao cấp tại UR Sport. Co giãn 4 chiều, thấm hút mồ hôi nhanh, kháng khuẩn khử mùi. Phù hợp tập gym, chạy bộ, cầu lông. Giá tốt, giao nhanh.',
    seoKeywords: 'áo thun thể thao nam, áo thể thao nam, áo tập gym nam, áo chạy bộ nam, áo thể thao nam cao cấp, đồ thể thao nam, áo thun lạnh thể thao',
    seoCanonical: `${SITE_URL}/apparel/ao-thun-the-thao-nam`,
    seoRobots: 'index, follow',
    content: `<h2>Áo Thun Thể Thao Nam - Hiệu Suất Đỉnh Cao Cho Mọi Buổi Tập</h2>
<p>Bộ sưu tập <strong>áo thun thể thao nam</strong> tại UR Sport được thiết kế với công nghệ dệt hiện đại, đáp ứng nhu cầu tập luyện cường độ cao. Từ <strong>áo tập gym nam</strong> đến <strong>áo chạy bộ nam</strong>, chúng tôi có đủ cho mọi bài tập.</p>
<h3>Công Nghệ Vải Thể Thao Tiên Tiến</h3>
<ul>
  <li><strong>Pro-Dry Technology:</strong> Thoát ẩm siêu tốc, giữ cơ thể luôn khô thoáng</li>
  <li><strong>Co giãn 4 chiều:</strong> Tự do chuyển động trong mọi bài tập</li>
  <li><strong>Kháng khuẩn khử mùi:</strong> Ngăn vi khuẩn và mùi khó chịu sau khi tập</li>
  <li><strong>Chống tia UV UPF 50+:</strong> Bảo vệ da khi tập ngoài trời</li>
</ul>
<h3>Phù Hợp Với Nhiều Môn Thể Thao</h3>
<p>Áo thun thể thao nam UR Sport phù hợp với: Tập gym, Chạy bộ, Cầu lông, Bóng đá, Bơi lội và nhiều môn thể thao ngoài trời khác. Thiết kế tối giản nhưng mạnh mẽ giúp bạn tự tin thể hiện bản thân trên sân tập.</p>`
  },
  {
    slug: 'ao-polo-nam',
    seoTitle: 'Áo Polo Nam Cao Cấp, Thể Thao & Lịch Sự 2026 | UR Sport',
    seoDescription: 'Khám phá bộ sưu tập áo polo nam cao cấp tại UR Sport. Vải cá sấu Pique Cotton mềm mịn, chống nhăn, cổ áo cứng cáp. Phù hợp đi làm, chơi golf, dạo phố. Đổi trả 7 ngày.',
    seoKeywords: 'áo polo nam, áo polo nam cao cấp, áo thun có cổ nam, áo polo thể thao nam, áo polo nam đẹp, áo polo golf nam, áo có cổ nam',
    seoCanonical: `${SITE_URL}/apparel/ao-polo-nam`,
    seoRobots: 'index, follow',
    content: `<h2>Áo Polo Nam - Thanh Lịch, Năng Động, Đẳng Cấp</h2>
<p><strong>Áo polo nam</strong> là sự kết hợp hoàn hảo giữa tính thanh lịch và sự năng động. Tại UR Sport, bộ sưu tập <strong>áo polo nam cao cấp</strong> được thiết kế tỉ mỉ với chất liệu Pique Cotton cao cấp và các công nghệ vải tiên tiến.</p>
<h3>Điểm Nổi Bật Của Áo Polo Nam UR Sport</h3>
<ul>
  <li><strong>Vải Pique Cotton cao cấp:</strong> Mềm mịn, thông thoáng, thân thiện với da</li>
  <li><strong>Chống nhăn tuyệt đối:</strong> Không cần ủi, luôn phẳng phiu</li>
  <li><strong>Cổ áo cứng cáp:</strong> Giữ form đẹp, không bị mềm sau nhiều lần giặt</li>
  <li><strong>Đa dạng màu sắc:</strong> Từ tông màu trung tính đến màu sắc nổi bật</li>
</ul>
<h3>Phong Cách Phối Đồ Với Áo Polo Nam</h3>
<p>Áo polo nam có thể phối linh hoạt với quần jeans, quần chino hoặc quần short thể thao. Đây là lựa chọn hoàn hảo cho những buổi đi làm bán chính thức, chơi golf, dạo phố cuối tuần hay những buổi hẹn hò lịch lãm.</p>`
  },
  {
    slug: 'quan-the-thao-nam',
    seoTitle: 'Quần Thể Thao Nam Jogger & Short Gym Chất Lượng Cao | UR Sport',
    seoDescription: 'Mua quần thể thao nam chất lượng cao tại UR Sport. Đủ loại quần jogger, quần short chạy bộ, quần gym co giãn 4 chiều, quần bơi. Thoải mái vận động, giao hàng nhanh toàn quốc.',
    seoKeywords: 'quần thể thao nam, quần short thể thao nam, quần jogger nam, quần tập gym nam, quần chạy bộ nam, quần đùi gym nam, đồ tập gym nam',
    seoCanonical: `${SITE_URL}/apparel/quan-the-thao-nam`,
    seoRobots: 'index, follow',
    content: `<h2>Quần Thể Thao Nam - Thoải Mái Tối Đa Cho Mọi Hoạt Động</h2>
<p>Bộ sưu tập <strong>quần thể thao nam</strong> tại UR Sport đa dạng kiểu dáng, đáp ứng mọi nhu cầu từ tập gym trong nhà đến chạy bộ ngoài trời. Chất liệu cao cấp, co giãn 4 chiều mang lại sự thoải mái tuyệt đối trong từng cử động.</p>
<h3>Các Loại Quần Thể Thao Nam Tại UR Sport</h3>
<ul>
  <li><strong>Quần short chạy bộ:</strong> Siêu nhẹ, có túi khóa kéo, phản quang an toàn</li>
  <li><strong>Quần jogger:</strong> Bo gấu thời trang, phù hợp cả tập luyện và dạo phố</li>
  <li><strong>Quần đùi gym 2 lớp:</strong> Tích hợp lớp lót bảo vệ cơ bắp tối ưu</li>
  <li><strong>Quần legging nén cơ:</strong> Hỗ trợ tuần hoàn máu, giảm mỏi cơ sau tập</li>
</ul>
<h3>Hướng Dẫn Chọn Size Quần Thể Thao Nam</h3>
<p>Đo vòng eo và chiều dài chân để chọn size chính xác. Nếu bạn tập luyện cường độ cao, nên chọn size lớn hơn 1 cỡ để có không gian vận động thoải mái. UR Sport hỗ trợ đổi size miễn phí trong 7 ngày đầu.</p>`
  },
  {
    slug: 'phu-kien-the-thao',
    seoTitle: 'Phụ Kiện Thể Thao Chính Hãng: Bình Nước, Găng Tay, Túi Gym | UR Sport',
    seoDescription: 'Mua phụ kiện thể thao chính hãng giá tốt tại UR Sport. Bình nước Tritan BPA Free, găng tay gym Pro-Grip, túi duffel, thảm yoga TPE, dây nhảy tốc độ và nhiều hơn nữa.',
    seoKeywords: 'phụ kiện thể thao, bình nước thể thao, găng tay tập gym, túi gym duffel, thảm yoga, dây nhảy thể lực, phụ kiện gym nam',
    seoCanonical: `${SITE_URL}/apparel/phu-kien-the-thao`,
    seoRobots: 'index, follow',
    content: `<h2>Phụ Kiện Thể Thao Chính Hãng - Trang Bị Đầy Đủ Cho Buổi Tập</h2>
<p>Không chỉ quần áo, <strong>phụ kiện thể thao</strong> đóng vai trò quan trọng giúp nâng cao hiệu suất tập luyện. Tại UR Sport, bạn có thể tìm thấy tất cả các phụ kiện gym chất lượng cao với giá cả hợp lý.</p>
<h3>Phụ Kiện Thể Thao Bán Chạy Nhất</h3>
<ul>
  <li><strong>Bình nước Tritan 1L:</strong> Nhựa BPA Free, an toàn sức khỏe, chống va đập tốt</li>
  <li><strong>Găng tay gym Pro-Grip:</strong> Bảo vệ lòng bàn tay, tăng lực bám khi đẩy tạ</li>
  <li><strong>Túi Duffel thể thao:</strong> Ngăn giày riêng, vải chống thấm, quai đeo êm</li>
  <li><strong>Thảm Yoga TPE 8mm:</strong> Chống trượt 2 mặt, đàn hồi tốt, bảo vệ khớp</li>
  <li><strong>Dây nhảy Speed Rope:</strong> Vòng bi 360 độ, tốc độ cao, chỉnh được độ dài</li>
</ul>
<h3>Tại Sao Nên Đầu Tư Vào Phụ Kiện Thể Thao Tốt?</h3>
<p>Phụ kiện thể thao chất lượng giúp bảo vệ cơ thể khỏi chấn thương, tăng hiệu quả tập luyện và kéo dài tuổi thọ thiết bị. Đầu tư một lần, sử dụng bền lâu — đây là triết lý của UR Sport.</p>`
  }
];

async function seedSeoData() {
  console.log('🚀 Bắt đầu seed SEO data vào Firestore...\n');
  
  for (const item of SEO_DATA) {
    try {
      const docRef = doc(db, 'categorySeo', item.slug);
      await setDoc(docRef, {
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
        seoKeywords: item.seoKeywords,
        seoCanonical: item.seoCanonical,
        seoRobots: item.seoRobots,
        content: item.content,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`✅ [${item.slug}] - Đã lưu thành công`);
      console.log(`   📌 Title: ${item.seoTitle}`);
      console.log(`   📝 Description: ${item.seoDescription.substring(0, 60)}...`);
      console.log('');
    } catch (error) {
      console.error(`❌ [${item.slug}] - Lỗi:`, error.message);
    }
  }
  
  console.log('🎉 Hoàn thành! SEO data đã được lưu vào Firestore cho tất cả danh mục.');
  process.exit(0);
}

seedSeoData();
