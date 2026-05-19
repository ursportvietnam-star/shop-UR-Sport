const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'DIV',
  'EM',
  'FIGCAPTION',
  'FIGURE',
  'H2',
  'H3',
  'H4',
  'HR',
  'I',
  'IFRAME',
  'IMG',
  'LI',
  'OL',
  'P',
  'SMALL',
  'SPAN',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
  'VIDEO',
]);

const GLOBAL_ATTRS = new Set(['class', 'id', 'title']);

const TAG_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'rel', 'target']),
  IFRAME: new Set(['allow', 'allowfullscreen', 'frameborder', 'loading', 'src', 'title']),
  IMG: new Set(['alt', 'height', 'loading', 'src', 'title', 'width']),
  LI: new Set(['data-list']),
  VIDEO: new Set(['controls', 'height', 'poster', 'src', 'width']),
};

const ALLOWED_CLASSES = new Set([
  'badge-good',
  'badge-normal',
  'blog-image-caption',
  'compare-table',
  'image-caption',
  'ql-align-center',
  'ql-align-justify',
  'ql-align-right',
  'ql-ui',
  'seo-faq',
  'seo-faq-answer',
  'seo-faq-icon',
  'seo-faq-item',
  'seo-faq-question',
  'seo-faq-section',
  'seo-faq-title',
  'table-wrap',
  'video-container',
]);

const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const isBrowser = () => typeof DOMParser !== 'undefined' && typeof document !== 'undefined';

const isSafeUrl = (value: string, allowRelative = true) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (allowRelative && (trimmed.startsWith('/') || trimmed.startsWith('#'))) return true;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
};

export const removeEmptyMedia = (root: ParentNode) => {
  root.querySelectorAll('iframe, video').forEach((media) => {
    const src = media.getAttribute('src')?.trim() || '';
    if (src) return;

    const container = media.closest('.video-container');
    const parent = media.parentElement;
    if (container) {
      container.remove();
    } else if (parent?.tagName === 'P' && parent.textContent?.trim() === '') {
      parent.remove();
    } else {
      media.remove();
    }
  });
};

const unwrapElement = (element: Element) => {
  const parent = element.parentNode;
  if (!parent) {
    element.remove();
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  element.remove();
};

const sanitizeClassList = (element: Element) => {
  const value = element.getAttribute('class');
  if (!value) return;

  const safeClasses = value
    .split(/\s+/)
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => ALLOWED_CLASSES.has(item));

  if (safeClasses.length > 0) {
    element.setAttribute('class', safeClasses.join(' '));
  } else {
    element.removeAttribute('class');
  }
};

const sanitizeElementAttributes = (element: Element) => {
  const tag = element.tagName;
  const allowedForTag = TAG_ATTRS[tag] || new Set<string>();

  Array.from(element.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    const canonicalName = attr.name;
    const isAllowed = GLOBAL_ATTRS.has(name) || allowedForTag.has(name);

    if (!isAllowed || name.startsWith('on')) {
      element.removeAttribute(canonicalName);
      return;
    }

    if ((name === 'href' || name === 'src' || name === 'poster') && !isSafeUrl(attr.value, true)) {
      element.removeAttribute(canonicalName);
      return;
    }

    if (name === 'target' && attr.value !== '_blank') {
      element.removeAttribute(canonicalName);
    }
  });

  sanitizeClassList(element);

  if (tag === 'A') {
    const href = element.getAttribute('href');
    if (!href) {
      unwrapElement(element);
      return;
    }
    if (element.getAttribute('target') === '_blank') {
      element.setAttribute('rel', 'noopener noreferrer');
    }
  }

  if (tag === 'IMG') {
    element.setAttribute('loading', element.getAttribute('loading') || 'lazy');
  }

  if (tag === 'VIDEO') {
    element.setAttribute('controls', '');
  }
};

export const sanitizeRichHtml = (html: string) => {
  if (!html || !isBrowser()) return html || '';

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const wrapper = parsed.body.firstElementChild as HTMLElement | null;
  if (!wrapper) return '';

  wrapper.querySelectorAll('script, style, link, meta, object, embed').forEach(node => node.remove());
  removeEmptyMedia(wrapper);

  Array.from(wrapper.querySelectorAll('*')).forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      unwrapElement(element);
      return;
    }

    sanitizeElementAttributes(element);
  });

  return wrapper.innerHTML;
};
