import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Plus, Search, UserX, UserCheck, Shield, Mail, Calendar, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let secondaryApp: any;
let secondaryAuth: any;
try {
  secondaryApp = initializeApp(firebaseConfig, 'SecondaryAdminApp');
  secondaryAuth = getAuth(secondaryApp);
} catch (error) {
  // Ignore if already initialized
}

interface CustomerData {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  createdAt: any;
  status: 'active' | 'banned';
  role: string;
}

export const CustomerManagementTab: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CustomerData[];
      setCustomers(data);
      setLoading(false);
    }, (error) => {
      console.error('Lỗi khi tải danh sách khách hàng:', error);
      toast.error('Không thể tải danh sách khách hàng');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleToggleStatus = async (customer: CustomerData) => {
    const newStatus = customer.status === 'active' ? 'banned' : 'active';
    const actionName = newStatus === 'banned' ? 'Khóa' : 'Mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionName.toLowerCase()} tài khoản ${customer.email}?`)) return;

    try {
      await updateDoc(doc(db, 'users', customer.id), {
        status: newStatus
      });
      toast.success(`${actionName} tài khoản thành công!`);
    } catch (error: any) {
      console.error(`Error toggling status:`, error);
      toast.error(`Lỗi: ${error.message}`);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newName) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!secondaryAuth) {
        secondaryApp = initializeApp(firebaseConfig, `SecondaryAdminApp_${Date.now()}`);
        secondaryAuth = getAuth(secondaryApp);
      }
      
      const result = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      if (result.user) {
        await updateProfile(result.user, { displayName: newName });
        
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: newName,
          photoURL: null,
          createdAt: serverTimestamp(),
          status: 'active',
          role: 'customer'
        });

        await signOut(secondaryAuth);
        
        toast.success('Thêm tài khoản khách hàng thành công!');
        setShowAddModal(false);
        setNewEmail('');
        setNewPassword('');
        setNewName('');
      }
    } catch (error: any) {
      console.error('Create user error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email này đã được sử dụng');
      } else {
        toast.error(`Lỗi: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.displayName && c.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
            Quản lý Khách hàng
          </h2>
          <p className="text-[#8e9aab] text-sm">
            Danh sách tài khoản và phân quyền người dùng
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="h-10 px-4 bg-[#1e4b64] text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-[#153648] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Thêm Khách Hàng
        </button>
      </div>

      {/* Filter / Search */}
      <div className="bg-[#1a2332] border border-[#2a3441] rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e9aab]" />
          <input
            type="text"
            placeholder="Tìm kiếm theo email, tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-[#0f172a] border border-[#2a3441] text-white rounded-lg focus:outline-none focus:border-[#1e4b64] transition-colors text-sm"
          />
        </div>
        <div className="text-sm font-medium text-[#8e9aab]">
          Hiển thị: <span className="text-white">{filteredCustomers.length}</span> / {customers.length}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#1a2332] border border-[#2a3441] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a]/50 text-xs uppercase tracking-widest text-[#8e9aab]">
                <th className="px-6 py-4 font-black">Khách Hàng</th>
                <th className="px-6 py-4 font-black">Ngày Đăng Ký</th>
                <th className="px-6 py-4 font-black">Trạng Thái</th>
                <th className="px-6 py-4 font-black text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3441] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#8e9aab]">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#1e4b64]" />
                      <span>Đang tải danh sách...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#8e9aab] font-medium">
                    Không tìm thấy khách hàng nào.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#0f172a]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#1e4b64]/20 border border-[#1e4b64]/30 flex items-center justify-center overflow-hidden shrink-0">
                          {customer.photoURL ? (
                            <img src={customer.photoURL} alt={customer.displayName} className="h-full w-full object-cover" />
                          ) : (
                            <Shield className="h-5 w-5 text-[#1e4b64]" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            {customer.displayName || 'Khách hàng'}
                            {customer.role === 'admin' && (
                              <span className="px-1.5 py-0.5 text-[10px] uppercase font-black bg-rose-500/10 text-rose-400 rounded">Admin</span>
                            )}
                          </div>
                          <div className="text-xs text-[#8e9aab] flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[#8e9aab] text-xs">
                        <Calendar className="h-4 w-4" />
                        {customer.createdAt?.toDate ? customer.createdAt.toDate().toLocaleDateString('vi-VN') : 'Mới đây'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        customer.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {customer.status === 'active' ? 'Hoạt động' : 'Bị Khóa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleToggleStatus(customer)}
                          className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
                            customer.status === 'active'
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={customer.status === 'active' ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                        >
                          {customer.status === 'active' ? (
                            <>
                              <UserX className="h-4 w-4" /> Khóa
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4" /> Mở
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#1a2332] border border-[#2a3441] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#2a3441]">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">
                  Thêm Khách Hàng
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-[#8e9aab] hover:text-white hover:bg-[#2a3441] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-[#8e9aab]">Tên khách hàng</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full h-11 px-4 bg-[#0f172a] border border-[#2a3441] text-white rounded-lg focus:outline-none focus:border-[#1e4b64] transition-colors"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-[#8e9aab]">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full h-11 px-4 bg-[#0f172a] border border-[#2a3441] text-white rounded-lg focus:outline-none focus:border-[#1e4b64] transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-[#8e9aab]">Mật khẩu</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    className="w-full h-11 px-4 bg-[#0f172a] border border-[#2a3441] text-white rounded-lg focus:outline-none focus:border-[#1e4b64] transition-colors"
                    required
                    minLength={6}
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="h-10 px-5 text-sm font-bold text-[#8e9aab] hover:text-white transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-6 bg-[#1e4b64] text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-[#153648] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      'Tạo Tài Khoản'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
