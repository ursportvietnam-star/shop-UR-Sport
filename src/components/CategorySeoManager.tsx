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

interface SeoData {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoCanonical: string;
  seoRobots: string;
  content: string;
}

const defaultSeoData: SeoData = {
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  seoCanonical: '',
  seoRobots: 'index, follow',
  content: '',
};

export function CategorySeoManager() {
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORY_METADATA[0]?.slug || '');
  const [seoData, setSeoData] = useState<SeoData>(defaultSeoData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);

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

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  }), []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image', 'video'
  ];

  const selectedCatName = CATEGORY_METADATA.find(c => c.slug === selectedCategory)?.name;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between bg-[#13161f] p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-[#1e4b64]" />
            SEO Danh Mục
          </h2>
          <p className="text-white/40 text-sm mt-1">
            Quản lý thẻ SEO và nội dung bài viết hiển thị ở cuối trang danh mục sản phẩm.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Category List */}
        <div className="bg-[#13161f] p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Chọn Danh Mục</h3>
          <div className="space-y-2">
            {CATEGORY_METADATA.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  selectedCategory === cat.slug
                    ? "bg-[#1e4b64] text-white shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {cat.name}
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
                    Meta Description (Mô tả)
                    <span className={cn("text-xs font-normal ml-auto", seoData.seoDescription.length > 160 ? "text-red-400" : "text-white/30")}>
                      {seoData.seoDescription.length}/160
                    </span>
                  </label>
                  <textarea
                    value={seoData.seoDescription}
                    onChange={e => updateField('seoDescription', e.target.value)}
                    placeholder="VD: Khám phá bộ sưu tập áo thun nam đẹp, form rộng, oversize, cotton cao cấp mới nhất 2026..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1e4b64] transition-colors resize-none placeholder:text-white/20"
                  />
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
                      placeholder="VD: https://ursport.vn/apparel/ao-thun-nam"
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
              <Button
                onClick={() => {
                  if (!isHtmlMode) {
                    setSeoData(prev => ({
                      ...prev,
                      content: beautify.html(prev.content.replace(/&nbsp;/g, ' '), { 
                        indent_size: 2,
                        wrap_line_length: 0,
                        preserve_newlines: true
                      })
                    }));
                  }
                  setIsHtmlMode(!isHtmlMode);
                }}
                variant="outline"
                className="bg-transparent border-white/10 text-white hover:bg-white/5 gap-2 rounded-full px-4"
              >
                <Code className="h-4 w-4" />
                {isHtmlMode ? 'Chế Độ Trực Quan' : 'Chế Độ HTML'}
              </Button>
            </div>

            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4b64]" />
              </div>
            ) : isHtmlMode ? (
              <div className="bg-[#0f1117] rounded-xl overflow-hidden border border-white/10 h-[400px]">
                <textarea
                  value={seoData.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-emerald-400 font-mono text-sm outline-none resize-none"
                  placeholder="Nhập mã HTML vào đây..."
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl overflow-hidden border border-zinc-200">
                <ReactQuill 
                  theme="snow"
                  value={seoData.content}
                  onChange={(val) => updateField('content', val)}
                  modules={quillModules}
                  formats={quillFormats}
                  className="h-[400px] text-zinc-900 pb-10"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
