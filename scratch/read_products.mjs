import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    console.log(`Total products in database: ${querySnapshot.size}`);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}, Name: ${data.name}, Category: ${data.category}`);
    });
  } catch (error) {
    console.error("Error reading products:", error);
  }
}

checkProducts();
