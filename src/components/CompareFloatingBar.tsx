import { useNavigate } from 'react-router-dom';
import { useComparison } from '../ComparisonContext';

export function CompareFloatingBar() {
  const navigate = useNavigate();
  const { compareIds, clearCompare } = useComparison();
  if (compareIds.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl sm:bottom-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1e4b64]">So sánh</p>
          <p className="text-sm font-black text-zinc-950">{compareIds.length}/3 sản phẩm</p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearCompare} className="rounded-full px-3 py-2 text-xs font-black text-zinc-500 hover:bg-zinc-100">Xóa</button>
          <button onClick={() => navigate('/so-sanh')} className="rounded-full bg-[#1e4b64] px-4 py-2 text-xs font-black text-white">Xem bảng</button>
        </div>
      </div>
    </div>
  );
}
