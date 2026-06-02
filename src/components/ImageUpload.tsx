import React, { useRef, useState } from 'react';
import { CheckCircle2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { auth } from '../firebase';
import { uploadLocalImage } from '../lib/localMediaUpload';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folder?: string;
  label?: string;
  externalPreview?: string;
  compact?: boolean;
  storage?: 'cloudinary' | 'blog-local' | 'local';
  multiple?: boolean;
}

const CLOUDINARY_CLOUD_NAME = 'dcj4qhcfh';
const CLOUDINARY_UPLOAD_PRESET = 'ursport_uploads';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  folder = 'products',
  label = 'Tai anh len',
  externalPreview,
  compact = false,
  storage = 'local',
  multiple = false
}) => {
  const DISABLE_UPLOADS = (import.meta as any).env?.VITE_DISABLE_MEDIA_UPLOADS === 'true';
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isUploading) return;
    if (DISABLE_UPLOADS) {
      toast.error('Tải ảnh đã bị vô hiệu hoá bởi cấu hình.');
      return;
    }
    fileInputRef.current?.click();
  };

  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Vui long chon anh dinh dang JPG, PNG, WebP hoac GIF.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File qua lon. Toi da 10MB.';
    }
    return '';
  };

  const uploadToBlogFolder = async (file: File, index: number, total: number) => {
    setProgress(Math.round((index / total) * 100));
    const token = await auth.currentUser?.getIdToken();
    const headers: Record<string, string> = {
      'Content-Type': file.type,
      'X-File-Name': encodeURIComponent(file.name),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch('/api/upload-blog-image', {
      method: 'POST',
      headers,
      body: file,
    });

    if (!response.ok) {
      let errorMsg = `Upload failed (${response.status})`;
      try {
        const errorData = await response.json().catch(() => ({}));
        if (errorData && errorData.error) errorMsg = `${errorMsg}: ${errorData.error}`;
      } catch (e) {
        // ignore
      }
      // Provide actionable hints for common causes
      if (response.status === 401 || response.status === 403) {
        errorMsg += ' — Unauthorized. Ensure you are signed in as an admin or enable VITE_ALLOW_LOCAL_UPLOAD in development.';
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.url as string;
  };

  const uploadToLocalFolder = async (file: File, index: number, total: number) => {
    setProgress(Math.round((index / total) * 100));
    // Normalise any folder alias → the API's accepted folder key
    const folderAliasMap: Record<string, string> = {
      // product description images (underscore OR dash variant)
      'product_descriptions': 'product-descriptions',
      'product-descriptions': 'product-descriptions',
      // size guide images
      'size_guides': 'size-guides',
      'size-guides': 'size-guides',
      // blog images
      'blog': 'blog',
      // product hero / gallery images
      'product': 'product',
      'products': 'products',
      // fixed site images
      'images': 'images',
      'root': 'images',
      // homepage banners
      'banners': 'banners',
    };
    const localFolder = folderAliasMap[folder] ?? 'products';
    return uploadLocalImage(file, localFolder);
  };

  const uploadToCloudinary = (file: File, index: number, total: number) => new Promise<string>((resolve, reject) => {
    const baseProgress = (index / total) * 100;
    const fileProgressShare = 100 / total;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round(baseProgress + (event.loaded / event.total) * fileProgressShare));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error('Upload that bai. Kiem tra lai Cloudinary config.'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Loi ket noi. Vui long thu lai.'));
    };

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.send(formData);
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (DISABLE_UPLOADS) {
      toast.error('Tải ảnh đã bị vô hiệu hoá bởi cấu hình.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const invalidMessage = files.map(validateFile).find(Boolean);
    if (invalidMessage) {
      toast.error(invalidMessage);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(files[0]);
    setPreviewUrl(objectUrl);
    setIsUploading(true);
    setProgress(0);
    setUploadError(null);
    setIsDone(false);

    try {
      const uploadedUrls: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const url = storage === 'blog-local' || storage === 'local'
          ? await uploadToLocalFolder(files[index], index, files.length)
          : await uploadToCloudinary(files[index], index, files.length);
        uploadedUrls.push(url);
        onUploadComplete(url);
      }

      setPreviewUrl(uploadedUrls[uploadedUrls.length - 1]);
      setProgress(100);
      setIsDone(true);
      toast.success(files.length > 1 ? `Da tai ${files.length} anh thanh cong!` : 'Tai anh thanh cong!');
    } catch (error: any) {
      const errMsg = error.message || 'Upload that bai. Vui long thu lai.';
      setUploadError(errMsg);
      setProgress(0);
      toast.error(errMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setProgress(0);
    setUploadError(null);
    setIsDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyUrl = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (previewUrl && !previewUrl.startsWith('blob:')) {
      navigator.clipboard.writeText(previewUrl);
      toast.success('Da copy link anh.');
    }
  };

  if (compact) {
    const hasImage = !!(externalPreview || previewUrl);
    return (
      <div className="w-full max-w-[280px]">
        <input
          type="file"
          multiple={multiple}
          ref={fileInputRef}
          onChange={handleFileChange}
          onClick={(event) => event.stopPropagation()}
          className="hidden"
          accept="image/*"
        />

        <div
          onClick={openFilePicker}
          className={cn(
            "relative group cursor-pointer border rounded-xl transition-all duration-300 flex items-center justify-between p-2 h-14",
            hasImage
              ? uploadError
                ? "border-red-500/30 bg-red-500/5"
                : isDone
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-[#1e4b64]/30 bg-blue-500/5"
              : "border-white/10 hover:border-[#1e4b64]/50 hover:bg-white/[0.02] bg-white/[0.01]",
            isUploading && "pointer-events-none"
          )}
        >
          {hasImage ? (
            <div className="flex items-center gap-2.5 w-full pr-6 overflow-hidden">
              <div className="h-10 w-12 rounded-lg bg-[#0f1117]/60 border border-white/5 flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                <img
                  src={externalPreview || previewUrl!}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[10px] font-bold text-white/50 block truncate uppercase tracking-wider">
                  {label ? label : 'Đã chọn ảnh'}
                </span>
                {isUploading ? (
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-[#1e4b64] rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : (
                  <span className="text-[9px] font-medium text-emerald-400 block">
                    {uploadError ? 'Lỗi tải lên' : 'Đã đồng bộ'}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 w-full">
              <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#1e4b64]/20 transition-all flex-shrink-0">
                <Upload className="h-4 w-4 text-zinc-400 group-hover:text-[#4ca6d8] transition-colors" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-zinc-400 group-hover:text-white uppercase tracking-wider block">
                  {label ? label : 'Tải ảnh lên'}
                </span>
                <span className="text-[8px] font-medium text-zinc-500 block">
                  JPG, PNG, WebP
                </span>
              </div>
            </div>
          )}

          {hasImage && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeImage();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#0f1117] hover:bg-red-500/20 border border-white/10 rounded-lg text-white/40 hover:text-red-400 transition-all"
              title="Xóa ảnh"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {label && !compact && <label className="text-sm font-bold text-white/40 uppercase tracking-widest">{label}</label>}

      <div
        onClick={openFilePicker}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center justify-center",
          "p-6 min-h-[180px]",
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
          multiple={multiple}
          ref={fileInputRef}
          onChange={handleFileChange}
          onClick={(event) => event.stopPropagation()}
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
                  "rounded-xl object-contain shadow-2xl border border-white/10",
                  "max-h-40"
                )}
              />
              {isDone && !previewUrl?.startsWith('blob:') && !compact && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-2 bg-[#0f1117]/80 backdrop-blur-md border border-white/10 rounded-lg text-white hover:bg-[#1e4b64] transition-all"
                    title="Copy link"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {isUploading && (
              <div className={cn("w-full space-y-2", "max-w-[200px]")}>
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
                  <span className="text-sm font-bold">Thanh cong!</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); removeImage(); }}
              className={cn(
                "absolute bg-[#0f1117] border border-white/10 rounded-full shadow-xl text-white/50 hover:text-red-400 transition-colors",
                "-top-3 -right-3 p-2"
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <div className={cn("bg-zinc-100 rounded-full group-hover:bg-blue-100 transition-colors flex items-center justify-center", "p-4 mb-3")}>
              <Upload className={cn("text-zinc-400 group-hover:text-[#1e4b64] transition-colors", "h-7 w-7")} />
            </div>
            {!compact && (
              <>
                <p className="text-sm font-bold text-zinc-500 group-hover:text-zinc-700 text-center">
                  {multiple ? 'Keo tha hoac click de chon nhieu anh' : 'Keo tha hoac click de chon anh'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WebP - Toi da 10MB</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
