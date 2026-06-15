import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkContent() {
  console.log('--- CHECKING BLOG POSTS ---');
  const blogsSnapshot = await getDocs(collection(db, 'blogPosts'));
  blogsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.content && data.content.toLowerCase().includes('size')) {
      console.log(`Blog [${doc.id}] Title: ${data.title}`);
      const snippet = data.content.substring(Math.max(0, data.content.toLowerCase().indexOf('size') - 50), data.content.toLowerCase().indexOf('size') + 100);
      console.log(`Content Snippet: ...${snippet.replace(/\n/g, '\\n')}...`);
      console.log('---------------------------');
    }
  });

  console.log('\n--- CHECKING SEO PAGES ---');
  const seoSnapshot = await getDocs(collection(db, 'seoPages'));
  seoSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.seoContent && data.seoContent.toLowerCase().includes('size')) {
      console.log(`SEO Page [${doc.id}]`);
      const snippet = data.seoContent.substring(Math.max(0, data.seoContent.toLowerCase().indexOf('size') - 50), data.seoContent.toLowerCase().indexOf('size') + 100);
      console.log(`Content Snippet: ...${snippet.replace(/\n/g, '\\n')}...`);
      console.log('---------------------------');
    }
  });
  
  process.exit(0);
}

checkContent().catch(console.error);
