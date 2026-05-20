import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Loader2, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { auth } from '../firebase';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folder?: string;
  label?: string;
  externalPreview?: string;
  compact?: boolean;
  storage?: 'cloudinary' | 'blog-local';
}

// ─── Cloudinary config ───────────────────────────────────────────────────────
// Điền thông tin Cloudinary của bạn vào đây
const CLOUDINARY_CLOUD_NAME = 'dcj4qhcfh';
const CLOUDINARY_UPLOAD_PRESET = 'ursport_uploads';
// ────────────────────────────────────────────────────────────────────────────

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  folder = 'products',
  label = 'Tải ảnh lên',
  externalPreview,
  compact = false,
  storage = 'cloudinary'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Vui lòng chọn file hình ảnh định dạng JPG, PNG, WebP hoặc GIF!');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn! Tối đa 10MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    if (storage === 'blog-local') {
      uploadToBlogFolder(file);
    } else {
      uploadToCloudinary(file);
    }
  };

  const uploadToBlogFolder = async (file: File) => {
    setIsUploading(true);
    setProgress(10);
    setUploadError(null);
    setIsDone(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': file.type,
        'X-File-Name': encodeURIComponent(file.name),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/upload-blog-image', {
        method: 'POST',
        headers,
        body: file,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      onUploadComplete(data.url);
      setPreviewUrl(data.url);
      setProgress(100);
      setIsDone(true);
      toast.success('Đã lưu ảnh vào /images/blog/');
    } catch (error: any) {
      const errMsg = error.message || 'Không thể lưu ảnh vào /images/blog. Kiểm tra server upload.';
      setUploadError(errMsg);
      toast.error(errMsg);
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadToCloudinary = (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setUploadError(null);
    setIsDone(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        setProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        onUploadComplete(data.secure_url);
        setPreviewUrl(data.secure_url); // Update preview to real URL
        setIsDone(true);
        setIsUploading(false);
        toast.success('Tải ảnh thành công!');
      } else {
        const errMsg = 'Upload thất bại. Kiểm tra lại Cloudinary config.';
        setUploadError(errMsg);
        toast.error(errMsg);
        setIsUploading(false);
        setProgress(0);
      }
    };

    xhr.onerror = () => {
      const errMsg = 'Lỗi kết nối. Vui lòng thử lại.';
      setUploadError(errMsg);
      toast.error(errMsg);
      setIsUploading(false);
      setProgress(0);
    };

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.send(formData);
  };

  const removeImage = () => {
    // If previewUrl is an object URL, revoke it to prevent memory leaks
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setProgress(0);
    setUploadError(null);
    setIsDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl && !previewUrl.startsWith('blob:')) {
      navigator.clipboard.writeText(previewUrl);
      toast.success('Đã sao chép đường dẫn ảnh!');
    }
  };

  return (
    <div className="w-full space-y-3">
      {label && !compact && <label className="text-sm font-bold text-white/40 uppercase tracking-widest">{label}</label>}

      <div
        onClick={openFilePicker}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center justify-center",
          compact ? "p-2 min-h-[64px] aspect-square" : "p-6 min-h-[180px]",
          previewUrl || externalPreview
            ? uploadError
              ? "border-red-400 bg-red-50/5"
              : isDone
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-[#1e4b64] bg-blue-500/5"
            : "border-white/10 hover:border-[#1e4b64] hover:bg-white/[0.02]",
          isUploading && "pointer-events-none"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          onClick={(e) => e.stopPropagation()}
          className="hidden"
          accept="image/*"
        />

        {(externalPreview || previewUrl) ? (
          <div className="relative w-full flex flex-col items-center justify-center">
            <div className="relative">
              <img
                src={externalPreview || previewUrl!}
                alt="Preview"
                className={cn(
                  "rounded-xl object-cover shadow-2xl border border-white/10",
                  compact ? "h-12 w-12" : "max-h-40"
                )}
              />
              {isDone && !previewUrl?.startsWith('blob:') && !compact && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-2 bg-[#0f1117]/80 backdrop-blur-md border border-white/10 rounded-lg text-white hover:bg-[#1e4b64] transition-all"
                    title="Sao chép link"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {isUploading && (
              <div className={cn("w-full space-y-2", compact ? "max-w-[40px]" : "max-w-[200px]")}>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1e4b64] rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {isDone && !compact && (
              <div className="w-full mt-4 space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-bold">Thành công!</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeImage(); }}
              className={cn(
                "absolute bg-[#0f1117] border border-white/10 rounded-full shadow-xl text-white/50 hover:text-red-400 transition-colors",
                compact ? "-top-2 -right-2 p-1" : "-top-3 -right-3 p-2"
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <div className={cn("bg-zinc-100 rounded-full group-hover:bg-blue-100 transition-colors flex items-center justify-center", compact ? "p-2" : "p-4 mb-3")}>
              <Upload className={cn("text-zinc-400 group-hover:text-[#1e4b64] transition-colors", compact ? "h-4 w-4" : "h-7 w-7")} />
            </div>
            {!compact && (
              <>
                <p className="text-sm font-bold text-zinc-500 group-hover:text-zinc-700 text-center">
                  Kéo thả hoặc click để chọn ảnh
                </p>
                <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WebP • Tối đa 10MB</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
