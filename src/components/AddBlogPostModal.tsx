import React, { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Tag, X, Upload, Trash2, Code, Sparkles } from 'lucide-react';
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
import { generateBlogSEO } from '../lib/gemini';
import aiBlogRewriteTemplate from '../content/ai-blog-rewrite-template.md?raw';
import aiGoogleRewriteTemplate from '../content/ai-google-rewrite-template.md?raw';

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
  const [aiEditedLineNumbers, setAiEditedLineNumbers] = useState<number[]>([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [isAiRewriteLoading, setIsAiRewriteLoading] = useState(false);
  const [isAiGoogleRewriteLoading, setIsAiGoogleRewriteLoading] = useState(false);
  const [isAiMarkdownLoading, setIsAiMarkdownLoading] = useState(false);
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
      setAiEditedLineNumbers([]);
      setCoverImage('');
      setImageUrls([]);
      setVideoUrls([]);
      setUploadProgress(0);
      setUploading(false);
      setSeoTitle('');
      setMetaDescription('');
      setPrimaryKeyword('');
      setSecondaryKeywords('');
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
      setAiEditedLineNumbers([]);
      setIsHtmlMode(containsTableHtml(post.content || ''));
      setCoverImage(post.image || '');
      setImageUrls(post.images || []);
      setVideoUrls(post.videos || []);
      setSeoTitle(post.seoTitle || '');
      setMetaDescription(post.metaDescription || '');
      setPrimaryKeyword(post.primaryKeyword || '');
      setSecondaryKeywords(post.secondaryKeywords || '');
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

    const realImageSources = Array.from(new Set([coverImage, ...imageUrls].map(url => url.trim()).filter(Boolean)));
    let fallbackImageIndex = 0;
    const readNextRealImageSource = () => {
      if (realImageSources.length === 0) return '';
      const url = realImageSources[Math.min(fallbackImageIndex, realImageSources.length - 1)];
      fallbackImageIndex += 1;
      return url;
    };

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
      if (/CLOUDINARY_OR_UPLOADED_IMAGE_URL/i.test(src)) {
        const replacementSrc = readNextRealImageSource();
        if (replacementSrc) {
          image.setAttribute('src', replacementSrc);
        } else {
          image.closest('figure')?.remove();
          image.remove();
          return;
        }
      }

      const currentSrc = image.getAttribute('src') || '';
      const savedAlt = currentSrc ? imageAltBySrcRef.current[currentSrc] : '';
      const savedCaption = currentSrc ? imageCaptionBySrcRef.current[currentSrc] : '';
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

  const normalizeHtmlDiffLine = (line: string) => line.trim().replace(/\s+/g, ' ');

  const getAiEditedLineNumbers = (beforeHtml: string, afterPrettyHtml: string) => {
    const beforeCounts = new Map<string, number>();
    beautifyHtml(beforeHtml)
      .split('\n')
      .map(normalizeHtmlDiffLine)
      .filter(Boolean)
      .forEach((line) => {
        beforeCounts.set(line, (beforeCounts.get(line) || 0) + 1);
      });

    return afterPrettyHtml
      .split('\n')
      .map((line, index) => ({ line: normalizeHtmlDiffLine(line), lineNumber: index + 1 }))
      .filter(({ line }) => {
        if (!line) return false;
        const count = beforeCounts.get(line) || 0;
        if (count > 0) {
          beforeCounts.set(line, count - 1);
          return false;
        }
        return true;
      })
      .map(({ lineNumber }) => lineNumber);
  };

  const getCurrentContentHtml = () => {
    if (isHtmlMode) return htmlSource;
    return getQuillEditor()?.root?.innerHTML || content;
  };

  const getPlainTextFromHtml = (html: string) => {
    if (typeof window === 'undefined' || !window.DOMParser) {
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const cleanKeywordCandidate = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/[“”"']/g, '')
      .replace(/[.!?;:|]+$/g, '')
      .trim();

  const extractLabeledValue = (text: string, labels: string[]) => {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = text.match(new RegExp(`^\\s*(?:[-*]\\s*)?${escaped}\\s*[:：-]\\s*(.+)$`, 'im'));
      const value = cleanKeywordCandidate(match?.[1] || '');
      if (value) return value;
    }
    return '';
  };

  const extractFirstHeading = (text: string) => {
    const htmlHeading = text.match(/<h1[^>]*>(.*?)<\/h1>|<h2[^>]*>(.*?)<\/h2>/i);
    if (htmlHeading) return cleanKeywordCandidate((htmlHeading[1] || htmlHeading[2] || '').replace(/<[^>]*>/g, ' '));
    const markdownHeading = text.match(/^\s*#{1,2}\s+(.+)$/m);
    return cleanKeywordCandidate(markdownHeading?.[1] || '');
  };

  const deriveKeywordPhrase = (value = '') => {
    const cleaned = cleanKeywordCandidate(value)
      .replace(/\s+[-–|]\s+.*$/i, '')
      .replace(/\s*[:：]\s+.*$/i, '')
      .replace(/\b(nên chọn loại nào|nên mua loại nào|loại nào tốt|loại nào đẹp|mua ở đâu|có tốt không|là gì|như thế nào|mặc hàng ngày được không|nên chọn form rộng hay vừa)\b/gi, '')
      .replace(/\b(cách chọn|hướng dẫn chọn|kinh nghiệm chọn|gợi ý chọn|top \d+)\s+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length >= 5 && cleaned.length <= 45) return cleaned;
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length > 6) return words.slice(0, 6).join(' ');
    return cleaned;
  };

  const isWeakKeyword = (value = '') => {
    const normalized = value.toLowerCase();
    return (
      !normalized.trim() ||
      normalized.length > 55 ||
      /[?？]/.test(value) ||
      /\b(nên chọn|nên mua|loại nào|mua ở đâu|có tốt không|là gì|như thế nào)\b/i.test(value)
    );
  };

  const inferPrimaryKeyword = (fallbackText = '') => {
    const explicitKeyword = extractLabeledValue(fallbackText, [
      'Primary keyword',
      'Từ khóa chính',
      'Tu khoa chinh',
      'Keyword chính',
      'Keyword chinh',
    ]);

    const candidates = [
      primaryKeyword,
      explicitKeyword,
      deriveKeywordPhrase(title),
      deriveKeywordPhrase(seoTitle),
      deriveKeywordPhrase(extractFirstHeading(fallbackText)),
      metaDescription.split(/[.?]/)[0],
      fallbackText.split(/[.?]/)[0],
    ]
      .map(cleanKeywordCandidate)
      .map(deriveKeywordPhrase)
      .filter(Boolean);

    const best = candidates.find(item => item.length >= 5 && item.length <= 45 && !isWeakKeyword(item)) || candidates[0];
    return best || 'blog URSport';
  };

  const inferSecondaryKeywords = (fallbackText = '') => {
    const explicitKeywords = extractLabeledValue(fallbackText, [
      'Secondary keywords',
      'Từ khóa phụ',
      'Tu khoa phu',
      'Keyword phụ',
      'Keyword phu',
    ]);
    if (explicitKeywords) {
      return explicitKeywords.split(',').map(cleanKeywordCandidate).filter(Boolean).slice(0, 8);
    }

    const source = [seoTitle, title, metaDescription, fallbackText.slice(0, 700)].join(' ');
    const primary = inferPrimaryKeyword(fallbackText).toLowerCase();
    const phrases = source
      .split(/[,;|.\n]/)
      .map(cleanKeywordCandidate)
      .map(deriveKeywordPhrase)
      .filter(item => item.length >= 8 && item.length <= 70)
      .filter(item => item.toLowerCase() !== primary)
      .filter(item => !isWeakKeyword(item));

    return Array.from(new Set(phrases)).slice(0, 5);
  };

  const isAiTemplatePlaceholder = (value = '') => {
    const normalized = value.toLowerCase();
    return (
      /\[[^\]]*(tieu de|tu khoa|loi ich|keyword|title|slug|meta|url)[^\]]*\]/i.test(value) ||
      normalized.includes('tieu de chua tu khoa') ||
      normalized.includes('url-than-thien-seo') ||
      normalized.includes('tu khoa 1') ||
      normalized.includes('tu khoa 2') ||
      normalized.includes('tu khoa 3')
    );
  };

  const replaceAiTemplatePlaceholders = (value = '') => {
    const lockedTitle = title.trim() || seoTitle.trim() || primaryKeyword.trim();
    if (!lockedTitle) return value;

    return value
      .replace(/"\s*\[Tieu de chua tu khoa \+ loi ich\]\s*"\s+la chu de nhieu nam gioi quan tam[^.]*\.\s*/gi, '')
      .replace(/"\s*\[Tieu de chua tu khoa \+ loi ich\]\s*"\s+là chủ đề nhiều nam giới quan tâm[^.]*\.\s*/gi, '')
      .replace(/\[Tieu de chua tu khoa \+ loi ich\]/gi, lockedTitle)
      .replace(/\[url-than-thien-seo\]/gi, slug || slugify(lockedTitle))
      .replace(/\burl-than-thien-seo\b/gi, slug || slugify(lockedTitle))
      .replace(/\btu khoa 1\b/gi, primaryKeyword.trim() || lockedTitle)
      .replace(/\btu khoa 2\b/gi, secondaryKeywords.split(',')[0]?.trim() || lockedTitle)
      .replace(/\btu khoa 3\b/gi, secondaryKeywords.split(',')[1]?.trim() || lockedTitle)
      .trim();
  };

  const optimizeSeoTitleForChecklist = (value = '') => {
    const cleaned = replaceAiTemplatePlaceholders(value).trim();
    const lockedTitle = title.trim() || cleaned;
    if (cleaned.length >= 60 && cleaned.length <= 65) return cleaned;
    if (lockedTitle.length >= 50 && lockedTitle.length <= 70) return lockedTitle;

    const base = lockedTitle || primaryKeyword.trim() || 'Blog URSport';
    if (base.length > 65) return base.slice(0, 65).replace(/\s+\S*$/, '').trim();
    return `${base} | URSport`.slice(0, 65).replace(/\s+\S*$/, '').trim();
  };

  const optimizeMetaDescriptionForChecklist = (value = '') => {
    const cleaned = replaceAiTemplatePlaceholders(value).replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 100 && cleaned.length <= 160) return cleaned;

    const lockedTitle = title.trim() || seoTitle.trim() || primaryKeyword.trim() || 'bài viết URSport';
    const keyword = primaryKeyword.trim() || inferPrimaryKeyword(cleaned || lockedTitle);
    const generated = `Khám phá ${lockedTitle.toLowerCase()} với mẹo chọn, phối đồ và gợi ý URSport giúp nam giới mặc thoải mái, lịch sự mỗi ngày.`;
    const fallback = generated.includes(keyword.toLowerCase()) ? generated : `${generated} Từ khóa: ${keyword}.`;

    if (fallback.length <= 160) return fallback;
    return fallback.slice(0, 160).replace(/\s+\S*$/, '').replace(/[,.!?;:]+$/, '').trim();
  };

  const buildAiBriefContext = (plainText: string, modeName: string) => {
    const selectedPrimaryKeyword = primaryKeyword.trim() || inferPrimaryKeyword(plainText);
    const selectedSecondaryKeywords = secondaryKeywords.trim() || inferSecondaryKeywords(plainText).join(', ');
    const lockedTitle = title.trim() || seoTitle.trim() || selectedPrimaryKeyword;
    const availableImages = Array.from(new Set([coverImage, ...imageUrls].map(url => url.trim()).filter(Boolean)));

    return [
      'Brief truoc khi AI thuc hien:',
      `- Che do: ${modeName}`,
      `- Danh muc bai viet: ${category || 'Blog'}`,
      `- Tieu de hien tai/de xuat: ${lockedTitle}`,
      `- Tu khoa chinh bat buoc: ${selectedPrimaryKeyword}`,
      `- Tu khoa phu: ${selectedSecondaryKeywords || 'AI tu suy luan tu tieu de, meta description va noi dung bai viet'}`,
      '- Duoc phep toi uu lai title cho tu nhien, de doc va co y mua/tim hieu ro hon, nhung khong duoc doi intent/chuyen chu de.',
      '- Tu khoa chinh phai la cum danh tu ngan 2-6 tu, vi du "ao the thao nam"; khong duoc la cau hoi dai nhu "ao the thao nam nen chon loai nao".',
      '- keywordCluster[0] bat buoc la tu khoa chinh ngan; keywordCluster[1..] la 3-8 tu khoa phu lien quan, khong lap lai title.',
      '- Neu tieu de la cau hoi co dau "?", mo bai phai tra loi thang cau hoi trong 1-2 cau dau, khong viet kieu "... la chu de nhieu nguoi quan tam".',
      '- Khong doi chu de, khong doi goc bai. Co the bien cau hoi thanh title tu nhien hon neu van giu dung intent.',
      '- Neu tieu de co them phan sau dau ":", "-", "?" hoac cum nhu "Meo phoi", phai xem do la goc trien khai chinh cua bai.',
      '- Doi tuong: Nam gioi Viet Nam 18-35 tuoi, quan tam do the thao, thoi trang nam va mua sam online.',
      '- Muc dich: Giao duc nguoi doc + dieu huong mua hang/san pham URSport mot cach tu nhien.',
      '- Do dai muc tieu: contentHtml toi thieu 2500 ky tu plain text, uu tien 1200-2000 tu neu du thong tin; khong viet dai bang cach lap y.',
      '- Muc tieu publish: SEO Score checklist phai dat 90-100 diem truoc khi tra ket qua.',
      '- Bat buoc SEO Title dai 60-65 ky tu neu co the; Meta description dai 100-160 ky tu; noi dung plain text toi thieu 2500 ky tu.',
      '- Bat buoc lien ket: them 3-5 internal link toi bai viet/category/san pham lien quan tren website va it nhat 1 external link toi nguon uy tin khi co thong tin can dan nguon.',
      '- Giong van: Than thien, de hieu, thuc te, co chuyen mon vua du.',
      `- Anh co san de chen vao bai: ${availableImages.length ? availableImages.join(', ') : 'Chua co anh that, khong chen figure anh gia.'}`,
      '- Khi chen anh, bat buoc dung src anh that trong danh sach tren. Khong dung CLOUDINARY_OR_UPLOADED_IMAGE_URL trong ket qua cuoi.',
      '- Cau truc anh dung: <figure><img src="/images/products/ten-anh.webp" alt="Mo ta anh tu nhien" title="Title anh ngan" width="1200" height="1600"><figcaption>Chu thich huu ich.</figcaption></figure>',
      '',
      'Truoc khi viet/sua, hay doc lai brief tren va bam sat no. Uu tien tieu de goc va tu khoa nhap tay hon moi suy luan cua AI.',
    ].join('\n');
  };

  const applyAiBlogDraft = (data: Awaited<ReturnType<typeof generateBlogSEO>>) => {
    const beforeAiContent = normalizeImageFigures(getCurrentContentHtml());
    const nextContent = replaceAiTemplatePlaceholders(normalizeImageFigures(data.contentHtml || ''));
    if (!nextContent.trim()) {
      throw new Error('AI khong tra ve noi dung HTML');
    }
    const nextPrettyContent = beautifyHtml(nextContent);

    setContent(nextContent);
    setAiEditedLineNumbers(getAiEditedLineNumbers(beforeAiContent, nextPrettyContent));
    if (isHtmlMode) {
      setHtmlSource(nextPrettyContent);
    }

    const nextTitle = replaceAiTemplatePlaceholders(data.title?.trim() || '');
    const nextSlug = replaceAiTemplatePlaceholders(data.slug?.trim() || '');
    const nextMetaTitle = optimizeSeoTitleForChecklist(data.metaTitle?.trim() || data.title?.trim() || seoTitle || title);
    const nextMetaDescription = optimizeMetaDescriptionForChecklist(data.metaDescription?.trim() || metaDescription);

    if (nextTitle && !isAiTemplatePlaceholder(data.title)) setTitle(nextTitle);
    if (!slug.trim() && nextSlug && !isAiTemplatePlaceholder(data.slug)) setSlug(nextSlug);
    if (nextMetaTitle) setSeoTitle(nextMetaTitle);
    if (nextMetaDescription) setMetaDescription(nextMetaDescription);
    if ((!primaryKeyword.trim() || isWeakKeyword(primaryKeyword)) && data.keywordCluster?.[0] && !isAiTemplatePlaceholder(data.keywordCluster[0])) {
      setPrimaryKeyword(deriveKeywordPhrase(data.keywordCluster[0]));
    }
    if ((!secondaryKeywords.trim() || inferSecondaryKeywords(nextContent).length < 3) && data.keywordCluster?.length > 1) {
      setSecondaryKeywords(data.keywordCluster.slice(1).filter(item => !isAiTemplatePlaceholder(item)).join(', '));
    }
  };

  const buildAiRewritePrompt = (sourceHtml: string, template: string, modeName: string) => {
    const plainText = getPlainTextFromHtml(sourceHtml);
    return [
      `Che do sua: ${modeName}`,
      buildAiBriefContext(plainText, modeName),
      `Primary keyword: ${primaryKeyword.trim() || inferPrimaryKeyword(plainText)}`,
      `Secondary keywords: ${secondaryKeywords.trim() || inferSecondaryKeywords(plainText).join(', ') || 'AI tu suy luan'}`,
      `Tieu de hien tai cua nguoi dung: ${title || seoTitle || 'Chua co'}`,
      'Rang buoc title: Duoc phep viet lai title cho tu nhien/chuan SEO hon, nhung phai giu dung intent. Noi dung phai tra loi dung cau hoi/goc bai cua tieu de hien tai.',
      'Rang buoc keyword: keywordCluster[0] phai la tu khoa chinh ngan 2-6 tu, khong phai nguyen cau hoi/title dai.',
      'Rang buoc mo bai: Khong mo dau bang cong thuc "[tieu de] la chu de...". Hay vao thang cau tra loi va loi ich thuc te.',
      'Rang buoc template: File mau chi la cau truc. Tuyet doi khong copy placeholder nhu [Tieu de chua tu khoa + loi ich], [url-than-thien-seo], tu khoa 1, tu khoa 2, tu khoa 3 vao ket qua.',
      'Neu title/meta/content co chuoi trong dau ngoac vuong tu file mau, ket qua se bi xem la sai.',
      'Rang buoc anh: Khong tra src="CLOUDINARY_OR_UPLOADED_IMAGE_URL". Neu can anh, dung dung URL anh co san trong brief; neu khong co anh that thi bo figure.',
      'Rang buoc checklist diem SEO: Ket qua sau AI Sua phai co SEO Score muc publish 90-100. Neu thieu, tu bo sung truoc khi tra JSON.',
      'Bat buoc: title bai viet hap dan va co the chinh sua rieng voi SEO title; SEO Title 60-65 ky tu neu co the, Meta description 100-160 ky tu, contentHtml plain text toi thieu 2500 ky tu, FAQ du 3 cau, internal link 3-5 cai, external link it nhat 1 nguon uy tin.',
      `Slug bat buoc: ${slug || slugify(title || 'bai-viet-ursport')}`,
      `SEO title hien tai: ${seoTitle || title || 'Chua co'}`,
      `Meta description hien tai: ${metaDescription || 'Chua co'}`,
      `Danh muc: ${category || 'Blog'}`,
      `Tac gia: ${author || 'UR SPORT Team'}`,
      'File mau Markdown can doc va bam theo:',
      template.slice(0, 6000),
      'Outline H2/H3: Giu dung chu de hien tai, toi uu lai bo cuc, FAQ, CTA, internal links va cac block anh.',
      'Yeu cau: Sua lai bai blog hien tai thanh HTML SEO chuyen sau cho URSport. Giu dung thong tin cot loi, khong doi chu de, khong chen markdown vao contentHtml.',
      `Noi dung hien tai:\n${plainText.slice(0, 8000)}`,
    ].join('\n');
  };

  const handleAiRewriteBlog = React.useCallback(async () => {
    if (isAiRewriteLoading) return;
    const sourceHtml = getCurrentContentHtml();
    if (!getPlainTextFromHtml(sourceHtml).trim()) {
      toast.error('Vui long nhap noi dung bai viet truoc khi dung AI sua.');
      return;
    }

    const toastId = toast.loading('AI dang sua bai blog theo file mau...');
    setIsAiRewriteLoading(true);
    try {
      const data = await generateBlogSEO(buildAiRewritePrompt(sourceHtml, aiBlogRewriteTemplate, 'AI Sua Blog'));
      applyAiBlogDraft(data);
      toast.success('AI da cap nhat bai viet tren editor.', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'AI chua the sua bai viet.', { id: toastId });
    } finally {
      setIsAiRewriteLoading(false);
    }
  }, [author, category, content, htmlSource, isAiRewriteLoading, isHtmlMode, metaDescription, primaryKeyword, secondaryKeywords, seoTitle, slug, title]);

  const handleAiRewriteGoogle = React.useCallback(async () => {
    if (isAiGoogleRewriteLoading) return;
    const sourceHtml = getCurrentContentHtml();
    if (!getPlainTextFromHtml(sourceHtml).trim()) {
      toast.error('Vui long nhap noi dung bai viet truoc khi dung AI Sua Google.');
      return;
    }

    const toastId = toast.loading('AI dang toi uu bai viet rieng cho Google...');
    setIsAiGoogleRewriteLoading(true);
    try {
      const data = await generateBlogSEO(buildAiRewritePrompt(sourceHtml, aiGoogleRewriteTemplate, 'AI Sua Google'));
      applyAiBlogDraft(data);
      toast.success('AI da toi uu bai viet cho Google.', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'AI chua the toi uu Google.', { id: toastId });
    } finally {
      setIsAiGoogleRewriteLoading(false);
    }
  }, [author, category, content, htmlSource, isAiGoogleRewriteLoading, isHtmlMode, metaDescription, primaryKeyword, secondaryKeywords, seoTitle, slug, title]);

  const handleAiMarkdownBlog = React.useCallback(() => {
    if (isAiMarkdownLoading) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const toastId = toast.loading('AI dang doc Markdown va viet bai blog...');
      setIsAiMarkdownLoading(true);
      try {
        const markdown = await file.text();
        const data = await generateBlogSEO([
          buildAiBriefContext(markdown, 'AI Markdown'),
          `Primary keyword: ${primaryKeyword.trim() || inferPrimaryKeyword(markdown) || file.name.replace(/\.[^.]+$/, '')}`,
          `Secondary keywords: ${secondaryKeywords.trim() || inferSecondaryKeywords(markdown).join(', ') || 'AI tu suy luan'}`,
          `Tieu de hien tai cua nguoi dung: ${title || seoTitle || file.name.replace(/\.[^.]+$/, '')}`,
          'Rang buoc title: Hay tao title bai viet de doc, tu nhien va dung intent; khong can lay nguyen cau hoi trong Markdown neu title moi ro hon.',
          'Rang buoc keyword: Tu khoa chinh khong duoc lay nguyen title/cau hoi. Phai la cum danh tu ngan 2-6 tu; keywordCluster[0] phai la tu khoa chinh do.',
          'Rang buoc mo bai: Neu title la cau hoi, cau dau phai tra loi thang cau hoi; khong viet kieu "... la chu de nhieu nam gioi quan tam".',
          'Rang buoc template: File mau chi la cau truc. Tuyet doi khong copy placeholder nhu [Tieu de chua tu khoa + loi ich], [url-than-thien-seo], tu khoa 1, tu khoa 2, tu khoa 3 vao ket qua.',
          'Neu title/meta/content co chuoi trong dau ngoac vuong tu file mau, ket qua se bi xem la sai.',
          'Rang buoc anh: Khong tra src="CLOUDINARY_OR_UPLOADED_IMAGE_URL". Neu can anh, dung dung URL anh co san trong brief; neu khong co anh that thi bo figure.',
          'Rang buoc checklist diem SEO: Ket qua sau AI Sua phai co SEO Score muc publish 90-100. Neu thieu, tu bo sung truoc khi tra JSON.',
          'Bat buoc: title bai viet rieng biet voi keyword, SEO Title 60-65 ky tu neu co the, Meta description 100-160 ky tu, contentHtml plain text toi thieu 2500 ky tu, FAQ du 3 cau, internal link 3-5 cai, external link it nhat 1 nguon uy tin.',
          `Slug bat buoc: ${slug || slugify(title || file.name.replace(/\.[^.]+$/, ''))}`,
          `SEO title: ${seoTitle || title || 'Chua co'}`,
          `Meta description: ${metaDescription || 'Chua co'}`,
          `Danh muc: ${category || 'Blog'}`,
          'File mau Markdown can doc va bam theo:',
          aiBlogRewriteTemplate.slice(0, 6000),
          'Outline H2/H3: Trich xuat tu file Markdown ben duoi, giu dung y chinh va toi uu thanh bai blog HTML.',
          'Yeu cau: Bien file Markdown thanh bai blog URSport co contentHtml, FAQ, CTA, internal links va imagePrompts. Khong tra markdown.',
          `Markdown source:\n${markdown.slice(0, 12000)}`,
        ].join('\n'));
        applyAiBlogDraft(data);
        toast.success('AI da chen bai blog tu Markdown.', { id: toastId });
      } catch (error: any) {
        toast.error(error.message || 'AI chua the xu ly file Markdown.', { id: toastId });
      } finally {
        setIsAiMarkdownLoading(false);
        input.value = '';
      }
    };
    input.click();
  }, [category, isAiMarkdownLoading, metaDescription, primaryKeyword, secondaryKeywords, seoTitle, slug, title]);

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
        primaryKeyword: primaryKeyword.trim(),
        secondaryKeywords: secondaryKeywords.trim(),
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

  const currentSeoContentHtml = isHtmlMode ? htmlSource : content;
  const currentSeoPlainText = getPlainTextFromHtml(currentSeoContentHtml);
  const seoLinkStats = (() => {
    if (typeof window === 'undefined' || !window.DOMParser) {
      const internalCount = (currentSeoContentHtml.match(/href=["']\/(?!\/)[^"']+["']/gi) || []).length;
      const externalCount = (currentSeoContentHtml.match(/href=["']https?:\/\/(?![^"']*ursport\.vn)[^"']+["']/gi) || []).length;
      return { internalCount, externalCount };
    }

    const parsed = new DOMParser().parseFromString(`<div>${currentSeoContentHtml}</div>`, 'text/html');
    const links = Array.from(parsed.querySelectorAll('a[href]'));
    const internalCount = links.filter((link) => {
      const href = link.getAttribute('href') || '';
      return href.startsWith('/') || href.includes('ursport.vn') || href.includes('localhost');
    }).length;
    const externalCount = links.filter((link) => {
      const href = link.getAttribute('href') || '';
      return /^https?:\/\//i.test(href) && !href.includes('ursport.vn') && !href.includes('localhost');
    }).length;
    return { internalCount, externalCount };
  })();
  const seoChecklistItems = [
    {
      label: 'Tiêu đề bài viết',
      detail: `${title.trim().length}/70 ký tự, nên có 60-65 ký tự`,
      passed: title.trim().length >= 60 && title.trim().length <= 65,
    },
    {
      label: 'Slug URL',
      detail: slug.trim() ? slugify(slug) : 'Cần slug rõ ràng, không dấu',
      passed: slug.trim().length >= 8,
    },
    {
      label: 'SEO Title',
      detail: `${seoTitle.trim().length}/65 ký tự, nên có 60-65 ký tự`,
      passed: seoTitle.trim().length >= 60 && seoTitle.trim().length <= 65,
    },
    {
      label: 'SEO Description',
      detail: `${metaDescription.trim().length}/165 ký tự, nên có 100-160 ký tự`,
      passed: metaDescription.trim().length >= 100 && metaDescription.trim().length <= 160,
    },
    {
      label: 'Từ khóa chính',
      detail: primaryKeyword.trim() || 'Cần nhập từ khóa chính cho AI đọc',
      passed: primaryKeyword.trim().length >= 5,
    },
    {
      label: 'Từ khóa phụ',
      detail: secondaryKeywords.trim() || 'Nên có 3-8 cụm từ khóa phụ',
      passed: secondaryKeywords.split(',').map(item => item.trim()).filter(Boolean).length >= 3,
    },
    {
      label: 'Ảnh đại diện',
      detail: coverImage ? 'Đã có ảnh đại diện' : 'Cần ảnh đại diện cho bài viết',
      passed: Boolean(coverImage),
    },
    {
      label: 'Nội dung bài viết',
      detail: `${currentSeoPlainText.length} ký tự, nên có ít nhất 2500 ký tự`,
      passed: currentSeoPlainText.length >= 2500,
    },
    {
      label: 'Liên kết Internal & External',
      detail: `${seoLinkStats.internalCount} internal, ${seoLinkStats.externalCount} external - cần 3-5 internal và ít nhất 1 external uy tín`,
      passed: seoLinkStats.internalCount >= 3 && seoLinkStats.internalCount <= 5 && seoLinkStats.externalCount >= 1,
    },
  ];
  const seoScore = Math.round((seoChecklistItems.filter(item => item.passed).length / seoChecklistItems.length) * 100);
  const aiEditedLineSet = React.useMemo(() => new Set(aiEditedLineNumbers), [aiEditedLineNumbers]);
  const htmlPreviewLines = React.useMemo(() => htmlSource.split('\n'), [htmlSource]);

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
                      .product-quill-editor .ql-toolbar .html-toolbar-button,
                      .product-quill-editor .ql-toolbar .ai-toolbar-button {
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
                      .product-quill-editor .ql-toolbar .ai-toolbar-button:disabled {
                        cursor: not-allowed !important;
                        opacity: 0.55 !important;
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
                    <span className="ql-formats">
                      <button
                        type="button"
                        onClick={handleAiRewriteBlog}
                        title="AI tối ưu lại bài blog theo chuẩn SEO"
                        className="ai-toolbar-button hover:!text-[#10b981]"
                        disabled={isAiRewriteLoading}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                        <span className="text-[11px] font-black text-[#10b981]">AI Sửa Blog</span>
                      </button>
                    </span>
                    <span className="ql-formats">
                      <button
                        type="button"
                        onClick={handleAiRewriteGoogle}
                        title="AI tối ưu riêng cho Google theo file mẫu"
                        className="ai-toolbar-button hover:!text-[#f97316]"
                        disabled={isAiGoogleRewriteLoading}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#f97316]" />
                        <span className="text-[11px] font-black text-[#f97316]">AI Sửa Google</span>
                      </button>
                    </span>
                    <span className="ql-formats">
                      <button
                        type="button"
                        onClick={handleAiMarkdownBlog}
                        title="Tải file .md để AI viết bài blog SEO"
                        className="ai-toolbar-button hover:!text-[#8b5cf6]"
                        disabled={isAiMarkdownLoading}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
                        <span className="text-[11px] font-bold text-[#8b5cf6]">AI Markdown</span>
                      </button>
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

                    {aiEditedLineNumbers.length > 0 && (
                      <div className="border-b border-emerald-400/20 bg-[#10251f]">
                        <div className="flex items-center justify-between gap-3 px-4 py-2">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                              AI đã sửa
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/70">
                              Các dòng nền xanh là phần AI vừa thêm hoặc thay đổi. HTML lưu bên dưới vẫn sạch, không dính màu.
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-mono font-bold text-emerald-200">
                            {aiEditedLineNumbers.length} dòng
                          </span>
                        </div>
                        <div className="max-h-64 overflow-auto border-t border-emerald-400/10 bg-[#0b1513]">
                          <div className="grid grid-cols-[3.5rem_1fr] text-[12px] font-mono leading-6">
                            {htmlPreviewLines.map((line, index) => {
                              const lineNumber = index + 1;
                              const isAiEdited = aiEditedLineSet.has(lineNumber);
                              return (
                                <React.Fragment key={`${lineNumber}-${line}`}>
                                  <div className={cn(
                                    "select-none border-r border-white/5 px-3 text-right text-[#64748b]",
                                    isAiEdited && "bg-emerald-400/15 text-emerald-200"
                                  )}>
                                    {lineNumber}
                                  </div>
                                  <pre className={cn(
                                    "min-h-6 overflow-visible whitespace-pre-wrap break-words px-3 text-[#a9b1d6]",
                                    isAiEdited && "bg-emerald-400/15 text-emerald-50 ring-1 ring-inset ring-emerald-300/10"
                                  )}>{line || ' '}</pre>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

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
            <div className="rounded-3xl border border-amber-100 bg-[#fff8e8] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="rounded-2xl bg-white/55 px-5 py-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c75a00]">SEO SCORE</p>
                  <p className={cn(
                    "mt-1 text-4xl font-black leading-none",
                    seoScore >= 80 ? "text-emerald-600" : seoScore >= 50 ? "text-[#c75a00]" : "text-orange-700"
                  )}>
                    {seoScore}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-zinc-900">Checklist điểm SEO</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-zinc-500">
                    Hoàn thiện các mục bên dưới để AI đọc đúng keyword và tối ưu bài viết tốt hơn.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {seoChecklistItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-2 rounded-2xl bg-white/60 px-3 py-2">
                    <span className={cn(
                      "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                      item.passed ? "bg-emerald-500" : "bg-orange-300"
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-zinc-800">{item.label}</p>
                      <p className="mt-0.5 text-[11px] font-semibold leading-4 text-zinc-500">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                Từ khóa chính cho AI đọc
                <input
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#1e4b64]"
                  placeholder="Ví dụ: quần thể thao nam mặc hằng ngày"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-zinc-700">
                Từ khóa phụ cho AI đọc
                <textarea
                  value={secondaryKeywords}
                  onChange={(e) => setSecondaryKeywords(e.target.value)}
                  className="h-24 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#1e4b64]"
                  placeholder="Ví dụ: quần short thể thao nam, quần jogger nam, đồ thể thao mặc đi chơi"
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
