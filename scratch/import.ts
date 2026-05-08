import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { PRODUCTS, STATIC_BLOG_POSTS } from '../src/data.js';

const firebaseConfig = {
  apiKey: "AIzaSyBZYqAg_mDmqTjhu1_DWWVsLZWNISQS1W4",
  authDomain: "shop-ursport.firebaseapp.com",
  projectId: "shop-ursport",
  storageBucket: "shop-ursport.firebasestorage.app",
  messagingSenderId: "980330324717",
  appId: "1:980330324717:web:3814444e6a5da2c09822e4",
  measurementId: "G-FTNSBF8B5N"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Importing products...');
  for (const p of PRODUCTS) {
    await setDoc(doc(db, 'products', p.id), p);
    console.log('Imported product', p.id);
  }
  console.log('Importing blog posts...');
  for (const b of STATIC_BLOG_POSTS) {
    await setDoc(doc(db, 'blogPosts', b.id), b);
    console.log('Imported blog post', b.id);
  }
  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);
