import { Copy, Image as ImageIcon, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImageUpload } from '../ImageUpload';
import React from 'react';

export interface MediaLibraryItem {
  id: string;
  url: string;
}

interface MediaLibraryTabProps {
  mediaItems: MediaLibraryItem[];
  onDeleteMedia: (id: string) => void;
  onSaveMedia: (url: string) => void;
}

const isLocalPublicImage = (url: string) => url.startsWith('/images/');
const SITE_IMAGE_HOSTS = new Set(['shop-ur-sport.vercel.app', 'ursport.vn', 'www.ursport.vn']);
const getMediaPath = (url: string) => {
  if (url.startsWith('/images/')) return url;

  try {
    const parsed = new URL(url);
    if (SITE_IMAGE_HOSTS.has(parsed.hostname) && parsed.pathname.startsWith('/images/')) {
      return parsed.pathname;
    }
  } catch {
    // Keep non-URL values as-is.
  }

  return url;
};

export function MediaLibraryTab({ mediaItems, onDeleteMedia, onSaveMedia }: MediaLibraryTabProps) {
  const DISABLE_UPLOADS = (import.meta as any).env?.VITE_DISABLE_MEDIA_UPLOADS === 'true';
  const allowLocalUpload = import.meta.env.DEV;
  const [brokenIds, setBrokenIds] = React.useState<Set<string>>(new Set());
  const brokenCount = mediaItems.filter(item => brokenIds.has(item.id)).length;

  const markBroken = (id: string) => {
    setBrokenIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Upload className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-widest">Tai anh len</h3>
              <p className="text-white/30 text-xs font-medium">{allowLocalUpload ? 'Local se luu vao /images/blog/' : 'Production dung Cloudinary de tranh loi upload'}</p>
            </div>
          </div>
          <div className="space-y-4">
            {DISABLE_UPLOADS ? (
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <p className="text-sm font-bold text-white">Uploads Disabled</p>
                <p className="text-xs text-white/40 mt-2">Media uploads have been disabled by configuration. To enable, unset `VITE_DISABLE_MEDIA_UPLOADS` or set it to `false`.</p>
              </div>
            ) : (
              <>
                {allowLocalUpload ? (
                  <div className="p-2 bg-white/[0.02] rounded-xl border border-white/5">
                    <p className="text-xs text-white/40 mb-2">Upload trực tiếp vào thư mục blog (sẽ lưu trong <span className="font-mono">/images/blog/</span>)</p>
                    <ImageUpload
                      onUploadComplete={onSaveMedia}
                      folder="blog"
                      storage="blog-local"
                      multiple
                      label="Upload vào /images/blog (dùng cho bài viết)"
                    />
                  </div>
                ) : (
                  <ImageUpload
                    onUploadComplete={onSaveMedia}
                    folder="media"
                    storage="cloudinary"
                    multiple
                    label="Upload Cloudinary - Dung duoc ngay tren Vercel"
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6">Thong tin luu tru</h3>
          <div className="space-y-4">
            {[
              { label: 'Anh moi luu tren Cloudinary', color: 'bg-emerald-500' },
              { label: 'Link https hien thi duoc tren production', color: 'bg-blue-500' },
              { label: 'Anh /images/blog cu can deploy kem code', color: 'bg-orange-500' },
              { label: brokenCount ? `${brokenCount} anh local dang bi vo tren trang nay` : 'Khong phat hien anh vo trong lan xem nay', color: brokenCount ? 'bg-red-500' : 'bg-purple-500' },
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
          <h3 className="text-white font-black text-sm uppercase tracking-widest">Anh da tai len</h3>
          <p className="text-white/30 text-xs font-medium">{mediaItems.length} anh</p>
        </div>
        <div className="p-6">
          {mediaItems.length === 0 ? (
            <div className="py-20 text-center">
              <ImageIcon className="h-12 w-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 font-bold text-sm">Chua co anh nao trong thu vien</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mediaItems.map((item) => {
                const mediaPath = getMediaPath(item.url);
                const isBroken = brokenIds.has(item.id);
                const isLocal = isLocalPublicImage(mediaPath);

                return (
                  <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-[#1e4b64]/50 transition-all">
                    {!isBroken ? (
                      <img
                        src={mediaPath}
                        alt=""
                        onError={() => markBroken(item.id)}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-950/60 p-4 text-center">
                        <AlertTriangle className="h-8 w-8 text-amber-400" />
                        <p className="text-xs font-black uppercase tracking-widest text-white">Anh chua co tren Vercel</p>
                        <p className="max-w-full truncate text-[10px] text-white/40">{mediaPath}</p>
                      </div>
                    )}

                    {isLocal && (
                      <div className={cn(
                        "absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white",
                        isBroken ? "bg-red-500" : "bg-amber-500"
                      )}>
                        {isBroken ? "Chua deploy" : "Local"}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(mediaPath);
                          toast.success(isLocal ? 'Da copy duong dan /images/blog!' : 'Da copy link!');
                        }}
                        className="p-2 bg-white/10 hover:bg-[#1e4b64] rounded-lg text-white transition-all"
                        title={isLocal ? "Copy /images/blog" : "Copy link"}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteMedia(item.id)}
                        className="p-2 bg-white/10 hover:bg-red-500 rounded-lg text-white transition-all"
                        title="Xoa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[8px] text-white/50 truncate font-mono">{mediaPath}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
