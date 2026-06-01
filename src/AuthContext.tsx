import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { auth, db, isFirebaseConfigured } from './firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  devLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_ADMIN_KEY = 'ursport_dev_admin';
const GOOGLE_AUTH_ERROR_KEY = 'ursport_google_auth_error';

const fakeAdminUser = {
  uid: 'dev-admin-local',
  email: 'ursportvietnam@gmail.com',
  displayName: 'Dev Admin (Local)',
  photoURL: null,
} as unknown as User;

const googleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Khởi tạo state từ localStorage để tránh flash khi reload
  const [user, setUser] = useState<User | null>(() => {
    if (isLocalhost && localStorage.getItem(DEV_ADMIN_KEY) === '1') {
      return fakeAdminUser;
    }
    return null;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (isLocalhost && localStorage.getItem(DEV_ADMIN_KEY) === '1') {
      return true;
    }
    return false;
  });
  const [loading, setLoading] = useState(true);

  const syncSignedInUser = async (authUser: User) => {
    if (!auth || !db) return;

    const userRef = doc(db, 'users', authUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().status === 'banned') {
      await signOut(auth);
      throw new Error('Tài khoản của bạn đã bị khóa.');
    }

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName || 'Người dùng mới',
        photoURL: authUser.photoURL || null,
        createdAt: serverTimestamp(),
        status: 'active',
        role: 'customer'
      });
    }
  };

  useEffect(() => {
    // Nếu đang dùng dev bypass thì không cần chờ Firebase
    if (isLocalhost && localStorage.getItem(DEV_ADMIN_KEY) === '1') {
      setLoading(false);
      return;
    }

    if (!auth || !db) {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // Kiểm tra lại dev bypass (phòng trường hợp localStorage thay đổi trong lúc đang chờ)
      if (isLocalhost && localStorage.getItem(DEV_ADMIN_KEY) === '1') {
        setUser(fakeAdminUser);
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      setUser(authUser);
      if (authUser) {
        // Special case: hardcoded admin email — no emailVerified check needed
        if (authUser.email === 'ursportvietnam@gmail.com') {
          setIsAdmin(true);
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', authUser.uid));
            setIsAdmin(adminDoc.exists());
          } catch (error: any) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          }
        }

        // Check if user is banned
        try {
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists() && userDoc.data().status === 'banned') {
            await signOut(auth);
            setUser(null);
            setIsAdmin(false);
            setLoading(false);
            // We use setTimeout because toast might fire before AuthProvider is fully mounted or when state is unstable
            setTimeout(() => toast.error('Tài khoản của bạn đã bị khóa.'), 100);
            return;
          }
        } catch (error) {
          console.error('Error checking banned status:', error);
        }

      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLocalhost && localStorage.getItem(DEV_ADMIN_KEY) === '1') return;
    if (!auth || !db) return;

    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        localStorage.removeItem(GOOGLE_AUTH_ERROR_KEY);
        await syncSignedInUser(result.user);
        setUser(result.user);
      })
      .catch((error: any) => {
        console.error('Google redirect login error:', error);
        const message = `Đăng nhập Google thất bại${error.code ? ` (${error.code})` : ''}: ${error.message || 'Lỗi không xác định'}`;
        localStorage.setItem(GOOGLE_AUTH_ERROR_KEY, message);
        toast.error(message);
      });

    const savedError = localStorage.getItem(GOOGLE_AUTH_ERROR_KEY);
    if (savedError) {
      setTimeout(() => toast.error(savedError), 300);
    }
  }, []);

  const loginWithGoogle = async () => {
    if (!auth || !db || !isFirebaseConfigured) {
      throw new Error('Firebase chưa được cấu hình. Vui lòng thêm các khóa VITE_FIREBASE_* vào Environment Variables (trên Vercel/Hosting) hoặc GitHub Secrets.');
    }

    const provider = googleProvider();
    try {
      if (isLocalhost) {
        localStorage.removeItem(DEV_ADMIN_KEY);
      }

      const result = await signInWithPopup(auth, provider);
      await syncSignedInUser(result.user);
      setUser(result.user);
    } catch (error: any) {
      console.error('Login error detail:', error);
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        toast.message('Popup bị chặn, đang chuyển sang đăng nhập toàn trang...');
        await signInWithRedirect(auth, googleProvider());
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Firebase chưa cho phép domain localhost. Vào Firebase Console > Authentication > Settings > Authorized domains thêm localhost và 127.0.0.1.');
      } else {
        toast.error(`Đăng nhập thất bại${error.code ? ` (${error.code})` : ''}: ${error.message || 'Lỗi không xác định'}`);
      }
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    if (!auth || !db || !isFirebaseConfigured) {
      throw new Error('Firebase chưa được cấu hình. Vui lòng thêm các khóa VITE_FIREBASE_* vào Environment Variables (trên Vercel/Hosting) hoặc GitHub Secrets.');
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if banned
      const userRef = doc(db, 'users', result.user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().status === 'banned') {
        await signOut(auth);
        throw new Error('Tài khoản của bạn đã bị khóa.');
      }
      
      setUser(result.user);
    } catch (error: any) {
      console.error('Login error detail:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('Email hoặc mật khẩu không đúng');
      }
      throw new Error(error.message || 'Đăng nhập thất bại');
    }
  };

  const registerWithEmail = async (email: string, password: string, displayName: string) => {
    if (!auth || !db || !isFirebaseConfigured) {
      throw new Error('Firebase chưa được cấu hình. Vui lòng thêm các khóa VITE_FIREBASE_* vào Environment Variables (trên Vercel/Hosting) hoặc GitHub Secrets.');
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await updateProfile(result.user, { displayName });
        
        // Sync new user
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: displayName,
          photoURL: null,
          createdAt: serverTimestamp(),
          status: 'active',
          role: 'customer'
        });

        // Force a re-fetch of the user object so UI updates with displayName
        setUser({ ...result.user, displayName } as User);
      }
    } catch (error: any) {
      console.error('Register error detail:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email này đã được sử dụng');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Mật khẩu quá yếu (cần ít nhất 6 ký tự)');
      }
      throw new Error(error.message || 'Đăng ký thất bại');
    }
  };

  // ── DEV BYPASS: chỉ dùng khi chạy localhost ──
  const devLogin = () => {
    if (!isLocalhost) return;
    localStorage.setItem(DEV_ADMIN_KEY, '1');
    setUser(fakeAdminUser);
    setIsAdmin(true);
  };

  const logout = async () => {
    localStorage.removeItem(DEV_ADMIN_KEY);
    try {
      if (auth) await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithGoogle, loginWithEmail, registerWithEmail, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
