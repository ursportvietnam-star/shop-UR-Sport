import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import ReactQuill from 'react-quill-new';
import { toast } from 'sonner';
import 'react-quill-new/dist/quill.snow.css';
import { BlogPost } from '../types';

const CLOUDINARY_CLOUD_NAME = 'dcj4qhcfh';
const CLOUDINARY_UPLOAD_PRESET = 'ursport_uploads';

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

interface AddBlogPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  post?: BlogPost | null;
}

export const AddBlogPostModal: React.FC<AddBlogPostModalProps> = ({ isOpen, onClose, onSuccess, post }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Tin tức');
  const [author, setAuthor] = useState('UrSport Team');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const quillRef = useRef<any>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setSlug('');
      setCategory('Tin tức');
      setAuthor('UrSport Team');
      setExcerpt('');
      setContent('');
      setCoverImage('');
      setImageUrls([]);
      setVideoUrls([]);
      setUploadProgress(0);
      setUploading(false);
      return;
    }

    if (post) {
      setTitle(post.title || '');
      setSlug(post.slug || slugify(post.title || ''));
      setCategory(post.category || 'Tin tức');
      setAuthor(post.author || 'UrSport Team');
      setExcerpt(post.excerpt || '');
      setContent(post.content || '');
      setHtmlSource(post.content || '');
      setCoverImage(post.image || '');
      setImageUrls(post.images || []);
      setVideoUrls(post.videos || []);
    }
  }, [isOpen, post]);

  const uploadFile = async (file: File, resourceType: 'image' | 'video') => {
    setUploading(true);
    setUploadProgress(0);
    return new Promise<string>((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `blog/${resourceType}`);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } else {
          reject(new Error('Upload thất bại, kiểm tra cấu hình Cloudinary.'));
        }
      };
      xhr.onerror = () => {
        setUploading(false);
        reject(new Error('Lỗi tải lên. Vui lòng thử lại.'));
      };
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`);
      xhr.send(formData);
    });
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ cho ảnh đại diện.');
      return;
    }
    try {
      const url = await uploadFile(file, 'image');
      setCoverImage(url);
      toast.success('Ảnh đại diện đã được tải lên.');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi upload ảnh đại diện');
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (type === 'image' && !file.type.startsWith('image/')) {
          toast.error('Vui lòng chọn file ảnh hợp lệ.');
          continue;
        }
        if (type === 'video' && !file.type.startsWith('video/')) {
          toast.error('Vui lòng chọn file video hợp lệ.');
          continue;
        }
        const url = await uploadFile(file, type);
        urls.push(url);
        toast.success(`${type === 'image' ? 'Ảnh' : 'Video'} đã được tải lên.`);
      }
      if (type === 'image') {
        setImageUrls((prev) => [...prev, ...urls]);
      } else {
        setVideoUrls((prev) => [...prev, ...urls]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi upload file');
    }
  }; 

  const escapeHtmlAttr = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const syncEditorHtml = () => {
    const html = quillRef.current?.getEditor()?.root?.innerHTML;
    if (typeof html === 'string') {
      setContent(html);
    }
  };

  const handleImageInsert = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const toastId = toast.loading('Đang tải ảnh lên...');
      try {
        const url = await uploadFile(file, 'image');
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.clipboard.dangerouslyPasteHTML(
            range.index,
            `<p><img src="${escapeHtmlAttr(url)}" style="display:block;margin:2rem auto;max-width:100%;border-radius:12px;" /></p><p><br></p>`,
            'user'
          );
          quill.setSelection(range.index + 1);
          quill.update('user');
          syncEditorHtml();
        }
        toast.success('Đã chèn ảnh thành công', { id: toastId });
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi tải ảnh', { id: toastId });
      }
    };
  };

  const handleVideoInsert = async () => {
    const input = window.prompt('Nhập URL video hoặc mã iframe để chèn vào bài viết');
    if (!input) return;
    let videoUrl = input.trim();
    if (videoUrl.includes('<iframe')) {
      const srcMatch = videoUrl.match(/src="([^"]+)"/);
      if (srcMatch) videoUrl = srcMatch[1];
    }

    if (videoUrl.includes('youtube.com/watch?v=')) {
      const videoId = videoUrl.split('v=')[1]?.split('&')[0];
      if (videoId) videoUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes('youtu.be/')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0];
      if (videoId) videoUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes('vimeo.com/')) {
      const videoId = videoUrl.split('/').pop();
      if (videoId) videoUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'video', videoUrl, 'user');
    quill.setSelection(range.index + 1, 0, 'user');
    quill.update('user');
    syncEditorHtml();
    toast.success('Đã chèn video thành công!');
  };

  const handleVideoFileInsert = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const toastId = toast.loading('Đang tải video lên...');
      try {
        const url = await uploadFile(file, 'video');
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.clipboard.dangerouslyPasteHTML(
            range.index,
            `<p><video controls src="${escapeHtmlAttr(url)}" style="width:100%;border-radius:12px;" /></p><p><br></p>`,
            'user'
          );
          quill.setSelection(range.index + 1);
          quill.update('user');
          syncEditorHtml();
        }
        toast.success('Đã chèn video thành công', { id: toastId });
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi tải video', { id: toastId });
      }
    };
  };

  const toggleHtmlMode = () => {
    if (!isHtmlMode) {
      setHtmlSource(content);
    } else {
      setContent(htmlSource);
    }
    setIsHtmlMode((prev) => !prev);
  };

  const modules = React.useMemo(() => ({
    toolbar: {
      container: '#blog-quill-toolbar',
      handlers: {
        image: handleImageInsert,
        video: handleVideoInsert,
      },
    },
  }), [handleImageInsert, handleVideoInsert]);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      toast.error('Vui lòng điền đủ tiêu đề, mô tả ngắn và nội dung.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSlug = slug.trim() ? slugify(slug) : slugify(title);
      const postData: Omit<BlogPost, 'id'> = {
        title: title.trim(),
        slug: finalSlug,
        category,
        author,
        date: new Date().toLocaleDateString('vi-VN'),
        image: coverImage,
        excerpt: excerpt.trim(),
        content,
        images: imageUrls,
        videos: videoUrls,
        createdAt: serverTimestamp(),
      };

      if (post && post.id) {
        await updateDoc(doc(db, 'blogPosts', post.id), postData as any);
        toast.success('Bài viết đã được cập nhật.');
      } else {
        await addDoc(collection(db, 'blogPosts'), postData as any);
        toast.success('Bài viết mới đã được tạo.');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi lưu bài viết.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploading(false);
    }
  };

  const removeMediaItem = (index: number, type: 'image' | 'video') => {
    if (type === 'image') {
      setImageUrls((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setVideoUrls((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  const editorWrapRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto max-h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-black inline">{post ? 'Chỉnh sửa bài viết' : 'Thêm bài viết mới'}</h2>
            <p className="text-sm text-zinc-500 mt-1">Tạo bài viết Blog với ảnh và video lưu trữ.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || uploading}
              className="inline-flex items-center gap-2 rounded-full bg-[#10b981] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {isSubmitting ? 'Đang lưu...' : 'Lưu bài viết'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 transition hover:bg-zinc-50">
              Hủy
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form className="grid min-h-[calc(100vh-7rem)] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-8" onSubmit={handleSubmit}>
          <div className="space-y-6 overflow-y-auto pr-2">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Tiêu đề bài viết
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1e4b64]"
                  placeholder="Nhập tiêu đề"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Slug URL
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1e4b64]"
                  placeholder="ví dụ: huong-dan-chon-do-the-thao"
                />
              </label>
            </div>

            <div className="space-y-2 text-sm font-semibold text-zinc-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Nội dung bài viết</span>
                <button
                  type="button"
                  onClick={toggleHtmlMode}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition',
                    isHtmlMode
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-violet-400 hover:text-violet-600'
                  )}
                >
                  <span className="text-[11px]">{isHtmlMode ? 'SOẠN THẢO' : 'HTML'}</span>
                </button>
              </div>
              <div ref={editorWrapRef} className="w-full product-quill-editor relative rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                      .product-quill-editor .ql-toolbar { border: none !important; background: transparent; padding: 0; }
                      .product-quill-editor .ql-container { border: none !important; box-shadow: none !important; font-family: inherit; font-size: 16px; }
                      .product-quill-editor .ql-editor { padding: 0.75rem; min-height: 420px; line-height: 1.75; color: #3f3f46; }
                      .product-quill-editor .ql-editor p { margin-bottom: 1rem; }
                      .product-quill-editor .ql-editor h1 { font-size: 2em; font-weight: 900; margin-bottom: 1rem; color: #18181b; }
                      .product-quill-editor .ql-editor h2 { font-size: 1.5em; font-weight: 800; margin-bottom: 1rem; color: #18181b; }
                      .product-quill-editor .ql-editor h3 { font-size: 1.17em; font-weight: 700; margin-bottom: 1rem; color: #18181b; }
                      .product-quill-editor .ql-editor img { border-radius: 8px; margin: 2rem auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 100%; cursor: pointer; display: block; }
                      .product-quill-editor .ql-editor iframe { border-radius: 8px; margin: 2rem 0; width: 100%; aspect-ratio: 16/9; }
                      .product-quill-editor .ql-editor video { border-radius: 12px; margin: 2rem 0 2rem auto; max-width: 100%; width: min(100%, 720px); display: block; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
                      .product-quill-editor .ql-snow .ql-tooltip { z-index: 9999; }
                      .product-quill-editor .ql-toolbar button,
                      .product-quill-editor .ql-toolbar select {
                        border: none !important;
                        background: transparent !important;
                      }
                    `,
                  }}
                />
                <div className="border-b border-zinc-200 px-4 py-3 bg-white sticky top-0 z-10">
                  <div id="blog-quill-toolbar" className="flex flex-wrap items-center gap-2">
                    <span className="ql-formats">
                      <select className="ql-header" defaultValue="">
                        <option value="1">H1</option>
                        <option value="2">H2</option>
                        <option value="3">H3</option>
                        <option value="">Normal</option>
                      </select>
                    </span>
                    <span className="ql-formats">
                      <button className="ql-bold" />
                      <button className="ql-italic" />
                      <button className="ql-underline" />
                      <button className="ql-strike" />
                    </span>
                    <span className="ql-formats">
                      <button className="ql-list" value="ordered" />
                      <button className="ql-list" value="bullet" />
                    </span>
                    <span className="ql-formats">
                      <select className="ql-align" />
                    </span>
                    <span className="ql-formats">
                      <button className="ql-link" />
                      <button className="ql-image" />
                      <button className="ql-video" />
                    </span>
                    <span className="ql-formats">
                      <button
                        type="button"
                        onClick={handleVideoFileInsert}
                        title="Upload video"
                        className="!inline-flex !items-center !justify-center"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                    </span>
                    <span className="ql-formats">
                      <button className="ql-clean" />
                    </span>
                  </div>
                </div>
                {isHtmlMode ? (
                  <textarea
                    value={htmlSource}
                    onChange={(e) => setHtmlSource(e.target.value)}
                    className="w-full min-h-[420px] resize-none border-none bg-white p-4 text-sm leading-6 text-zinc-700 outline-none"
                  />
                ) : (
                  <ReactQuill
                    ref={quillRef}
                    value={content}
                    onChange={setContent}
                    theme="snow"
                    modules={modules}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 overflow-y-auto rounded-[32px] border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Cài đặt bài viết</p>
            </div>

            <label className="space-y-2 text-sm font-semibold text-zinc-700">
              Chuyên mục
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1e4b64]"
              >
                <option>Tin tức</option>
                <option>Xem nhiều</option>
                <option>Kinh nghiệm</option>
                <option>Sự kiện</option>
                <option>Khuyến mại</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-zinc-700">
              Tác giả
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1e4b64]"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold text-zinc-700">
              Mô tả ngắn
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="h-24 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1e4b64] resize-none"
              />
            </label>

            <div className="space-y-4">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Ảnh đại diện
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:border-0 file:bg-[#1e4b64] file:px-4 file:py-2 file:text-white file:font-semibold file:rounded-full"
                />
              </label>
              {coverImage && (
                <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white">
                  <img src={coverImage} alt="Cover" className="h-40 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-zinc-700 shadow"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-4">
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Ảnh bài viết
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleMediaUpload(e, 'image')}
                  className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:border-0 file:bg-[#1e4b64] file:px-4 file:py-2 file:text-white file:font-semibold file:rounded-full"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Video bài viết
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => handleMediaUpload(e, 'video')}
                  className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:border-0 file:bg-[#1e4b64] file:px-4 file:py-2 file:text-white file:font-semibold file:rounded-full"
                />
              </label>
            </div>

            {uploading && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                Đang tải lên... {uploadProgress}%
              </div>
            )}

            {imageUrls.length > 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-zinc-900">Ảnh đã tải lên</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative overflow-hidden rounded-3xl border border-white/70 bg-slate-50">
                      <img src={url} alt={`blog-image-${index}`} className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeMediaItem(index, 'image')}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-zinc-700 shadow"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videoUrls.length > 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-zinc-900">Video đã tải lên</p>
                </div>
                <div className="grid gap-3">
                  {videoUrls.map((url, index) => (
                    <div key={index} className="relative overflow-hidden rounded-3xl border border-white/70 bg-black">
                      <video controls src={url} className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeMediaItem(index, 'video')}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-zinc-700 shadow"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" className="w-full" disabled={isSubmitting || uploading}>
                <span className="flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" />
                  {post ? 'Cập nhật bài viết' : 'Lưu bài viết'}
                </span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
