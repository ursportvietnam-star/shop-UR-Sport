import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { auth, db } from './firebase';

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

const fakeAdminUser = {
  uid: 'dev-admin-local',
  email: 'ursportvietnam@gmail.com',
  displayName: 'Dev Admin (Local)',
  photoURL: null,
} as unknown as User;

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

  useEffect(() => {
    // Nếu đang dùng dev bypass thì không cần chờ Firebase
    if (isLocalhost && localStorage.getItem(DEV_ADMIN_KEY) === '1') {
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
            // Check if user is listed in Firestore admins collection
            const adminDoc = await getDoc(doc(db, 'admins', authUser.uid));
            setIsAdmin(adminDoc.exists());
          } catch (error: any) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error: any) {
      console.error('Login error detail:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Bạn đã đóng cửa sổ đăng nhập');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Tên miền này chưa được ủy quyền trong Firebase Console!');
      } else {
        toast.error('Đăng nhập thất bại: ' + (error.message || 'Lỗi không xác định'));
      }
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
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
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await updateProfile(result.user, { displayName });
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
      await signOut(auth);
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
