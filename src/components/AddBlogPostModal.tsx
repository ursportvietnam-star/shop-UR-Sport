import React, { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Tag, X, Upload, Trash2, Code } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import ReactQuill from 'react-quill-new';
import Quill from 'quill';
import { toast } from 'sonner';
import 'react-quill-new/dist/quill.snow.css';
import { BlogPost } from '../types';
import beautify from 'js-beautify';
import { removeEmptyMedia, sanitizeRichHtml } from '../lib/htmlContent';
import { uploadLocalImage } from '../lib/localMediaUpload';

// ── Đăng ký blots cho <figure> và <figcaption> để Quill không strip các thẻ này ──
const BlockEmbedClass = Quill.import('blots/block/embed') as any;
const BlockClass = Quill.import('blots/block') as any;

class FigcaptionBlot extends BlockClass {
  static blotName = 'figcaption';
  static tagName = 'figcaption';
}
try { Quill.register(FigcaptionBlot, true); } catch {}

class FigureBlot extends BlockEmbedClass {
  static blotName = 'figure';
  static tagName = 'figure';

  static create(value: { src: string; alt?: string; caption?: string; width?: string; height?: string }) {
    const node = super.create() as HTMLElement;
    const img = document.createElement('img');
    img.setAttribute('src', value.src || '');
    img.setAttribute('alt', value.alt || '');
    img.setAttribute('width', value.width || '1200');
    img.setAttribute('height', value.height || '675');
    if (value.width) img.style.width = value.width;
    node.appendChild(img);
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = value.caption || '';
    node.appendChild(figcaption);
    return node;
  }

  static value(node: HTMLElement) {
    const img = node.querySelector('img');
    const figcaption = node.querySelector('figcaption');
    return {
      src: img?.getAttribute('src') || '',
      alt: img?.getAttribute('alt') || '',
      caption: figcaption?.textContent || '',
      width: img?.getAttribute('width') || '1200',
      height: img?.getAttribute('height') || '675',
    };
  }
}
try { Quill.register(FigureBlot, true); } catch {}

const CLOUDINARY_CLOUD_NAME = 'dcj4qhcfh';
const CLOUDINARY_UPLOAD_PRESET = 'ursport_uploads';

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

const imageFigureHtml = (src: string, alt = '', caption = '') => `
<figure>
  <img
    src="${src}"
    alt="${alt}"
    width="1200"
    height="675"
  >
  <figcaption>${caption}</figcaption>
</figure>
<p><br></p>`;

const containsTableHtml = (html: string) => /<table[\s>]/i.test(html);

interface AddBlogPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  post?: BlogPost | null;
  blogCategories?: string[];
}

const DEFAULT_BLOG_CATEGORIES = ['Kiến thức', 'Chất liệu', 'Dáng người', 'Thể thao', 'Quần thể thao nam', 'Hướng dẫn'];

export const AddBlogPostModal: React.FC<AddBlogPostModalProps> = ({ isOpen, onClose, onSuccess, post, blogCategories = DEFAULT_BLOG_CATEGORIES }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Tin tức');
  const [author, setAuthor] = useState('UrSport Team');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const quillRef = useRef<any>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [altDraft, setAltDraft] = useState('');
  const [imageEditPanel, setImageEditPanel] = useState<'caption' | 'alt' | 'replace' | null>(null);
  const [replaceImageUrl, setReplaceImageUrl] = useState('');
  const [selectedEditorImage, setSelectedEditorImage] = useState<{
    src: string;
    width: string;
    alignment: 'left' | 'center' | 'right';
    toolbarLeft: number;
    toolbarTop: number;
  } | null>(null);
  const categoryOptions = blogCategories.length > 0 ? blogCategories : DEFAULT_BLOG_CATEGORIES;
  const selectedEditorImageRef = useRef<HTMLImageElement | null>(null);
  const imageToolbarRef = useRef<HTMLDivElement | null>(null);
  const imageAltBySrcRef = useRef<Record<string, string>>({});
  const imageCaptionBySrcRef = useRef<Record<string, string>>({});
  const imagePickerOpenRef = useRef(false);
  // Refs để các handler Quill đọc state mà không cần close over (tránh Quill reinitialize)
  const isHtmlModeRef = useRef(false);
  const htmlSourceRef = useRef('');

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setSlug('');
      setCategory('Tin tức');
      setAuthor('UrSport Team');
      setContent('');
      setIsHtmlMode(false);
      setHtmlSource('');
      setCoverImage('');
      setImageUrls([]);
      setVideoUrls([]);
      setUploadProgress(0);
      setUploading(false);
      setSeoTitle('');
      setMetaDescription('');
      imageAltBySrcRef.current = {};
      imageCaptionBySrcRef.current = {};
      return;
    }

    if (post) {
      imageAltBySrcRef.current = {};
      imageCaptionBySrcRef.current = {};
      const parser = new DOMParser();
      const parsed = parser.parseFromString(`<div>${post.content || ''}</div>`, 'text/html');
      parsed.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (!src) return;
        const alt = img.getAttribute('alt') || img.getAttribute('title') || '';
        const caption = img.closest('figure')?.querySelector('figcaption')?.textContent || '';
        if (alt.trim()) imageAltBySrcRef.current[src] = alt.trim();
        if (caption.trim()) imageCaptionBySrcRef.current[src] = caption.trim();
      });
      setTitle(post.title || '');
      setSlug(post.slug || slugify(post.title || ''));
      setCategory(post.category || 'Tin tức');
      setAuthor(post.author || 'UrSport Team');
      setContent(post.content || '');
      setHtmlSource(containsTableHtml(post.content || '') ? beautifyHtml(post.content || '') : post.content || '');
      setIsHtmlMode(containsTableHtml(post.content || ''));
      setCoverImage(post.image || '');
      setImageUrls(post.images || []);
      setVideoUrls(post.videos || []);
      setSeoTitle(post.seoTitle || '');
      setMetaDescription(post.metaDescription || '');
    }
  }, [isOpen, post]);

  useEffect(() => { isHtmlModeRef.current = isHtmlMode; }, [isHtmlMode]);
  useEffect(() => { htmlSourceRef.current = htmlSource; }, [htmlSource]);

  const uploadFile = async (file: File, resourceType: 'image' | 'video') => {
    setUploading(true);
    setUploadProgress(10);
    try {
      if (resourceType === 'image') {
        setUploadProgress(90);
        return await uploadLocalImage(file, 'blog');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `blog/${resourceType}`);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error?.message || `Upload thất bại: ${res.statusText}`);
      }
      return data.secure_url;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message === 'Failed to fetch' ? 'Lỗi kết nối mạng. Vui lòng thử lại.' : (error.message || 'Lỗi tải lên. Vui lòng thử lại.'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ cho ảnh đại diện.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn! Tối đa 10MB.');
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
        if (file.size > (type === 'video' ? 100 : 10) * 1024 * 1024) {
          toast.error(`File quá lớn! Tối đa ${type === 'video' ? '100MB' : '10MB'}.`);
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
    value ? value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const extractJsonLdFromHtml = (html: string) => {
    const parser = new DOMParser();
    const document = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const wrapper = document.body.firstElementChild as HTMLElement | null;
    const schemas: string[] = [];

    if (!wrapper) return { html, schema: '' };

    wrapper.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      const schemaText = script.textContent?.trim();
      if (schemaText) {
        schemas.push(schemaText);
      }
      script.remove();
    });

    const readJsonLdText = (value?: string | null) => {
      const text = (value || '').trim();
      const looksLikeJsonLd = text.startsWith('{') && text.includes('"@context"');
      if (!looksLikeJsonLd) return { text, isJsonLd: false, isValid: false };

      try {
        JSON.parse(text);
        return { text, isJsonLd: true, isValid: true };
      } catch {
        return { text, isJsonLd: text.includes('FAQPage') || text.includes('schema.org'), isValid: false };
      }
    };

    Array.from(wrapper.querySelectorAll('*')).reverse().forEach((element) => {
      const text = element.textContent?.trim() || '';
      const jsonLd = readJsonLdText(text);
      if (!jsonLd.isJsonLd) return;
      if (jsonLd.isValid) {
        schemas.push(text);
      }
      element.remove();
    });

    const textWalker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    const schemaTextNodes: Text[] = [];
    while (textWalker.nextNode()) {
      const node = textWalker.currentNode as Text;
      const text = node.textContent?.trim() || '';
      const jsonLd = readJsonLdText(text);
      if (!jsonLd.isJsonLd) continue;
      if (jsonLd.isValid) {
        schemas.push(text);
      }
      schemaTextNodes.push(node);
    }
    schemaTextNodes.forEach(node => {
      node.textContent = '';
    });

    return {
      html: sanitizeRichHtml(wrapper.innerHTML),
      schema: schemas[0] || ''
    };
  };

  const normalizeImageFigures = (html: string) => {
    const parser = new DOMParser();
    const document = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const wrapper = document.body.firstElementChild as HTMLElement | null;
    if (!wrapper) return html;

    removeEmptyMedia(wrapper);

    wrapper.querySelectorAll('p.blog-image-caption').forEach((caption) => {
      const previous = caption.previousElementSibling as HTMLElement | null;
      const figure = previous?.tagName === 'FIGURE' ? previous : null;
      const image = figure?.querySelector('img');
      if (!figure || !image) return;

      let figcaption = figure.querySelector('figcaption');
      if (!figcaption) {
        figcaption = document.createElement('figcaption');
        figure.appendChild(figcaption);
      }
      figcaption.textContent = caption.textContent || '';
      caption.remove();
    });

    wrapper.querySelectorAll('img').forEach((image) => {
      const src = image.getAttribute('src') || '';
      const savedAlt = src ? imageAltBySrcRef.current[src] : '';
      const savedCaption = src ? imageCaptionBySrcRef.current[src] : '';
      if (savedAlt) {
        image.setAttribute('alt', savedAlt);
        image.setAttribute('title', savedAlt);
      }
      if (!image.getAttribute('width')) image.setAttribute('width', '1200');
      if (!image.getAttribute('height')) image.setAttribute('height', '675');

      if (image.closest('figure')) {
        const figure = image.closest('figure') as HTMLElement;
        const existingFigcaption = figure.querySelector('figcaption');
        if (existingFigcaption) existingFigcaption.remove();
        const figcaption = document.createElement('figcaption');
        figcaption.textContent = savedCaption || existingFigcaption?.textContent || '';
        figure.appendChild(figcaption);
        return;
      }

      const parent = image.parentElement;
      const figure = document.createElement('figure');
      const next = parent?.nextElementSibling as HTMLElement | null;
      const captionText = savedCaption || (next?.classList.contains('blog-image-caption') ? next.textContent || '' : '');

      if (parent?.tagName === 'P') {
        parent.insertAdjacentElement('beforebegin', figure);
      } else {
        image.insertAdjacentElement('beforebegin', figure);
      }
      figure.appendChild(image);

      const figcaption = document.createElement('figcaption');
      figcaption.textContent = captionText.trim();
      figure.appendChild(figcaption);
      if (next?.classList.contains('blog-image-caption')) next.remove();

      if (parent?.tagName === 'P' && !parent.textContent?.trim() && parent.children.length === 0) {
        parent.remove();
      }
    });

    wrapper.querySelectorAll('figure').forEach((figure) => {
      const image = figure.querySelector('img');
      if (!image) {
        figure.remove();
        return;
      }

      const captions = Array.from(figure.querySelectorAll('figcaption'));
      captions.slice(1).forEach((caption) => caption.remove());
      if (captions.length === 0) {
        figure.appendChild(document.createElement('figcaption'));
      }
    });

    return wrapper.innerHTML;
  };

  const getQuillEditor = () => {
    try {
      return quillRef.current?.getEditor?.() || null;
    } catch {
      return null;
    }
  };

  const syncEditorHtml = () => {
    const html = getQuillEditor()?.root?.innerHTML;
    if (typeof html === 'string') {
      setContent(html);
    }
  };

  const commitEditorHtml = (html: string) => {
    const normalized = normalizeImageFigures(html);
    setContent(normalized);
    if (isHtmlMode) {
      setHtmlSource(beautifyHtml(normalized));
    }
  };

  const readImageAlignment = (image: HTMLImageElement): 'left' | 'center' | 'right' => {
    const marginLeft = image.style.marginLeft;
    const marginRight = image.style.marginRight;
    if (marginLeft === '0px' && marginRight === 'auto') return 'left';
    if (marginLeft === 'auto' && marginRight === '0px') return 'right';
    return 'center';
  };

  const selectEditorImage = React.useCallback((image: HTMLImageElement | null) => {
    selectedEditorImageRef.current?.classList.remove('ql-selected-blog-image');
    selectedEditorImageRef.current = image;

    if (!image) {
      setSelectedEditorImage(null);
      setImageEditPanel(null);
      setCaptionDraft('');
      setAltDraft('');
      setReplaceImageUrl('');
      return;
    }

    image.classList.add('ql-selected-blog-image');
    const imageRect = image.getBoundingClientRect();
    const wrapperRect = editorWrapRef.current?.getBoundingClientRect();
    const wrapperScrollLeft = editorWrapRef.current?.scrollLeft || 0;
    const wrapperScrollTop = editorWrapRef.current?.scrollTop || 0;
    const nextSelection = {
      src: image.getAttribute('src') || '',
      width: image.style.width || '100%',
      alignment: readImageAlignment(image),
      toolbarLeft: wrapperRect ? imageRect.left - wrapperRect.left + wrapperScrollLeft : 0,
      toolbarTop: wrapperRect ? Math.max(6, imageRect.top - wrapperRect.top + wrapperScrollTop - 42) : 0,
    };

    setSelectedEditorImage((current) => {
      if (
        current?.src === nextSelection.src &&
        current.width === nextSelection.width &&
        current.alignment === nextSelection.alignment &&
        Math.round(current.toolbarLeft) === Math.round(nextSelection.toolbarLeft) &&
        Math.round(current.toolbarTop) === Math.round(nextSelection.toolbarTop)
      ) {
        return current;
      }

      return nextSelection;
    });
    const figure = image.closest('figure') as HTMLElement | null;
    const caption = figure ? getDirectFigcaption(figure)?.textContent || '' : '';
    setCaptionDraft(caption);
    setAltDraft(image.getAttribute('alt') || '');
    setReplaceImageUrl(image.getAttribute('src') || '');
  }, []);

  const handleEditorAreaPointer = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target || imageToolbarRef.current?.contains(target)) return;

    const image = target.closest('.ql-editor img') as HTMLImageElement | null;

    if (image && editorWrapRef.current?.contains(image)) {
      event.preventDefault();
      event.stopPropagation();
      const src = image.getAttribute('src') || '';
      if (src) {
        const figcaption = image.closest('figure')?.querySelector('figcaption');
        if (figcaption?.textContent?.trim()) {
          imageCaptionBySrcRef.current[src] = figcaption.textContent.trim();
        }
        const alt = image.getAttribute('alt') || image.getAttribute('title') || '';
        if (alt.trim()) {
          imageAltBySrcRef.current[src] = alt.trim();
        }
      }
      selectEditorImage(image);
      return;
    }

    if (!target.closest('.ql-editor')) {
      selectEditorImage(null);
    }
  };

  useEffect(() => {
    if (!isOpen || isHtmlMode) {
      selectEditorImage(null);
      return;
    }

    let root: HTMLElement | undefined;
    let handleEditorKeydown: ((event: KeyboardEvent) => void) | undefined;
    let handleOutsideClick: ((event: MouseEvent) => void) | undefined;
    let updateToolbarPosition: (() => void) | undefined;

    let retryCount = 0;
    let timer = 0;

    const attachListeners = () => {
      const quill = getQuillEditor();
      root = quill?.root as HTMLElement | undefined;
      if (!root) {
        retryCount += 1;
        if (retryCount < 10) {
          timer = window.setTimeout(attachListeners, 50);
        }
        return;
      }

      handleEditorKeydown = (event: KeyboardEvent) => {
        if ((event.key === 'Backspace' || event.key === 'Delete') && selectedEditorImageRef.current) {
          selectedEditorImageRef.current.remove();
          selectEditorImage(null);
          syncEditorHtml();
        }
      };

      handleOutsideClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        if (root?.contains(target) || imageToolbarRef.current?.contains(target)) return;
        selectEditorImage(null);
      };

      updateToolbarPosition = () => {
        if (selectedEditorImageRef.current) {
          selectEditorImage(selectedEditorImageRef.current);
        }
      };

      root.addEventListener('keydown', handleEditorKeydown);
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('resize', updateToolbarPosition);
    };

    timer = window.setTimeout(attachListeners, 0);

    return () => {
      window.clearTimeout(timer);
      if (root && handleEditorKeydown) root.removeEventListener('keydown', handleEditorKeydown);
      if (handleOutsideClick) document.removeEventListener('mousedown', handleOutsideClick);
      if (updateToolbarPosition) window.removeEventListener('resize', updateToolbarPosition);
    };
  }, [content, isHtmlMode, isOpen, selectEditorImage]);

  const updateSelectedImage = (updates: Partial<CSSStyleDeclaration>) => {
    const image = selectedEditorImageRef.current;
    if (!image) return;

    Object.entries(updates).forEach(([property, value]) => {
      if (typeof value === 'string') {
        image.style[property as any] = value;
      }
    });
    selectEditorImage(image);
    syncEditorHtml();
  };

  const setSelectedImageAlignment = (alignment: 'left' | 'center' | 'right') => {
    const alignments = {
      left: { display: 'block', marginLeft: '0px', marginRight: 'auto' },
      center: { display: 'block', marginLeft: 'auto', marginRight: 'auto' },
      right: { display: 'block', marginLeft: 'auto', marginRight: '0px' },
    };
    updateSelectedImage(alignments[alignment] as Partial<CSSStyleDeclaration>);
  };

  const setSelectedImageWidth = (width: string) => {
    updateSelectedImage({ width, maxWidth: '100%' } as Partial<CSSStyleDeclaration>);
  };

  const ensureImageFigure = (image: HTMLImageElement) => {
    const existingFigure = image.closest('figure') as HTMLElement | null;
    if (existingFigure) return existingFigure;

    const figure = document.createElement('figure');
    const parent = image.parentElement;

    if (parent?.tagName === 'P') {
      parent.insertAdjacentElement('beforebegin', figure);
    } else {
      image.insertAdjacentElement('beforebegin', figure);
    }

    figure.appendChild(image);
    if (parent?.tagName === 'P' && !parent.textContent?.trim() && parent.children.length === 0) {
      parent.remove();
    }
    return figure;
  };

  const getDirectFigcaption = (figure: HTMLElement) =>
    Array.from(figure.children).find((child) => child.tagName === 'FIGCAPTION') as HTMLElement | undefined;

  const removeSelectedEditorImage = () => {
    const image = selectedEditorImageRef.current;
    if (!image) return;
    const figure = image.closest('figure');

    if (figure) {
      figure.remove();
    } else {
      const imageBlock = image.closest('p') || image;
      const nextElement = imageBlock.nextElementSibling as HTMLElement | null;
      if (nextElement?.classList.contains('blog-image-caption')) {
        nextElement.remove();
      }
      image.remove();
    }

    selectEditorImage(null);
    syncEditorHtml();
    toast.success('Đã xoá ảnh khỏi nội dung.');
  };

  const updateSelectedImageCaption = () => {
    const image = selectedEditorImageRef.current;
    if (!image) return;

    const figure = ensureImageFigure(image);
    const legacyCaption = figure.nextElementSibling as HTMLElement | null;
    const existingCaption = getDirectFigcaption(figure);
    const currentCaption = existingCaption?.textContent || (legacyCaption?.classList.contains('blog-image-caption') ? legacyCaption.textContent || '' : '');
    setCaptionDraft(currentCaption);
    setImageEditPanel((current) => current === 'caption' ? null : 'caption');
    selectEditorImage(image);
  };

  const applySelectedImageCaption = () => {
    const image = selectedEditorImageRef.current;
    if (!image) return;
    const src = image.getAttribute('src') || '';
    if (!src) {
      toast.error('Không tìm thấy ảnh để cập nhật caption.');
      return;
    }

    // Ghi trực tiếp vào DOM của Quill trước khi commit
    const figure = ensureImageFigure(image);
    let figcaption = getDirectFigcaption(figure);
    if (!figcaption) {
      figcaption = document.createElement('figcaption');
      figure.appendChild(figcaption);
    }
    figcaption.textContent = captionDraft.trim();

    if (captionDraft.trim()) {
      imageCaptionBySrcRef.current[src] = captionDraft.trim();
    } else {
      delete imageCaptionBySrcRef.current[src];
    }

    commitEditorHtml(getQuillEditor()?.root?.innerHTML || content);
    setImageEditPanel(null);
    toast.success(captionDraft.trim() ? 'Đã cập nhật ghi chú ảnh.' : 'Đã xoá ghi chú ảnh.');
  };

  const updateSelectedImageAlt = () => {
    const image = selectedEditorImageRef.current;
    if (!image) return;

    setAltDraft(image.getAttribute('alt') || '');
    setImageEditPanel((current) => current === 'alt' ? null : 'alt');
    selectEditorImage(image);
  };

  const applySelectedImageAlt = () => {
    const image = selectedEditorImageRef.current;
    if (!image) return;
    const src = image.getAttribute('src') || '';
    if (!src) {
      toast.error('Không tìm thấy ảnh để cập nhật Alt.');
      return;
    }

    // Ghi trực tiếp vào DOM của Quill trước khi commit
    image.setAttribute('alt', altDraft.trim());
    image.setAttribute('title', altDraft.trim());

    if (altDraft.trim()) {
      imageAltBySrcRef.current[src] = altDraft.trim();
    } else {
      delete imageAltBySrcRef.current[src];
    }
    commitEditorHtml(getQuillEditor()?.root?.innerHTML || content);
    setImageEditPanel(null);
    toast.success('Đã cập nhật Alt ảnh.');
  };

  const replaceSelectedEditorImage = async () => {
    const image = selectedEditorImageRef.current;
    if (!image) return;

    setReplaceImageUrl(image.getAttribute('src') || '');
    setImageEditPanel((current) => current === 'replace' ? null : 'replace');
    selectEditorImage(image);
  };

  const applySelectedImageUrl = () => {
    const image = selectedEditorImageRef.current;
    if (!image) return;

    if (!replaceImageUrl.trim()) {
      toast.error('Đường dẫn ảnh không được để trống.');
      return;
    }

    const oldSrc = image.getAttribute('src') || '';
    if (oldSrc && oldSrc !== replaceImageUrl.trim()) {
      if (imageAltBySrcRef.current[oldSrc]) {
        imageAltBySrcRef.current[replaceImageUrl.trim()] = imageAltBySrcRef.current[oldSrc];
        delete imageAltBySrcRef.current[oldSrc];
      }
      if (imageCaptionBySrcRef.current[oldSrc]) {
        imageCaptionBySrcRef.current[replaceImageUrl.trim()] = imageCaptionBySrcRef.current[oldSrc];
        delete imageCaptionBySrcRef.current[oldSrc];
      }
    }
    image.setAttribute('src', replaceImageUrl.trim());
    commitEditorHtml(getQuillEditor()?.root?.innerHTML || content);
    setImageEditPanel(null);
    toast.success('Đã thay ảnh bằng đường dẫn mới.');
  };

  const uploadReplacementImage = async () => {
    const image = selectedEditorImageRef.current;
    if (!image) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const toastId = toast.loading('Đang upload ảnh thay thế...');

      try {
        const url = await uploadFile(file, 'image');
        const oldSrc = image.getAttribute('src') || '';
        if (oldSrc && oldSrc !== url) {
          if (imageAltBySrcRef.current[oldSrc]) {
            imageAltBySrcRef.current[url] = imageAltBySrcRef.current[oldSrc];
            delete imageAltBySrcRef.current[oldSrc];
          }
          if (imageCaptionBySrcRef.current[oldSrc]) {
            imageCaptionBySrcRef.current[url] = imageCaptionBySrcRef.current[oldSrc];
            delete imageCaptionBySrcRef.current[oldSrc];
          }
        }
        image.setAttribute('src', url);
        commitEditorHtml(getQuillEditor()?.root?.innerHTML || content);
        setReplaceImageUrl(url);
        setImageEditPanel(null);
        toast.success('Đã thay ảnh trong nội dung.', { id: toastId });
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi thay ảnh', { id: toastId });
      }
    };
  };

  const normalizeHtmlText = (html: string) => {
    const parser = new DOMParser();
    const document = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const wrapper = document.body.firstElementChild as HTMLElement | null;

    if (!wrapper) return html.replace(/&nbsp;/g, ' ');

    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      node.nodeValue = (node.nodeValue || '')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]{2,}/g, ' ');
    }

    return wrapper.innerHTML;
  };

  const beautifyHtml = (html: string) =>
    beautify.html(normalizeHtmlText(html), {
      indent_size: 2,
      wrap_line_length: 0,
      preserve_newlines: true,
      max_preserve_newlines: 1,
      unformatted: ['a', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'small'],
    });

  const handleImageInsert = React.useCallback(async () => {
    if (imagePickerOpenRef.current) return;
    imagePickerOpenRef.current = true;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    const unlockPicker = () => {
      window.setTimeout(() => {
        imagePickerOpenRef.current = false;
      }, 250);
    };
    // Guards chống double-trigger
    let handled = false;
    input.onchange = async () => {
      if (handled) return;
      handled = true;
      const file = input.files?.[0];
      if (!file) {
        unlockPicker();
        return;
      }
      const toastId = toast.loading('Đang tải ảnh lên...');
      try {
        const url = await uploadFile(file, 'image');
        if (isHtmlModeRef.current) {
          const nextSource = `${htmlSourceRef.current || ''}\n${imageFigureHtml(escapeHtmlAttr(url))}`.trim();
          setHtmlSource(beautifyHtml(normalizeImageFigures(nextSource)));
          toast.success('Đã chèn ảnh thành công', { id: toastId });
          return;
        }

        const quill = getQuillEditor();
        if (quill) {
          const range = quill.getSelection(true);
        const insertIndex = range?.index ?? quill.getLength();
          quill.clipboard.dangerouslyPasteHTML(
            insertIndex,
            `${imageFigureHtml(escapeHtmlAttr(url))}<p><br></p>`,
            'user'
          );
          // Quill inserts the figure (which may have length 1 or more depending on blots)
          // and the <p><br></p>. The safest way is to just let user click or move cursor to the end.
          // But we can try to set selection to insertIndex + 2 (1 for figure, 1 for p).
          setTimeout(() => {
            quill.setSelection(insertIndex + 2, 'silent');
          }, 0);
          quill.update('user');
          commitEditorHtml(quill.root.innerHTML);
        }
        toast.success('Đã chèn ảnh thành công', { id: toastId });
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi tải ảnh', { id: toastId });
      }
    };
    input.oncancel = unlockPicker;
    window.setTimeout(unlockPicker, 15000);
    input.click();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upload nhiều ảnh rồi chèn vào vị trí con trỏ trong editor
  const insertImageFilesToEditor = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return false;

    const toastId = toast.loading(`Đang tải ${imageFiles.length > 1 ? imageFiles.length + ' ảnh' : 'ảnh'} lên...`);
    try {
      for (const file of imageFiles) {
        const url = await uploadFile(file, 'image');
        if (isHtmlMode) {
          const html = imageFigureHtml(escapeHtmlAttr(url));
          setHtmlSource(prev => beautifyHtml(normalizeImageFigures(`${prev || ''}\n${html}`.trim())));
        } else {
          const quill = getQuillEditor();
          if (quill) {
            const range = quill.getSelection(true);
        const insertIndex = range?.index ?? quill.getLength();
            quill.clipboard.dangerouslyPasteHTML(
              insertIndex,
              `${imageFigureHtml(escapeHtmlAttr(url))}<p><br></p>`,
              'user'
            );
            setTimeout(() => {
              quill.setSelection(insertIndex + 2, 'silent');
            }, 0);
            quill.update('user');
            commitEditorHtml(quill.root.innerHTML);
          }
        }
      }
      toast.success(imageFiles.length > 1 ? `Đã chèn ${imageFiles.length} ảnh thành công.` : 'Đã chèn ảnh thành công.', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tải ảnh', { id: toastId });
    }
    return true;
  };

  // Drag & drop ảnh vào vùng editor
  const handleEditorDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (imageToolbarRef.current?.contains(e.target as Node)) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.some(f => f.type.startsWith('image/'))) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      await insertImageFilesToEditor(files);
    }
  };

  // Paste ảnh từ clipboard (Ctrl+V)
  const handleEditorPaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
    await insertImageFilesToEditor(files);
  };

  const handleVideoInsert = React.useCallback(async () => {
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

    const quill = getQuillEditor();
    if (!quill) return;
    const range = quill.getSelection(true);
        const insertIndex = range?.index ?? quill.getLength();
    quill.insertEmbed(insertIndex, 'video', videoUrl, 'user');
    quill.setSelection(insertIndex + 1, 0, 'user');
    quill.update('user');
    syncEditorHtml();
    toast.success('Đã chèn video thành công!');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const quill = getQuillEditor();
        if (quill) {
          const range = quill.getSelection(true);
        const insertIndex = range?.index ?? quill.getLength();
          quill.clipboard.dangerouslyPasteHTML(
            insertIndex,
            `<p><video controls src="${escapeHtmlAttr(url)}" style="width:100%;border-radius:12px;" /></p><p><br></p>`,
            'user'
          );
          quill.setSelection(insertIndex + 1);
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
      const current = getQuillEditor()?.root?.innerHTML || content;
      const normalized = normalizeImageFigures(current);
      const pretty = beautifyHtml(normalized);
      setContent(normalized);
      setHtmlSource(pretty);
    } else {
      const normalized = normalizeImageFigures(htmlSource);
      if (containsTableHtml(normalized)) {
        toast.info('Bài viết có bảng HTML. Hãy giữ chế độ HTML để bảng không bị editor trực quan làm hỏng.');
      }
      setContent(normalized);
      setHtmlSource(beautifyHtml(normalized));
    }
    setIsHtmlMode((prev) => !prev);
  };

  const insertFaqTemplate = React.useCallback(() => {
    const faqTemplate = `
<h2>Câu hỏi thường gặp</h2>
<h3>Câu hỏi 1?</h3>
<p>Nhập câu trả lời 1 tại đây.</p>
<h3>Câu hỏi 2?</h3>
<p>Nhập câu trả lời 2 tại đây.</p>
<h3>Câu hỏi 3?</h3>
<p>Nhập câu trả lời 3 tại đây.</p>`;

    if (isHtmlMode) {
      setHtmlSource(prev => `${prev || ''}\n${faqTemplate}`.trim());
      toast.success('Đã chèn mẫu FAQ vào HTML.');
      return;
    }

    const quill = getQuillEditor();
    if (!quill) {
      setContent(prev => `${prev || ''}${faqTemplate}`.trim());
      return;
    }

    const range = quill.getSelection(true);
    const insertIndex = range?.index ?? quill.getLength();
    quill.clipboard.dangerouslyPasteHTML(insertIndex, faqTemplate, 'user');
    quill.setSelection(insertIndex + 1, 0);
    quill.update('user');
    syncEditorHtml();
    toast.success('Đã chèn 3 câu hỏi FAQ.');
  }, [isHtmlMode, syncEditorHtml]);

  const modules = React.useMemo(() => ({
    toolbar: {
      container: '#blog-quill-toolbar',
      handlers: {
        image: handleImageInsert,
        video: handleVideoInsert,
      },
    },
    clipboard: {
      matchVisual: false,
    },
  // handlers đã stable (useCallback([])), modules không bao giờ thay đổi
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const finalContent = isHtmlMode ? htmlSource : content;

    if (!title.trim() || !finalContent.trim()) {
      toast.error('Vui lòng điền đủ tiêu đề và nội dung.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSlug = slug.trim() ? slugify(slug) : slugify(title);
      const { html: cleanedContent, schema: extractedSchema } = extractJsonLdFromHtml(normalizeImageFigures(finalContent));
      const postData: Omit<BlogPost, 'id'> = {
        title: title.trim(),
        slug: finalSlug,
        category,
        author,
        date: new Date().toLocaleDateString('vi-VN'),
        image: coverImage,
        excerpt: metaDescription.trim() || title.trim(),
        content: cleanedContent,
        seoTitle: seoTitle.trim(),
        metaDescription: metaDescription.trim(),
        customSchema: extractedSchema || post?.customSchema || '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        <div className="flex-none flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 lg:px-8">
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

        <form className="flex-1 overflow-hidden grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_400px] lg:px-8 lg:py-8" onSubmit={handleSubmit}>
          <div className="h-full space-y-6 overflow-y-auto pr-2 pb-10">
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
                <span className="text-xs font-normal text-zinc-400 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Kéo &amp; thả ảnh vào editor, hoặc Ctrl+V để chèn từ clipboard
                </span>
              </div>
              <div
                ref={editorWrapRef}
                onMouseDownCapture={handleEditorAreaPointer}
                onDrop={handleEditorDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={(e) => { if (!editorWrapRef.current?.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
                onDragEnd={() => setIsDragOver(false)}
                onPaste={handleEditorPaste}
                className={cn('w-full product-quill-editor relative rounded-3xl border border-zinc-200 bg-white shadow-sm transition-colors', isDragOver && 'is-drag-over border-blue-400')}
              >
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
                      .product-quill-editor .ql-editor figure { margin: 24px 0; text-align: center; }
                      .product-quill-editor .ql-editor figure img,
                      .product-quill-editor .ql-editor img { border-radius: 12px; box-sizing: border-box; height: auto; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 100%; cursor: pointer; display: block; }
                      .product-quill-editor .ql-editor img.ql-selected-blog-image { box-shadow: 0 0 0 2px #2563eb !important; outline: none; }
                      .product-quill-editor .ql-editor figure figcaption,
                      .product-quill-editor .ql-editor .blog-image-caption { color: #6b7280; font-size: 14px; font-style: italic; line-height: 1.5; margin: 10px auto 0; max-width: 760px; text-align: center; }
                      .product-quill-editor .ql-editor iframe { border-radius: 8px; margin: 2rem 0; width: 100%; aspect-ratio: 16/9; }
                      .product-quill-editor .ql-editor video { border-radius: 12px; margin: 2rem 0 2rem auto; max-width: 100%; width: min(100%, 720px); display: block; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
                      .product-quill-editor .ql-snow .ql-tooltip { z-index: 9999; }
                      .product-quill-editor .ql-toolbar button,
                      .product-quill-editor .ql-toolbar select {
                        border: none !important;
                        background: transparent !important;
                      }
                      .product-quill-editor .ql-toolbar .faq-toolbar-button,
                      .product-quill-editor .ql-toolbar .html-toolbar-button {
                        align-items: center !important;
                        border-radius: 999px !important;
                        display: inline-flex !important;
                        gap: 0.25rem !important;
                        height: 28px !important;
                        justify-content: center !important;
                        width: auto !important;
                        padding: 0 0.45rem !important;
                        color: #111827 !important;
                        font-size: 0.72rem !important;
                        font-weight: 900 !important;
                      }
                      .product-quill-editor .ql-toolbar .faq-toolbar-button::before {
                        content: "FAQ" !important;
                      }
                      .product-quill-editor .ql-toolbar .html-toolbar-button.is-active {
                        background: #7c3aed !important;
                        color: #fff !important;
                      }
                    `,
                  }}
                />
                <div className="border-b border-zinc-200 px-4 py-3 bg-white sticky top-0 z-10">
                  <div id="blog-quill-toolbar" className="ql-toolbar flex flex-wrap items-center gap-2">
                    <span className="ql-formats">
                      <select className="ql-header" defaultValue="">
                        <option value="1">H1</option>
                        <option value="2">H2</option>
                        <option value="3">H3</option>
                        <option value="">Normal</option>
                      </select>
                    </span>
                    <span className="ql-formats">
                      <button type="button" className="ql-bold" />
                      <button type="button" className="ql-italic" />
                      <button type="button" className="ql-underline" />
                      <button type="button" className="ql-strike" />
                    </span>
                    <span className="ql-formats">
                      <button type="button" className="ql-list" value="ordered" />
                      <button type="button" className="ql-list" value="bullet" />
                    </span>
                    <span className="ql-formats">
                      <select className="ql-align" />
                    </span>
                    <span className="ql-formats">
                      <button type="button" className="ql-link" />
                      <button type="button" className="ql-image" onClick={isHtmlMode ? handleImageInsert : undefined} />
                      <button type="button" className="ql-video" />
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
                      <button type="button" className="faq-toolbar-button" onClick={insertFaqTemplate} title="Chèn 3 câu hỏi FAQ" />
                      <button
                        type="button"
                        onClick={toggleHtmlMode}
                        title={isHtmlMode ? 'Đang sửa HTML - bấm để chuyển sang trực quan' : 'Đang soạn trực quan - bấm để chuyển sang HTML'}
                        className={cn('html-toolbar-button', isHtmlMode && 'is-active')}
                      >
                        <span>{isHtmlMode ? 'HTML' : 'VISUAL'}</span>
                      </button>
                    </span>
                    <span className="ql-formats">
                      <button className="ql-clean" />
                    </span>
                  </div>
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
                        <span className="text-white/30 text-[11px] font-mono ml-2">content.html</span>
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
                        className="flex-1 bg-transparent pl-4 pr-6 pt-4 pb-4 text-[13px] font-mono text-[#a9b1d6] leading-6 resize-none outline-none min-h-[420px] w-full"
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
                  <ReactQuill
                    ref={quillRef}
                    value={content}
                    onChange={setContent}
                    theme="snow"
                    modules={modules}
                  />
                )}
                {/* Drag overlay */}
                {isDragOver && (
                  <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-3xl border-2 border-blue-400 bg-blue-50/90 gap-3">
                    <div className="rounded-full bg-blue-100 p-4">
                      <Upload className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-sm font-bold text-blue-600">Thả ảnh vào đây để upload</p>
                    <p className="text-xs text-blue-400">Ảnh sẽ tự động lưu vào local và chèn vào bài viết</p>
                  </div>
                )}
                {selectedEditorImage && !isHtmlMode && (
                  <div
                    ref={imageToolbarRef}
                    className="absolute z-20 flex w-max items-center gap-1 rounded-md bg-zinc-950 px-2 py-1 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)]"
                    style={{
                      left: `${selectedEditorImage.toolbarLeft}px`,
                      top: `${selectedEditorImage.toolbarTop}px`,
                    }}
                  >
                    <div className="flex items-center gap-0.5 border-r border-white/15 pr-1">
                      <button type="button" onClick={() => setSelectedImageAlignment('left')} title="Căn trái" className={cn('rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white', selectedEditorImage.alignment === 'left' && 'bg-white/10 text-white')}>
                        <AlignLeft className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setSelectedImageAlignment('center')} title="Căn giữa" className={cn('rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white', selectedEditorImage.alignment === 'center' && 'bg-white/10 text-white')}>
                        <AlignCenter className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setSelectedImageAlignment('right')} title="Căn phải" className={cn('rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white', selectedEditorImage.alignment === 'right' && 'bg-white/10 text-white')}>
                        <AlignRight className="h-4 w-4" />
                      </button>
                    </div>
                    <button type="button" onClick={updateSelectedImageCaption} title="Thêm hoặc sửa caption" className={cn('inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs font-black text-white hover:bg-white/10', imageEditPanel === 'caption' && 'bg-blue-500')}>
                      <span className="text-sm leading-none">T</span>
                      Caption
                    </button>
                    <button type="button" onClick={replaceSelectedEditorImage} title="Upload ảnh hoặc thay bằng đường dẫn" className={cn('inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs font-black text-white hover:bg-white/10', imageEditPanel === 'replace' && 'bg-blue-500')}>
                      <Upload className="h-3.5 w-3.5" />
                      Thay ảnh
                    </button>
                    <button type="button" onClick={updateSelectedImageAlt} title="Sửa Alt text" className={cn('inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs font-black text-white hover:bg-white/10', imageEditPanel === 'alt' ? 'bg-emerald-500' : altDraft ? 'bg-emerald-600/70' : '')}>
                      <Tag className="h-3.5 w-3.5" />
                      Alt
                    </button>
                    <button type="button" onClick={removeSelectedEditorImage} title="Xoá ảnh khỏi nội dung" className="rounded p-1.5 text-white/70 hover:bg-red-500 hover:text-white">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {imageEditPanel === 'caption' && (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={captionDraft}
                          onChange={(event) => setCaptionDraft(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && applySelectedImageCaption()}
                          placeholder="Nhập ghi chú..."
                          className="ml-1 w-56 rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium text-white outline-none placeholder:text-white/40 focus:border-blue-400"
                        />
                        <button type="button" onClick={applySelectedImageCaption} className="rounded bg-blue-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-400">
                          Áp dụng
                        </button>
                      </>
                    )}
                    {imageEditPanel === 'alt' && (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={altDraft}
                          onChange={(event) => setAltDraft(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && applySelectedImageAlt()}
                          placeholder="Nhập thẻ alt..."
                          className="ml-1 w-56 rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium text-white outline-none placeholder:text-white/40 focus:border-emerald-400"
                        />
                        <button type="button" onClick={applySelectedImageAlt} className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-400">
                          Áp dụng
                        </button>
                      </>
                    )}
                    {imageEditPanel === 'replace' && (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={replaceImageUrl}
                          onChange={(event) => setReplaceImageUrl(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && applySelectedImageUrl()}
                          placeholder="/images/blog/ten-anh.webp"
                          className="ml-1 w-64 rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium text-white outline-none placeholder:text-white/40 focus:border-blue-400"
                        />
                        <button type="button" onClick={applySelectedImageUrl} className="rounded bg-blue-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-400">
                          URL
                        </button>
                        <button type="button" onClick={uploadReplacementImage} className="rounded bg-white/10 px-2 py-1 text-[11px] font-bold text-white hover:bg-white/20">
                          Upload
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-full space-y-6 overflow-y-auto rounded-[32px] border border-zinc-200 bg-zinc-50 p-6 shadow-sm pb-10">
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
                {categoryOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
                {category && !categoryOptions.includes(category) && (
                  <option value={category}>{category}</option>
                )}
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

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Tối ưu SEO</p>
              
              <label className="block space-y-2 text-sm font-semibold text-zinc-700">
                SEO Title
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#1e4b64]"
                  placeholder="Ví dụ: Áo Thun Nam Mặc Không Nóng..."
                />
              </label>

              <label className="block space-y-2 text-sm font-semibold text-zinc-700">
                SEO Description
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="h-24 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#1e4b64] resize-none"
                  placeholder="Cách chọn áo thun nam mặc không nóng..."
                />
              </label>
            </div>

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
                <div className="relative aspect-[1024/682] overflow-hidden rounded-3xl border border-zinc-200 bg-white">
                  <img src={coverImage} alt="Cover Preview" loading="lazy" className="h-full w-full object-cover" />
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
                      <img src={url} alt={`blog-image-${index}`} loading="lazy" className="h-28 w-full object-cover" />
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
