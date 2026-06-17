import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../LanguageContext';

const SIZE_CHARTS = {
  polo: [
    { size: 'M', vai: 42, dai: 68, nguc: 96 },
    { size: 'L', vai: 44, dai: 70, nguc: 100 },
    { size: 'XL', vai: 46, dai: 72, nguc: 104 },
    { size: 'XXL', vai: 48, dai: 74, nguc: 108 },
    { size: 'XXXL', vai: 50, dai: 76, nguc: 112 }
  ],
  tshirt: [
    { size: 'M', vai: 43, dai: 69, nguc: 98 },
    { size: 'L', vai: 45, dai: 71, nguc: 102 },
    { size: 'XL', vai: 47, dai: 73, nguc: 106 },
    { size: 'XXL', vai: 49, dai: 75, nguc: 110 },
    { size: 'XXXL', vai: 51, dai: 77, nguc: 114 },
    { size: '4XL', vai: 53, dai: 79, nguc: 118 }
  ],
  sports: [
    { size: 'M', vai: 41, dai: 67, nguc: 94 },
    { size: 'L', vai: 43, dai: 69, nguc: 98 },
    { size: 'XL', vai: 45, dai: 71, nguc: 102 },
    { size: 'XXL', vai: 47, dai: 73, nguc: 106 },
    { size: 'XXXL', vai: 49, dai: 75, nguc: 110 }
  ]
};

export function BlogSizeGuideWidget() {
  const { language } = useLanguage();
  const [suggestedSize, setSuggestedSize] = useState<string | null>(null);
  const [isSizeProfileModalOpen, setIsSizeProfileModalOpen] = useState(false);
  const [activeChart, setActiveChart] = useState<'polo' | 'tshirt' | 'sports'>('polo');
  const [userHeight, setUserHeight] = useState('');
  const [userWeight, setUserWeight] = useState('');

  // Load from localStorage if exists
  useEffect(() => {
    const cachedHeight = localStorage.getItem('user_height');
    const cachedWeight = localStorage.getItem('user_weight');
    if (cachedHeight) setUserHeight(cachedHeight);
    if (cachedWeight) setUserWeight(cachedWeight);
    if (cachedHeight && cachedWeight) {
      calculateSize(Number(cachedHeight), Number(cachedWeight));
    }
  }, []);

  const calculateSize = (height: number, weight: number) => {
    if (height > 180 || weight > 82) setSuggestedSize('XXXL');
    else if (height > 175 || weight > 75) setSuggestedSize('XXL');
    else if (height > 170 || weight > 68) setSuggestedSize('XL');
    else if (height > 165 || weight > 60) setSuggestedSize('L');
    else setSuggestedSize('M');
  };

  const handleSaveSizeProfile = () => {
    if (userHeight && userWeight) {
      localStorage.setItem('user_height', userHeight);
      localStorage.setItem('user_weight', userWeight);
      calculateSize(Number(userHeight), Number(userWeight));
      setIsSizeProfileModalOpen(false);
    }
  };

  return (
    <div className="w-full my-8 not-prose font-sans">
      <h4 className="text-[18px] font-bold text-zinc-900 italic mb-6 pb-4 border-b-2 border-zinc-900 inline-block pr-8">
        {language === 'en' ? 'SIZE GUIDE' : 'HƯỚNG DẪN CHỌN SIZE'}
      </h4>
      
      <div className="w-full bg-white">
        <h5 className="text-[15px] font-medium text-zinc-800 mb-4">{language === 'en' ? 'Product measurements' : 'Số đo sản phẩm'}</h5>
        
        {/* Banner Đề xuất Size */}
        <div className="w-full border border-red-200 bg-red-50/30 rounded-xl p-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span className="text-[14px] text-zinc-700">
              {suggestedSize ? (
                <>{language === 'en' ? 'Suggested size' : 'Size đề xuất'}: <strong className="text-red-500">{suggestedSize}</strong></>
              ) : (
                language === 'en' ? 'Enter height and weight to get a size suggestion' : 'Nhập chiều cao cân nặng để nhận đề xuất size'
              )}
            </span>
          </div>
          <button 
            onClick={() => setIsSizeProfileModalOpen(true)}
            className="text-[13px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors"
          >
            {language === 'en' ? 'Size profile' : 'Hồ sơ size'} <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Bảng thông số */}

        <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 mb-6">
          <table className="w-full text-center text-[14px] min-w-[500px] border-collapse m-0">
            <thead className="bg-zinc-50">
              <tr>
                <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200 text-left">{language === 'en' ? 'Size (International)' : 'Size (Quốc Tế)'}</th>
                <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">{language === 'en' ? 'Shoulder' : 'Vai'} <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
                <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">{language === 'en' ? 'Shirt length' : 'Chiều dài áo'} <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
                <th className="py-4 px-4 font-bold text-zinc-800 border-b border-zinc-200">{language === 'en' ? 'Chest' : 'Vòng ngực'} <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">(cm)</span></th>
              </tr>
            </thead>
            <tbody>
              {SIZE_CHARTS[activeChart].map((row) => {
                const isSuggested = suggestedSize === row.size;
                return (
                  <tr key={row.size} className={cn("border-b border-zinc-100 last:border-0", isSuggested ? "bg-red-50/20" : "")}>
                    <td className={cn("py-4 px-4 text-left font-medium", isSuggested ? "text-red-500 font-bold" : "text-zinc-600")}>{row.size}</td>
                    <td className={cn("py-4 px-4", isSuggested ? "text-red-500 font-bold" : "text-zinc-600")}>{row.vai}</td>
                    <td className={cn("py-4 px-4", isSuggested ? "text-red-500 font-bold" : "text-zinc-600")}>{row.dai}</td>
                    <td className={cn("py-4 px-4", isSuggested ? "text-red-500 font-bold" : "text-zinc-600")}>{row.nguc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <p className="text-[12px] text-zinc-400 mt-4">{language === 'en' ? 'Measurements may vary slightly depending on each fit.' : 'Số đo có thể thay đổi nhẹ tùy thuộc vào từng form áo.'}</p>
      </div>

      {/* Modal Hồ Sơ Size */}
      <AnimatePresence>
        {isSizeProfileModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSizeProfileModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-100">
                <h3 className="text-[18px] font-medium text-zinc-800">{language === 'en' ? 'Measurement information' : 'Thông tin số đo'}</h3>
                <button 
                  onClick={() => setIsSizeProfileModalOpen(false)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              </div>
              
              <div className="p-6">
                <h4 className="text-[15px] font-medium text-zinc-800 mb-4">{language === 'en' ? 'Basic measurements' : 'Các số đo cơ bản'}</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[13px] text-zinc-600 mb-2">{language === 'en' ? 'Height' : 'Chiều cao mẫu'}<span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={userHeight}
                        onChange={(e) => setUserHeight(e.target.value)}
                        placeholder="VD: 175"
                        className="w-full h-11 px-4 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64] text-[14px]"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">cm</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] text-zinc-600 mb-2">{language === 'en' ? 'Weight' : 'Cân nặng mẫu'}<span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={userWeight}
                        onChange={(e) => setUserWeight(e.target.value)}
                        placeholder="VD: 70"
                        className="w-full h-11 px-4 border border-zinc-200 rounded-xl outline-none focus:border-[#1e4b64] text-[14px]"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">kg</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-4 mb-6">
                  <button className="w-full flex items-center justify-between text-[14px] text-zinc-800">
                    {language === 'en' ? 'Other measurements' : 'Các số đo khác'}
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </button>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={handleSaveSizeProfile}
                    className="px-10 py-2.5 bg-[#f05d40] text-white font-bold rounded-md hover:bg-[#d94b30] transition-colors"
                  >
                    {language === 'en' ? 'Save' : 'Lưu'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
