import React, { useState, useEffect } from 'react';
import { Video, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const AdminLivestreamTab = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'livestream'));
        if (snap.exists()) {
          const data = snap.data();
          setVideoUrl(data.videoUrl || '');
          setTitle(data.title || '');
          setDescription(data.description || '');
        } else {
          // Defaults
          setTitle('🔥 Siêu Sale Đồ Thể Thao Cao Cấp');
          setDescription('Săn ngay deal hot giảm giá đến 50% chỉ có trong livestream hôm nay.');
        }
      } catch (error) {
        console.error('Error fetching livestream settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'livestream'), {
        videoUrl,
        title,
        description,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Đã lưu cấu hình Livestream!');
    } catch (error) {
      console.error('Error saving livestream config:', error);
      toast.error('Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-white/50 text-sm">Đang tải cấu hình...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Cấu hình Livestream</h2>
            <p className="text-sm font-medium text-white/45">Thiết lập luồng phát trực tiếp hiển thị trên trang /live</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-widest">
              Đường link Video Livestream (YouTube / Facebook)
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="VD: https://www.youtube.com/watch?v=..."
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ca6d8] focus:ring-1 focus:ring-[#4ca6d8]/50 transition-all placeholder:text-white/20 font-medium"
            />
            <p className="text-xs text-white/40 mt-2 flex items-start gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Hỗ trợ link YouTube (thông thường hoặc Live) và Facebook Live. Hệ thống sẽ tự động chuyển đổi thành video nhúng.</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-widest">
              Tiêu đề chương trình Live
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: 🔥 Siêu Sale Đồ Thể Thao"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ca6d8] focus:ring-1 focus:ring-[#4ca6d8]/50 transition-all placeholder:text-white/20 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-widest">
              Mô tả ngắn gọn
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả ngắn gọn về ưu đãi trong phiên live..."
              rows={3}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ca6d8] focus:ring-1 focus:ring-[#4ca6d8]/50 transition-all placeholder:text-white/20 font-medium resize-none"
            />
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-[#4ca6d8] hover:bg-[#3b8dbf] text-black font-black text-sm px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
