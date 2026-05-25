import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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

async function checkNavigation() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'navigation'));
    if (snap.exists()) {
      console.log("Navigation settings in DB:", JSON.stringify(snap.data(), null, 2));
    } else {
      console.log("Navigation document does not exist in DB.");
    }
  } catch (error) {
    console.error("Error reading navigation:", error);
  }
}

checkNavigation();
