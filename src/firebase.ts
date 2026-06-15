import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config — loaded from environment variables.
// If the VITE_FIREBASE_* vars are not provided at build time, we avoid throwing
// so the site can still render. Components that require Firebase should
// gracefully handle `null` exports.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBZYqAg_mDmqTjhu1_DWWVsLZWNISQS1W4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'shop-ursport.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shop-ursport',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'shop-ursport.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '980330324717',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:980330324717:web:3814444e6a5da2c09822e4',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-FTNSBF8B5N'
};

const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let _db = null;
let _auth = null;
let _storage = null;

if (hasFirebaseConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      _db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } else {
      _db = getFirestore(app);
    }
  } else {
    _db = getFirestore(app);
  }
  _auth = getAuth(app);
  _storage = getStorage(app);
} else {
  // Provide helpful console guidance for missing config (non-fatal)
  // so deploys without secrets still render a usable site.
  // Firebase features will be unavailable until env vars are set.
  // eslint-disable-next-line no-console
  console.warn('Firebase configuration missing. Set VITE_FIREBASE_* build env vars or repository secrets to enable Firebase features.');
}

export const db = _db;
export const auth = _auth;
export const storage = _storage;
export const isFirebaseConfigured = hasFirebaseConfig;
