import React, { useState, useEffect } from 'react';
import { Video, Save, AlertCircle, Smartphone, Monitor, Globe2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

export const AdminLivestreamTab = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewers, setViewers] = useState<any[]>([]);

  // Lắng nghe danh sách người xem realtime
  useEffect(() => {
    if (!db) return;
    const viewersCol = collection(db, 'live_viewers');
    // Chỉ lấy những người đang online (hoạt động trong 60s qua)
    const activeThreshold = Date.now() - 60000;
    const q = query(viewersCol, where('lastActive', '>', activeThreshold));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activeViewers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Bỏ qua những session cũ không có thông tin thiết bị
      activeViewers = activeViewers.filter((v: any) => v.deviceInfo);

      // Sắp xếp người mới vào lên trên
      activeViewers.sort((a: any, b: any) => {
        const aTime = a.deviceInfo?.joinedAt || 0;
        const bTime = b.deviceInfo?.joinedAt || 0;
        return bTime - aTime;
      });
      setViewers(activeViewers);
    }, (err) => {
      console.error("Lỗi khi theo dõi người xem:", err);
    });

    return () => unsubscribe();
  }, []);

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

      {/* Viewers Real-time Dashboard */}
      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center bg-green-500/10 text-green-500 rounded-xl">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Người đang xem ({viewers.length})</h2>
              <p className="text-sm font-medium text-white/45">Theo dõi vị trí và thiết bị theo thời gian thực</p>
            </div>
          </div>
          {viewers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>

        {viewers.length === 0 ? (
          <div className="text-center py-10 border border-white/5 border-dashed rounded-xl">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 mb-3 text-white/20">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm text-white/40 font-medium">Chưa có ai đang xem luồng trực tiếp này.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {viewers.map((v, i) => (
              <div key={v.id || i} className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg ${v.deviceInfo?.type === 'Mobile' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {v.deviceInfo?.type === 'Mobile' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {v.deviceInfo?.browser || 'Không xác định'} 
                      <span className="text-white/20">•</span> 
                      {v.deviceInfo?.os || 'Không xác định'}
                    </div>
                    <div className="text-xs font-medium text-white/40 flex items-center gap-1.5 mt-1">
                      <Globe2 className="w-3.5 h-3.5" />
                      {v.deviceInfo?.location || 'Không xác định'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1">Tham gia lúc</div>
                  <div className="text-sm text-white/80 font-medium">
                    {v.deviceInfo?.joinedAt ? new Date(v.deviceInfo.joinedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
