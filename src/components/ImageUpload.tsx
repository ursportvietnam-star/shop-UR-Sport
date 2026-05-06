import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folder?: string;
  label?: string;
  externalPreview?: string;
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
  externalPreview
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

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh!');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn! Tối đa 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    uploadToCloudinary(file);
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
    setPreviewUrl(null);
    setProgress(0);
    setUploadError(null);
    setIsDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-3">
      {label && <label className="text-sm font-bold text-zinc-700">{label}</label>}

      <div
        onClick={openFilePicker}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center min-h-[180px]",
          previewUrl
            ? uploadError
              ? "border-red-400 bg-red-50/10"
              : isDone
              ? "border-green-400 bg-green-50/10"
              : "border-[#0082c8] bg-blue-50/10"
            : "border-zinc-200 hover:border-[#0082c8] hover:bg-zinc-50",
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
          <div className="relative w-full flex flex-col items-center gap-3">
            <img
              src={externalPreview || previewUrl!}
              alt="Preview"
              className="max-h-36 rounded-xl object-cover shadow-md"
            />

            {isUploading && (
              <div className="w-full space-y-2">
                <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0082c8] rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-[#0082c8]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-bold">{progress}%</span>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-bold text-center">{uploadError}</span>
              </div>
            )}

            {isDone && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-bold">Upload thành công!</span>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeImage(); }}
              className="absolute -top-2 -right-2 bg-white border border-zinc-200 p-1.5 rounded-full shadow hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="bg-zinc-100 p-4 rounded-full mb-3 group-hover:bg-blue-100 transition-colors">
              <Upload className="h-7 w-7 text-zinc-400 group-hover:text-[#0082c8] transition-colors" />
            </div>
            <p className="text-sm font-bold text-zinc-500 group-hover:text-zinc-700 text-center">
              Kéo thả hoặc click để chọn ảnh
            </p>
            <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WebP • Tối đa 10MB</p>
          </>
        )}
      </div>
    </div>
  );
};
