import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, Github, Chrome } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { loginWithGoogle, devLogin } = useAuth();
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register' && password !== confirmPassword) {
      toast.error('Mật khẩu không khớp!');
      return;
    }
    toast.info('Tính năng đăng nhập email đang được phát triển. Vui lòng sử dụng Đăng nhập Google.');
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      onClose();
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      console.error('Login error:', error);
      // AuthContext.tsx already handles the toast with specific messages
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[450px] bg-white rounded-[32px] shadow-2xl z-[101] overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 p-2 rounded-full hover:bg-zinc-100 transition-colors z-10"
            >
              <X className="h-5 w-5 text-zinc-400" />
            </button>

            <div className="p-8 sm:p-10">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">
                  {mode === 'login' ? 'Chào mừng trở lại' : 'Đăng ký tài khoản'}
                </h2>
                <p className="text-zinc-500 font-medium">
                  {mode === 'login' ? 'Đăng nhập để tiếp tục trải nghiệm cùng UrSport' : 'Tham gia cộng đồng UrSport ngay hôm nay'}
                </p>
              </div>

              {/* ── DEV BYPASS BUTTON (localhost only) ── */}
              {isLocalhost && (
                <button
                  type="button"
                  onClick={() => { devLogin(); onClose(); }}
                  className="w-full h-12 mb-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-900 font-black text-sm flex items-center justify-center gap-2 border-2 border-amber-500 transition-all"
                >
                  ⚡ Dev Admin Login (localhost only)
                </button>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 mt-[1px]" />
                    <input 
                      type="text"
                      placeholder="Tên của bạn"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:border-[#1e4b64] focus:ring-4 focus:ring-[#1e4b64]/5 outline-none transition-all font-medium"
                    />
                  </div>
                )}

                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 mt-[1px]" />
                  <input 
                    type="email"
                    placeholder="Email của bạn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:border-[#1e4b64] focus:ring-4 focus:ring-[#1e4b64]/5 outline-none transition-all font-medium"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 mt-[1px]" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 pl-12 pr-12 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:border-[#1e4b64] focus:ring-4 focus:ring-[#1e4b64]/5 outline-none transition-all font-medium"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-[#1e4b64] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {mode === 'register' && (
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 mt-[1px]" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:border-[#1e4b64] focus:ring-4 focus:ring-[#1e4b64]/5 outline-none transition-all font-medium"
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button type="button" className="text-xs font-bold text-[#1e4b64] hover:underline">Quên mật khẩu?</button>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-[#1e4b64] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(30,75,100,0.25)] hover:shadow-[0_12px_28px_rgba(30,75,100,0.35)] hover:-translate-y-0.5 transition-all active:scale-95 group"
                >
                  {mode === 'login' ? (
                    <>
                      <span>Đăng nhập</span>
                      <LogIn className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      <span>Đăng ký</span>
                      <UserPlus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-black text-zinc-400">
                  <span className="bg-white px-4">Hoặc tiếp tục với</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-3 h-14 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-white hover:border-[#1e4b64]/30 transition-all group"
                >
                  <div className="bg-white p-1.5 rounded-lg border border-zinc-100 group-hover:border-[#1e4b64]/20 transition-all">
                    <Chrome className="h-5 w-5 text-[#ea4335]" />
                  </div>
                  <span className="font-bold text-zinc-700">Google</span>
                </button>
                <button 
                  disabled
                  className="flex items-center justify-center gap-3 h-14 rounded-2xl border border-zinc-100 bg-zinc-50 opacity-60 cursor-not-allowed group"
                >
                  <div className="bg-white p-1.5 rounded-lg border border-zinc-100">
                    <div className="w-5 h-5 bg-[#1877f2] rounded-sm flex items-center justify-center">
                      <span className="text-white font-black text-[14px]">f</span>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-700">Facebook</span>
                </button>
              </div>

              <p className="mt-8 text-center text-zinc-500 font-medium">
                {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                {' '}
                <button 
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-[#1e4b64] font-bold hover:underline"
                >
                  {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
                </button>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
