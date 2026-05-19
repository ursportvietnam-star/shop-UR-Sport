import { Copy, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImageUpload } from '../ImageUpload';

export interface MediaLibraryItem {
  id: string;
  url: string;
}

interface MediaLibraryTabProps {
  mediaItems: MediaLibraryItem[];
  onDeleteMedia: (id: string) => void;
  onSaveMedia: (url: string) => void;
}

export function MediaLibraryTab({ mediaItems, onDeleteMedia, onSaveMedia }: MediaLibraryTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Upload className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-widest">Tải ảnh lên</h3>
              <p className="text-white/30 text-xs font-medium">Lưu tại /images/blog/</p>
            </div>
          </div>
          <ImageUpload
            onUploadComplete={onSaveMedia}
            folder="images/blog"
            storage="blog-local"
            label="Kéo thả hoặc nhấn để chọn ảnh"
          />
        </div>

        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6">Thông tin lưu trữ</h3>
          <div className="space-y-4">
            {[
              { label: 'Lưu trong public/images/blog', color: 'bg-emerald-500' },
              { label: 'Link dạng /images/blog/ten-file', color: 'bg-blue-500' },
              { label: 'Dễ chèn vào HTML bài viết', color: 'bg-purple-500' },
              { label: 'Hỗ trợ đa định dạng', color: 'bg-orange-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className={cn("h-2 w-2 rounded-full shrink-0", item.color)} />
                <span className="text-white/60 text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-white font-black text-sm uppercase tracking-widest">Ảnh đã tải lên</h3>
          <p className="text-white/30 text-xs font-medium">{mediaItems.length} ảnh</p>
        </div>
        <div className="p-6">
          {mediaItems.length === 0 ? (
            <div className="py-20 text-center">
              <ImageIcon className="h-12 w-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 font-bold text-sm">Chưa có ảnh nào trong thư viện</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mediaItems.map((item) => (
                <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-[#1e4b64]/50 transition-all">
                  <img
                    src={item.url}
                    alt=""
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.url);
                        toast.success('Đã sao chép link!');
                      }}
                      className="p-2 bg-white/10 hover:bg-[#1e4b64] rounded-lg text-white transition-all"
                      title="Sao chép link"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteMedia(item.id)}
                      className="p-2 bg-white/10 hover:bg-red-500 rounded-lg text-white transition-all"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[8px] text-white/50 truncate font-mono">{item.url}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
