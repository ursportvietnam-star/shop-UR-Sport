import React, { useState } from 'react';
import { generateProductSEO, AIProductData, getGeminiApiKey, setGeminiApiKey, getDeepSeekApiKey, setDeepSeekApiKey, AIProvider } from '../lib/gemini';
import { Bot, Sparkles, Send, Settings, Save, AlertCircle, BrainCircuit } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIProductAssistantProps {
  onApply: (data: AIProductData) => void;
}

export function AIProductAssistant({ onApply }: AIProductAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIProductData | null>(null);
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [geminiKey, setGeminiKey] = useState(getGeminiApiKey());
  const [deepSeekKey, setDeepSeekKey] = useState(getDeepSeekApiKey());
  const [showSettings, setShowSettings] = useState(!getGeminiApiKey() && !getDeepSeekApiKey());

  const handleSaveSettings = () => {
    setGeminiApiKey(geminiKey);
    setDeepSeekApiKey(deepSeekKey);
    toast.success('Đã lưu cấu hình AI!');
    setShowSettings(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Vui lòng nhập mô tả sản phẩm để AI xử lý');
      return;
    }
    setLoading(true);
    try {
      const data = await generateProductSEO(prompt, provider);
      setResult(data);
      toast.success('Tạo nội dung thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tạo nội dung');
      if (error.message.includes('API Key')) setShowSettings(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {showSettings && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-start gap-3">
            <Settings className="h-6 w-6 text-blue-500 shrink-0" />
            <div>
              <h3 className="font-bold text-white">Cấu hình AI Assistant</h3>
              <p className="text-sm text-zinc-400 mt-1">Thiết lập API Key để sử dụng trí tuệ nhân tạo.</p>
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
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">DeepSeek API Key</label>
              <input 
                type="password" 
                value={deepSeekKey}
                onChange={e => setDeepSeekKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </div>

            <Button onClick={handleSaveSettings} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl gap-2">
              <Save className="h-5 w-5" /> Lưu cấu hình
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 leading-tight">AI CONTENT GEN v2</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Product SEO Specialist</p>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <Settings className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl mb-6 w-fit">
          <button 
            onClick={() => setProvider('gemini')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black transition-all",
              provider === 'gemini' ? "bg-white text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Google Gemini
          </button>
          <button 
            onClick={() => setProvider('deepseek')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black transition-all",
              provider === 'deepseek' ? "bg-white text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            DeepSeek-V3
          </button>
        </div>
        
        <div className="flex flex-col gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Nhập ý tưởng sản phẩm... AI sẽ viết mô tả, SEO, Tags và bài đăng MXH cho bạn."
            className="w-full min-h-[140px] p-5 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y text-zinc-900 leading-relaxed"
          />
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleGenerate} 
              disabled={loading || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black h-14 px-10 gap-3 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              {loading ? (
                <div className="h-6 w-6 rounded-full border-3 border-white border-t-transparent animate-spin" />
              ) : (
                <BrainCircuit className="h-6 w-6" />
              )}
              {loading ? 'AI ĐANG PHÂN TÍCH...' : 'GENERATE AI CONTENT'}
            </Button>
          </div>
        </div>
      </div>

      {/* Result Area */}
      {result && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" /> Kết quả tạo bởi AI
            </h3>
            <Button 
              onClick={() => onApply(result)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-10 px-6 gap-2 rounded-lg"
            >
              <Send className="h-4 w-4" /> Apply to Product
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tên sản phẩm</label>
                <div className="mt-1 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-semibold">{result.name}</div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Slug SEO</label>
                <div className="mt-1 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 font-mono text-sm">{result.slug}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mô tả ngắn</label>
                <div className="mt-1 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700">{result.shortDescription}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Lợi ích chính (Bullet Points)</label>
                <ul className="mt-1 p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 list-disc list-inside space-y-1">
                  {result.bulletBenefits.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                <h4 className="font-bold text-blue-900">SEO & Meta</h4>
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Meta Title</label>
                  <div className="mt-1 p-2 bg-white border border-blue-200 rounded text-blue-900 text-sm font-semibold">{result.metaTitle}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Meta Description</label>
                  <div className="mt-1 p-2 bg-white border border-blue-200 rounded text-blue-800 text-sm">{result.metaDescription}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Keywords & Tags</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {result.tags.map(t => <span key={t} className="px-2 py-1 bg-white border border-blue-200 rounded-md text-xs font-bold text-blue-700">#{t}</span>)}
                  </div>
                  <div className="mt-2 text-xs text-blue-600 font-mono">{result.seoKeywords}</div>
                </div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-4">
                <h4 className="font-bold text-orange-900">Marketplace & Social</h4>
                <div>
                  <label className="text-xs font-bold text-orange-700 uppercase tracking-wider">Shopee Title</label>
                  <div className="mt-1 p-2 bg-white border border-orange-200 rounded text-orange-900 text-sm font-semibold">{result.shopeeTitle}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-orange-700 uppercase tracking-wider">Facebook Caption</label>
                  <div className="mt-1 p-3 bg-white border border-orange-200 rounded text-orange-800 text-sm whitespace-pre-wrap">{result.facebookCaption}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mô tả dài HTML (Preview)</label>
            <div className="mt-2 p-6 bg-zinc-50 border border-zinc-200 rounded-xl prose max-w-none text-zinc-800" dangerouslySetInnerHTML={{ __html: result.descriptionHtml }} />
          </div>
        </div>
      )}
    </div>
  );
}

// Custom CheckIcon for internal use since lucide might not import it perfectly
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
