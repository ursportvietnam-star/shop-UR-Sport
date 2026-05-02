import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { toast } from 'sonner';
import { Button } from './ui/button';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh!');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Firebase
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);

    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      },
      (error) => {
        console.error('Upload error:', error);
        toast.error('Lỗi khi tải ảnh lên: ' + error.message);
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onUploadComplete(downloadURL);
        setIsUploading(false);
        toast.success('Tải ảnh lên thành công!');
      }
    );
  };

  const removeImage = () => {
    setPreviewUrl(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-4">
      {label && <label className="text-sm font-bold text-zinc-700">{label}</label>}
      
      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 transition-all duration-300 flex flex-col items-center justify-center min-h-[200px]",
          previewUrl ? "border-[#0082c8] bg-blue-50/10" : "border-zinc-200 hover:border-[#0082c8] hover:bg-zinc-50",
          isUploading && "pointer-events-none opacity-70"
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
          <div className="relative w-full h-full flex flex-col items-center">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-h-48 rounded-2xl object-cover shadow-lg mb-4"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-[#0082c8] animate-spin" />
                <span className="text-sm font-bold text-[#0082c8]">{Math.round(progress)}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 font-bold">
                <CheckCircle2 className="h-5 w-5" />
                <span>Hoàn tất</span>
              </div>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              className="absolute -top-4 -right-4 bg-white border border-zinc-200 p-2 rounded-full shadow-md hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="bg-zinc-100 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
              <Upload className="h-8 w-8 text-zinc-400 group-hover:text-[#0082c8] transition-colors" />
            </div>
            <p className="text-sm font-bold text-zinc-500 group-hover:text-zinc-700">
              Kéo thả hoặc click để chọn ảnh
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              JPG, PNG, WebP (Tối đa 5MB)
            </p>
          </>
        )}
      </div>
    </div>
  );
};
