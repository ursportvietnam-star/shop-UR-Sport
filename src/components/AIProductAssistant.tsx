import React, { useState } from 'react';
import { generateProductSEO, AIProductData, getAIProvider, setAIProvider } from '../lib/gemini';
import type { Product } from '../types';
import { Bot, Sparkles, Send, Settings, Save, AlertCircle, BrainCircuit } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { sanitizeRichHtml } from '../lib/htmlContent';

interface AIProductAssistantProps {
  products?: Product[];
  onApply: (data: AIProductData, sourceProduct?: Product | null) => void;
}

const stripHtml = (value = '') =>
  value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const buildVariantSummary = (product: Product) => {
  if (!product.variants?.length) {
    return `Mau sac: ${(product.colors || []).join(', ') || 'chua co'}\nSize: ${(product.sizes || []).join(', ') || 'chua co'}\nTon kho tong: ${product.stock ?? 0}`;
  }

  const outOfStock = product.variants
    .filter(variant => Number(variant.stock || 0) <= 0)
    .map(variant => `${variant.color}/${variant.size}`)
    .join(', ');

  return [
    `Mau sac: ${(product.colors || []).join(', ') || 'chua co'}`,
    `Size: ${(product.sizes || []).join(', ') || 'chua co'}`,
    `Ton kho tong: ${product.stock ?? 0}`,
    `So phan loai: ${product.variants.length}`,
    outOfStock ? `Phan loai het hang, khong duoc quang cao la con hang: ${outOfStock}` : 'Tat ca phan loai dang co ton kho.',
  ].join('\n');
};

const buildProductPrompt = (product: Product, extraInstruction: string) => `
Hay toi uu noi dung cho san pham that dang co trong admin URSport. Chi dua tren du lieu ben duoi, khong bia gia, ton kho, chat lieu, bao hanh hoac tinh nang ky thuat.

DU LIEU SAN PHAM:
- Ten hien tai: ${product.name}
- Slug hien tai: ${product.slug || product.id}
- Danh muc: ${product.category}
- Gia niem yet: ${Number(product.price || 0).toLocaleString('vi-VN')} VND
- Gia khuyen mai: ${product.discountPrice ? `${Number(product.discountPrice).toLocaleString('vi-VN')} VND` : 'khong co'}
- Thuong hieu: ${product.brand || 'UR SPORT'}
- Xuat xu: ${product.origin || 'Viet Nam'}
- Chat lieu: ${product.material || 'chua nhap'}
- Kieu dang/form: ${product.style || 'chua nhap'}
- Phong cach: ${product.fashionStyle || 'chua nhap'}
- Co ao: ${product.collarType || 'chua nhap'}
- Dac diem hien co: ${(product.features || []).join(', ') || 'chua co'}
${buildVariantSummary(product)}

MO TA HIEN TAI:
${stripHtml(product.description).slice(0, 2500) || 'Chua co mo ta.'}

YEU CAU THEM CUA ADMIN:
${extraInstruction.trim() || 'Viet lai mo ta san pham tu nhien, ro loi ich, tap trung chuyen doi va SEO.'}

BAT BUOC:
- Giu dung thong tin san pham that.
- Neu co phan loai het hang, khong noi tat ca size/mau deu san san.
- descriptionHtml dung HTML sach: <p>, <h2>, <ul><li>, <strong>.
- Khong tra ve markdown, chi tra JSON dung schema.
`;

export function AIProductAssistant({ products = [], onApply }: AIProductAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIProductData | null>(null);
  const [provider, setProvider] = useState<'gemini' | 'local'>(() => getAIProvider() as 'gemini' | 'local');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const safeDescriptionHtml = React.useMemo(() => sanitizeRichHtml(result?.descriptionHtml || ''), [result?.descriptionHtml]);
  const selectedProduct = React.useMemo(
    () => products.find(product => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const handleSaveSettings = () => {
    setAIProvider(provider);
    toast.success('Đã lưu cấu hình AI!');
    setShowSettings(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !selectedProduct) {
      toast.error('Vui lòng chọn sản phẩm hoặc nhập brief để AI xử lý');
      return;
    }
    setLoading(true);
    try {
      setAIProvider(provider);
      const finalPrompt = selectedProduct ? buildProductPrompt(selectedProduct, prompt) : prompt;
      const data = await generateProductSEO(finalPrompt);
      setResult(data);
      toast.success('Tạo nội dung thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tạo nội dung');
      if (error.message.includes('API Key') || error.message.includes('xác thực') || error.message.includes('cấu hình')) setShowSettings(true);
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
              <p className="text-sm text-zinc-400 mt-1">Chọn nguồn AI để tạo nội dung sản phẩm.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Nhà cung cấp AI</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'gemini', label: 'Gemini (Cloud)' },
                  { id: 'local', label: 'Ollama local' },
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setProvider(option.id as 'gemini' | 'local')}
                    className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                      provider === option.id
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {provider === 'local' && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-sm text-purple-200">
                  <strong className="text-purple-400">Yêu cầu:</strong> Bạn cần cài đặt Ollama và tải model <code>qwen2.5</code> trên máy tính (Cổng mặc định: 11434).
                </p>
              </div>
            )}
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

        <div className="mb-6 inline-flex rounded-xl bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700">
          {provider === 'local' ? 'Ollama local' : 'Google Gemini'}
        </div>
        
        <div className="flex flex-col gap-4">
          {products.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                Lấy dữ liệu từ sản phẩm thật
              </label>
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-900 outline-none focus:border-blue-500"
              >
                <option value="">Tạo sản phẩm mới từ brief thủ công</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.slug || product.id}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="mt-3 grid gap-2 text-xs font-bold text-zinc-500 sm:grid-cols-3">
                  <span>Giá: {Number(selectedProduct.discountPrice || selectedProduct.price || 0).toLocaleString('vi-VN')}đ</span>
                  <span>Màu: {selectedProduct.colors?.length || 0}</span>
                  <span>Phân loại: {selectedProduct.variants?.length || 0}</span>
                </div>
              )}
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={selectedProduct ? "Nhập yêu cầu thêm nếu cần, ví dụ: nhấn mạnh cotton mềm, mặc hằng ngày, văn phong cao cấp..." : "Nhập ý tưởng sản phẩm... AI sẽ viết mô tả, SEO, Tags và bài đăng MXH cho bạn."}
            className="w-full min-h-[140px] p-5 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y text-zinc-900 leading-relaxed"
          />
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleGenerate} 
              disabled={loading || (!prompt.trim() && !selectedProduct)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black h-14 px-10 gap-3 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              {loading ? (
                <div className="h-6 w-6 rounded-full border-3 border-white border-t-transparent animate-spin" />
              ) : (
                <BrainCircuit className="h-6 w-6" />
              )}
              {loading ? 'AI ĐANG PHÂN TÍCH...' : selectedProduct ? 'TỐI ƯU SẢN PHẨM NÀY' : 'GENERATE AI CONTENT'}
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
              onClick={() => onApply(result, selectedProduct)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-10 px-6 gap-2 rounded-lg"
            >
              <Send className="h-4 w-4" /> Áp dụng vào form
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
            <div className="mt-2 p-6 bg-zinc-50 border border-zinc-200 rounded-xl prose max-w-none text-zinc-800" dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }} />
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
