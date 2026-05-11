import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config — loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBZYqAg_mDmqTjhu1_DWWVsLZWNISQS1W4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shop-ursport.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shop-ursport",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "shop-ursport.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "980330324717",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:980330324717:web:3814444e6a5da2c09822e4",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FTNSBF8B5N"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
