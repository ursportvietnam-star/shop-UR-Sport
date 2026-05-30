import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Eye, Settings, Star, Check, AlignLeft, AlignCenter, AlignRight, Type, Tag, Code, TrendingUp, Trash2, Upload, Link as LinkIcon, CircleCheck, CircleAlert, Sparkles, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ImageUpload } from './ImageUpload';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CATEGORIES } from '../data';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { normalizeProductSlug } from '../lib/productUrls';
import { uploadLocalImage } from '../lib/localMediaUpload';
import { generateProductSeoFix, generateProductDescriptionFromMd } from '../lib/gemini';

const DEFAULT_PRODUCT_SIZES = ['M', 'L', 'XL', 'XXL', '3XL', '4XL'];
const DEFAULT_PRODUCT_SIZE_TEXT = DEFAULT_PRODUCT_SIZES.join(',');
const LOCAL_PRODUCT_COPIES_STORAGE_KEY = 'ursport_local_product_copies_v1';
const LOCAL_PRODUCTS_UPDATED_EVENT = 'ursport:local-products-updated';

const normalizeProductCode = (value: string) => {
  const cleaned = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
  const withoutPrefix = cleaned.replace(/^UR-?/i, '');
  return `UR${withoutPrefix ? `-${withoutPrefix}` : ''}`;
};

const getInitialProductCode = (product?: Product | null) =>
  normalizeProductCode(product?.productCode || (product?.id ? product.id.slice(0, 8) : ''));

const stripUndefinedValues = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map(item => stripUndefinedValues(item))
      .filter(item => item !== undefined) as T;
  }

  if (!value || typeof value !== 'object') return value;

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;

  return Object.entries(value as Record<string, unknown>).reduce((acc, [key, item]) => {
    if (item !== undefined) {
      (acc as Record<string, unknown>)[key] = stripUndefinedValues(item);
    }
    return acc;
  }, {} as Record<string, unknown>) as T;
};

const loadLocalProductCopies = (): Product[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = window.localStorage.getItem(LOCAL_PRODUCT_COPIES_STORAGE_KEY);
    const parsed = cached ? JSON.parse(cached) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalProduct = (product: Product) => {
  if (typeof window === 'undefined') return;
  const existing = loadLocalProductCopies().filter(item => item.id !== product.id);
  window.localStorage.setItem(
    LOCAL_PRODUCT_COPIES_STORAGE_KEY,
    JSON.stringify([product, ...existing]),
  );
  window.dispatchEvent(new CustomEvent(LOCAL_PRODUCTS_UPDATED_EVENT));
};

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
    node.setAttribute('class', 'video-uploaded');
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
    if (domNode.hasAttribute('data-align')) {
      formats['data-align'] = domNode.getAttribute('data-align');
    }
    if (domNode.hasAttribute('alt')) {
      formats.alt = domNode.getAttribute('alt');
    }
    if (domNode.hasAttribute('title')) {
      formats.title = domNode.getAttribute('title');
    }
    return formats;
  }
  format(name, value) {
    if (['style', 'data-align', 'alt', 'title'].includes(name)) {
      if (value) {
        (this as any).domNode.setAttribute(name, value);
      } else {
        (this as any).domNode.removeAttribute(name);
      }
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
    return node;
  }
  static formats(domNode: HTMLElement) {
    return domNode.getAttribute('data-caption') === '1' ? true : undefined;
  }
}
Quill.register(CaptionBlot as any, true);
// ───────────────────────────────────────────────────────────────────────
import { Category, Product, ProductVariant } from '../types';
import { cn } from '@/lib/utils';
import {
  canonicalCategoryLabel,
  getProductCategoryOptions,
  isSameCategoryLabel,
  NavigationItem,
  normalizeMenuLabel,
  ProductCategoryOption
} from '../lib/categoryConfig';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

type ColorVariantForm = { name: string; image: string };
type ProductVariantForm = {
  id: string;
  color: string;
  size: string;
  price: string;
  stock: string;
  sku: string;
};
type VariantBulkForm = {
  price: string;
  stock: string;
  sku: string;
};
type SeoChecklistFixId =
  | 'name'
  | 'description'
  | 'seoTitle'
  | 'metaDescription'
  | 'keywords'
  | 'brand'
  | 'attributes'
  | 'variants'
  | 'images';
type SeoChecklistItem = {
  id: SeoChecklistFixId;
  label: string;
  detail: string;
  passed: boolean;
  aiFixable: boolean;
};

const parseSizeList = (value: string) => {
  const parsed = value.split(',').map(size => size.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_PRODUCT_SIZES;
};

const getVariantId = (color: string, size: string) =>
  `${color.trim().toLowerCase()}__${size.trim().toLowerCase()}`;

const buildProductSku = (productCode: string, color: string, size: string) =>
  [normalizeProductCode(productCode), color, size]
    .map(part => String(part || '').trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, ''))
    .filter(Boolean)
    .join('-');

const toVariantForm = (variant: ProductVariant): ProductVariantForm => ({
  id: variant.id || getVariantId(variant.color, variant.size),
  color: variant.color,
  size: variant.size,
  price: variant.price?.toString() || '',
  stock: variant.stock?.toString() || '',
  sku: variant.sku || '',
});

const buildVariantMatrix = (
  colorVariants: ColorVariantForm[],
  sizes: string[],
  existing: ProductVariantForm[],
  defaults: { price: string; stock: string; productCode: string },
) => {
  const existingById = new Map(existing.map(item => [item.id || getVariantId(item.color, item.size), item]));
  const colors = colorVariants.map(variant => variant.name.trim()).filter(Boolean);

  return colors.flatMap(color =>
    sizes.map(size => {
      const id = getVariantId(color, size);
      const found = existingById.get(id);
      return {
        id,
        color,
        size,
        price: found?.price || defaults.price,
        stock: found?.stock || defaults.stock,
        sku: found?.sku || buildProductSku(defaults.productCode, color, size),
      };
    }),
  );
};

const normalizeVariantPayload = (rows: ProductVariantForm[]): ProductVariant[] =>
  rows.map(row => ({
    id: row.id || getVariantId(row.color, row.size),
    color: row.color,
    size: row.size,
    price: Number(row.price || 0),
    stock: Number(row.stock || 0),
    sku: row.sku.trim() || undefined,
  }));

const stripHtmlText = (value = '') =>
  value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const clampText = (value: string, maxLength: number) => {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1).trim()}…`;
};

const cleanGeneratedProductName = (value: string) =>
  value
    .replace(/\s*\((copy|bản sao|clone|duplicate)\)\s*/gi, ' ')
    .replace(/\s+-\s+copy\b/gi, ' ')
    .replace(/\bcopy\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

interface ImageToolbarState {
  el: HTMLImageElement;
  top: number;
  left: number;
  width: number;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSuccess, product }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const leftScrollerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const salesInfoRef = useRef<HTMLElement>(null);
  const [imageToolbar, setImageToolbar] = useState<ImageToolbarState | null>(null);
  const [activeQuickTab, setActiveQuickTab] = useState<'description' | 'sales'>('description');
  const [aiFixingChecklistId, setAiFixingChecklistId] = useState<SeoChecklistFixId | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [altDraft, setAltDraft] = useState('');
  const [showAltInput, setShowAltInput] = useState(false);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; type: 'url' | 'file' | null }>({ isOpen: false, type: null });
  const [videoInput, setVideoInput] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isAiRewriteLoading, setIsAiRewriteLoading] = useState(false);
  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  const imageAltBySrcRef = useRef<Record<string, string>>({});
  const imageCaptionBySrcRef = useRef<Record<string, string>>({});
  const imagePickerOpenRef = useRef(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const [productCategoryOptions, setProductCategoryOptions] = useState(() => getProductCategoryOptions());

  // AI Writer Modal states
  const [isAiWriterModalOpen, setIsAiWriterModalOpen] = useState(false);
  const [aiWriterName, setAiWriterName] = useState('');
  const [aiWriterKeywords, setAiWriterKeywords] = useState('');
  const [aiWriterBrief, setAiWriterBrief] = useState('');
  const [isAiWriterGenerating, setIsAiWriterGenerating] = useState(false);

  const escapeHtmlAttr = (value: string) =>
    value ? value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const normalizeImageAltTitles = (html: string) => {
    if (!html || typeof window === 'undefined' || !window.DOMParser) return html;
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const isDuplicateCaptionParagraph = (element: Element | null, caption: string) => {
      if (!element || element.tagName !== 'P' || !caption) return false;
      const text = (element.textContent || '').trim();
      if (text !== caption) return false;
      if (element.getAttribute('data-caption') === '1') return true;
      if (element.classList.contains('image-caption')) return true;
      const em = element.querySelector('em');
      return Boolean(
        element.classList.contains('ql-align-center') &&
        em &&
        (em.textContent || '').trim() === caption
      );
    };

    doc.body.querySelectorAll('img').forEach(originalImg => {
      const img = originalImg as HTMLImageElement;
      const src = img.getAttribute('src') || '';
      const alt = (imageAltBySrcRef.current[src] || img.getAttribute('alt') || img.getAttribute('title') || '').trim();
      if (alt) {
        img.setAttribute('alt', alt);
        img.setAttribute('title', alt);
      } else {
        img.removeAttribute('alt');
        img.removeAttribute('title');
      }

      const existingFigure = img.closest('figure');
      const legacyParagraph = img.closest('p');
      const legacyNext = legacyParagraph?.nextElementSibling as HTMLElement | null;
      const existingFigcaption = existingFigure?.querySelector('figcaption') as HTMLElement | null;
      const legacyCaption = legacyNext?.getAttribute('data-caption') === '1' ? (legacyNext.textContent || '').trim() : '';
      const figureCaption = existingFigcaption ? (existingFigcaption.textContent || '').trim() : '';
      const caption = (imageCaptionBySrcRef.current[src] || figureCaption || legacyCaption).trim();

      if (isDuplicateCaptionParagraph(legacyNext, caption)) {
        legacyNext.remove();
      }
      if (existingFigcaption) existingFigcaption.remove();

      let figure = existingFigure as HTMLElement | null;
      if (!figure) {
        figure = doc.createElement('figure');
        figure.setAttribute('class', 'image-figure');
        const wrapper = legacyParagraph || img.parentElement;
        if (wrapper?.parentNode) {
          wrapper.parentNode.insertBefore(figure, wrapper);
          figure.appendChild(img);
          if (legacyParagraph && legacyParagraph.textContent?.trim() === '') {
            legacyParagraph.remove();
          }
        }
      } else {
        figure.setAttribute('class', 'image-figure');
      }

      const dataAlign = img.getAttribute('data-align');
      img.getAttributeNames().forEach(name => {
        if (!['src', 'alt', 'title', 'class', 'data-align'].includes(name)) {
          img.removeAttribute(name);
        }
      });
      if (!dataAlign) img.removeAttribute('data-align');
      if (caption && figure) {
        const captionEl = doc.createElement('figcaption');
        captionEl.setAttribute('class', 'image-caption');
        captionEl.textContent = caption;
        figure.appendChild(captionEl);
      }

      let sibling = figure?.nextElementSibling;
      while (isDuplicateCaptionParagraph(sibling, caption)) {
        const nextSibling = sibling?.nextElementSibling || null;
        sibling?.remove();
        sibling = nextSibling;
      }
    });
    return doc.body.firstElementChild?.innerHTML || html;
  };

  const getCurrentEditorHtml = () => {
    const html = quillRef.current?.getEditor()?.root?.innerHTML;
    return normalizeImageAltTitles(typeof html === 'string' ? html : formData.description);
  };

  const commitEditorHtml = () => {
    const html = getCurrentEditorHtml();
    setFormData(prev => ({ ...prev, description: html }));
    return html;
  };

  const getImageAlignStyle = (align: 'left' | 'center' | 'right') => {
    return '';
  };

  const syncEditorHtml = () => {
    commitEditorHtml();
  };

  const insertHtmlIntoEditor = (html: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection(true);
        const insertIndex = range?.index ?? quill.getLength();
    quill.clipboard.dangerouslyPasteHTML(insertIndex, html, 'user');
    quill.setSelection(insertIndex + 1, 0, 'user');
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
      const current = getCurrentEditorHtml();
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
    productCode: 'UR',
    name: '',
    price: '',
    discountPrice: '',
    category: CATEGORIES[0],
    description: '',
    stock: '',
    sizes: DEFAULT_PRODUCT_SIZE_TEXT,
    sizeGuideUrl: '',
    slug: '',
    seoTitle: '',
    metaDescription: '',
    keywords: '',
    colorVariants: [] as ColorVariantForm[],
    variants: [] as ProductVariantForm[],
    variantBulk: {
      price: '',
      stock: '',
      sku: '',
    } as VariantBulkForm,
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

  const uploadProductDescriptionImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Vui long chon file anh hop le.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File qua lon! Toi da 10MB.');
    }

    return uploadLocalImage(file, 'product-descriptions');
  };

  const buildAiRewritePrompt = React.useCallback((currentDescription: string) => {
    const context = [
      `Tên sản phẩm: ${formData.name || 'Sản phẩm URSport'}`,
      `Danh mục: ${formData.category || 'Chưa chọn'}`,
      `Thương hiệu: ${formData.brand || 'UR SPORT'}`,
      `Xuất xứ: ${formData.origin || 'Việt Nam'}`,
      `Chất liệu: ${formData.material || 'Cotton Premium'}`,
      `Phong cách/Form: ${formData.style || formData.fashionStyle || 'Slim Fit'}`,
      `Từ khóa SEO hiện tại: ${formData.keywords || 'Không có'}`,
      `Mô tả hiện tại: ${currentDescription || 'Chưa có mô tả hiện tại'}`,
      'Yêu cầu: Viết lại toàn bộ phần mô tả sản phẩm theo đúng cấu trúc của PRODUCT_SKILL.md. Nội dung phải có HTML semantic, <h2>, <ul><li>, <strong>, không dùng markdown, và vẫn giữ đúng thông tin sản phẩm hiện có. Trả về đúng JSON thuần: {"seoTitle":"...","metaDescription":"...","keywords":"...","shortDescription":"...","descriptionHtml":"..."}.',
    ];
    return context.join('\n');
  }, [formData.name, formData.category, formData.brand, formData.origin, formData.material, formData.style, formData.fashionStyle, formData.keywords]);

  const applyDescriptionHtml = (html: string) => {
    if (isHtmlMode) {
      setHtmlSource(beautifyHtml(html));
    }
    setFormData(prev => ({ ...prev, description: html }));
  };

  const handleAiRewriteDescription = React.useCallback(async () => {
    if (isAiRewriteLoading) return;
    const currentDescription = isHtmlMode ? htmlSource : getCurrentEditorHtml();
    const prompt = buildAiRewritePrompt(stripHtmlText(currentDescription));
    const toastId = toast.loading('AI đang sửa mô tả sản phẩm theo cấu trúc...');
    setIsAiRewriteLoading(true);
    try {
      const fix = await generateProductSeoFix(prompt);
      if (fix.descriptionHtml) {
        applyDescriptionHtml(fix.descriptionHtml);
      }
      setFormData(prev => ({
        ...prev,
        seoTitle: fix.seoTitle || prev.seoTitle,
        metaDescription: fix.metaDescription || prev.metaDescription,
        keywords: fix.keywords || prev.keywords,
      }));
      toast.success('AI đã sửa xong mô tả sản phẩm', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'AI chưa thể sửa mô tả', { id: toastId });
    } finally {
      setIsAiRewriteLoading(false);
    }
  }, [applyDescriptionHtml, buildAiRewritePrompt, getCurrentEditorHtml, htmlSource, isAiRewriteLoading, isHtmlMode]);

  const handleProductDescriptionImageInsert = React.useCallback(async () => {
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

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        unlockPicker();
        return;
      }

      const toastId = toast.loading('Dang tai anh len mo ta...');
      try {
        const imageUrl = await uploadProductDescriptionImage(file);
        const imageHtml = `<p><img src="${escapeHtmlAttr(imageUrl)}" alt="" title="" data-align="center" /></p><p><br></p>`;

        if (isHtmlMode) {
          setHtmlSource(prev => beautifyHtml(`${prev || ''}\n${imageHtml}`.trim()));
        } else {
          insertHtmlIntoEditor(imageHtml);
        }

        toast.success('Da chen anh thanh cong', { id: toastId });
      } catch (error: any) {
        toast.error(error.message || 'Loi khi tai anh', { id: toastId });
      } finally {
        input.value = '';
        unlockPicker();
      }
    };

    input.oncancel = unlockPicker;
    window.setTimeout(unlockPicker, 15000);
    input.click();
  }, [isHtmlMode]);

  const handleMarkdownAiUpload = React.useCallback(() => {
    setAiWriterName(formData.name || '');
    setAiWriterKeywords(formData.keywords || '');
    setAiWriterBrief('');
    setIsAiWriterModalOpen(true);
  }, [formData.name, formData.keywords]);

  const handleLoadMdFile = React.useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.md, text/markdown';
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const text = await file.text();
      setAiWriterBrief(text);
      toast.success('Đã tải nội dung file Markdown!');
    };
    fileInput.click();
  }, []);

  const handleAiWriterGenerate = async () => {
    if (!aiWriterName.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm');
      return;
    }
    setIsAiWriterGenerating(true);
    const toastId = toast.loading('AI đang phân tích và viết bài mô tả...');
    try {
      const result = await generateProductDescriptionFromMd(
        aiWriterBrief,
        aiWriterName,
        aiWriterKeywords
      );
      if (result && result.contentHtml) {
        applyDescriptionHtml(result.contentHtml);
        
        // Also sync name and keywords back to the main form
        setFormData(prev => ({
          ...prev,
          name: aiWriterName,
          keywords: aiWriterKeywords
        }));

        setIsAiWriterModalOpen(false);
        toast.success('AI đã hoàn thiện và chèn mô tả sản phẩm!', { id: toastId });
      } else {
        throw new Error('AI không trả về nội dung HTML');
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi AI viết bài', { id: toastId });
    } finally {
      setIsAiWriterGenerating(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    getDoc(doc(db, 'settings', 'navigation'))
      .then(snap => {
        const items = snap.exists() ? (snap.data().items || []) as NavigationItem[] : [];
        setProductCategoryOptions(getProductCategoryOptions(items));
      })
      .catch(() => {
        setProductCategoryOptions(getProductCategoryOptions());
      });
  }, [isOpen]);

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
      const variants = (product.variants || []).map(toVariantForm);

      setFormData({
        productCode: getInitialProductCode(product),
        name: product.name || '',
        price: product.price?.toString() || '',
        discountPrice: product.discountPrice?.toString() || '',
        category: (canonicalCategoryLabel(product.category) || CATEGORIES[0]) as Category,
        description: product.description || '',
        stock: product.stock?.toString() || '',
        sizes: product.sizes?.join(', ') || '',
        sizeGuideUrl: product.sizeGuideUrl || '',
        slug: product.slug || '',
        seoTitle: product.seoTitle || '',
        metaDescription: product.metaDescription || '',
        keywords: product.keywords || '',
        colorVariants,
        variants,
        variantBulk: {
          price: product.price?.toString() || '',
          stock: product.stock?.toString() || '',
          sku: getInitialProductCode(product),
        },
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
      imageAltBySrcRef.current = {};
      imageCaptionBySrcRef.current = {};
      if (product.description && typeof window !== 'undefined' && window.DOMParser) {
        const doc = new DOMParser().parseFromString(`<div>${product.description}</div>`, 'text/html');
        doc.body.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src') || '';
          if (!src) return;
          const alt = (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
          if (alt) imageAltBySrcRef.current[src] = alt;
          const figcaption = img.closest('figure')?.querySelector('figcaption');
          const next = img.closest('p')?.nextElementSibling as HTMLElement | null;
          const caption = (
            figcaption?.textContent ||
            (next?.getAttribute('data-caption') === '1' ? next.textContent : '') ||
            ''
          ).trim();
          if (caption) imageCaptionBySrcRef.current[src] = caption;
        });
      }
      setHtmlSource(product.description || '');
    } else {
      imageAltBySrcRef.current = {};
      imageCaptionBySrcRef.current = {};
      setFormData({
        productCode: 'UR',
        name: '',
        price: '',
        discountPrice: '',
        category: CATEGORIES[0],
        description: '',
        stock: '',
        sizes: DEFAULT_PRODUCT_SIZE_TEXT,
        sizeGuideUrl: '',
        slug: '',
        seoTitle: '',
        metaDescription: '',
        keywords: '',
        colorVariants: [],
        variants: [],
        variantBulk: {
          price: '',
          stock: '',
          sku: '',
        },
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
            try {
              const imageUrl = await uploadLocalImage(file, 'product-descriptions');
              
              const quill = quillRef.current?.getEditor();
              if (quill) {
                const range = quill.getSelection(true);
                const insertIndex = range?.index ?? quill.getLength();
                quill.clipboard.dangerouslyPasteHTML(
                  insertIndex,
                  `<p><img src="${escapeHtmlAttr(imageUrl)}" alt="" title="" data-align="center" /></p><p><br></p>`,
                  'user'
                );
                quill.setSelection(insertIndex + 1);
                quill.update('user');
                syncEditorHtml();
              }
              toast.success('Đã chèn ảnh thành công', { id: toastId });
            } catch (error: any) {
              toast.error(error.message || 'Lỗi khi tải ảnh', { id: toastId });
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
        const insertIndex = range?.index ?? quill.getLength();

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
    quill.insertEmbed(insertIndex, 'videoContainer', videoUrl, 'user');
    quill.setSelection(insertIndex + 1, 0, 'user');
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
        const insertIndex = range?.index ?? quill.getLength();
        quill.insertEmbed(insertIndex, 'uploadedVideo', data.secure_url, 'user');
        quill.setSelection(insertIndex + 1, 0, 'user');
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

    const productCode = normalizeProductCode(formData.productCode);

    setIsSubmitting(true);
    try {
      const parsedSizes = formData.sizes.split(',').map(c => c.trim()).filter(Boolean);
      const validVariants = formData.colorVariants.filter(v => v.name.trim() !== '');
      const finalSizes = parsedSizes.length > 0 ? parsedSizes : DEFAULT_PRODUCT_SIZES;
      const variantRows = buildVariantMatrix(validVariants, finalSizes, formData.variants, {
        price: formData.price,
        stock: formData.stock,
        productCode,
      });
      const productVariants = normalizeVariantPayload(variantRows);
      const totalVariantStock = productVariants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
      
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
      
      const finalDescription = normalizeImageAltTitles(isHtmlMode ? htmlSource : getCurrentEditorHtml());
      if (isHtmlMode) {
        setHtmlSource(finalDescription);
      } else {
        setFormData(prev => ({ ...prev, description: finalDescription }));
      }

      const payload = stripUndefinedValues({
        productCode,
        name: formData.name,
        description: finalDescription,
        category: canonicalCategoryLabel(formData.category) as Category,
        colors: validVariants.map(v => v.name.trim()),
        colorImages: validVariants.map(v => ({ name: v.name.trim(), image: v.image })),
        images: allImages,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
        stock: productVariants.length > 0 ? totalVariantStock : Number(formData.stock),
        sizes: finalSizes,
        variants: productVariants,
        sizeGuideUrl: formData.sizeGuideUrl,
        slug: normalizeProductSlug(formData.slug, formData.name),
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
      });

      if (product && product.id && !product.id.startsWith('ai_')) {
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
      
      // Reset form ONLY for new product additions
      if (!product || (product && product.id && product.id.startsWith('ai_'))) {
        onClose();
        setFormData({
          productCode: 'UR',
          name: '',
          price: '',
          discountPrice: '',
          category: CATEGORIES[0],
          description: '',
          stock: '',
          sizes: DEFAULT_PRODUCT_SIZE_TEXT,
          sizeGuideUrl: '',
          slug: '',
          seoTitle: '',
          metaDescription: '',
          keywords: '',
          colorVariants: [],
          variants: [],
          variantBulk: {
            price: '',
            stock: '',
            sku: '',
          },
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
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      console.error('Error saving product:', error, {
        productId: product?.id,
        category: formData.category,
        canonicalCategory: canonicalCategoryLabel(formData.category)
      });

      const isLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocalhost) {
        const localId = product && product.id && !product.id.startsWith('ai_')
          ? product.id
          : `local-product-${Date.now()}`;
        const localSizes = parseSizeList(formData.sizes);
        const localColorVariants = formData.colorVariants.filter(v => v.name.trim());
        const localVariantRows = buildVariantMatrix(localColorVariants, localSizes, formData.variants, {
          price: formData.price,
          stock: formData.stock,
          productCode,
        });
        const localProductVariants = normalizeVariantPayload(localVariantRows);
        const localTotalStock = localProductVariants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
        const localProduct = stripUndefinedValues({
          ...(product || {}),
          productCode,
          name: formData.name,
          description: isHtmlMode ? htmlSource : getCurrentEditorHtml(),
          category: canonicalCategoryLabel(formData.category) as Category,
          colors: formData.colorVariants.filter(v => v.name.trim()).map(v => v.name.trim()),
          colorImages: formData.colorVariants.filter(v => v.name.trim()).map(v => ({ name: v.name.trim(), image: v.image })),
          images: [
            formData.coverImage,
            ...formData.colorVariants.map(v => v.image),
            ...formData.extraImages
          ].filter(Boolean),
          price: Number(formData.price),
          discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
          stock: localProductVariants.length > 0 ? localTotalStock : Number(formData.stock),
          sizes: localSizes,
          variants: localProductVariants,
          sizeGuideUrl: formData.sizeGuideUrl,
          slug: normalizeProductSlug(formData.slug, formData.name),
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
          collarType: formData.collarType,
          id: localId,
          rating: product?.rating || 0,
          reviewsCount: product?.reviewsCount || 0,
          createdAt: product?.createdAt
        }) as Product;
        saveLocalProduct(localProduct);
        toast.success('Đã lưu sản phẩm trên local');
        onSuccess();
        if (!product || product.id.startsWith('ai_')) onClose();
        return;
      }

      toast.error(`Lỗi khi lưu sản phẩm: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Image click handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const editorWrap = editorWrapRef.current;
    if (!editorWrap) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.img-float-toolbar')) return;

      const img = target.closest('.ql-editor img') as HTMLImageElement | null;
      if (img) {
        selectedImgRef.current = img;
        const src = img.getAttribute('src') || '';
        setAltDraft(imageAltBySrcRef.current[src] || img.getAttribute('alt') || img.getAttribute('title') || '');
        setShowAltInput(false);

        const wrapRect = editorWrap.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        setImageToolbar({
          el: img,
          top: Math.max(0, imgRect.top - wrapRect.top - 44),
          left: Math.max(0, imgRect.left - wrapRect.left),
          width: imgRect.width,
        });

        const figcaption = img.closest('figure')?.querySelector('figcaption');
        const next = img.closest('p')?.nextElementSibling;
        if (figcaption || next?.getAttribute('data-caption') === '1') {
          setCaptionDraft(imageCaptionBySrcRef.current[src] || figcaption?.textContent || next?.textContent || '');
          setShowCaption(true);
        } else {
          setCaptionDraft(imageCaptionBySrcRef.current[src] || '');
          setShowCaption(false);
        }
      } else {
        setImageToolbar(null);
        setShowCaption(false);
        setShowAltInput(false);
      }
    };

    editorWrap.addEventListener('click', handleClick);
    return () => editorWrap.removeEventListener('click', handleClick);
  }, [isOpen]);

  const applyImageAlign = (align: 'left' | 'center' | 'right') => {
    const img = selectedImgRef.current;
    if (!img) return;
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const blot = Quill.find(img);
    if (blot) {
      (blot as any).format('data-align', align);
      (blot as any).format('style', '');
    }
    img.setAttribute('data-align', align);
    img.removeAttribute('style');
    const caption = img.closest('p')?.nextElementSibling as HTMLElement | null;
    if (caption?.getAttribute('data-caption') === '1') {
      caption.style.textAlign = 'center';
    }
    quill.update('silent');
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
    const src = img.getAttribute('src') || '';
    if (!src) {
      toast.error('Khong tim thay anh de them ghi chu');
      return;
    }

    const captionText = captionDraft.trim();
    if (captionText) {
      imageCaptionBySrcRef.current[src] = captionText;
    } else {
      delete imageCaptionBySrcRef.current[src];
    }

    const html = normalizeImageAltTitles(quill.root.innerHTML);
    setFormData(prev => ({ ...prev, description: html }));
    setShowCaption(false);
    setImageToolbar(null);
    toast.success('Đã áp dụng ghi chú ảnh');
  };

  const applyImageAlt = () => {
    const img = selectedImgRef.current;
    if (!img) return;
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const alt = altDraft.trim();
    const src = img.getAttribute('src') || '';
    if (src) {
      if (alt) {
        imageAltBySrcRef.current[src] = alt;
      } else {
        delete imageAltBySrcRef.current[src];
      }
    }
    const blot = Quill.find(img);
    if (blot) {
      (blot as any).format('alt', alt);
      (blot as any).format('title', alt);
    }
    if (alt) {
      img.setAttribute('alt', alt);
      img.setAttribute('title', alt);
    } else {
      img.removeAttribute('alt');
      img.removeAttribute('title');
    }

    quill.update('silent');
    syncEditorHtml();
    setShowAltInput(false);
    toast.success(alt ? 'Đã thêm thẻ alt cho ảnh' : 'Đã xóa thẻ alt khỏi ảnh');
  };

  const selectedSizes = React.useMemo(() => parseSizeList(formData.sizes), [formData.sizes]);
  const variantMatrixRows = React.useMemo(
    () => buildVariantMatrix(formData.colorVariants, selectedSizes, formData.variants, {
      price: formData.price,
      stock: formData.stock,
      productCode: formData.productCode,
    }),
    [formData.colorVariants, formData.sizes, formData.variants, formData.price, formData.stock, formData.productCode, selectedSizes],
  );
  const variantStockTotal = variantMatrixRows.reduce((sum, row) => sum + Number(row.stock || 0), 0);

  const updateVariantRow = (id: string, field: keyof Pick<ProductVariantForm, 'price' | 'stock' | 'sku'>, value: string) => {
    setFormData(prev => {
      const rows = buildVariantMatrix(prev.colorVariants, parseSizeList(prev.sizes), prev.variants, {
        price: prev.price,
        stock: prev.stock,
        productCode: prev.productCode,
      });
      return {
        ...prev,
        variants: rows.map(row => row.id === id ? { ...row, [field]: value } : row),
      };
    });
  };

  const applyBulkToVariants = () => {
    setFormData(prev => {
      const rows = buildVariantMatrix(prev.colorVariants, parseSizeList(prev.sizes), prev.variants, {
        price: prev.price,
        stock: prev.stock,
        productCode: prev.productCode,
      });
      return {
        ...prev,
        variants: rows.map(row => ({
          ...row,
          price: prev.variantBulk.price || row.price,
          stock: prev.variantBulk.stock || row.stock,
          sku: prev.variantBulk.sku
            ? buildProductSku(prev.variantBulk.sku, row.color, row.size)
            : row.sku,
        })),
      };
    });
    toast.success('Da ap dung cho tat ca phan loai');
  };

  const parentCategoryOptions = productCategoryOptions.filter(option => !option.parent);
  const getChildCategoryOptions = (parentLabel: string) => productCategoryOptions.filter(
    option => option.parent && normalizeMenuLabel(option.parent) === normalizeMenuLabel(parentLabel)
  );
  const orphanCategoryOptions = productCategoryOptions.filter(option =>
    option.parent && !parentCategoryOptions.some(parent => normalizeMenuLabel(parent.label) === normalizeMenuLabel(option.parent))
  );

  const scrollToQuickSection = (section: 'description' | 'sales') => {
    setActiveQuickTab(section);
    const target = section === 'description' ? editorWrapRef.current : salesInfoRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLeftColumnScroll = () => {
    const scroller = leftScrollerRef.current;
    const salesSection = salesInfoRef.current;
    if (!scroller || !salesSection) return;

    const scrollerTop = scroller.getBoundingClientRect().top;
    const salesTop = salesSection.getBoundingClientRect().top - scrollerTop;
    setActiveQuickTab(salesTop <= 120 ? 'sales' : 'description');
  };

  const currentDescriptionHtml = isHtmlMode ? htmlSource : formData.description;
  const currentDescriptionText = stripHtmlText(currentDescriptionHtml);
  const imageCount = React.useMemo(() => {
    const galleryImages = formData.extraImages.filter(Boolean);
    const variantImagesNotInGallery = formData.colorVariants
      .map(variant => variant.image)
      .filter(image => image && !galleryImages.includes(image));
    const coverImageCount = formData.coverImage && !galleryImages.includes(formData.coverImage) ? 1 : 0;
    return galleryImages.length + variantImagesNotInGallery.length + coverImageCount;
  }, [formData.coverImage, formData.extraImages, formData.colorVariants]);
  const keywordCount = formData.keywords.split(',').map(keyword => keyword.trim()).filter(Boolean).length;
  const filledAttributeCount = [
    formData.brand,
    formData.origin,
    formData.style,
    formData.material,
    formData.fashionStyle,
    formData.collarType,
  ].filter(Boolean).length;
  const seoChecklistItems: SeoChecklistItem[] = [
    {
      id: 'name',
      label: 'Tên sản phẩm chuẩn SEO',
      detail: `${formData.name.trim().length}/100 ký tự, nên có 25-100 ký tự`,
      passed: formData.name.trim().length >= 25 && formData.name.trim().length <= 100,
      aiFixable: true,
    },
    {
      id: 'images',
      label: 'Ảnh sản phẩm đầy đủ',
      detail: `${imageCount}/5 ảnh, nên có ít nhất 5 ảnh rõ sản phẩm`,
      passed: imageCount >= 5,
      aiFixable: false,
    },
    {
      id: 'description',
      label: 'Mô tả đủ nội dung',
      detail: `${currentDescriptionText.length} ký tự, nên có từ 700 ký tự hoặc hơn`,
      passed: currentDescriptionText.length >= 700,
      aiFixable: true,
    },
    {
      id: 'seoTitle',
      label: 'SEO Title đạt chuẩn',
      detail: `${formData.seoTitle.trim().length}/65 ký tự, nên có 35-65 ký tự`,
      passed: formData.seoTitle.trim().length >= 35 && formData.seoTitle.trim().length <= 65,
      aiFixable: true,
    },
    {
      id: 'metaDescription',
      label: 'Meta Description đạt chuẩn',
      detail: `${formData.metaDescription.trim().length}/165 ký tự, nên có 120-165 ký tự`,
      passed: formData.metaDescription.trim().length >= 120 && formData.metaDescription.trim().length <= 165,
      aiFixable: true,
    },
    {
      id: 'keywords',
      label: 'Từ khóa SEO',
      detail: `${keywordCount}/8 từ khóa, nên có ít nhất 8 cụm từ khóa`,
      passed: keywordCount >= 8,
      aiFixable: true,
    },
    {
      id: 'brand',
      label: 'Thương hiệu và xuất xứ',
      detail: formData.brand && formData.origin ? `${formData.brand} - ${formData.origin}` : 'Cần đủ thương hiệu và xuất xứ',
      passed: Boolean(formData.brand && formData.origin),
      aiFixable: true,
    },
    {
      id: 'attributes',
      label: 'Thuộc tính sản phẩm',
      detail: `${filledAttributeCount}/6 trường chi tiết đã nhập`,
      passed: filledAttributeCount >= 6,
      aiFixable: true,
    },
    {
      id: 'variants',
      label: 'Phân loại bán hàng',
      detail: `${formData.colorVariants.filter(variant => variant.name.trim()).length} màu, ${selectedSizes.length} size, ${variantMatrixRows.length} dòng`,
      passed: formData.colorVariants.some(variant => variant.name.trim()) && selectedSizes.length >= 3 && variantMatrixRows.length >= 3,
      aiFixable: true,
    },
  ];
  const passedChecklistCount = seoChecklistItems.filter(item => item.passed).length;
  const seoChecklistScore = Math.round((passedChecklistCount / seoChecklistItems.length) * 100);
  const seoChecklistReady = passedChecklistCount === seoChecklistItems.length;

  const buildFallbackDescription = () => {
    const name = formData.name.trim() || 'Áo thun nam URSport';
    const material = formData.material.trim() || 'Cotton Premium';
    const style = formData.style.trim() || 'regular fit';
    const brand = formData.brand.trim() || 'UR SPORT';
    return [
      `<h2>${name} - lựa chọn dễ mặc cho nam giới năng động</h2>`,
      `<p><strong>${name}</strong> được phát triển cho nhu cầu mặc hằng ngày, đi chơi, tập luyện nhẹ và phối đồ thể thao nam. Sản phẩm tập trung vào cảm giác thoải mái, phom gọn và độ linh hoạt khi vận động.</p>`,
      `<h2>Chất liệu và form dáng</h2>`,
      `<p>Chất liệu ${material} cho bề mặt vải mềm, dễ chịu trên da và phù hợp khí hậu nóng ẩm. Form ${style} giúp áo lên dáng gọn, không quá bó và không quá rộng, dễ phối cùng quần short, jogger hoặc quần thể thao.</p>`,
      `<h2>Điểm nổi bật</h2>`,
      `<ul><li>Dễ mặc trong nhiều hoàn cảnh: đi làm, đi chơi, tập luyện nhẹ.</li><li>Thiết kế nam tính, tối giản, dễ phối màu.</li><li>Có nhiều lựa chọn màu và size để chọn đúng nhu cầu.</li><li>Phù hợp khách hàng thích phong cách thể thao gọn gàng.</li></ul>`,
      `<h2>Gợi ý chọn size và bảo quản</h2>`,
      `<p>Hãy chọn size theo số đo cơ thể và thói quen mặc ôm hoặc rộng. Khi giặt, nên lộn trái sản phẩm, giặt với màu tương đồng và hạn chế sấy nhiệt cao để giữ form vải tốt hơn.</p>`,
      `<p>${brand} khuyến khích kiểm tra kỹ bảng size, màu sắc và tồn kho phân loại trước khi đặt hàng để chọn đúng sản phẩm phù hợp nhất.</p>`,
    ].join('');
  };

  const buildSmartSeoTitle = () =>
    clampText(`${cleanGeneratedProductName(formData.name) || 'Áo Thun Nam URSport'} | URSport`, 65);

  const buildSmartMetaDescription = () =>
    clampText(`${cleanGeneratedProductName(formData.name) || 'Áo thun nam URSport'} chất liệu ${formData.material || 'thoáng mát'}, form ${formData.style || 'dễ mặc'}, nhiều màu size. Xem giá và ưu đãi tại URSport.`, 165);

  const buildSmartProductName = () => {
    const rawName = cleanGeneratedProductName(formData.name);
    const categoryText = `${formData.category || ''} ${rawName}`.toLowerCase();
    const isPants = /quần|quan|short|jogger/.test(categoryText);
    const isPolo = /polo/.test(categoryText);
    const baseName = rawName || (isPants ? 'Quần thể thao nam' : isPolo ? 'Áo polo nam' : 'Áo thun nam');
    const normalizedBase = baseName
      .replace(/\bSlim Fit\b/gi, '')
      .replace(/\bCotton Premium\b/gi, '')
      .replace(/\bURSport\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const material = formData.material && !/chưa|chua/i.test(formData.material)
      ? formData.material
      : isPants
        ? 'vải co giãn'
        : 'Cotton Premium';
    const style = formData.style && !/chưa|chua/i.test(formData.style)
      ? formData.style
      : isPants
        ? 'ống suông'
        : 'form regular';
    const productTypeName = isPants
      ? normalizedBase.replace(/áo thun|ao thun|áo polo|ao polo/gi, 'Quần thể thao').trim()
      : normalizedBase.replace(/quần thể thao|quan the thao|quần short|quan short|jogger/gi, isPolo ? 'Áo polo' : 'Áo thun').trim();

    return clampText(`${productTypeName} ${material} ${style} URSport`, 100);
  };

  const buildChecklistFixPrompt = (item: SeoChecklistItem) => `
Hay cap nhat noi dung san pham de dat tieu chi: ${item.label}.

Du lieu hien tai:
- Ten: ${formData.name}
- Danh muc: ${formData.category}
- Gia: ${formData.price}
- Thuong hieu: ${formData.brand || 'UR SPORT'}
- Xuat xu: ${formData.origin || 'Viet Nam'}
- Chat lieu: ${formData.material || 'chua nhap'}
- Form: ${formData.style || 'chua nhap'}
- Mau: ${formData.colorVariants.map(variant => variant.name).filter(Boolean).join(', ') || 'chua nhap'}
- Size: ${selectedSizes.join(', ')}
- SEO title: ${formData.seoTitle}
- Meta description: ${formData.metaDescription}
- Keywords: ${formData.keywords}
- Mo ta hien tai: ${currentDescriptionText.slice(0, 1600) || 'chua co'}

Yeu cau: chi dua tren du lieu co that, khong bia thong so, gia, ton kho, bao hanh.`;

  const handleChecklistAiFix = async (item: SeoChecklistItem) => {
    if (item.passed || aiFixingChecklistId) return;
    setAiFixingChecklistId(item.id);

    try {
      if (item.id === 'name') {
        const smartName = buildSmartProductName();
        setFormData(prev => ({
          ...prev,
          name: smartName,
          slug: normalizeProductSlug(prev.slug && !/\bcopy\b|\(copy\)/i.test(prev.slug) ? prev.slug : smartName),
        }));
        toast.success('AI đã cập nhật tên sản phẩm');
        return;
      }

      if (item.id === 'brand') {
        setFormData(prev => ({ ...prev, brand: prev.brand || 'UR SPORT', origin: prev.origin || 'Việt Nam' }));
        toast.success('Đã bổ sung thương hiệu và xuất xứ');
        return;
      }

      if (item.id === 'attributes') {
        setFormData(prev => ({
          ...prev,
          brand: prev.brand || 'UR SPORT',
          origin: prev.origin || 'Việt Nam',
          style: prev.style || 'Regular Fit',
          material: prev.material || 'Cotton Premium',
          fashionStyle: prev.fashionStyle || 'Thể thao, cơ bản, dễ phối',
          collarType: prev.collarType || 'Cổ tròn',
        }));
        toast.success('Đã bổ sung thuộc tính sản phẩm');
        return;
      }

      if (item.id === 'variants') {
        setFormData(prev => ({
          ...prev,
          sizes: prev.sizes.trim() ? prev.sizes : DEFAULT_PRODUCT_SIZE_TEXT,
          colorVariants: prev.colorVariants.length > 0
            ? prev.colorVariants
            : [{ name: 'Đen', image: '' }, { name: 'Trắng', image: '' }, { name: 'Xám', image: '' }],
          stock: prev.stock || '10',
          variantBulk: {
            price: prev.variantBulk.price || prev.price,
            stock: prev.variantBulk.stock || prev.stock || '10',
            sku: prev.variantBulk.sku || prev.productCode,
          },
        }));
        toast.success('Đã tạo khung phân loại bán hàng');
        return;
      }

      const fix = await generateProductSeoFix(buildChecklistFixPrompt(item));
      setFormData(prev => ({
        ...prev,
        seoTitle: fix.seoTitle || prev.seoTitle || buildSmartSeoTitle(),
        metaDescription: fix.metaDescription || prev.metaDescription || buildSmartMetaDescription(),
        keywords: fix.keywords || prev.keywords,
      }));
      if (item.id === 'description' && fix.descriptionHtml) {
        applyDescriptionHtml(fix.descriptionHtml);
      } else if (item.id === 'description') {
        applyDescriptionHtml(buildFallbackDescription());
      }
      toast.success('AI đã cập nhật checklist SEO');
    } catch (error: any) {
      if (['description', 'seoTitle', 'metaDescription', 'keywords'].includes(item.id)) {
        setFormData(prev => ({
          ...prev,
          seoTitle: prev.seoTitle || buildSmartSeoTitle(),
          metaDescription: prev.metaDescription || buildSmartMetaDescription(),
          keywords: prev.keywords || 'áo thun nam, áo thun thể thao nam, áo cotton nam, áo nam thoáng mát, áo nam form regular, đồ thể thao nam, thời trang nam URSport, áo nam dễ phối',
        }));
        if (item.id === 'description') applyDescriptionHtml(buildFallbackDescription());
        toast.success('Đã dùng bản cập nhật nhanh trong form');
      } else {
        toast.error(error.message || 'AI chưa cập nhật được mục này');
      }
    } finally {
      setAiFixingChecklistId(null);
    }
  };

  const renderCategoryOption = (option: ProductCategoryOption, isChild = false) => {
    const cat = option.label;

    return (
      <label key={cat} className={cn(
        "flex items-center gap-3 cursor-pointer group py-1",
        isChild && "ml-8 pl-4 border-l border-zinc-200"
      )}>
        <div className="relative flex items-center justify-center">
          <input
            type="radio"
            name="category"
            value={cat}
            checked={isSameCategoryLabel(formData.category, cat)}
            onChange={(e) => setFormData({ ...formData, category: canonicalCategoryLabel(e.target.value) as Category })}
            className="peer appearance-none w-[18px] h-[18px] border-[1.5px] border-zinc-300 rounded-full checked:border-[#10b981] transition-colors cursor-pointer"
          />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#10b981] scale-0 peer-checked:scale-100 transition-transform pointer-events-none" />
        </div>
        <span className={cn(
          "text-[14px] transition-colors",
          isSameCategoryLabel(formData.category, cat) ? "text-[#10b981] font-bold" : "text-zinc-600 font-medium group-hover:text-zinc-900"
        )}>
          {cat}
          {option.parent && (
            <span className="ml-2 text-[11px] font-medium text-zinc-400">
              con của {option.parent}
            </span>
          )}
        </span>
      </label>
    );
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
            <aside className="w-full shrink-0 overflow-y-auto border-r border-zinc-200 bg-[#f4f7f6] md:w-[360px] xl:w-[390px]">
              <div className={cn(
                "m-4 overflow-hidden rounded-xl border bg-white shadow-sm",
                seoChecklistReady ? "border-emerald-200" : "border-zinc-200"
              )}>
                <div className={cn(
                  "p-5",
                  seoChecklistReady ? "bg-emerald-50" : "bg-amber-50"
                )}>
                  <p className="text-[13px] font-bold text-zinc-700">Cấp độ Nội dung</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <h3 className={cn(
                        "text-2xl font-black",
                        seoChecklistReady ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {seoChecklistReady ? 'Đạt chuẩn' : 'Cần tối ưu'}
                      </h3>
                      <p className="mt-1 text-[12px] font-bold text-zinc-500">
                        {passedChecklistCount}/{seoChecklistItems.length} tiêu chí đạt
                      </p>
                    </div>
                    <span className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-black",
                      seoChecklistReady ? "bg-emerald-100 text-emerald-700" : "bg-white text-amber-700"
                    )}>
                      {seoChecklistScore}%
                    </span>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/80">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        seoChecklistReady ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      style={{ width: `${seoChecklistScore}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-[12px] font-black uppercase tracking-widest text-zinc-500">Checklist chuẩn SEO</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const firstMissing = seoChecklistItems.find(item => !item.passed && item.aiFixable);
                        if (firstMissing) handleChecklistAiFix(firstMissing);
                      }}
                      disabled={seoChecklistReady || Boolean(aiFixingChecklistId) || !seoChecklistItems.some(item => !item.passed && item.aiFixable)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[11px] font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI sửa mục đầu
                    </button>
                  </div>

                  {seoChecklistItems.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border p-3 transition",
                        item.passed ? "border-emerald-100 bg-emerald-50/70" : "border-zinc-200 bg-white"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          item.passed ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"
                        )}>
                          {item.passed ? <CircleCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "text-[13px] font-black leading-5",
                            item.passed ? "text-emerald-800" : "text-zinc-800"
                          )}>
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium leading-4 text-zinc-500">{item.detail}</p>
                          {!item.passed && (
                            item.aiFixable ? (
                              <button
                                type="button"
                                onClick={() => handleChecklistAiFix(item)}
                                disabled={Boolean(aiFixingChecklistId)}
                                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-black text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                              >
                                <Sparkles className={cn("h-3.5 w-3.5", aiFixingChecklistId === item.id && "animate-spin")} />
                                {aiFixingChecklistId === item.id ? 'Đang cập nhật...' : 'AI cập nhật'}
                              </button>
                            ) : (
                              <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-[11px] font-bold text-zinc-500">
                                Cần bổ sung thủ công trong khu vực ảnh/video.
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Left Editor Column */}
            <div
              ref={leftScrollerRef}
              onScroll={handleLeftColumnScroll}
              className="flex-1 overflow-y-auto bg-white border-r border-zinc-200"
            >
              <div className="mx-auto w-full max-w-[1040px] p-6 md:p-10 space-y-8">
                {/* Product Name Input */}
                <textarea
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Thêm tiêu đề..."
                  rows={2}
                  className="min-h-[92px] w-full resize-none overflow-hidden bg-transparent text-3xl font-black leading-tight text-zinc-900 outline-none placeholder:text-zinc-300 placeholder:font-black sm:text-4xl"
                />

                <div className="sticky top-0 z-30 -mx-2 border-b border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur">
                  <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 shadow-sm">
                    {[
                      { id: 'description' as const, label: 'Mô tả' },
                      { id: 'sales' as const, label: 'Thông tin bán hàng' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => scrollToQuickSection(tab.id)}
                        className={cn(
                          'h-9 rounded-md px-4 text-[13px] font-black transition-colors',
                          activeQuickTab === tab.id
                            ? 'bg-white text-[#10b981] shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-900'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                 
                {/* Rich Text Editor */}
                <div ref={editorWrapRef} className="w-full product-quill-editor relative scroll-mt-20">
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
                    .product-quill-editor .ql-editor figure,
                    .product-quill-editor .ql-editor figure.image-figure {
                      display: block !important;
                      margin: 2rem auto !important;
                      max-width: 100% !important;
                      text-align: center !important;
                    }
                    .product-quill-editor .ql-editor figure img {
                      margin: 0 auto !important;
                    }
                    .product-quill-editor .ql-editor figcaption,
                    .product-quill-editor .ql-editor p[data-caption="1"],
                    .product-quill-editor .ql-editor p.image-caption,
                    .product-quill-editor .ql-editor p[style*="font-style:italic"][style*="font-size:0.8em"],
                    .product-quill-editor .ql-editor p[style*="font-style: italic"][style*="font-size: 0.8em"] {
                      color: #a1a1aa !important;
                      font-size: 0.75rem !important;
                      font-style: italic !important;
                      display: block !important;
                      text-align: center !important;
                      margin: 0.5rem auto 1.5rem !important;
                      line-height: 1.4 !important;
                      width: 100% !important;
                      opacity: 0.85 !important;
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
                        <button type="button" className="ql-bold" />
                        <button type="button" className="ql-italic" />
                        <button type="button" className="ql-underline" />
                        <button type="button" className="ql-strike" />
                        <button type="button" className="ql-blockquote" />
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
                        <button type="button" className="ql-image" onClick={isHtmlMode ? handleProductDescriptionImageInsert : undefined} />
                        <button type="button" className="ql-video" />
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
                        <button type="button" className="ql-clean" />
                      </span>
                      <span className="ql-formats">
                        <button
                          type="button"
                          onClick={handleAiRewriteDescription}
                          title="AI tự động sửa mô tả theo cấu trúc PRODUCT_SKILL"
                          className="!inline-flex !items-center !justify-center gap-1 !w-auto !px-2 hover:!text-[#10b981]"
                          disabled={isAiRewriteLoading}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                          <span className="text-[11px] font-black text-[#10b981]">AI Sửa</span>
                        </button>
                      </span>
                      <span className="ql-formats">
                        <button
                          type="button"
                          onClick={handleMarkdownAiUpload}
                          title="Tải file .md để AI viết bài SEO"
                          className="!inline-flex !items-center !justify-center gap-1 !w-auto !px-2 hover:!text-[#8b5cf6]"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
                          <span className="text-[11px] font-bold text-[#8b5cf6]">AI Markdown</span>
                        </button>
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
                          <button type="button" onClick={() => {
                              setShowCaption(v => !v);
                              setShowAltInput(false);
                            }}
                            className={cn("p-1.5 rounded transition-colors text-[11px] font-bold flex items-center gap-1",
                              showCaption ? "bg-blue-500" : "hover:bg-white/10")}
                            title="Ghi chú ảnh">
                            <Type className="h-3.5 w-3.5" />
                            <span>Caption</span>
                          </button>
                          <button type="button" onClick={() => {
                              setShowAltInput(v => !v);
                              setShowCaption(false);
                            }}
                            className={cn("p-1.5 rounded transition-colors text-[11px] font-bold flex items-center gap-1",
                              showAltInput ? "bg-emerald-500" : altDraft ? "bg-emerald-500/30 hover:bg-emerald-500/40" : "hover:bg-white/10")}
                            title={altDraft ? `Alt: ${altDraft}` : 'Thêm thẻ alt cho ảnh'}>
                            <Tag className="h-3.5 w-3.5" />
                            <span>Alt</span>
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
                          {showAltInput && (
                            <>
                              <input
                                autoFocus
                                type="text"
                                value={altDraft}
                                onChange={e => setAltDraft(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyImageAlt()}
                                placeholder="Nhập thẻ alt..."
                                className="bg-white/10 rounded px-2 py-1 text-[12px] font-medium placeholder:text-white/40 outline-none border border-white/20 focus:border-emerald-400 w-48 ml-1"
                              />
                              <button type="button" onClick={applyImageAlt}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 rounded text-[11px] font-bold transition-colors ml-0.5">
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
                        onChange={(content, delta, source) => {
                          if (source === 'user') {
                            setFormData(prev => ({...prev, description: content}));
                          }
                        }}
                        modules={modules}
                        placeholder="Bắt đầu viết mô tả sản phẩm..."
                      />
                    </>
                  )}
                </div>

                <section ref={salesInfoRef} className="scroll-mt-20 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_16px_50px_-35px_rgba(15,23,42,0.45)] sm:p-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                      <h3 className="text-[20px] font-black text-zinc-950">Thông tin bán hàng</h3>
                      <p className="mt-1 text-[12px] font-medium text-zinc-500">
                        Quản lý màu sắc, size, giá và số lượng tồn kho theo từng phân loại.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, colorVariants: [...formData.colorVariants, { name: '', image: '' }] })}
                      className="rounded-lg bg-[#10b981] px-4 py-2.5 text-[12px] font-black uppercase text-white shadow-sm transition hover:bg-[#059669]"
                    >
                      + Thêm màu
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff4d30]" />
                        <h4 className="text-[13px] font-black text-zinc-800">Phân loại màu sắc</h4>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {formData.colorVariants.map((variant, index) => (
                          <div key={index} className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-[#10b981]/50 hover:shadow-sm">
                            <div
                              className={cn(
                                "relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-white",
                                formData.coverImage === variant.image ? "border-2 border-blue-500" : "border-zinc-200",
                              )}
                              onClick={() => variant.image && setFormData({ ...formData, coverImage: variant.image })}
                            >
                              {variant.image ? (
                                <img src={variant.image} alt={variant.name || 'Color variant'} loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <ImageUpload
                                  onUploadComplete={(url) => {
                                    setFormData(prev => {
                                      const newVariants = [...prev.colorVariants];
                                      newVariants[index].image = url;
                                      return {
                                        ...prev,
                                        colorVariants: newVariants,
                                        coverImage: prev.coverImage || url,
                                      };
                                    });
                                  }}
                                  folder="products"
                                  label="Ảnh"
                                  storage="local"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(event) => {
                                  const newVariants = [...formData.colorVariants];
                                  newVariants[index].name = event.target.value;
                                  setFormData({ ...formData, colorVariants: newVariants });
                                }}
                                className="h-10 w-full border-b border-zinc-200 bg-transparent text-[14px] font-black uppercase text-zinc-950 outline-none focus:border-[#10b981]"
                                placeholder="Tên màu (VD: Đen)"
                              />
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => variant.image && setFormData({ ...formData, coverImage: variant.image })}
                                  disabled={!variant.image}
                                  className="text-[11px] font-bold text-[#1e4b64] transition hover:text-[#10b981] disabled:text-zinc-300"
                                >
                                  Đặt làm ảnh chính
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newVariants = [...formData.colorVariants];
                                    newVariants.splice(index, 1);
                                    setFormData({ ...formData, colorVariants: newVariants });
                                  }}
                                  className="text-[11px] font-black uppercase text-red-500 hover:underline"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {formData.colorVariants.length === 0 && (
                          <p className="rounded-lg border border-dashed border-zinc-300 py-6 text-center text-[12px] font-medium text-zinc-400 sm:col-span-2">
                            Chưa có phân loại màu sắc
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                      <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <h4 className="mb-3 text-[13px] font-black text-zinc-800">Kích cỡ</h4>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Cách nhau bằng dấu phẩy</label>
                        <input
                          type="text"
                          value={formData.sizes}
                          onChange={(event) => setFormData({ ...formData, sizes: event.target.value })}
                          className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[14px] font-bold text-zinc-900 outline-none transition focus:border-[#10b981] focus:bg-white"
                          placeholder={DEFAULT_PRODUCT_SIZE_TEXT}
                        />
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-[13px] font-black text-zinc-800">Phân loại màu / size</h4>
                            <p className="text-[11px] font-medium text-zinc-400">
                              {variantMatrixRows.length > 0
                                ? `${variantMatrixRows.length} phân loại - tổng kho ${variantStockTotal}`
                                : 'Thêm màu sắc và kích cỡ để tạo bảng phân loại'}
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(180px,1.2fr)] 2xl:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(220px,1.35fr)_auto]">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatDisplayPrice(formData.variantBulk.price)}
                            onChange={(event) => setFormData(prev => ({
                              ...prev,
                              variantBulk: { ...prev.variantBulk, price: parsePrice(event.target.value) },
                            }))}
                            className="h-10 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[13px] font-bold outline-none transition focus:border-[#10b981] focus:bg-white"
                            placeholder="Giá"
                          />
                          <input
                            type="number"
                            value={formData.variantBulk.stock}
                            onChange={(event) => setFormData(prev => ({
                              ...prev,
                              variantBulk: { ...prev.variantBulk, stock: event.target.value },
                            }))}
                            className="h-10 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[13px] font-bold outline-none transition focus:border-[#10b981] focus:bg-white"
                            placeholder="Kho hàng"
                          />
                          <input
                            type="text"
                            value={formData.variantBulk.sku}
                            onChange={(event) => setFormData(prev => ({
                              ...prev,
                              variantBulk: { ...prev.variantBulk, sku: normalizeProductCode(event.target.value) },
                            }))}
                            className="h-10 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[13px] font-bold outline-none transition focus:border-[#10b981] focus:bg-white"
                            placeholder="SKU phân loại"
                          />
                          <button
                            type="button"
                            onClick={applyBulkToVariants}
                            disabled={variantMatrixRows.length === 0}
                            className="h-10 whitespace-nowrap rounded-lg bg-[#ff8f80] px-5 text-[12px] font-black text-white shadow-sm transition hover:bg-[#ff7462] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-3 2xl:col-span-1"
                          >
                            Áp dụng
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
                        <div>
                          <h4 className="text-[13px] font-black text-zinc-800">Bảng tồn kho phân loại</h4>
                          <p className="text-[11px] font-medium text-zinc-400">Mỗi dòng là một màu + size riêng biệt.</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-zinc-500 shadow-sm">
                          {variantMatrixRows.length} dòng
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                      <table className="min-w-[820px] w-full border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-white text-zinc-500">
                            <th className="w-[190px] border-b border-r border-zinc-100 px-5 py-3 text-left font-black">Màu sắc</th>
                            <th className="w-[84px] border-b border-r border-zinc-100 px-4 py-3 text-center font-black">Size</th>
                            <th className="w-[180px] border-b border-r border-zinc-100 px-4 py-3 text-left font-black">Giá</th>
                            <th className="w-[150px] border-b border-r border-zinc-100 px-4 py-3 text-left font-black">Kho hàng</th>
                            <th className="border-b border-zinc-100 px-4 py-3 text-left font-black">SKU phân loại</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantMatrixRows.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-[13px] font-medium text-zinc-400">
                                Chưa có phân loại. Hãy thêm màu sắc và kích cỡ trước.
                              </td>
                            </tr>
                          ) : variantMatrixRows.map((row, index) => {
                            const colorImage = formData.colorVariants.find(color => color.name.trim() === row.color)?.image;
                            const isFirstColorRow = index === 0 || variantMatrixRows[index - 1]?.color !== row.color;
                            return (
                              <tr key={row.id} className={cn("border-b border-zinc-100 last:border-b-0", Number(row.stock || 0) <= 0 && "bg-red-50/35")}>
                                <td className="border-r border-zinc-100 px-5 py-3 align-middle">
                                  {isFirstColorRow && (
                                    <div className="flex items-center gap-4">
                                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                                        {colorImage ? (
                                          <img src={colorImage} alt={row.color} loading="lazy" className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="h-full w-full bg-zinc-100" />
                                        )}
                                      </div>
                                      <span className="pl-1 font-bold text-zinc-700">{row.color}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="border-r border-zinc-100 px-4 py-3 text-center font-black text-zinc-800">{row.size}</td>
                                <td className="border-r border-zinc-100 px-4 py-3">
                                  <input type="text" inputMode="numeric" value={formatDisplayPrice(row.price)} onChange={(event) => updateVariantRow(row.id, 'price', parsePrice(event.target.value))} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-bold outline-none transition focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/10" placeholder="0" />
                                </td>
                                <td className="border-r border-zinc-100 px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <input type="number" value={row.stock} onChange={(event) => updateVariantRow(row.id, 'stock', event.target.value)} className={cn("h-10 w-full rounded-lg border bg-white px-3 font-bold outline-none transition focus:ring-2", Number(row.stock || 0) <= 0 ? "border-red-200 text-red-600 focus:border-red-400 focus:ring-red-100" : "border-zinc-200 focus:border-[#10b981] focus:ring-[#10b981]/10")} placeholder="0" />
                                    {Number(row.stock || 0) <= 0 && (
                                      <span className="hidden min-w-[44px] shrink-0 items-center justify-center rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase leading-none text-red-600 xl:inline-flex">Hết</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <input type="text" value={row.sku} onChange={(event) => updateVariantRow(row.id, 'sku', event.target.value.toUpperCase())} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-bold outline-none transition focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/10" placeholder="SKU" />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </div>
                </section>
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
                    {parentCategoryOptions.map(option => (
                      <div key={option.label} className="space-y-1">
                        {renderCategoryOption(option)}
                        {getChildCategoryOptions(option.label).map(child => renderCategoryOption(child, true))}
                      </div>
                    ))}
                    {orphanCategoryOptions.map(option => renderCategoryOption(option, true))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-200">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Mã sản phẩm</h3>
                  <div className="bg-white p-1 rounded-md border border-zinc-200 focus-within:border-[#1e4b64] focus-within:ring-1 focus-within:ring-[#1e4b64] transition-all">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase px-2 pt-1 block">SKU sản phẩm</label>
                    <input
                      type="text"
                      value={formData.productCode}
                      onChange={(event) => setFormData({ ...formData, productCode: normalizeProductCode(event.target.value) })}
                      onBlur={() => setFormData(prev => ({ ...prev, productCode: normalizeProductCode(prev.productCode) }))}
                      className="w-full h-8 px-2 text-[15px] font-bold text-zinc-900 bg-transparent outline-none"
                      placeholder="UR-S1"
                    />
                  </div>
                  <p className="px-1 text-xs font-medium text-zinc-400">Mã sản phẩm bắt buộc bắt đầu bằng UR.</p>
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
                        storage="local"
                        multiple
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
                          <img src={url} alt={`Extra image ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
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
                        folder="size-guides"
                        label="Tải ảnh bảng size"
                        externalPreview={formData.sizeGuideUrl || undefined}
                        storage="local"
                      />
                    </div>
                  </div>
                  {formData.sizeGuideUrl && (
                    <div className="relative w-full h-32 rounded-md overflow-hidden border border-zinc-200 group shadow-sm bg-white mt-3">
                      <img src={formData.sizeGuideUrl} alt="Size Guide Preview" loading="lazy" className="w-full h-full object-cover" />
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
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64]"
                        placeholder="UR SPORT"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Xuất xứ</label>
                      <input 
                        type="text"
                        value={formData.origin}
                        onChange={(e) => setFormData({...formData, origin: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64]"
                        placeholder="Việt Nam"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Kiểu dáng</label>
                      <input 
                        type="text"
                        value={formData.style}
                        onChange={(e) => setFormData({...formData, style: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64]"
                        placeholder="Slim Fit"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Chất liệu</label>
                      <input 
                        type="text"
                        value={formData.material}
                        onChange={(e) => setFormData({...formData, material: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64]"
                        placeholder="Cotton Premium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Phong cách</label>
                      <input 
                        type="text"
                        value={formData.fashionStyle || ''}
                        onChange={(e) => setFormData({...formData, fashionStyle: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64]"
                        placeholder="Thể thao, Cơ bản, Hàn Quốc"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Cổ áo</label>
                      <input 
                        type="text"
                        value={formData.collarType || ''}
                        onChange={(e) => setFormData({...formData, collarType: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64]"
                        placeholder="Cổ tròn"
                      />
                    </div>
                  </div>
                </div>
                
                {/* SEO Settings */}
                <div className="space-y-6 pt-8 border-t border-zinc-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-[#1e4b64]" />
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
                          https://www.ursport.vn/
                        </div>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({...prev, slug: e.target.value}))}
                          onBlur={() => setFormData(prev => ({ ...prev, slug: normalizeProductSlug(prev.slug) }))}
                          placeholder="mac-dinh-theo-ten"
                          autoComplete="off"
                          className="w-full pl-[172px] pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1e4b64]/20 focus:border-[#1e4b64] transition-all font-medium"
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
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1e4b64]/20 focus:border-[#1e4b64] transition-all"
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
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1e4b64]/20 focus:border-[#1e4b64] transition-all resize-none"
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
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1e4b64]/20 focus:border-[#1e4b64] transition-all"
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
                        videoModal.type !== 'file' ? "bg-white text-[#1e4b64] shadow-sm" : "text-zinc-500 hover:text-zinc-900"
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
                        videoModal.type === 'file' ? "bg-white text-[#1e4b64] shadow-sm" : "text-zinc-500 hover:text-zinc-900"
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
                        "flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-6 text-center transition-all hover:border-[#1e4b64] hover:bg-blue-50/40",
                        isUploadingVideo && "pointer-events-none opacity-60"
                      )}>
                        <Upload className="h-8 w-8 text-[#1e4b64] mb-3" />
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
                    className="bg-[#1e4b64] hover:bg-[#153446] text-white font-black px-8 h-11 rounded-xl shadow-lg shadow-[#1e4b64]/20"
                  >
                    Chèn Video
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* AI Writer Modal (for AI Markdown button) */}
          {isAiWriterModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
              >
                <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
                      AI Writer - Viết bài chuẩn SEO & Chèn ảnh
                    </h3>
                    <p className="text-sm text-zinc-500 font-medium mt-1">
                      Tự động viết bài theo PRODUCT_SKILL và chèn ảnh theo IMAGE_FORMAT_RULES.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAiWriterModalOpen(false)} 
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                    disabled={isAiWriterGenerating}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto flex-1">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Tên sản phẩm</label>
                      <input
                        type="text"
                        value={aiWriterName}
                        onChange={(e) => setAiWriterName(e.target.value)}
                        placeholder="Ví dụ: Áo Thun Nam Cotton Compact"
                        className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-bold text-zinc-900"
                        disabled={isAiWriterGenerating}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Từ khóa chính (cách nhau bằng dấu phẩy)</label>
                      <input
                        type="text"
                        value={aiWriterKeywords}
                        onChange={(e) => setAiWriterKeywords(e.target.value)}
                        placeholder="áo thun nam, áo thun cotton, áo thun đẹp..."
                        className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-zinc-800"
                        disabled={isAiWriterGenerating}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Tài liệu tham khảo / Phác thảo bài viết (Tùy chọn)</label>
                        <button
                          type="button"
                          onClick={handleLoadMdFile}
                          disabled={isAiWriterGenerating}
                          className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1.5 transition-colors border border-purple-200 hover:border-purple-300 rounded-lg px-3 py-1.5 bg-purple-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Tải file .md
                        </button>
                      </div>
                      <textarea
                        value={aiWriterBrief}
                        onChange={(e) => setAiWriterBrief(e.target.value)}
                        placeholder="Dán nội dung Markdown, thông số kỹ thuật hoặc brief bài viết tại đây. AI sẽ viết lại theo đúng cấu trúc tiêu chuẩn..."
                        className="w-full min-h-[160px] p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-y leading-relaxed text-zinc-700"
                        disabled={isAiWriterGenerating}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 bg-zinc-50 flex items-center justify-end gap-3 shrink-0 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsAiWriterModalOpen(false)}
                    className="px-6 h-11 text-sm font-black text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                    disabled={isAiWriterGenerating}
                  >
                    Hủy bỏ
                  </button>
                  <Button
                    onClick={handleAiWriterGenerate}
                    disabled={isAiWriterGenerating || !aiWriterName.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-black px-8 h-11 rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2 active:scale-95 transition-all"
                  >
                    {isAiWriterGenerating ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <BrainCircuit className="h-4 w-4" />
                    )}
                    {isAiWriterGenerating ? 'Đang viết bài...' : 'AI Viết Mô Tả'}
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
