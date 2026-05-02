import React, { useState } from 'react';
import { X, Save, Package, Tag, Info, DollarSign, ListOrdered } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ImageUpload } from './ImageUpload';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CATEGORIES } from '../data';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: CATEGORIES[0],
    description: '',
    stock: '',
    images: [] as string[]
  });

  const modules = React.useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const toastId = toast.loading('Đang tải ảnh lên mô tả...');
            const uploadData = new FormData();
            uploadData.append('file', file);
            uploadData.append('upload_preset', 'ursport_uploads');
            uploadData.append('folder', 'product_descriptions');

            try {
              const res = await fetch(`https://api.cloudinary.com/v1_1/dcj4qhcfh/image/upload`, {
                method: 'POST',
                body: uploadData
              });
              const data = await res.json();
              
              const quill = (document.querySelector('.ql-editor') as any)?.__quill;
              if (quill) {
                const range = quill.getSelection();
                quill.insertEmbed(range.index, 'image', data.secure_url);
              }
              toast.success('Đã chèn ảnh thành công', { id: toastId });
            } catch (error) {
              toast.error('Lỗi khi tải ảnh', { id: toastId });
            }
          };
        }
      }
    }
  }), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || formData.images.length === 0) {
      toast.error('Vui lòng điền đầy đủ thông tin và tải ít nhất 1 ảnh!');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'products'), {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        slug: formData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        createdAt: serverTimestamp(),
        rating: 5,
        reviews: 0,
        colors: ['Black', 'White', 'Blue'], // Default colors
        sizes: ['S', 'M', 'L', 'XL'] // Default sizes
      });

      toast.success('Thêm sản phẩm thành công!');
      onSuccess();
      onClose();
      setFormData({
        name: '',
        price: '',
        category: CATEGORIES[0],
        description: '',
        stock: '',
        images: [] as string[]
      });
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Lỗi khi lưu sản phẩm');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] max-h-[95vh] bg-white rounded-[32px] shadow-2xl z-[101] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#0082c8] rounded-xl flex items-center justify-center text-white">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black italic tracking-tighter uppercase">Thêm sản phẩm mới</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Inventory Management</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Tên sản phẩm</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="pl-12 h-12 rounded-xl border-zinc-200 focus:ring-[#0082c8]"
                        placeholder="VD: Áo Thun Thể Thao Nam"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Giá bán (₫)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input 
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          className="pl-12 h-12 rounded-xl border-zinc-200"
                          placeholder="250000"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Tồn kho</label>
                      <div className="relative">
                        <ListOrdered className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input 
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({...formData, stock: e.target.value})}
                          className="pl-12 h-12 rounded-xl border-zinc-200"
                          placeholder="100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Danh mục</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-white focus:ring-2 focus:ring-[#0082c8] outline-none font-bold text-sm"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Mô tả sản phẩm (Chuẩn SEO)</label>
                    <div className="quill-container">
                      <ReactQuill 
                        theme="snow"
                        value={formData.description}
                        onChange={(content) => setFormData({...formData, description: content})}
                        modules={modules}
                        placeholder="Nhập mô tả chi tiết, bạn có thể chèn ảnh, định dạng văn bản để chuẩn SEO..."
                        className="h-[300px] mb-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Hình ảnh sản phẩm</label>
                    <ImageUpload 
                      onUploadComplete={(url) => setFormData({...formData, images: [...formData.images, url]})}
                      folder="products"
                      label=""
                    />
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {formData.images.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-100 group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})}
                            className="absolute top-1 right-1 bg-white/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose}
                  className="rounded-xl font-bold px-8"
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#0082c8] hover:bg-[#0071ae] text-white rounded-xl font-bold px-12 h-12 shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  {isSubmitting ? 'Đang lưu...' : (
                    <>
                      <Save className="h-4 w-4" />
                      Lưu sản phẩm
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
