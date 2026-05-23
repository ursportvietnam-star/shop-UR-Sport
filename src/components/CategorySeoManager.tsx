import React, { useState, useEffect, useMemo } from 'react';
import { Save, Search, AlertCircle, Code, Globe, FileText, Tag, Link2, Bot } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CATEGORY_METADATA } from '../data';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import beautify from 'js-beautify';
import { getNavigationSubcategories, NavigationItem, slugifyVietnamese } from '../lib/categoryConfig';

interface SeoData {
  heading: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoCanonical: string;
  seoRobots: string;
  content: string;
}

const defaultSeoData: SeoData = {
  heading: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  seoCanonical: '',
  seoRobots: 'index, follow',
  content: '',
};

const buildSeoCategoryOptions = (navigationItems: NavigationItem[] = []) => [
  {
    name: 'Trang chủ',
    slug: 'homepage',
    key: 'homepage',
    type: 'homepage' as const,
    parentName: ''
  },
  ...CATEGORY_METADATA.map(cat => ({
    ...cat,
    name: cat.name as string,
    key: `category-${cat.slug}`,
    type: 'category' as const,
    parentName: ''
  })),
  ...getNavigationSubcategories(navigationItems).map(item => ({
    name: item.label,
    slug: item.link.replace(/^\//, '') || slugifyVietnamese(item.label),
    key: `subcategory-${slugifyVietnamese(item.label)}`,
    icon: item.icon || '',
    type: 'subcategory' as const,
    parentName: item.parentLabel || ''
  }))
];

export function CategorySeoManager() {
  const quillRef = React.useRef<ReactQuill | null>(null);
  const [seoCategoryOptions, setSeoCategoryOptions] = useState(() => buildSeoCategoryOptions());
  const [selectedOptionKey, setSelectedOptionKey] = useState<string>(seoCategoryOptions[0]?.key || '');
  const selectedOption = seoCategoryOptions.find(c => c.key === selectedOptionKey) || seoCategoryOptions[0];
  const selectedCategory = selectedOption?.slug || '';
  const [seoData, setSeoData] = useState<SeoData>(defaultSeoData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'navigation'))
      .then(snap => {
        const items = snap.exists() ? (snap.data().items || []) as NavigationItem[] : [];
        const nextOptions = buildSeoCategoryOptions(items);
        setSeoCategoryOptions(nextOptions);
        if (!nextOptions.some(option => option.key === selectedOptionKey)) {
          setSelectedOptionKey(nextOptions[0]?.key || '');
        }
      })
      .catch(() => {
        setSeoCategoryOptions(buildSeoCategoryOptions());
      });
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    
    const fetchSeoData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'categorySeo', selectedCategory);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSeoData({
            heading: data.heading || '',
            seoTitle: data.seoTitle || '',
            seoDescription: data.seoDescription || '',
            seoKeywords: data.seoKeywords || '',
            seoCanonical: data.seoCanonical || '',
            seoRobots: data.seoRobots || 'index, follow',
            content: data.content || '',
          });
        } else {
          setSeoData(defaultSeoData);
        }
      } catch (error) {
        console.error("Error fetching SEO content:", error);
        toast.error("Không thể tải nội dung SEO");
      } finally {
        setLoading(false);
      }
    };

    fetchSeoData();
  }, [selectedCategory]);

  const handleSave = async () => {
    if (!selectedCategory) return;
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'categorySeo', selectedCategory), {
        ...seoData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success("Đã lưu nội dung SEO thành công!");
    } catch (error) {
      console.error("Error saving SEO content:", error);
      toast.error("Đã xảy ra lỗi khi lưu SEO");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SeoData, value: string) => {
    setSeoData(prev => ({ ...prev, [field]: value }));
  };

  const buildFaqTemplate = () => `
<h2>Câu hỏi thường gặp</h2>
<h3>Câu hỏi 1?</h3>
<p>Nhập câu trả lời 1 tại đây.</p>
<h3>Câu hỏi 2?</h3>
<p>Nhập câu trả lời 2 tại đây.</p>
<h3>Câu hỏi 3?</h3>
<p>Nhập câu trả lời 3 tại đây.</p>`;

  const insertFaqTemplate = React.useCallback(() => {
    const faqTemplate = buildFaqTemplate();

    if (isHtmlMode) {
      setSeoData(prev => ({
        ...prev,
        content: `${prev.content || ''}\n${faqTemplate}`.trim()
      }));
      toast.success('Đã chèn mẫu FAQ vào nội dung SEO.');
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) {
      setSeoData(prev => ({
        ...prev,
        content: `${prev.content || ''}${faqTemplate}`.trim()
      }));
      return;
    }

    const selection = editor.getSelection(true);
    const insertIndex = selection?.index ?? editor.getLength();
    editor.clipboard.dangerouslyPasteHTML(insertIndex, faqTemplate, 'user');
    editor.setSelection(insertIndex + 1, 0);
    toast.success('Đã chèn 3 câu hỏi FAQ.');
  }, [isHtmlMode]);

  const toggleHtmlMode = React.useCallback(() => {
    if (!isHtmlMode) {
      const editorHtml = quillRef.current?.getEditor()?.root?.innerHTML;
      setSeoData(prev => ({
        ...prev,
        content: beautify.html((editorHtml || prev.content).replace(/&nbsp;/g, ' '), {
          indent_size: 2,
          wrap_line_length: 0,
          preserve_newlines: true
        })
      }));
    }
    setIsHtmlMode(prev => !prev);
  }, [isHtmlMode]);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: '#category-seo-quill-toolbar'
    }
  }), []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image', 'video'
  ];

  const selectedCatName = selectedOption?.name;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between bg-[#13161f] p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-[#1e4b64]" />
            SEO Danh Mục & Trang Chủ
          </h2>
          <p className="text-white/40 text-sm mt-1">
            Quản lý thẻ SEO và nội dung bài viết hiển thị ở cuối trang danh mục sản phẩm hoặc trang chủ.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Category List */}
        <div className="bg-[#13161f] p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Chọn Danh Mục</h3>
          <div className="space-y-2">
            {seoCategoryOptions.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedOptionKey(cat.key)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  selectedOptionKey === cat.key
                    ? "bg-[#1e4b64] text-white shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="block">{cat.name}</span>
                {cat.type === 'subcategory' && (
                  <span className="mt-1 block text-[10px] font-medium text-white/35">
                    Trang con của {cat.parentName}
                  </span>
                )}
                {cat.type === 'homepage' && (
                  <span className="mt-1 block text-[10px] font-medium text-white/35">
                    SEO trang chủ
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-8 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex gap-2 items-start text-blue-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs font-medium">Các thẻ SEO sẽ được tự động inject vào &lt;head&gt; của trang. Nội dung bài viết hiển thị ở cuối trang danh mục.</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* SEO Meta Fields */}
          <div className="bg-[#13161f] p-6 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#1e4b64]" />
                Thẻ SEO cho: <span className="text-[#1e4b64]">{selectedCatName}</span>
              </h3>
              <Button
                onClick={handleSave}
                disabled={loading || saving}
                className="bg-[#1e4b64] hover:bg-[#153446] text-white gap-2 rounded-full px-6"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </Button>
            </div>

            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4b64]" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Custom H1 Heading */}
                <div>
                  <label className="flex items-center gap-2 text-white/70 text-sm font-bold mb-2">
                    <FileText className="h-3.5 w-3.5" />
                    Thẻ H1 (Tiêu đề hiển thị trên trang)
                  </label>
                  <input
                    type="text"
                    value={seoData.heading}
                    onChange={e => updateField('heading', e.target.value)}
                    placeholder="VD: Áo Thun Nam Đẹp, Cao Cấp | UR Sport"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1e4b64] transition-colors placeholder:text-white/20 font-bold"
                  />
                  <p className="text-[10px] text-white/20 mt-1 italic">Mặc định sẽ lấy tên danh mục nếu để trống.</p>
                </div>

                {/* Title */}
                <div>
                  <label className="flex items-center gap-2 text-white/70 text-sm font-bold mb-2">
                    <FileText className="h-3.5 w-3.5" />
                    Title (Tiêu đề trang)
                    <span className={cn("text-xs font-normal ml-auto", seoData.seoTitle.length > 60 ? "text-red-400" : "text-white/30")}>
                      {seoData.seoTitle.length}/60
                    </span>
                  </label>
                  <input
                    type="text"
                    value={seoData.seoTitle}
                    onChange={e => updateField('seoTitle', e.target.value)}
                    placeholder="VD: Áo Thun Nam Đẹp - Form Rộng, Oversize, Cotton Cao Cấp 2026"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1e4b64] transition-colors placeholder:text-white/20"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <label className="flex items-center gap-2 text-white/70 text-sm font-bold mb-2">
                    <FileText className="h-3.5 w-3.5" />
                    Mô tả danh mục SEO
                    <span className={cn("text-xs font-normal ml-auto", seoData.seoDescription.length > 160 ? "text-red-400" : "text-white/30")}>
                      {seoData.seoDescription.length}/160
                    </span>
                  </label>
                  <textarea
                    value={seoData.seoDescription}
                    onChange={e => updateField('seoDescription', e.target.value)}
                    placeholder="VD: Mua áo thun nam đẹp, thoáng mát, dễ phối đồ tại UR Sport. Nhiều mẫu cotton, oversize, áo thể thao nam, giao hàng toàn quốc."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1e4b64] transition-colors resize-none placeholder:text-white/20"
                  />
                  <div className="mt-2 grid gap-2 text-[11px] font-medium text-white/35 sm:grid-cols-3">
                    <span className="rounded-lg bg-white/[0.04] px-3 py-2">Nên dài 140-160 ký tự.</span>
                    <span className="rounded-lg bg-white/[0.04] px-3 py-2">Có từ khóa chính của danh mục.</span>
                    <span className="rounded-lg bg-white/[0.04] px-3 py-2">Nêu lợi ích mua hàng rõ ràng.</span>
                  </div>
                  <p className="mt-2 text-[11px] text-white/30">
                    Mô tả này dùng cho Google, social preview và đoạn giới thiệu ngắn dưới H1 khi trang danh mục chưa lọc.
                  </p>
                </div>

                {/* Meta Keywords */}
                <div>
                  <label className="flex items-center gap-2 text-white/70 text-sm font-bold mb-2">
                    <Tag className="h-3.5 w-3.5" />
                    Meta Keywords (Từ khóa)
                  </label>
                  <input
                    type="text"
                    value={seoData.seoKeywords}
                    onChange={e => updateField('seoKeywords', e.target.value)}
                    placeholder="VD: áo thun nam, áo thun nam đẹp, áo thun oversize, áo thun cotton nam"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1e4b64] transition-colors placeholder:text-white/20"
                  />
                </div>

                {/* Canonical & Robots - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-white/70 text-sm font-bold mb-2">
                      <Link2 className="h-3.5 w-3.5" />
                      Canonical URL
                    </label>
                    <input
                      type="text"
                      value={seoData.seoCanonical}
                      onChange={e => updateField('seoCanonical', e.target.value)}
                      placeholder="VD: https://shop-ur-sport.vercel.app/apparel/ao-thun-nam"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1e4b64] transition-colors placeholder:text-white/20"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-white/70 text-sm font-bold mb-2">
                      <Bot className="h-3.5 w-3.5" />
                      Robots Meta
                    </label>
                    <input
                      type="text"
                      value={seoData.seoRobots}
                      onChange={e => updateField('seoRobots', e.target.value)}
                      placeholder="index, follow"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1e4b64] transition-colors placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Article Content Editor */}
          <div className="bg-[#13161f] p-6 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#1e4b64]" />
                Nội dung bài viết SEO
              </h3>
            </div>

            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4b64]" />
              </div>
            ) : (
              <div className="bg-white rounded-xl overflow-hidden border border-zinc-200">
                <div id="category-seo-quill-toolbar" className="ql-toolbar flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-3">
                  {!isHtmlMode && (
                    <>
                      <span className="ql-formats">
                        <select className="ql-header" defaultValue="">
                          <option value="1">H1</option>
                          <option value="2">H2</option>
                          <option value="3">H3</option>
                          <option value="4">H4</option>
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
                        <select className="ql-color" />
                        <select className="ql-background" />
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
                    </>
                  )}
                  <span className="ql-formats">
                    <button type="button" className="faq-toolbar-button" onClick={insertFaqTemplate} title="Chèn 3 câu hỏi FAQ" />
                    <button type="button" className="html-toolbar-button" onClick={toggleHtmlMode} title={isHtmlMode ? 'Chế độ trực quan' : 'Chế độ HTML'}>
                      <Code className="h-4 w-4" />
                      <span>{isHtmlMode ? 'Visual' : 'HTML'}</span>
                    </button>
                  </span>
                  {!isHtmlMode && (
                    <span className="ql-formats">
                      <button className="ql-clean" />
                    </span>
                  )}
                </div>
                {isHtmlMode ? (
                  <textarea
                    value={seoData.content}
                    onChange={(e) => updateField('content', e.target.value)}
                    className="h-[400px] w-full resize-none bg-[#0f1117] p-4 font-mono text-sm text-emerald-400 outline-none"
                    placeholder="Nhập mã HTML vào đây..."
                    spellCheck={false}
                  />
                ) : (
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={seoData.content}
                    onChange={(val) => updateField('content', val)}
                    modules={quillModules}
                    formats={quillFormats}
                    className="h-[400px] text-zinc-900 pb-10"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
