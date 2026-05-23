import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocs, collection, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBZYqAg_mDmqTjhu1_DWWVsLZWNISQS1W4",
  authDomain: "shop-ursport.firebaseapp.com",
  projectId: "shop-ursport",
  storageBucket: "shop-ursport.firebasestorage.app",
  messagingSenderId: "980330324717",
  appId: "1:980330324717:web:3814444e6a5da2c09822e4"
};

async function main() {
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('Fetching products...');
  const querySnapshot = await getDocs(collection(db, 'products'));
  let found = false;
  
  for (const document of querySnapshot.docs) {
    const data = document.data();
    if (data.slug === 'ao-thun-nam-ascend-premium-cotton') {
      found = true;
      console.log('Found product:', data.name);
      
      let description = data.description || '';
      console.log('Original description:', description);
      
      // Fix description URLs:
      // 1. /images/products/ao-thun-nam-ascend-lifestyle-ngoi-ghe.webp -> /images/blog/ao-thun-nam-ascend-lifestyle-ngoi-ghe.webp
      // 2. /images/products/ao-thun-nam-ascend-xanh-den-front-back.webp -> /images/blog/ao-thun-nam-ascend-xanh-den-front-back-premium.webp
      // 3. /images/products/ao-thun-nam-ascend-trang-front-back.webp -> /images/blog/ao-thun-nam-ascend-den-front-back-premium.webp
      
      const newDesc = description
        .replace(/\/images\/products\/ao-thun-nam-ascend-lifestyle-ngoi-ghe\.webp/g, '/images/blog/ao-thun-nam-ascend-lifestyle-ngoi-ghe.webp')
        .replace(/\/images\/products\/ao-thun-nam-ascend-xanh-den-front-back\.webp/g, '/images/blog/ao-thun-nam-ascend-xanh-den-front-back-premium.webp')
        .replace(/\/images\/products\/ao-thun-nam-ascend-trang-front-back\.webp/g, '/images/blog/ao-thun-nam-ascend-den-front-back-premium.webp');
      
      if (newDesc !== description) {
        console.log('Updating description in Firestore...');
        const docRef = doc(db, 'products', document.id);
        await updateDoc(docRef, { description: newDesc });
        console.log('Successfully updated product description in Firestore!');
      } else {
        console.log('No description updates needed, URLs are already correct or did not match.');
      }
    }
  }
  
  if (!found) {
    console.log('Product not found in Firestore.');
  }
}

main().catch(console.error);
