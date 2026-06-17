import React from 'react';
import { CheckCircle2, Circle, Loader2, PackagePlus, Rocket, Save, Sparkles, Trash2, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { ImageUpload } from './ImageUpload';
import { generateProductFactoryDraft, publishProductFactoryDraft } from '../lib/productFactoryApi';
import type { ProductFactoryInput, ProductFactoryResult } from '../types/productFactory';
import { saveLocalProduct } from '../lib/localProducts';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const DEFAULT_STEPS = [
  'AI Vision',
  'Product Blueprint',
  'Rule Engine',
  'SEO Engine',
  'Content Engine',
  'Image SEO',
  'Schema',
  'Internal Link',
  'Quality Audit',
  'Publish Gate',
];

const splitCsv = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

const formatPrice = (value: number) => Number(value || 0).toLocaleString('vi-VN');

export function ProductFactoryPanel() {
  const [form, setForm] = React.useState({
    title: '',
    brand: 'URSport',
    productType: 'ao-thun-nam',
    material: 'premium cotton',
    fit: 'regular fit',
    color: '',
    sizes: 'M,L,XL,XXL,3XL,4XL',
    price: '119000',
    quantity: '90',
  });
  const [images, setImages] = React.useState<Array<{ url: string; fileName?: string }>>([]);
  const [result, setResult] = React.useState<ProductFactoryResult | null>(null);
  const [running, setRunning] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(-1);

  const syncLocalToFirebase = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error('Không thể lấy dữ liệu local');
      const data = await res.json();
      
      const publishedProducts = data.products.filter((p: any) => p.status === 'published');
      if (publishedProducts.length === 0) {
        toast.info('Không có sản phẩm nào đã publish ở local.');
        return;
      }
      
      let syncedCount = 0;
      for (const p of publishedProducts) {
        const imgs = data.images.filter((i: any) => i.productId === p.id);
        const legacyProduct = {
          id: p.id,
          productCode: 'UR-' + p.id.slice(0, 8).toUpperCase(),
          slug: p.slug,
          name: p.title,
          description: p.fullDescriptionHtml,
          price: p.price,
          images: imgs.map((image: any) => image.url),
          category: p.productType.includes('the-thao') ? 'Áo thun thể thao nam' : p.productType.includes('polo') ? 'Áo polo nam' : 'Áo thun nam',
          colors: p.color ? p.color.split(',').map((item: any) => item.trim()).filter(Boolean) : [],
          sizes: p.sizes,
          stock: p.quantity || 100,
          rating: 5.0,
          reviewsCount: 0,
          features: [],
          seoTitle: p.metaTitle,
          metaDescription: p.metaDescription,
          keywords: p.secondaryKeywords ? p.secondaryKeywords.join(', ') : '',
          specifications: '',
          brand: p.brand || 'URSport',
          isNew: true,
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'products', legacyProduct.id), legacyProduct, { merge: true });
        syncedCount++;
      }
      
      toast.success(`Đã đồng bộ thành công ${syncedCount} sản phẩm lên Firebase!`);
    } catch (error: any) {
      toast.error('Lỗi đồng bộ: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const input: ProductFactoryInput = React.useMemo(() => ({
    title: form.title.trim(),
    brand: form.brand.trim() || 'URSport',
    productType: form.productType.trim(),
    material: form.material.trim(),
    fit: form.fit.trim(),
    color: form.color.trim(),
    sizes: splitCsv(form.sizes),
    price: Number(String(form.price).replace(/[^\d]/g, '')),
    quantity: Number(String(form.quantity).replace(/[^\d]/g, '')),
    images,
  }), [form, images]);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const runFactory = async () => {
    if (!input.title || !input.productType || !input.material || !input.fit || !input.price) {
      toast.error('Nhập đủ tên, loại sản phẩm, chất liệu, form và giá trước khi chạy AI.');
      return;
    }

    setRunning(true);
    setResult(null);
    setActiveStep(0);
    const timer = window.setInterval(() => {
      setActiveStep(prev => Math.min(prev + 1, DEFAULT_STEPS.length - 2));
    }, 700);

    try {
      const draft = await generateProductFactoryDraft(input);
      setResult(draft);
      setActiveStep(DEFAULT_STEPS.length - 1);
      toast.success(draft.audit.score >= 90 ? 'Draft đạt SEO Score >= 90.' : 'Draft đã lưu, cần tối ưu thêm trước khi publish.');
    } catch (error: any) {
      toast.error(error.message || 'Product Factory chưa chạy được.');
    } finally {
      window.clearInterval(timer);
      setRunning(false);
    }
  };

  const publishDraft = async () => {
    if (!result) return;
    if (result.audit.score < 90) {
      toast.error('SEO Score dưới 90, chưa được publish.');
      return;
    }

    setPublishing(true);
    try {
      const published = await publishProductFactoryDraft(result);
      setResult(prev => prev ? { ...prev, product: published.product, images: published.images, schema: published.schema, blueprint: published.blueprint } : prev);
      toast.success(published.published ? 'Đã publish và đưa vào catalog local.' : 'Đã lưu draft.');
    } catch (error: any) {
      toast.error(error.message || 'Chưa publish được sản phẩm.');
    } finally {
      setPublishing(false);
    }
  };

  const score = result?.audit.score || 0;
  const canPublish = score >= 90;
  const wordCount = result ? result.product.fullDescriptionHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-zinc-950">AI Product Factory</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-500">Upload ảnh, nhập dữ liệu tối thiểu, chạy pipeline và publish khi SEO Score đạt chuẩn.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={syncLocalToFirebase} disabled={syncing} className="h-12 rounded-xl bg-blue-600 px-5 font-black text-white hover:bg-blue-700">
              {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}
              Đồng bộ lên Firebase
            </Button>
            <Button onClick={runFactory} disabled={running} className="h-12 rounded-xl bg-violet-600 px-5 font-black text-white hover:bg-violet-700">
              {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              Tạo sản phẩm bằng AI
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">Thông tin tối thiểu</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-zinc-500">Tên sản phẩm gốc</span>
                <input value={form.title} onChange={e => updateForm('title', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500" placeholder="Áo Thun Nam AETHER Premium Cotton" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-zinc-500">Brand</span>
                  <input value={form.brand} onChange={e => updateForm('brand', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-zinc-500">Loại sản phẩm</span>
                  <select value={form.productType} onChange={e => updateForm('productType', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500">
                    <option value="ao-thun-nam">áo thun nam</option>
                    <option value="ao-the-thao-nam">áo thể thao nam</option>
                    <option value="ao-polo-nam">áo polo nam</option>
                    <option value="quan-the-thao-nam">quần thể thao nam</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-zinc-500">Chất liệu</span>
                  <input value={form.material} onChange={e => updateForm('material', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-zinc-500">Form</span>
                  <input value={form.fit} onChange={e => updateForm('fit', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-zinc-500">Màu sắc</span>
                <input value={form.color} onChange={e => updateForm('color', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500" placeholder="Đen, Trắng, Xanh đen" />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-zinc-500">Giá</span>
                  <input value={form.price} onChange={e => updateForm('price', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-zinc-500">Số lượng</span>
                  <input value={form.quantity} onChange={e => updateForm('quantity', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-zinc-500">Size</span>
                  <input value={form.sizes} onChange={e => updateForm('sizes', e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Ảnh sản phẩm</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-black text-zinc-500">{images.length} ảnh</span>
            </div>
            <ImageUpload
              folder="products"
              multiple
              storage="cloudinary"
              label="Upload nhiều ảnh"
              onUploadComplete={(url) => setImages(prev => [...prev, { url }])}
            />
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div key={`${image.url}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                      className="absolute right-1 top-1 hidden h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white group-hover:flex"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">Pipeline</h3>
            <div className="space-y-3">
              {DEFAULT_STEPS.map((step, index) => {
                const done = result || index < activeStep;
                const active = running && index === activeStep;
                return (
                  <div key={step} className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                    {active ? <Loader2 className="h-5 w-5 animate-spin text-violet-600" /> : done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-zinc-300" />}
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-black text-zinc-950">Preview sản phẩm</h3>
                <p className="text-sm font-semibold text-zinc-500">{result ? `${wordCount} từ, ${result.images.length} ảnh SEO` : 'Chưa có draft'}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl px-4 py-3 text-center ${canPublish ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest">SEO Score</p>
                  <p className="text-2xl font-black">{score}</p>
                </div>
                <Button disabled={!result} variant="outline" className="h-12 rounded-xl font-black">
                  <Save className="h-4 w-4" />
                  Lưu nháp
                </Button>
                <Button onClick={publishDraft} disabled={!result || !canPublish || publishing} className="h-12 rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700">
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  Xuất bản
                </Button>
              </div>
            </div>

            {!result ? (
              <div className="mt-6 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
                <div>
                  <PackagePlus className="mx-auto h-12 w-12 text-zinc-300" />
                  <p className="mt-3 text-sm font-bold text-zinc-500">Nhập dữ liệu và bấm “Tạo sản phẩm bằng AI”.</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Title / Slug</p>
                  <h1 className="mt-1 text-2xl font-black text-zinc-950">{result.product.title}</h1>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">/{result.product.slug}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs font-black text-zinc-400">Giá</p>
                    <p className="text-lg font-black text-zinc-950">{formatPrice(result.product.price)}₫</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs font-black text-zinc-400">Số lượng</p>
                    <p className="text-lg font-black text-zinc-950">{result.product.quantity}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs font-black text-zinc-400">Keyword</p>
                    <p className="text-sm font-black text-zinc-950">{result.product.targetKeyword}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs font-black text-zinc-400">Status</p>
                    <p className="text-sm font-black text-zinc-950">{result.product.status}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Meta</p>
                  <p className="mt-2 text-sm font-black text-zinc-950">{result.product.metaTitle}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-zinc-500">{result.product.metaDescription}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(result.audit.checklist).map(([key, item]) => (
                    <div key={key} className={`rounded-xl border p-3 ${item.passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-black ${item.passed ? 'text-emerald-700' : 'text-amber-700'}`}>{item.message}</p>
                        <span className="text-xs font-black">{item.passed ? item.points : 0}/{item.points}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="prose max-w-none rounded-2xl border border-zinc-200 p-5" dangerouslySetInnerHTML={{ __html: result.product.fullDescriptionHtml }} />
                {result.images.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-3">
                    {result.images.map(image => (
                      <div key={image.id} className="rounded-2xl border border-zinc-200 p-3">
                        <img src={image.url} alt={image.alt} className="aspect-square w-full rounded-xl object-cover" />
                        <p className="mt-2 text-xs font-black text-zinc-950">{image.fileName}</p>
                        <p className="mt-1 text-xs font-semibold text-zinc-500">{image.alt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
