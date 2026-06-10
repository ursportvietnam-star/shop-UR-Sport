import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Trash2, 
  Upload, 
  Check as CheckIcon, 
  Sparkles, 
  AlertCircle, 
  Copy, 
  Eye, 
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { saveAdminSetting, getAdminSetting } from '../../services/adminData';
import { toast } from 'sonner';

export function BioPageConfigManager() {
  const [htmlCode, setHtmlCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    getAdminSetting<{ htmlCode?: string }>('bio')
      .then((data) => {
        if (data && typeof data.htmlCode === 'string') {
          setHtmlCode(data.htmlCode);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Lỗi khi tải cấu hình Bio:', error);
        toast.error('Không thể tải cấu hình Bio Link');
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAdminSetting('bio', {
        htmlCode: htmlCode.trim(),
        updatedAt: new Date().toISOString()
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Đã lưu cấu hình trang Bio Link thành công!');
    } catch (error: any) {
      console.error('Lỗi khi lưu cấu hình Bio:', error);
      toast.error('Lưu thất bại: ' + (error.message || 'Lỗi kết nối'));
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefault = async () => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn khôi phục giao diện mặc định? Mã HTML tùy biến hiện tại của bạn sẽ bị xóa.'
      )
    ) {
      setSaving(true);
      try {
        await saveAdminSetting('bio', {
          htmlCode: '',
          updatedAt: new Date().toISOString()
        });
        setHtmlCode('');
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success('Đã khôi phục giao diện Bio mặc định của hệ thống!');
      } catch (error: any) {
        toast.error('Khôi phục thất bại: ' + error.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const sampleTemplate = `<div style="min-height: 100vh; background: linear-gradient(135deg, #090b11 0%, #111522 100%); color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 48px 20px 24px 20px; box-sizing: border-box;">
  
  <div style="width: 100%; max-width: 440px; display: flex; flex-direction: column; align-items: center;">
    
    <!-- Avatar/Logo -->
    <div style="position: relative; margin-bottom: 24px;">
      <div style="width: 96px; height: 96px; border-radius: 50%; padding: 4px; background: linear-gradient(to right, #1e4b64, #10b981); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; background: #13161f; display: flex; align-items: center; justify-content: center; padding: 10px; box-sizing: border-box;">
          <img src="/images/products/icon-logo-ursport.png" alt="UR Sport" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
      </div>
    </div>
    
    <!-- Tiêu đề & Giới thiệu -->
    <h1 style="font-size: 24px; font-weight: 900; color: #fff; margin: 0 0 6px 0; letter-spacing: 0.5px;">UR SPORT</h1>
    <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: #10b981; margin: 0 0 12px 0;">Thời Trang Thể Thao Nam</p>
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0 0 32px 0; max-width: 320px; line-height: 1.6;">Đồ tập gym, chạy bộ, thể thao ngoài trời chính hãng. Co giãn tốt, thấm hút mồ hôi vượt trội.</p>
    
    <!-- Danh sách liên kết -->
    <div style="width: 100%; display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px;">
      
      <!-- Link 1 -->
      <a href="https://www.ursport.vn" target="_blank" style="display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <span style="display: flex; align-items: center; gap: 12px;">🌐 Website chính thức</span>
        <span>➔</span>
      </a>
      
      <!-- Link 2 -->
      <a href="https://shopee.vn/ursport.vn" target="_blank" style="display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <span style="display: flex; align-items: center; gap: 12px;">🛍️ Gian hàng Shopee Mall</span>
        <span>➔</span>
      </a>
      
      <!-- Link 3 -->
      <a href="https://zalo.me/0917722425" target="_blank" style="display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background-color: rgba(30,75,100,0.25); border: 1px solid rgba(30,75,100,0.4); border-radius: 16px; color: #34d399; text-decoration: none; font-weight: 700; font-size: 14px; transition: all 0.3s; box-shadow: 0 4px 10px rgba(16,185,129,0.15);">
        <span style="display: flex; align-items: center; gap: 12px;">💬 Hotline Zalo hỗ trợ nhanh</span>
        <span>➔</span>
      </a>

    </div>
  </div>
  
  <!-- Copyright footer -->
  <div style="font-size: 10px; color: #4b5563; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
    © 2026 UR SPORT · ĐÚNG CHẤT THỂ THAO
  </div>
  
</div>`;

  const handleCopyTemplate = () => {
    setHtmlCode(sampleTemplate);
    toast.success('Đã nạp mẫu code giao diện mẫu! Hãy bấm Lưu để cập nhật.');
  };

  if (loading) {
    return (
      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-20 flex flex-col items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-[#1e4b64] border-t-transparent animate-spin mb-4" />
        <p className="text-white/30 text-sm font-bold">Đang tải cấu hình Bio Link...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      <div className="bg-[#1e4b64]/10 border border-[#1e4b64]/20 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-3">
          <div className="h-10 w-10 bg-[#1e4b64]/20 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-widest">Trang Bio Link Tùy Biến</h3>
            <p className="text-white/40 text-xs font-medium mt-1 leading-relaxed">
              Bạn có thể tự do chỉnh sửa HTML, CSS và Javascript để thiết kế lại trang <code className="text-sky-400">ursport.vn/bio</code> của mình.
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <a
            href="/bio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/5"
          >
            Xem trang bio <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Editor Section */}
      <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Code2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-xs uppercase tracking-widest">Mã HTML Tùy Biến (Custom HTML Code)</h3>
              <p className="text-white/30 text-[10px] mt-0.5 font-semibold">Để trống để sử dụng giao diện mặc định cực đẹp của UR Sport</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreDefault}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all disabled:opacity-50"
              title="Khôi phục giao diện React mặc định"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Khôi phục mặc định
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#1e4b64] hover:bg-[#153446] text-white'
              }`}
            >
              {saved ? <CheckIcon className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
              {saved ? 'Đã lưu!' : 'Lưu giao diện'}
            </button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="relative">
          {/* Line Numbers */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/[0.02] border-r border-white/5 pointer-events-none flex flex-col items-end pt-4 pb-4 pr-2 select-none overflow-hidden">
            {Array.from({ length: Math.max(htmlCode.split('\n').length, 25) }, (_, i) => (
              <span key={i} className="text-white/15 text-xs font-mono leading-6">
                {i + 1}
              </span>
            ))}
          </div>
          <textarea
            value={htmlCode}
            onChange={(e) => setHtmlCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const val = htmlCode;
                setHtmlCode(val.substring(0, start) + '  ' + val.substring(end));
                setTimeout(() => e.currentTarget.setSelectionRange(start + 2, start + 2), 0);
              }
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
              }
            }}
            spellCheck={false}
            placeholder={`<!-- Viết code HTML tùy biến của bạn cho trang Bio vào đây -->\n\n<div style="text-align: center; padding: 40px; color: #fff;">\n  <h1>Chào mừng đến với UR SPORT</h1>\n  <a href="https://ursport.vn">Về trang chủ</a>\n</div>`}
            className="w-full min-h-[500px] bg-transparent pl-14 pr-6 pt-4 pb-4 text-[13px] font-mono text-cyan-300 leading-6 resize-y outline-none placeholder:text-white/15 border-none"
            style={{ caretColor: '#22d3ee' }}
          />
        </div>

        {/* Bottom bar */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-white/25 text-[11px] font-medium">
            {htmlCode.split('\n').length} dòng • {htmlCode.length} ký tự • Lưu nhanh:{' '}
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/40">Ctrl+S</kbd>
          </p>
          <p className="text-white/25 text-[11px]">Tab = 2 spaces</p>
        </div>
      </div>

      {/* Snippet / Helper section */}
      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-sky-400" />
          <h4 className="text-white font-bold text-xs uppercase tracking-widest">Hướng dẫn & Code Mẫu</h4>
        </div>
        <p className="text-white/40 text-xs leading-relaxed">
          Nếu bạn chưa có mã HTML, bạn có thể bấm nút dưới đây để nạp giao diện mẫu Bio tuyệt đẹp do chuyên gia thiết kế sẵn.
          Sau đó, bạn chỉ cần thay thế các liên kết đường dẫn sang đúng tài khoản của bạn.
        </p>
        <div>
          <button
            type="button"
            onClick={handleCopyTemplate}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all"
          >
            <Copy className="h-3.5 w-3.5" /> Nạp giao diện mẫu
          </button>
        </div>
      </div>
    </div>
  );
}
