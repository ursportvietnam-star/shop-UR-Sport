import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Edit2, Eye, EyeOff, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import {
  BLOG_PAGE_SECTION_TYPES,
  DEFAULT_BLOG_PAGE_SECTIONS,
  getBlogPageSectionLabel,
  isLocalhost,
  mergeBlogPageSections,
  normalizeBlogPageSection,
  readLocalBlogPageSections,
  writeLocalBlogPageSections,
  type BlogPageSectionConfig,
  type BlogPageSectionType,
} from '../lib/blogPageConfig';
import type { BlogPost } from '../types';

type BlogCategoryOption = {
  label: string;
  link: string;
};

type BlogPageConfigManagerProps = {
  blogPosts?: BlogPost[];
  blogCategories?: BlogCategoryOption[];
};

export function BlogPageConfigManager({ blogPosts = [], blogCategories = [] }: BlogPageConfigManagerProps) {
  const { isAdmin, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<BlogPageSectionConfig[]>(DEFAULT_BLOG_PAGE_SECTIONS);
  const [newSectionType, setNewSectionType] = useState<BlogPageSectionType>('article-list');
  const [newSectionName, setNewSectionName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const categoryOptions = useMemo(() => {
    const fallback = [
      { label: 'Tất cả', link: '/blog' },
      { label: 'Áo thun nam', link: '/blog/ao-thun-nam' },
      { label: 'Áo thun thể thao nam', link: '/blog/ao-thun-the-thao-nam' },
      { label: 'Quần thể thao nam', link: '/blog/quan-the-thao-nam' },
      { label: 'Chất liệu vải thể thao', link: '/blog/chat-lieu-vai-the-thao' },
      { label: 'Phối đồ thể thao nam', link: '/blog/phoi-do-the-thao-nam' },
    ];

    return blogCategories.length ? blogCategories : fallback;
  }, [blogCategories]);

  useEffect(() => {
    let mounted = true;

    const loadSections = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'settings', 'blogPage'));
        const data = snap.exists() ? snap.data() : null;
        const localSections = readLocalBlogPageSections();
        const next = localSections || mergeBlogPageSections((data?.sections || DEFAULT_BLOG_PAGE_SECTIONS) as BlogPageSectionConfig[]);
        if (mounted) setSections(next);
      } catch (error) {
        console.error('Failed to load blog page config:', error);
        const localSections = readLocalBlogPageSections();
        if (mounted) setSections(localSections || mergeBlogPageSections(DEFAULT_BLOG_PAGE_SECTIONS));
        if (!localSections) toast.error('Không thể tải cấu hình trang Blog');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSections();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDragStart = (event: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    const from = dragIndexRef.current;
    if (from == null || from === index) return;

    setSections(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
  };

  const updateSection = (index: number, patch: Partial<BlogPageSectionConfig>) => {
    setSections(prev => prev.map((section, itemIndex) => itemIndex === index ? { ...section, ...patch } : section));
  };

  const updateSectionSettings = (index: number, settings: NonNullable<BlogPageSectionConfig['settings']>) => {
    setSections(prev => prev.map((section, itemIndex) => (
      itemIndex === index
        ? { ...section, settings: { ...(section.settings || {}), ...settings } }
        : section
    )));
  };

  const addSection = () => {
    const type = newSectionType;
    const duplicateCount = sections.filter(section => section.type === type).length;
    const section = normalizeBlogPageSection({
      id: `${type}-${Date.now()}`,
      type,
      name: newSectionName.trim() || `${getBlogPageSectionLabel(type)}${duplicateCount ? ` ${duplicateCount + 1}` : ''}`,
      enabled: true,
    });

    setSections(prev => [...prev, section]);
    setNewSectionName('');
    setEditingIndex(sections.length);
  };

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const saveSections = async () => {
    if (!isAdmin) {
      toast.error('Bạn cần quyền quản trị để lưu cấu hình');
      return;
    }

    const normalizedSections = sections.map(normalizeBlogPageSection);
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'blogPage'), {
        sections: normalizedSections,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (isLocalhost()) writeLocalBlogPageSections(normalizedSections);
      setSections(normalizedSections);
      toast.success('Đã lưu cấu hình trang Blog');
    } catch (error) {
      console.error('Failed to save blog page config:', error);
      if (isLocalhost()) {
        writeLocalBlogPageSections(normalizedSections);
        setSections(normalizedSections);
        toast.success('Đã lưu cấu hình Blog trên trình duyệt local');
      } else {
        toast.error('Không thể lưu cấu hình trang Blog');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = (section: BlogPageSectionConfig, index: number) => (
    <div className="border-t border-white/5 p-4">
      <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Tên block</label>
      <input
        value={section.name}
        onChange={event => updateSection(index, { name: event.target.value })}
        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
      />
      <p className="mt-3 text-xs font-semibold leading-5 text-white/35">
        Block này điều khiển phần <span className="font-black text-white/70">{getBlogPageSectionLabel(section.type)}</span> trên trang Blog.
        Bạn có thể kéo thả để đổi vị trí hoặc tắt block nếu chưa muốn hiển thị.
      </p>

      {section.type === 'category-tabs' && (
        <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-white/60">Tab danh mục hiển thị</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categoryOptions.map(category => {
              const selected = section.settings?.selectedTabLinks?.length
                ? section.settings.selectedTabLinks.includes(category.link)
                : true;

              return (
                <label key={category.link} className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#11141d] p-3 text-xs font-bold text-white/70">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const current = section.settings?.selectedTabLinks?.length
                        ? section.settings.selectedTabLinks
                        : categoryOptions.map(item => item.link);
                      const next = current.includes(category.link)
                        ? current.filter(link => link !== category.link)
                        : [...current, category.link];
                      updateSectionSettings(index, { selectedTabLinks: next });
                    }}
                    className="h-4 w-4 accent-[#1e4b64]"
                  />
                  <span>{category.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {section.type === 'featured' && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Nguồn bài nổi bật</label>
            <select
              value={section.settings?.featuredMode || 'latest'}
              onChange={event => updateSectionSettings(index, { featuredMode: event.target.value as 'latest' | 'manual' })}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#11141d] px-3 text-sm font-bold text-white outline-none [color-scheme:dark]"
            >
              <option value="latest">3 bài viết mới nhất</option>
              <option value="manual">Chọn 3 bài riêng</option>
            </select>
          </div>

          {(section.settings?.featuredMode || 'latest') === 'latest' && (
            <div className="mt-4">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Danh mục bài viết</label>
              <select
                value={section.settings?.featuredCategorySlug || ''}
                onChange={event => updateSectionSettings(index, { featuredCategorySlug: event.target.value })}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#11141d] px-3 text-sm font-bold text-white outline-none [color-scheme:dark]"
              >
                <option value="">Tất cả danh mục</option>
                {categoryOptions.filter(category => category.link !== '/blog').map(category => (
                  <option key={category.link} value={category.link.split('/').filter(Boolean).pop() || ''}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(section.settings?.featuredMode || 'latest') === 'manual' && (
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Chọn bài viết</label>
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                {blogPosts.length === 0 ? (
                  <p className="p-4 text-sm font-bold text-white/35">Chưa có bài viết để chọn.</p>
                ) : blogPosts.map(post => {
                  const selectedIds = section.settings?.selectedPostIds || [];
                  const selected = selectedIds.includes(post.id);
                  return (
                    <label key={post.id} className="flex items-start gap-3 rounded-xl p-3 text-sm font-bold text-white/70 hover:bg-white/[0.04]">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const next = selected
                            ? selectedIds.filter(id => id !== post.id)
                            : [...selectedIds, post.id];
                          updateSectionSettings(index, { selectedPostIds: next });
                        }}
                        className="mt-1 h-4 w-4 accent-[#1e4b64]"
                      />
                      <span>{post.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {section.type === 'category-sections' && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Kiểu hiển thị</label>
            <select
              value={section.settings?.categoryMode || 'all'}
              onChange={event => updateSectionSettings(index, { categoryMode: event.target.value as 'all' | 'single' })}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#11141d] px-3 text-sm font-bold text-white outline-none [color-scheme:dark]"
            >
              <option value="all">Tất cả cụm danh mục</option>
              <option value="single">Chỉ một danh mục</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Danh mục bài viết</label>
            <select
              value={section.settings?.categorySlug || 'ao-thun-nam'}
              onChange={event => updateSectionSettings(index, { categorySlug: event.target.value })}
              disabled={(section.settings?.categoryMode || 'all') === 'all'}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#11141d] px-3 text-sm font-bold text-white outline-none disabled:opacity-40 [color-scheme:dark]"
            >
              {categoryOptions.filter(category => category.link !== '/blog').map(category => (
                <option key={category.link} value={category.link.split('/').filter(Boolean).pop() || ''}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Nguồn bài</label>
            <select
              value={section.settings?.postMode || 'latest'}
              onChange={event => updateSectionSettings(index, { postMode: event.target.value as 'latest' | 'manual' })}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#11141d] px-3 text-sm font-bold text-white outline-none [color-scheme:dark]"
            >
              <option value="latest">Bài mới nhất theo danh mục</option>
              <option value="manual">Chọn bài riêng</option>
            </select>
          </div>
        </div>
      )}

      {section.type === 'category-sections' && section.settings?.postMode === 'manual' && (
        <div className="mt-4">
          <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/35">Chọn bài viết cho cụm danh mục</label>
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            {blogPosts.length === 0 ? (
              <p className="p-4 text-sm font-bold text-white/35">Chưa có bài viết để chọn.</p>
            ) : blogPosts.map(post => {
              const selectedIds = section.settings?.selectedPostIds || [];
              const selected = selectedIds.includes(post.id);
              return (
                <label key={post.id} className="flex items-start gap-3 rounded-xl p-3 text-sm font-bold text-white/70 hover:bg-white/[0.04]">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const next = selected
                        ? selectedIds.filter(id => id !== post.id)
                        : [...selectedIds, post.id];
                      updateSectionSettings(index, { selectedPostIds: next });
                    }}
                    className="mt-1 h-4 w-4 accent-[#1e4b64]"
                  />
                  <span>{post.title}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Cấu hình trang Blog</h2>
            <p className="mt-1 text-sm font-medium text-white/40">
              Kéo thả để đổi thứ tự block, bật/tắt block đang hiển thị trên trang Blog.
            </p>
          </div>
          <Button
            onClick={saveSections}
            disabled={saving || loading || authLoading || !isAdmin}
            className="gap-2 rounded-full bg-[#1e4b64] px-6 text-white hover:bg-[#153446]"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#13161f] p-5">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto]">
          <select
            value={newSectionType}
            onChange={event => setNewSectionType(event.target.value as BlogPageSectionType)}
            className="h-11 rounded-xl border border-white/10 bg-[#11141d] px-3 text-sm font-bold text-white outline-none [color-scheme:dark]"
          >
            {BLOG_PAGE_SECTION_TYPES.map(section => (
              <option key={section.value} value={section.value} className="bg-[#11141d] text-white">
                {section.label}
              </option>
            ))}
          </select>
          <input
            value={newSectionName}
            onChange={event => setNewSectionName(event.target.value)}
            placeholder="Tên block mới, có thể để trống"
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
          />
          <Button onClick={addSection} className="h-11 gap-2 rounded-xl bg-white/10 text-white hover:bg-white/15">
            <Plus className="h-4 w-4" />
            Thêm block
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-[#13161f] p-10 text-center text-sm font-bold text-white/40">
            Đang tải cấu hình trang Blog...
          </div>
        ) : sections.map((section, index) => {
          const typeMeta = BLOG_PAGE_SECTION_TYPES.find(item => item.value === section.type);
          return (
            <div
              key={section.id}
              draggable
              onDragStart={event => handleDragStart(event, index)}
              onDragOver={event => event.preventDefault()}
              onDrop={event => handleDrop(event, index)}
              className={cn(
                "rounded-2xl border bg-[#13161f] transition-colors",
                section.enabled ? "border-white/10" : "border-white/5 opacity-60"
              )}
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <button type="button" className="cursor-move rounded-xl bg-white/5 p-2 text-white/40 hover:text-white">
                    <GripVertical className="h-5 w-5" />
                  </button>
                  <div>
                    <p className="text-sm font-black text-white">{section.name}</p>
                    <p className="mt-1 text-xs font-semibold text-white/35">{typeMeta?.label || section.type} · {section.id}</p>
                    {typeMeta?.description && <p className="mt-1 text-[11px] font-medium text-white/25">{typeMeta.description}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSection(index, { enabled: !section.enabled })}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black",
                      section.enabled
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/5 text-white/45"
                    )}
                  >
                    {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {section.enabled ? 'Đang hiện' : 'Đang ẩn'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-white/70 hover:text-white"
                  >
                    {editingIndex === index ? <X className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                    {editingIndex === index ? 'Đóng' : 'Sửa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-black text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                </div>
              </div>

              {editingIndex === index && renderEditor(section, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
