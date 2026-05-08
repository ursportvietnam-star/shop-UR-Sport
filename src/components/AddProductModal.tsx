import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Eye, Settings, Star, Check, AlignLeft, AlignCenter, AlignRight, Type, Code, TrendingUp, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { ImageUpload } from './ImageUpload';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CATEGORIES } from '../data';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// ── Custom Video Blot ──────────────────────────────────────────────────
const BlockEmbed = Quill.import('blots/block/embed') as any;
class VideoContainerBlot extends BlockEmbed {
  static blotName = 'videoContainer';
  static tagName = 'div';

  static create(value) {
    const node = super.create();
    node.setAttribute('class', 'video-container');
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', value);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    node.appendChild(iframe);
    return node;
  }
  static value(node) {
    const iframe = node.querySelector('iframe');
    return iframe ? iframe.getAttribute('src') : '';
  }
}
Quill.register(VideoContainerBlot as any);

class UploadedVideoBlot extends BlockEmbed {
  static blotName = 'uploadedVideo';
  static tagName = 'video';

  static create(value: string) {
    const node = super.create();
    node.setAttribute('src', value);
    node.setAttribute('controls', 'true');
    node.setAttribute('playsinline', 'true');
    node.setAttribute('preload', 'metadata');
    node.setAttribute('data-align', 'right');
    node.setAttribute('style', 'display:block;margin:2rem 0 2rem auto;max-width:100%;width:min(100%,720px);border-radius:12px;');
    return node;
  }

  static value(node: HTMLVideoElement) {
    return node.getAttribute('src') || '';
  }
}
Quill.register(UploadedVideoBlot as any);

// ── Custom Image to support inline styles ──
const Image = Quill.import('formats/image') as any;
class StyledImage extends Image {
  static formats(domNode) {
    const formats = super.formats(domNode);
    if (domNode.hasAttribute('style')) {
      formats.style = domNode.getAttribute('style');
    }
    return formats;
  }
  format(name, value) {
    if (name === 'style') {
      (this as any).domNode.setAttribute('style', value);
    } else {
      super.format(name, value);
    }
  }
}
Quill.register(StyledImage as any, true);

// ── Custom Caption Blot ──
const Block = Quill.import('blots/block') as any;
class CaptionBlot extends Block {
  static blotName = 'caption';
  static tagName = 'p';
  static className = 'image-caption';

  static create(value: any) {
    const node = super.create(value);
    node.setAttribute('data-caption', '1');
    node.setAttribute('class', 'image-caption');
    node.setAttribute('style', 'text-align:center;font-style:italic;font-size:0.75rem;color:#a1a1aa;margin-top:-1.25rem;margin-bottom:1.5rem;line-height:1.4;');
    return node;
  }
  static formats(domNode: HTMLElement) {
    return domNode.getAttribute('data-caption') === '1' ? true : undefined;
  }
}
Quill.register(CaptionBlot as any, true);
// ───────────────────────────────────────────────────────────────────────
import { Category, Product } from '../types';
import { cn } from '@/lib/utils';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

interface ImageToolbarState {
  el: HTMLImageElement;
  top: number;
  left: number;
  width: number;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSuccess, product }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quillRef = useRef<any>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [imageToolbar, setImageToolbar] = useState<ImageToolbarState | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; type: 'url' | 'file' | null }>({ isOpen: false, type: null });
  const [videoInput, setVideoInput] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');

  const escapeHtmlAttr = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const getImageAlignStyle = (align: 'left' | 'center' | 'right') => {
    if (align === 'left') return 'display:block;margin:2rem auto 2rem 0;max-width:100%;';
    if (align === 'right') return 'display:block;margin:2rem 0 2rem auto;max-width:100%;';
    return 'display:block;margin:2rem auto;max-width:100%;';
  };

  const syncEditorHtml = () => {
    const html = quillRef.current?.getEditor()?.root?.innerHTML;
    if (typeof html === 'string') {
      setFormData(prev => ({ ...prev, description: html }));
    }
  };

  const insertHtmlIntoEditor = (html: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection(true);
    quill.clipboard.dangerouslyPasteHTML(range.index, html, 'user');
    quill.setSelection(range.index + 1, 0, 'user');
    quill.update('user');
    syncEditorHtml();
  };

  // ── HTML Beautifier ────────────────────────────────────────────────────
  const beautifyHtml = (html: string): string => {
    const BLOCK = /^(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr|td|th|figure|figcaption|section|article|header|footer|main|nav|aside|img|video|iframe|br|hr)$/i;
    const INLINE = /^(a|span|strong|b|em|i|u|s|code|mark|small|sub|sup)$/i;
    let indent = 0;
    const pad = (n: number) => '  '.repeat(n);

    // Tokenize tags and text
    const tokens: string[] = [];
    const re = /(<[^>]+>)|([^<]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      if (m[1]) tokens.push(m[1]);
      else if (m[2].trim()) tokens.push(m[2].trim());
    }

    const lines: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const tagMatch = t.match(/^<(\/?)(\w+)([^>]*)>$/);
      if (!tagMatch) {
        // text node
        lines.push(pad(indent) + t);
        continue;
      }
      const isClose = tagMatch[1] === '/';
      const tag = tagMatch[2].toLowerCase();
      const attrs = tagMatch[3];
      const isSelf = /\/$/.test(attrs) || /^(img|br|hr|input|meta|link)$/.test(tag);

      if (isClose && BLOCK.test(tag)) {
        indent = Math.max(0, indent - 1);
        lines.push(pad(indent) + t);
      } else if (!isClose && BLOCK.test(tag)) {
        lines.push(pad(indent) + t);
        if (!isSelf) indent++;
      } else {
        // inline or unknown — try to keep with adjacent inline tokens
        lines.push(pad(indent) + t);
      }
    }

    return lines
      .filter(l => l.trim())
      .join('\n');
  };

  const toggleHtmlMode = () => {
    if (!isHtmlMode) {
      // Visual → HTML: snapshot current Quill HTML and beautify
      const current = quillRef.current?.getEditor()?.root?.innerHTML || formData.description;
      const pretty = beautifyHtml(current);
      setHtmlSource(pretty);
    } else {
      // HTML → Visual: push raw HTML back into form state
      setFormData(prev => ({...prev, description: htmlSource}));
    }
    setIsHtmlMode(v => !v);
    setImageToolbar(null);
  };
  
  const formatDisplayPrice = (val: string | number) => {
    if (!val) return '';
    return val.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parsePrice = (val: string) => {
    return val.replace(/\D/g, '');
  };

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    discountPrice: '',
    category: CATEGORIES[0],
    description: '',
    stock: '',
    sizes: '',
    sizeGuideUrl: '',
    slug: '',
    seoTitle: '',
    metaDescription: '',
    keywords: '',
    colorVariants: [] as {name: string, image: string}[],
    extraImages: [] as string[],
    coverImage: '',
    specifications: '',
    careInstructions: '',
    brand: '',
    origin: '',
    style: '',
    material: '',
    fashionStyle: '',
    collarType: ''
  });

  const lastLoadedProductId = useRef<string | null>(null);

  // Populate form when editing — uses product.id so it triggers correctly
  useEffect(() => {
    if (!isOpen) {
      lastLoadedProductId.current = null;
      return;
    }

    // Only load if it's a different product or first time opening
    const currentId = product?.id || 'new';
    if (lastLoadedProductId.current === currentId) return;
    lastLoadedProductId.current = currentId;

    if (product) {
      const colorVariants = product.colorImages?.length
        ? product.colorImages.map(ci => ({ name: ci.name, image: ci.image }))
        : (product.colors || []).map((c, i) => ({ name: c, image: product.images?.[i] || '' }));

      const extraImages = [...(product.images || [])];
      const coverImage = product.images?.[0] || colorVariants[0]?.image || '';

      setFormData({
        name: product.name || '',
        price: product.price?.toString() || '',
        discountPrice: product.discountPrice?.toString() || '',
        category: product.category || CATEGORIES[0],
        description: product.description || '',
        stock: product.stock?.toString() || '',
        sizes: product.sizes?.join(', ') || '',
        sizeGuideUrl: product.sizeGuideUrl || '',
        slug: product.slug || '',
        seoTitle: product.seoTitle || '',
        metaDescription: product.metaDescription || '',
        keywords: product.keywords || '',
        colorVariants,
        extraImages,
        coverImage,
        specifications: product.specifications || '',
        careInstructions: product.careInstructions || '',
        brand: product.brand || 'UR SPORT',
        origin: product.origin || 'Việt Nam',
        style: product.style || 'Slim Fit',
        material: product.material || 'Cotton Premium',
        fashionStyle: product.fashionStyle || 'Thể thao, Cơ bản',
        collarType: product.collarType || 'Cổ tròn',
      });
      setHtmlSource(product.description || '');
    } else {
      setFormData({
        name: '',
        price: '',
        discountPrice: '',
        category: CATEGORIES[0],
        description: '',
        stock: '',
        sizes: '',
        sizeGuideUrl: '',
        slug: '',
        seoTitle: '',
        metaDescription: '',
        keywords: '',
        colorVariants: [],
        extraImages: [],
        coverImage: '',
        specifications: '',
        careInstructions: '',
        brand: 'UR SPORT',
        origin: 'Việt Nam',
        style: 'Slim Fit',
        material: 'Cotton Premium',
        fashionStyle: 'Thể thao, Cơ bản',
        collarType: 'Cổ tròn',
      });
      setHtmlSource('');
    }
  }, [isOpen, product]);

  const modules = React.useMemo(() => ({
    toolbar: {
      container: '#quill-toolbar-container',
      handlers: {
        image: () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const toastId = toast.loading('Đang tải ảnh lên mô tả...');
            const uploadData = new FormData();
            uploadData.append('file', file);
            uploadData.append('upload_preset', 'ursport_uploads');
            uploadData.append('folder', 'product_descriptions');

            try {
              const res = await fetch(`https://api.cloudinary.com/v1_1/dcj4qhcfh/image/upload`, {
                method: 'POST',
                body: uploadData
              });
              const data = await res.json();
              
              const quill = quillRef.current?.getEditor();
              if (quill) {
                const range = quill.getSelection(true);
                quill.clipboard.dangerouslyPasteHTML(
                  range.index,
                  `<p><img src="${escapeHtmlAttr(data.secure_url)}" data-align="center" style="${getImageAlignStyle('center')}" /></p><p><br></p>`,
                  'user'
                );
                quill.setSelection(range.index + 1);
                quill.update('user');
                syncEditorHtml();
              }
              toast.success('Đã chèn ảnh thành công', { id: toastId });
            } catch (error) {
              toast.error('Lỗi khi tải ảnh', { id: toastId });
            }
          };
        },
        video: () => {
          setVideoModal({ isOpen: true, type: 'url' });
        }
      }
    }
  }), []);

  const handleInsertVideo = () => {
    if (!videoInput.trim()) return;
    
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection(true);

    // Phân tích nội dung nhập vào
    const input = videoInput.trim();
    let videoUrl = input;
    
    if (input.includes('<iframe')) {
      // Nếu là mã nhúng iframe, trích xuất src
      const srcMatch = input.match(/src="([^"]+)"/);
      if (srcMatch) videoUrl = srcMatch[1];
    }
    
    // Chuẩn hóa link YouTube sang link embed
    if (videoUrl.includes('youtube.com/watch?v=')) {
      const videoId = videoUrl.split('v=')[1]?.split('&')[0];
      videoUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes('youtu.be/')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0];
      videoUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes('vimeo.com/')) {
      const videoId = videoUrl.split('/').pop();
      videoUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    // Chèn bằng custom blot của chúng ta
    quill.insertEmbed(range.index, 'videoContainer', videoUrl, 'user');
    quill.setSelection(range.index + 1, 0, 'user');
    quill.update('user');
    syncEditorHtml();

    setVideoInput('');
    setVideoModal({ isOpen: false, type: null });
    toast.success('Đã chèn video thành công!');
  };

  const handleVideoFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Vui lòng chọn file video');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video quá lớn. Vui lòng chọn file dưới 100MB.');
      return;
    }

    setIsUploadingVideo(true);
    const toastId = toast.loading('Đang tải video lên mô tả...');

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('upload_preset', 'ursport_uploads');
      uploadData.append('folder', 'product_description_videos');

      const res = await fetch('https://api.cloudinary.com/v1_1/dcj4qhcfh/video/upload', {
        method: 'POST',
        body: uploadData
      });

      if (!res.ok) throw new Error('Upload video thất bại');
      const data = await res.json();
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'uploadedVideo', data.secure_url, 'user');
        quill.setSelection(range.index + 1, 0, 'user');
        quill.update('user');
        syncEditorHtml();
      }
      setVideoModal({ isOpen: false, type: null });
      toast.success('Đã tải và chèn video vào mô tả', { id: toastId });
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error('Lỗi khi tải video', { id: toastId });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.price || formData.colorVariants.length === 0) {
      toast.error('Vui lòng điền thông tin và thêm ít nhất 1 màu sắc!');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedSizes = formData.sizes.split(',').map(c => c.trim()).filter(Boolean);
      const validVariants = formData.colorVariants.filter(v => v.name.trim() !== '');
      
      // Only use extraImages for the main gallery, don't auto-include all variant images
      let allImages = [...formData.extraImages].filter(Boolean);

      // Ensure coverImage is first
      if (formData.coverImage) {
        allImages = [formData.coverImage, ...allImages.filter(img => img !== formData.coverImage)];
      } else if (allImages.length === 0 && validVariants.length > 0) {
        // Fallback to variant images only if no extra images are provided
        allImages = validVariants.map(v => v.image).filter(Boolean);
      }
      
      // Make unique
      allImages = Array.from(new Set(allImages));
      
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        colors: validVariants.map(v => v.name.trim()),
        colorImages: validVariants.map(v => ({ name: v.name.trim(), image: v.image })),
        images: allImages,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
        stock: Number(formData.stock),
        sizes: parsedSizes.length > 0 ? parsedSizes : ['S', 'M', 'L', 'XL'],
        sizeGuideUrl: formData.sizeGuideUrl,
        slug: formData.slug.trim() || formData.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, ''),
        seoTitle: formData.seoTitle,
        metaDescription: formData.metaDescription,
        keywords: formData.keywords,
        specifications: formData.specifications,
        careInstructions: formData.careInstructions,
        brand: formData.brand,
        origin: formData.origin,
        style: formData.style,
        material: formData.material,
        fashionStyle: formData.fashionStyle,
        collarType: formData.collarType
      };

      if (product && product.id) {
        await updateDoc(doc(db, 'products', product.id), payload);
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: serverTimestamp(),
          rating: 0,
          reviewsCount: 0,
        });
        toast.success('Thêm sản phẩm thành công!');
      }

      onSuccess();
      onClose();
      
      // Reset form ONLY for new product additions
      if (!product) {
        setFormData({
          name: '',
          price: '',
          discountPrice: '',
          category: CATEGORIES[0],
          description: '',
          stock: '',
          sizes: '',
          sizeGuideUrl: '',
          slug: '',
          seoTitle: '',
          metaDescription: '',
          keywords: '',
          colorVariants: [],
          extraImages: [],
          coverImage: '',
          specifications: '',
          careInstructions: '',
          brand: 'UR SPORT',
          origin: 'Việt Nam',
          style: 'Slim Fit',
          material: 'Cotton Premium',
          fashionStyle: 'Thể thao, Cơ bản',
          collarType: 'Cổ tròn',
        });
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Lỗi khi lưu sản phẩm');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Image click handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const editorEl = quill.root as HTMLElement;

      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
          const img = target as HTMLImageElement;
          selectedImgRef.current = img;
          const wrapRect = editorWrapRef.current?.getBoundingClientRect();
          const imgRect = img.getBoundingClientRect();
          if (!wrapRect) return;
          setImageToolbar({
            el: img,
            top: imgRect.top - wrapRect.top - 44,
            left: imgRect.left - wrapRect.left,
            width: imgRect.width,
          });
          // Check existing caption sibling
          const next = img.closest('p')?.nextElementSibling;
          if (next?.getAttribute('data-caption') === '1') {
            setCaptionDraft(next.textContent || '');
            setShowCaption(true);
          } else {
            setCaptionDraft('');
            setShowCaption(false);
          }
        } else if (!(target as HTMLElement).closest('.img-float-toolbar')) {
          setImageToolbar(null);
          setShowCaption(false);
        }
      };

      editorEl.addEventListener('click', handleClick);
      return () => editorEl.removeEventListener('click', handleClick);
    }, 400);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const applyImageAlign = (align: 'left' | 'center' | 'right') => {
    const img = selectedImgRef.current;
    if (!img) return;
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    img.setAttribute('data-align', align);
    img.setAttribute('style', getImageAlignStyle(align));
    const caption = img.closest('p')?.nextElementSibling as HTMLElement | null;
    if (caption?.getAttribute('data-caption') === '1') {
      caption.style.textAlign = 'center';
    }
    quill.update('user');
    syncEditorHtml();
    // Update toolbar position as centering might move the image
    setTimeout(() => {
      if (selectedImgRef.current && editorWrapRef.current) {
        const wrapRect = editorWrapRef.current.getBoundingClientRect();
        const imgRect = selectedImgRef.current.getBoundingClientRect();
        setImageToolbar(prev => prev ? {
          ...prev,
          top: imgRect.top - wrapRect.top - 44,
          left: imgRect.left - wrapRect.left
        } : null);
      }
    }, 50);
  };

  const handleDeleteImage = () => {
    const img = selectedImgRef.current;
    if (!img) return;
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const blot = Quill.find(img);
      if (blot) {
        (blot as any).remove();
        quill.update('user');
        setImageToolbar(null);
        selectedImgRef.current = null;
        toast.success('Đã xóa ảnh');
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if an image is selected AND we are NOT typing in a caption/input
      if (selectedImgRef.current && !['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''))) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteImage();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const applyCaption = () => {
    const img = selectedImgRef.current;
    if (!img) return;
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const pEl = img.closest('p');
    if (!pEl) return;
    // Remove existing caption sibling
    const next = pEl.nextElementSibling;
    if (next?.getAttribute('data-caption') === '1') next.remove();
    if (captionDraft.trim()) {
      const caption = document.createElement('p');
      caption.setAttribute('data-caption', '1');
      caption.setAttribute('class', 'image-caption');
      caption.style.cssText = 'text-align:center;font-style:italic;font-size:0.75rem;color:#a1a1aa;margin-top:-1.25rem;margin-bottom:1.5rem;line-height:1.4;';
      caption.textContent = captionDraft.trim();
      pEl.insertAdjacentElement('afterend', caption);
    }
    quill.update('user');
    syncEditorHtml();
    setShowCaption(false);
    setImageToolbar(null);
    toast.success('Đã áp dụng ghi chú ảnh');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed inset-0 bg-[#f0f2f5] z-[100] flex flex-col h-screen w-screen overflow-hidden"
        >
          {/* Header */}
          <header className="h-[60px] bg-white border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-[17px] font-bold text-zinc-900">{product ? 'Chỉnh sửa' : 'Thêm mới'}</h2>
                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[11px] font-bold rounded">Bản nháp</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors hidden sm:block">
                <Eye className="h-5 w-5 text-zinc-600" />
              </button>
              <Button 
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6 h-9 rounded-md flex items-center gap-2 shadow-sm transition-colors"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Left Editor Column */}
            <div className="flex-1 overflow-y-auto bg-white border-r border-zinc-200">
              <div className="max-w-[800px] mx-auto p-6 md:p-10 space-y-8">
                {/* Product Name Input */}
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Thêm tiêu đề..."
                  className="w-full text-4xl font-black text-zinc-900 bg-transparent border-none outline-none placeholder:text-zinc-300 placeholder:font-black"
                />
                
                {/* Rich Text Editor */}
                <div ref={editorWrapRef} className="w-full product-quill-editor relative">
                  <style dangerouslySetInnerHTML={{__html: `
                    .product-quill-editor .ql-container {
                      font-family: inherit;
                      font-size: 16px;
                      border: none !important;
                    }
                    .product-quill-editor .ql-toolbar {
                      border: none !important;
                      background: transparent;
                      padding: 12px 0;
                    }
                    .product-quill-editor .ql-editor {
                      padding: 0;
                      min-height: 400px;
                      line-height: 1.7;
                      color: #3f3f46;
                    }
                    .product-quill-editor .ql-editor p { margin-bottom: 1rem; }
                    .product-quill-editor .ql-editor h1 { font-size: 2em; font-weight: 900; margin-bottom: 1rem; color: #18181b; }
                    .product-quill-editor .ql-editor h2 { font-size: 1.5em; font-weight: 800; margin-bottom: 1rem; color: #18181b; }
                    .product-quill-editor .ql-editor h3 { font-size: 1.17em; font-weight: 700; margin-bottom: 1rem; color: #18181b; }
                    .product-quill-editor .ql-editor img { border-radius: 8px; margin: 2rem auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 100%; cursor: pointer; transition: outline 0.15s; display: block; }
                    .product-quill-editor .ql-editor img[data-align="left"] { margin-left: 0 !important; margin-right: auto !important; }
                    .product-quill-editor .ql-editor img[data-align="center"] { margin-left: auto !important; margin-right: auto !important; }
                    .product-quill-editor .ql-editor img[data-align="right"] { margin-left: auto !important; margin-right: 0 !important; }
                    .product-quill-editor .ql-editor img:hover { outline: 2px solid #3b82f6; outline-offset: 2px; }
                    .product-quill-editor .ql-editor p[data-caption="1"],
                    .product-quill-editor .ql-editor p.image-caption,
                    .product-quill-editor .ql-editor p:has(img) + p,
                    .product-quill-editor .ql-editor p[style*="font-style:italic"][style*="font-size:0.8em"],
                    .product-quill-editor .ql-editor p[style*="font-style: italic"][style*="font-size: 0.8em"] {
                      color: #a1a1aa !important;
                      font-size: 0.75rem !important;
                      font-style: italic !important;
                      text-align: center !important;
                      margin-top: -1.25rem !important;
                      margin-bottom: 1.5rem !important;
                      line-height: 1.4 !important;
                      width: 100% !important;
                    }
                    .product-quill-editor .ql-editor iframe { border-radius: 8px; margin: 2rem 0; width: 100%; aspect-ratio: 16/9; }
                    .product-quill-editor .ql-editor video { border-radius: 12px; margin: 2rem 0 2rem auto; max-width: 100%; width: min(100%, 720px); display: block; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
                    .product-quill-editor .ql-snow .ql-tooltip { z-index: 9999; }
                    
                    /* Nhúng video YouTube responsive */
                    .video-container {
                      overflow: hidden;
                      position: relative;
                      width: 100%;
                      margin: 2rem 0;
                      border-radius: 12px;
                      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    }
                    .video-container::after {
                      padding-top: 56.25%;
                      display: block;
                      content: '';
                    }
                    .video-container iframe {
                      position: absolute;
                      top: 0;
                      left: 0;
                      width: 100%;
                      height: 100%;
                      border: none;
                    }
                  `}} />

                  {/* Sticky Toolbar Area */}
                  <div className="sticky top-0 bg-white z-20 border-b border-zinc-100 flex items-center justify-between px-4 py-1">
                    <div className="flex-1 flex items-center flex-wrap gap-y-1" id="quill-toolbar-container">
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
                        <button className="ql-blockquote" />
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
                          onClick={() => setVideoModal({ isOpen: true, type: 'file' })}
                          title="Upload video"
                          className="!inline-flex !items-center !justify-center"
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </button>
                      </span>
                      <span className="ql-formats">
                        <button className="ql-clean" />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleHtmlMode}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border shrink-0 ml-4',
                        isHtmlMode
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-violet-400 hover:text-violet-600'
                      )}
                    >
                      <Code className="h-3.5 w-3.5" />
                      {isHtmlMode ? 'SOẠN THẢO' : 'HTML'}
                    </button>
                  </div>

                  {isHtmlMode ? (
                    /* ── HTML SOURCE EDITOR ── */
                    <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
                      {/* Header bar */}
                      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] select-none">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/70" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                            <div className="w-3 h-3 rounded-full bg-green-500/70" />
                          </div>
                          <span className="text-white/30 text-[11px] font-mono ml-2">description.html</span>
                        </div>
                        <span className="text-white/20 text-[10px] font-mono">
                          {htmlSource.split('\n').length} dòng
                        </span>
                      </div>

                      {/* Editor with line numbers */}
                      <div className="relative flex bg-[#1e1e2e]">
                        {/* Line numbers */}
                        <div className="select-none text-right pr-4 pl-3 pt-4 pb-4 text-[12px] font-mono text-[#4b5563] leading-6 bg-[#161622] border-r border-white/5 min-w-[3rem]">
                          {htmlSource.split('\n').map((_, i) => (
                            <div key={i}>{i + 1}</div>
                          ))}
                        </div>

                        {/* Textarea */}
                        <textarea
                          value={htmlSource}
                          onChange={e => setHtmlSource(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              const s = e.currentTarget.selectionStart;
                              const end = e.currentTarget.selectionEnd;
                              const v = htmlSource;
                              setHtmlSource(v.substring(0, s) + '  ' + v.substring(end));
                              setTimeout(() => e.currentTarget.setSelectionRange(s + 2, s + 2), 0);
                            }
                            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                              e.preventDefault();
                              setHtmlSource(beautifyHtml(htmlSource));
                            }
                          }}
                          spellCheck={false}
                          className="flex-1 bg-transparent pl-4 pr-6 pt-4 pb-4 text-[13px] font-mono text-[#a9b1d6] leading-6 resize-none outline-none min-h-[400px] w-full"
                          style={{ caretColor: '#7aa2f7' }}
                        />
                      </div>

                      {/* Status bar */}
                      <div className="flex items-center justify-between px-4 py-2 bg-[#161622] border-t border-white/5">
                        <p className="text-[#4b5563] text-[11px] font-mono">
                          {htmlSource.length} ký tự &nbsp;•&nbsp; {htmlSource.split('\n').length} dòng
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setHtmlSource(beautifyHtml(htmlSource))}
                            className="text-[#7aa2f7] text-[11px] font-mono hover:text-[#bb9af7] transition-colors"
                          >
                            Format &nbsp;(Ctrl+B)
                          </button>
                          <button
                            type="button"
                            onClick={toggleHtmlMode}
                            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            ← Áp dụng vào Visual
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ── FLOATING IMAGE TOOLBAR ── */}
                      {imageToolbar && (
                        <div
                          className="img-float-toolbar absolute z-50 flex items-center gap-0.5 bg-zinc-900 text-white rounded-lg shadow-2xl px-1 py-1"
                          style={{ top: imageToolbar.top, left: imageToolbar.left }}
                        >
                          <button type="button" onClick={() => applyImageAlign('left')}
                            className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Căn trái">
                            <AlignLeft className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => applyImageAlign('center')}
                            className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Căn giữa">
                            <AlignCenter className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => applyImageAlign('right')}
                            className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Căn phải">
                            <AlignRight className="h-3.5 w-3.5" />
                          </button>
                          <div className="w-px h-4 bg-white/20 mx-1" />
                          <button type="button" onClick={() => setShowCaption(v => !v)}
                            className={cn("p-1.5 rounded transition-colors text-[11px] font-bold flex items-center gap-1",
                              showCaption ? "bg-blue-500" : "hover:bg-white/10")}
                            title="Ghi chú ảnh">
                            <Type className="h-3.5 w-3.5" />
                            <span>Caption</span>
                          </button>
                          <div className="w-px h-4 bg-white/20 mx-1" />
                          <button type="button" onClick={handleDeleteImage}
                            className="p-1.5 hover:bg-red-500 rounded transition-colors text-white" title="Xóa ảnh">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {showCaption && (
                            <>
                              <input
                                autoFocus
                                type="text"
                                value={captionDraft}
                                onChange={e => setCaptionDraft(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyCaption()}
                                placeholder="Nhập ghi chú..."
                                className="bg-white/10 rounded px-2 py-1 text-[12px] font-medium placeholder:text-white/40 outline-none border border-white/20 focus:border-blue-400 w-40 ml-1"
                              />
                              <button type="button" onClick={applyCaption}
                                className="px-2 py-1 bg-blue-500 hover:bg-blue-400 rounded text-[11px] font-bold transition-colors ml-0.5">
                                Áp dụng
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* ── QUILL VISUAL EDITOR ── */}
                      <ReactQuill
                        key={product?.id || 'new'}
                        ref={quillRef}
                        theme="snow"
                        value={formData.description}
                        onChange={(content) => setFormData(prev => ({...prev, description: content}))}
                        modules={modules}
                        placeholder="Bắt đầu viết mô tả sản phẩm..."
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar Column */}
            <div className="w-full md:w-[420px] bg-[#f8f9fa] flex flex-col overflow-y-auto shrink-0 border-l border-zinc-200">
              <div className="p-4 border-b border-zinc-200 flex items-center gap-2 bg-white sticky top-0 z-10">
                <Settings className="h-4 w-4 text-zinc-600" />
                <span className="font-bold text-[13px] text-zinc-900 uppercase">Cài đặt</span>
              </div>
              
              <div className="p-5 space-y-8">
                {/* Danh mục */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Danh mục</h3>
                  <div className="space-y-2">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-3 cursor-pointer group py-1">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="radio" 
                            name="category"
                            value={cat}
                            checked={formData.category === cat}
                            onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                            className="peer appearance-none w-[18px] h-[18px] border-[1.5px] border-zinc-300 rounded-full checked:border-[#10b981] transition-colors cursor-pointer"
                          />
                          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#10b981] scale-0 peer-checked:scale-100 transition-transform pointer-events-none" />
                        </div>
                        <span className={cn(
                          "text-[14px] transition-colors",
                          formData.category === cat ? "text-[#10b981] font-bold" : "text-zinc-600 font-medium group-hover:text-zinc-900"
                        )}>
                          {cat}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Giá & Kho */}
                <div className="space-y-4 pt-6 border-t border-zinc-200">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Giá bán & Tồn kho</h3>
                  <div className="space-y-4">
                    <div className="bg-white p-1 rounded-md border border-zinc-200 focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981] transition-all relative">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-2 pt-1 block">Giá niêm yết (₫)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={formatDisplayPrice(formData.price)}
                        onChange={(e) => setFormData({...formData, price: parsePrice(e.target.value)})}
                        className="w-full h-8 px-2 text-[15px] font-bold text-zinc-900 bg-transparent outline-none"
                        placeholder="Giá gốc chưa giảm..."
                      />
                      {formData.price && (
                        <div className="absolute right-3 bottom-2 text-[10px] font-bold text-zinc-300 pointer-events-none">
                          {Number(formData.price).toLocaleString('vi-VN')}₫
                        </div>
                      )}
                    </div>
                    <div className="bg-white p-1 rounded-md border border-zinc-200 focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981] transition-all relative">
                      <label className="text-[10px] font-bold text-[#10b981] uppercase px-2 pt-1 block">Giá khuyến mãi (₫)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={formatDisplayPrice(formData.discountPrice)}
                        onChange={(e) => setFormData({...formData, discountPrice: parsePrice(e.target.value)})}
                        className="w-full h-8 px-2 text-[15px] font-bold text-[#10b981] bg-transparent outline-none"
                        placeholder="Để trống nếu không giảm giá"
                      />
                      {formData.discountPrice && (
                        <div className="absolute right-3 bottom-2 text-[10px] font-bold text-[#10b981]/30 pointer-events-none">
                          {Number(formData.discountPrice).toLocaleString('vi-VN')}₫
                        </div>
                      )}
                    </div>
                    <div className="bg-white p-1 rounded-md border border-zinc-200 focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981] transition-all">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-2 pt-1 block">Tồn kho</label>
                      <input 
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: e.target.value})}
                        className="w-full h-8 px-2 text-[15px] font-bold text-zinc-900 bg-transparent outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Phân loại màu sắc */}
                <div className="space-y-4 pt-6 border-t border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Phân loại màu sắc</h3>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, colorVariants: [...formData.colorVariants, {name: '', image: ''}]})}
                      className="text-[11px] font-bold text-[#10b981] hover:text-[#0d9488]"
                    >
                      + THÊM MÀU
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.colorVariants.map((variant, index) => (
                      <div key={index} className="bg-white border border-zinc-200 rounded-lg p-2 flex gap-3">
                        <div 
                          className={cn(
                            "w-16 h-16 shrink-0 bg-zinc-50 rounded-md border overflow-hidden relative group cursor-pointer",
                            formData.coverImage === variant.image ? "border-2 border-blue-500" : "border-zinc-200"
                          )}
                          onClick={() => variant.image && setFormData({...formData, coverImage: variant.image})}
                        >
                          {variant.image ? (
                            <>
                              <img src={variant.image} alt="" className="w-full h-full object-cover" />
                              {formData.coverImage === variant.image && (
                                <div className="absolute top-1 left-1 bg-blue-500 rounded-full p-0.5 z-10 shadow-sm">
                                  <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newVariants = [...formData.colorVariants];
                                    newVariants[index].image = '';
                                    setFormData({
                                      ...formData, 
                                      colorVariants: newVariants,
                                      coverImage: formData.coverImage === variant.image ? '' : formData.coverImage
                                    });
                                  }}
                                  className="text-white hover:text-red-500 transition-colors bg-white/20 p-1.5 rounded-full"
                                  title="Xóa ảnh"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <ImageUpload 
                              onUploadComplete={(url) => {
                                setFormData(prev => {
                                  const newVariants = [...prev.colorVariants];
                                  newVariants[index].image = url;
                                  return {
                                    ...prev, 
                                    colorVariants: newVariants,
                                    coverImage: prev.coverImage || url
                                  };
                                });
                              }}
                              folder="products"
                              label="Ảnh"
                            />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <input 
                            type="text"
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...formData.colorVariants];
                              newVariants[index].name = e.target.value;
                              setFormData({...formData, colorVariants: newVariants});
                            }}
                            className="w-full text-[13px] font-bold text-zinc-900 bg-transparent border-b border-zinc-200 focus:border-[#10b981] outline-none py-1 mb-1 transition-colors uppercase placeholder:normal-case placeholder:font-normal"
                            placeholder="Tên màu (VD: Đen)"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newVariants = [...formData.colorVariants];
                              newVariants.splice(index, 1);
                              setFormData({...formData, colorVariants: newVariants});
                            }}
                            className="text-[10px] text-red-500 font-bold self-end mt-1 hover:underline uppercase"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                    {formData.colorVariants.length === 0 && (
                      <p className="text-[12px] text-zinc-400 italic text-center py-2">Chưa có phân loại màu sắc</p>
                    )}
                  </div>
                </div>

                {/* Kích cỡ */}
                <div className="space-y-4 pt-6 border-t border-zinc-200">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Kích cỡ</h3>
                  <div className="bg-white p-1 rounded-md border border-zinc-200 focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981] transition-all">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase px-2 pt-1 block">Kích cỡ (cách nhau dấu phẩy)</label>
                    <input 
                      type="text"
                      value={formData.sizes}
                      onChange={(e) => setFormData({...formData, sizes: e.target.value})}
                      className="w-full h-8 px-2 text-[14px] font-medium text-zinc-900 bg-transparent outline-none"
                      placeholder="S, M, L, XL..."
                    />
                  </div>
                </div>

                {/* Hình ảnh bổ sung */}
                <div className="space-y-4 pt-6 border-t border-zinc-200">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Hình ảnh bổ sung</h3>
                  <div className="bg-white rounded-xl border border-zinc-200 p-1">
                    <div className="h-[120px]">
                      <ImageUpload 
                        onUploadComplete={(url) => setFormData(prev => ({
                          ...prev, 
                          extraImages: [...prev.extraImages, url],
                          coverImage: prev.coverImage || url
                        }))}
                        folder="products"
                        label="Tải ảnh lên"
                        externalPreview={formData.coverImage || undefined}
                      />
                    </div>
                  </div>
                  {formData.extraImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {formData.extraImages.map((url, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "relative w-16 h-16 rounded-md overflow-hidden border group shadow-sm bg-white cursor-pointer",
                            formData.coverImage === url ? "border-2 border-blue-500" : "border-zinc-200"
                          )}
                          onClick={() => setFormData({...formData, coverImage: url})}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {formData.coverImage === url && (
                            <div className="absolute top-1 left-1 bg-blue-500 rounded-full p-0.5 z-10 shadow-sm">
                              <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({
                                  ...formData, 
                                  extraImages: formData.extraImages.filter((_, idx) => idx !== i),
                                  coverImage: formData.coverImage === url ? '' : formData.coverImage
                                });
                              }}
                              className="text-white hover:text-red-500 transition-colors bg-white/20 p-1.5 rounded-full"
                              title="Xóa ảnh"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bảng Size */}
                <div className="space-y-4 pt-6 border-t border-zinc-200">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Bảng size</h3>
                  <div className="bg-white rounded-xl border border-zinc-200 p-1">
                    <div className="h-[120px]">
                      <ImageUpload 
                        onUploadComplete={(url) => setFormData(prev => ({...prev, sizeGuideUrl: url}))}
                        folder="products"
                        label="Tải ảnh bảng size"
                        externalPreview={formData.sizeGuideUrl || undefined}
                      />
                    </div>
                  </div>
                  {formData.sizeGuideUrl && (
                    <div className="relative w-full h-32 rounded-md overflow-hidden border border-zinc-200 group shadow-sm bg-white mt-3">
                      <img src={formData.sizeGuideUrl} alt="Size Guide" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, sizeGuideUrl: ''})}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Chi tiết sản phẩm */}
                <div className="space-y-6 pt-6 border-t border-zinc-200">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Chi tiết sản phẩm</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Thương hiệu</label>
                      <input 
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({...formData, brand: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#0082c8]"
                        placeholder="UR SPORT"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Xuất xứ</label>
                      <input 
                        type="text"
                        value={formData.origin}
                        onChange={(e) => setFormData({...formData, origin: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#0082c8]"
                        placeholder="Việt Nam"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Kiểu dáng</label>
                      <input 
                        type="text"
                        value={formData.style}
                        onChange={(e) => setFormData({...formData, style: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#0082c8]"
                        placeholder="Slim Fit"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Chất liệu</label>
                      <input 
                        type="text"
                        value={formData.material}
                        onChange={(e) => setFormData({...formData, material: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#0082c8]"
                        placeholder="Cotton Premium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Phong cách</label>
                      <input 
                        type="text"
                        value={formData.fashionStyle || ''}
                        onChange={(e) => setFormData({...formData, fashionStyle: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#0082c8]"
                        placeholder="Thể thao, Cơ bản, Hàn Quốc"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Cổ áo</label>
                      <input 
                        type="text"
                        value={formData.collarType || ''}
                        onChange={(e) => setFormData({...formData, collarType: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#0082c8]"
                        placeholder="Cổ tròn"
                      />
                    </div>
                  </div>
                </div>
                
                {/* SEO Settings */}
                <div className="space-y-6 pt-8 border-t border-zinc-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-[#0082c8]" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Cấu hình SEO</h3>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Tối ưu hóa tìm kiếm trên Google và mạng xã hội</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700 flex items-center justify-between">
                        Đường dẫn sản phẩm (Slug)
                        <span className="text-[10px] font-normal text-zinc-400">Ví dụ: ao-thun-dep-ca-tinh</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 text-xs font-medium">
                          ursport.vn/
                        </div>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({...prev, slug: e.target.value}))}
                          placeholder="mac-dinh-theo-ten"
                          className="w-full pl-[74px] pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0082c8]/20 focus:border-[#0082c8] transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">SEO Title</label>
                      <input
                        type="text"
                        value={formData.seoTitle}
                        onChange={(e) => setFormData(prev => ({...prev, seoTitle: e.target.value}))}
                        placeholder="Tiêu đề hiển thị trên Google (Mặc định là tên sản phẩm)"
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0082c8]/20 focus:border-[#0082c8] transition-all"
                      />
                      <div className="flex justify-between px-1">
                         <p className="text-[10px] text-zinc-400">Đề xuất: 50-60 ký tự</p>
                         <p className={cn("text-[10px] font-bold", formData.seoTitle.length > 60 ? "text-red-500" : "text-zinc-400")}>
                            {formData.seoTitle.length}/60
                         </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Meta Description</label>
                      <textarea
                        rows={3}
                        value={formData.metaDescription}
                        onChange={(e) => setFormData(prev => ({...prev, metaDescription: e.target.value}))}
                        placeholder="Mô tả ngắn hiển thị trên Google..."
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0082c8]/20 focus:border-[#0082c8] transition-all resize-none"
                      />
                      <div className="flex justify-between px-1">
                         <p className="text-[10px] text-zinc-400">Đề xuất: 150-160 ký tự</p>
                         <p className={cn("text-[10px] font-bold", formData.metaDescription.length > 160 ? "text-red-500" : "text-zinc-400")}>
                            {formData.metaDescription.length}/160
                         </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Từ khóa (Keywords)</label>
                      <input
                        type="text"
                        value={formData.keywords}
                        onChange={(e) => setFormData(prev => ({...prev, keywords: e.target.value}))}
                        placeholder="ao thun nam, ao the thao, ursport..."
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0082c8]/20 focus:border-[#0082c8] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Video Selection Modal */}
          {videoModal.isOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
              >
                <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Thêm Video</h3>
                    <p className="text-sm text-zinc-500 font-medium mt-1">Dán link video hoặc upload file từ máy</p>
                  </div>
                  <button onClick={() => setVideoModal({ isOpen: false, type: null })} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1">
                    <button
                      type="button"
                      onClick={() => setVideoModal({ isOpen: true, type: 'url' })}
                      className={cn(
                        "h-11 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all",
                        videoModal.type !== 'file' ? "bg-white text-[#0082c8] shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                      )}
                    >
                      <LinkIcon className="h-4 w-4" />
                      Link / iframe
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoModal({ isOpen: true, type: 'file' })}
                      className={cn(
                        "h-11 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all",
                        videoModal.type === 'file' ? "bg-white text-[#0082c8] shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                      )}
                    >
                      <Upload className="h-4 w-4" />
                      Upload video
                    </button>
                  </div>

                  {videoModal.type === 'file' ? (
                    <div className="space-y-3">
                      <label className="text-[12px] font-black uppercase tracking-widest text-zinc-400">File video</label>
                      <label className={cn(
                        "flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-6 text-center transition-all hover:border-[#0082c8] hover:bg-blue-50/40",
                        isUploadingVideo && "pointer-events-none opacity-60"
                      )}>
                        <Upload className="h-8 w-8 text-[#0082c8] mb-3" />
                        <span className="text-sm font-black text-zinc-900">Chọn video để upload</span>
                        <span className="mt-1 text-xs font-medium text-zinc-500">MP4/WebM/MOV, tối đa 100MB. Video sẽ được canh phải trong mô tả.</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          disabled={isUploadingVideo}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoFileUpload(file);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[12px] font-black uppercase tracking-widest text-zinc-400">Nội dung video</label>
                      <textarea
                        value={videoInput}
                        onChange={(e) => setVideoInput(e.target.value)}
                        placeholder="Dán link YouTube/Vimeo hoặc mã nhúng <iframe> tại đây..."
                        className="w-full min-h-[150px] p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-medium focus:border-blue-500 focus:bg-white outline-none transition-all resize-none"
                      />
                      <div className="bg-blue-50 p-4 rounded-xl">
                        <p className="text-[11px] text-blue-600 font-bold leading-relaxed">
                          • Hỗ trợ link YouTube, Vimeo trực tiếp.<br/>
                          • Hỗ trợ mã nhúng iframe để hiển thị video tốt nhất.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-8 py-6 bg-zinc-50 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setVideoModal({ isOpen: false, type: null })}
                    className="px-6 h-11 text-sm font-black text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <Button
                    onClick={handleInsertVideo}
                    disabled={videoModal.type === 'file' || !videoInput.trim()}
                    className="bg-[#0082c8] hover:bg-[#0071ae] text-white font-black px-8 h-11 rounded-xl shadow-lg shadow-blue-500/20"
                  >
                    Chèn Video
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
