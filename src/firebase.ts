import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config của shop-ursport
const firebaseConfig = {
  apiKey: "AIzaSyBZYqAg_mDmqTjhu1_DWWVsLZWNISQS1W4",
  authDomain: "shop-ursport.firebaseapp.com",
  projectId: "shop-ursport",
  storageBucket: "shop-ursport.firebasestorage.app",
  messagingSenderId: "980330324717",
  appId: "1:980330324717:web:3814444e6a5da2c09822e4",
  measurementId: "G-FTNSBF8B5N"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
