import React from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { useProducts } from '../ProductsContext';
import { useComparison } from '../ComparisonContext';
import { getProductPath } from '../lib/productUrls';
import { Product } from '../types';

export default function ProductComparisonPage() {
  const { products } = useProducts();
  const { compareIds, removeCompare, clearCompare } = useComparison();
  const comparedProducts = compareIds
    .map(id => products.find(product => product.id === id))
    .filter((product): product is Product => Boolean(product));

  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1e4b64]">Product Comparison</p>
            <h1 className="mt-2 text-2xl font-black text-zinc-950 sm:text-3xl">So sánh sản phẩm</h1>
          </div>
          {comparedProducts.length > 0 && (
            <button onClick={clearCompare} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 hover:bg-zinc-100">
              Xóa so sánh
            </button>
          )}
        </div>

        {comparedProducts.length === 0 ? (
          <div className="rounded-[28px] border border-zinc-100 bg-white p-12 text-center shadow-sm">
            <PackageSearch className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
            <h2 className="text-xl font-black text-zinc-950">Chưa chọn sản phẩm để so sánh</h2>
            <Link to="/shop" className="mt-6 inline-flex h-11 items-center rounded-full bg-[#1e4b64] px-6 text-sm font-black text-white">Chọn sản phẩm</Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[28px] border border-zinc-100 bg-white shadow-sm">
            <table className="min-w-[760px] w-full text-left">
              <tbody className="divide-y divide-zinc-100">
                <tr>
                  <th className="w-44 p-4 text-xs font-black uppercase tracking-widest text-zinc-400">Sản phẩm</th>
                  {comparedProducts.map(product => (
                    <td key={product.id} className="p-4 align-top">
                      <button onClick={() => removeCompare(product.id)} className="mb-3 text-xs font-black text-red-500">Bỏ so sánh</button>
                      <img src={product.images?.[0]} alt={product.name} className="mb-3 aspect-square w-32 rounded-2xl object-cover" />
                      <Link to={getProductPath(product)} className="block text-sm font-black text-zinc-950 hover:text-[#1e4b64]">{product.name}</Link>
                    </td>
                  ))}
                </tr>
                {[
                  ['Giá', (product: Product) => `${(product.discountPrice || product.price).toLocaleString('vi-VN')}đ`],
                  ['Danh mục', (product: Product) => String(product.category)],
                  ['Chất liệu', (product: Product) => product.material || 'Đang cập nhật'],
                  ['Form dáng', (product: Product) => product.style || product.fashionStyle || 'Đang cập nhật'],
                  ['Màu sắc', (product: Product) => product.colors?.join(', ') || 'Đang cập nhật'],
                  ['Kích cỡ', (product: Product) => product.sizes?.join(', ') || 'Đang cập nhật'],
                  ['Đánh giá', (product: Product) => `${product.rating || 0}/5 (${product.reviewsCount || 0})`],
                ].map(([label, getter]) => (
                  <tr key={String(label)}>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-400">{String(label)}</th>
                    {comparedProducts.map(product => (
                      <td key={product.id} className="p-4 text-sm font-bold text-zinc-700">{(getter as (product: Product) => string)(product)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
