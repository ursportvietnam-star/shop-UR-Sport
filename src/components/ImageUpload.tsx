import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folder?: string;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  folder = 'uploads',
  label = 'Tải ảnh lên'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File quá lớn! Tối đa 5MB.');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    uploadFile(file);
  };

  const uploadFile = (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setUploadError(null);
    setIsDone(false);

    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);

    try {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(p);
        },
        (error) => {
          console.error('Upload error:', error);
          let msg = 'Lỗi khi tải ảnh lên';
          if (error.code === 'storage/unauthorized') {
            msg = 'Không có quyền upload. Kiểm tra Firebase Storage Rules.';
          } else if (error.code === 'storage/canceled') {
            msg = 'Upload bị hủy.';
          } else if (error.code === 'storage/unknown') {
            msg = 'Lỗi kết nối. Vui lòng thử lại.';
          }
          setUploadError(msg);
          toast.error(msg);
          setIsUploading(false);
          setProgress(0);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onUploadComplete(downloadURL);
            setIsDone(true);
            setIsUploading(false);
            toast.success('Tải ảnh thành công!');
          } catch (err) {
            setUploadError('Không thể lấy URL ảnh. Thử lại.');
            toast.error('Không thể lấy URL ảnh.');
            setIsUploading(false);
          }
        }
      );
    } catch (err) {
      setUploadError('Không thể kết nối Firebase Storage.');
      toast.error('Không thể kết nối Firebase Storage.');
      setIsUploading(false);
    }
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
        onClick={() => !isUploading && fileInputRef.current?.click()}
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
          className="hidden"
          accept="image/*"
        />

        {previewUrl ? (
          <div className="relative w-full flex flex-col items-center gap-3">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-36 rounded-xl object-cover shadow-md"
            />

            {/* Progress bar */}
            {isUploading && (
              <div className="w-full space-y-2">
                <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0082c8] rounded-full transition-all duration-300"
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
                <span className="text-xs font-bold">{uploadError}</span>
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
            <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WebP • Tối đa 5MB</p>
          </>
        )}
      </div>
    </div>
  );
};
