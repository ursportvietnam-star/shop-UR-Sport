import React, { useState } from 'react';
import { generateProductSEO, AIProductData, getGeminiApiKey, setGeminiApiKey } from '../lib/gemini';
import { Bot, Sparkles, Send, Settings, Save, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface AIProductAssistantProps {
  onApply: (data: AIProductData) => void;
}

export function AIProductAssistant({ onApply }: AIProductAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIProductData | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [showSettings, setShowSettings] = useState(!getGeminiApiKey());

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput);
    toast.success('Đã lưu API Key!');
    setShowSettings(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Vui lòng nhập mô tả sản phẩm để AI xử lý');
      return;
    }
    setLoading(true);
    try {
      const data = await generateProductSEO(prompt);
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
      {/* Settings Modal/Area for API Key if not configured or editing */}
      {showSettings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 shrink-0" />
            <div>
              <h3 className="font-bold text-yellow-800">Cấu hình Google Gemini API Key</h3>
              <p className="text-sm text-yellow-700 mt-1">Tính năng này yêu cầu API Key của Google Gemini. Nhập Key của bạn vào bên dưới. Key sẽ được lưu an toàn trong trình duyệt (localStorage).</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input 
              type="password" 
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 bg-white border border-yellow-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <Button onClick={handleSaveApiKey} className="bg-yellow-600 hover:bg-yellow-700 text-white gap-2">
              <Save className="h-4 w-4" /> Lưu
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900">AI Viết Sản Phẩm (Chuẩn SEO)</h2>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="text-zinc-500 hover:text-zinc-800 p-2">
            <Settings className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex flex-col gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Nhập ý tưởng sản phẩm... (VD: Áo thun nam URSport cotton premium màu trắng co giãn, thấm hút mồ hôi, mặc tập gym)"
            className="w-full min-h-[120px] p-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleGenerate} 
              disabled={loading || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 gap-2 rounded-xl"
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {loading ? 'AI đang phân tích...' : 'Generate AI'}
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
