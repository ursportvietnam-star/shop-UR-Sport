import React, { useState } from 'react';
import { generateBlogSEO, AIBlogData, getGeminiApiKey, setGeminiApiKey } from '../lib/gemini';
import { Sparkles, Send, Settings, Save, AlertCircle, PenTool, BrainCircuit } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { BlogPost } from '../types';
import { DailySeoSuggestionPanel } from './DailySeoSuggestionPanel';
import { SeoSuggestion, buildSeoBlogPrompt } from '../lib/dailySeoSuggestions';

interface AIBlogAssistantProps {
  onApply: (data: AIBlogData) => void;
  blogPosts?: BlogPost[];
}

export function AIBlogAssistant({ onApply, blogPosts = [] }: AIBlogAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIBlogData | null>(null);
  const [geminiKey, setGeminiKey] = useState(getGeminiApiKey());
  const [showSettings, setShowSettings] = useState(!getGeminiApiKey());
  const [activeSuggestionSlug, setActiveSuggestionSlug] = useState<string | undefined>();

  const handleSaveSettings = () => {
    setGeminiApiKey(geminiKey);
    toast.success('Đã lưu cấu hình AI!');
    setShowSettings(false);
  };

  const buildPromptFromSuggestion = (suggestion: SeoSuggestion) => buildSeoBlogPrompt(suggestion);

  const handleUseSuggestion = (suggestion: SeoSuggestion) => {
    setPrompt(buildPromptFromSuggestion(suggestion));
    toast.success('Đã đưa gợi ý SEO vào prompt AI Blog.');
  };

  const handleGenerateFromSuggestion = async (suggestion: SeoSuggestion) => {
    const suggestionPrompt = buildPromptFromSuggestion(suggestion);
    setPrompt(suggestionPrompt);
    await handleGenerate(suggestionPrompt, suggestion.slug);
  };

  const handleGenerate = async (promptOverride?: string, suggestionSlug?: string) => {
    const finalPrompt = (promptOverride || prompt).trim();
    if (!finalPrompt) {
      toast.error('Vui lòng nhập chủ đề bài viết');
      return;
    }
    setLoading(true);
    setActiveSuggestionSlug(suggestionSlug);
    try {
      const data = await generateBlogSEO(finalPrompt);
      setResult(data);
      toast.success('Tạo bài viết thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tạo bài viết');
      if (error.message.includes('API Key')) setShowSettings(true);
    } finally {
      setLoading(false);
      setActiveSuggestionSlug(undefined);
    }
  };

  const promptChecklist = [
    { label: 'Có slug/URL rõ ràng', passed: /slug|\/blog\//i.test(prompt) },
    { label: 'Có keyword chính', passed: /primary keyword|keyword:/i.test(prompt) },
    { label: 'Có intent/funnel', passed: /intent|funnel|TOFU|MOFU|BOFU/i.test(prompt) },
    { label: 'Có internal link', passed: /internal links|\/ao-|\/quan-|\/blog\//i.test(prompt) },
    { label: 'Có outline H2/H3', passed: /H2:|H3:/i.test(prompt) }
  ];

  const resultChecklist = result ? [
    { label: 'Title có đủ', passed: Boolean(result.title && result.title.length <= 80) },
    { label: 'Slug có đủ', passed: Boolean(result.slug) },
    { label: 'Meta description chuẩn', passed: Boolean(result.metaDescription && result.metaDescription.length <= 170) },
    { label: 'Có H2/H3', passed: /<h2[\s>]|<h3[\s>]/i.test(result.contentHtml || '') },
    { label: 'Có FAQ', passed: /Câu hỏi thường gặp|FAQ|<h3[\s>].+\?/i.test(result.contentHtml || '') },
    { label: 'Có internal links', passed: /href="\//i.test(result.contentHtml || '') || result.internalLinkMap.length > 0 }
  ] : [];

  return (
    <div className="space-y-6">
      <DailySeoSuggestionPanel
        blogPosts={blogPosts}
        onUseSuggestion={handleUseSuggestion}
        onGenerateSuggestion={handleGenerateFromSuggestion}
        generatingSlug={activeSuggestionSlug}
      />

      {showSettings && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-start gap-3">
            <Settings className="h-6 w-6 text-purple-500 shrink-0" />
            <div>
              <h3 className="font-bold text-white">Cấu hình AI Blog Writer</h3>
              <p className="text-sm text-zinc-400 mt-1">Thiết lập API Key để AI bắt đầu viết bài cho bạn.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Google Gemini Key</label>
              <input 
                type="password" 
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500"
              />
            </div>
            <Button onClick={handleSaveSettings} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 rounded-xl gap-2 transition-all active:scale-[0.98]">
              <Save className="h-5 w-5" /> Lưu cấu hình
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 rounded-xl">
              <PenTool className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 leading-tight uppercase tracking-tighter">AI Blog Creator</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Content Marketing Specialist</p>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <Settings className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <div className="mb-6 inline-flex rounded-xl bg-purple-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-purple-700">
          Google Gemini
        </div>
        
          <div className="flex flex-col gap-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Chọn 'Dùng gợi ý' ở card phía trên hoặc nhập brief bài viết. AI sẽ giữ slug, keyword, internal link và outline theo quy trình SEO."
              className="w-full min-h-[220px] p-5 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-y text-zinc-900 leading-relaxed"
            />
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Checklist trước khi viết</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {promptChecklist.map(item => (
                <div
                  key={item.label}
                  className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${
                    item.passed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-zinc-200 bg-white text-zinc-400'
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium leading-5 text-zinc-500">
              Quy trình tốt nhất: chọn gợi ý hôm nay, kiểm tra prompt đủ 5 tín hiệu, tạo bài, rồi Apply to Blog để mở form duyệt trước khi publish.
            </p>
            <Button 
              onClick={() => handleGenerate()} 
              disabled={loading || !prompt.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black h-14 px-10 gap-3 rounded-2xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all shrink-0"
            >
              {loading ? (
                <div className="h-6 w-6 rounded-full border-3 border-white border-t-transparent animate-spin" />
              ) : (
                <BrainCircuit className="h-6 w-6" />
              )}
              {loading ? 'AI ĐANG VIẾT BÀI...' : 'WRITE BLOG WITH AI'}
            </Button>
          </div>
        </div>
      </div>

      {/* Result Area */}
      {result && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" /> Kết quả bài viết
            </h3>
            <Button 
              onClick={() => onApply(result)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-10 px-6 gap-2 rounded-lg"
            >
              <Send className="h-4 w-4" /> Apply to Blog
            </Button>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">SEO QA trước khi đưa vào form</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              {resultChecklist.map(item => (
                <div
                  key={item.label}
                  className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${
                    item.passed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tiêu đề (H1)</label>
                <div className="mt-1 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-bold text-lg">{result.title}</div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Slug SEO</label>
                <div className="mt-1 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 font-mono text-sm">{result.slug}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Call to Action (CTA)</label>
                <div className="mt-1 p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 font-medium">{result.cta}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Gợi ý Internal Links</label>
                <ul className="mt-1 p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 list-disc list-inside space-y-1">
                  {result.internalLinkMap.map((link, i) => <li key={i}>{link}</li>)}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-4">
                <h4 className="font-bold text-purple-900">SEO & Meta</h4>
                <div>
                  <label className="text-xs font-bold text-purple-700 uppercase tracking-wider">Meta Title</label>
                  <div className="mt-1 p-2 bg-white border border-purple-200 rounded text-purple-900 text-sm font-semibold">{result.metaTitle}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-700 uppercase tracking-wider">Meta Description</label>
                  <div className="mt-1 p-2 bg-white border border-purple-200 rounded text-purple-800 text-sm">{result.metaDescription}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-700 uppercase tracking-wider">Keyword Cluster</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {result.keywordCluster.map(k => <span key={k} className="px-2 py-1 bg-white border border-purple-200 rounded-md text-xs font-bold text-purple-700">{k}</span>)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                <h4 className="font-bold text-blue-900">Social Media</h4>
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Social Caption</label>
                  <div className="mt-1 p-3 bg-white border border-blue-200 rounded text-blue-800 text-sm whitespace-pre-wrap">{result.socialCaption}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nội dung bài viết (HTML)</label>
            <div className="mt-2 p-8 bg-zinc-50 border border-zinc-200 rounded-xl prose max-w-none text-zinc-800" dangerouslySetInnerHTML={{ __html: result.contentHtml }} />
          </div>
        </div>
      )}
    </div>
  );
}

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
