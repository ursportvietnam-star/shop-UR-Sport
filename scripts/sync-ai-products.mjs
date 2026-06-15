import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';

// Load .env variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const toLegacyProduct = (product, images) => ({
  id: product.id,
  productCode: 'UR-' + product.id.slice(0, 8).toUpperCase(),
  slug: product.slug,
  name: product.title,
  description: product.fullDescriptionHtml,
  price: product.price,
  images: images.map(image => image.url),
  category: product.productType.includes('the-thao') ? 'Áo thun thể thao nam' : product.productType.includes('polo') ? 'Áo polo nam' : 'Áo thun nam',
  colors: product.color ? product.color.split(',').map(item => item.trim()).filter(Boolean) : [],
  sizes: product.sizes,
  stock: product.quantity || 100,
  rating: 5.0,
  reviewsCount: 0,
  features: [],
  seoTitle: product.metaTitle,
  metaDescription: product.metaDescription,
  keywords: product.secondaryKeywords ? product.secondaryKeywords.join(', ') : '',
  specifications: '',
  brand: product.brand || 'URSport',
  isNew: true,
  createdAt: new Date().toISOString()
});

async function main() {
  console.log('--- ĐỒNG BỘ DỮ LIỆU TỪ LOCAL LÊN FIREBASE ---');
  console.log('Lưu ý: Bạn cần tài khoản Admin để đẩy dữ liệu lên web thật.\\n');
  
  const email = await question('Nhập Email Admin: ');
  const password = await question('Nhập Mật khẩu: ');
  
  try {
    console.log('\\nĐang đăng nhập...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Đăng nhập thành công!');
    
    // Đẩy Sản phẩm
    const dbPath = path.resolve('.local/product-factory-db.json');
    if (fs.existsSync(dbPath)) {
      const localDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const publishedProducts = localDb.products.filter(p => p.status === 'published');
      
      console.log(`\\nTìm thấy ${publishedProducts.length} sản phẩm (đã publish) ở local.`);
      for (const p of publishedProducts) {
        const imgs = localDb.productImages.filter(i => i.productId === p.id);
        const legacyProduct = toLegacyProduct(p, imgs);
        
        await setDoc(doc(db, 'products', legacyProduct.id), legacyProduct);
        console.log(`Đã đồng bộ sản phẩm: ${legacyProduct.name}`);
      }
    } else {
      console.log('\\nKhông tìm thấy file database sản phẩm local (.local/product-factory-db.json).');
    }

    // Về bài viết Blog
    console.log('\\n--- BÀI VIẾT BLOG ---');
    console.log('Các bài viết Blog do AI Blog Writer tạo ra ở local đều đã được tự động lưu thẳng lên Firebase rồi!');
    console.log('Bạn không cần phải chạy đồng bộ cho Blog nữa. Bạn có thể kiểm tra trên domain.');
    
    console.log('\\nĐỒNG BỘ HOÀN TẤT! 🎉');
    
  } catch (error) {
    console.error('\\nLỖI ĐỒNG BỘ:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
