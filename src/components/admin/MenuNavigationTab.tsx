import { Plus, Trash2 } from 'lucide-react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { ImageUpload } from '../ImageUpload';
import { CATEGORY_METADATA } from '../../data';
import { DEFAULT_SEO_SUBCATEGORIES, linkForCategoryLabel, linkForSubcategoryLabel } from '../../lib/categoryConfig';
import type { NavigationItem } from '../../types/admin';

interface MenuNavigationTabProps {
  navigation: NavigationItem[];
  setNavigation: Dispatch<SetStateAction<NavigationItem[]>>;
  parentNavigationItems: NavigationItem[];
  getChildNavigationItems: (parent: NavigationItem) => NavigationItem[];
  addChildNavigationItem: (parent: NavigationItem) => void;
  handleSaveNavigation: (navigation: NavigationItem[]) => void;
  renderNavigationCard: (nav: NavigationItem, isChild?: boolean) => ReactNode;
}

export function MenuNavigationTab({
  navigation,
  setNavigation,
  parentNavigationItems,
  getChildNavigationItems,
  addChildNavigationItem,
  handleSaveNavigation,
  renderNavigationCard,
}: MenuNavigationTabProps) {
  return (
    <div className="space-y-6">
      {/* Navigation Menu Settings */}
      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-widest">Quản lý Menu Navigation</h3>
            <p className="text-white/30 text-xs mt-1">Tùy chỉnh các mục menu và danh mục sản phẩm có icon</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button 
              onClick={() => setNavigation([...navigation, { id: Date.now(), label: 'Mục mới', link: '/', icon: '', group: 'main' }])}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm Mục Menu
            </button>
            <button 
              onClick={() => setNavigation([
                ...navigation,
                ...DEFAULT_SEO_SUBCATEGORIES.map((item, i) => ({
                  id: Date.now() + i,
                  label: item.label,
                  link: item.link,
                  icon: '',
                  group: 'subcategory',
                  parentLabel: item.parentLabel
                }))
              ])}
              className="px-4 py-2 bg-[#1e4b64] hover:bg-[#153446] border border-[#1e4b64] rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm 3 Trang Con Áo Thun
            </button>
          </div>
        </div>

        <datalist id="navigation-parent-categories">
          {CATEGORY_METADATA.map(cat => (
            <option key={cat.slug} value={cat.name} />
          ))}
        </datalist>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {navigation.length === 0 ? (
            <div className="col-span-full py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
              <p className="text-white/20 text-sm font-medium">Chưa có mục menu nào. Hãy thêm mục đầu tiên.</p>
            </div>
          ) : (
            parentNavigationItems.map(nav => {
              const idx = navigation.findIndex(item => item.id === nav.id);
              const childItems = getChildNavigationItems(nav);
              return (
                <div key={nav.id} className="space-y-3">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-4">
                    <div className="w-20 shrink-0">
                      <ImageUpload 
                        folder="nav"
                        label=""
                        compact={true}
                        externalPreview={nav.icon}
                        onUploadComplete={(url) => {
                          const updated = [...navigation];
                          updated[idx].icon = url;
                          setNavigation(updated);
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Nhãn (Label)</label>
                          <input 
                            type="text"
                            value={nav.label}
                            onChange={(e) => {
                              const updated = [...navigation];
                              updated[idx].label = e.target.value;
                              if (updated[idx].group === 'category') {
                                updated[idx].link = linkForCategoryLabel(e.target.value);
                              }
                              if (updated[idx].group === 'subcategory') {
                                updated[idx].link = linkForSubcategoryLabel(e.target.value);
                              }
                              setNavigation(updated);
                            }}
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Nhóm</label>
                          <select 
                            value={nav.group}
                            onChange={(e) => {
                              const updated = [...navigation];
                              updated[idx].group = e.target.value;
                              if (e.target.value === 'category') {
                                updated[idx].link = linkForCategoryLabel(updated[idx].label);
                                updated[idx].parentLabel = '';
                              }
                              if (e.target.value === 'subcategory') {
                                updated[idx].link = linkForSubcategoryLabel(updated[idx].label);
                                updated[idx].parentLabel = updated[idx].parentLabel || 'Áo thun nam';
                              }
                              setNavigation(updated);
                            }}
                            className="w-full bg-[#1c1f26] border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                          >
                            <option value="main">Danh mục chính</option>
                            <option value="category">Danh mục sản phẩm</option>
                            <option value="subcategory">Danh mục con SEO</option>
                          </select>
                        </div>
                      </div>
                      {nav.group === 'subcategory' && (
                        <div>
                          <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Danh mục cha</label>
                          <input
                            type="text"
                            value={nav.parentLabel || ''}
                            list="navigation-parent-categories"
                            placeholder="VD: Áo thun nam"
                            onChange={(e) => {
                              const updated = [...navigation];
                              updated[idx].parentLabel = e.target.value;
                              updated[idx].link = linkForSubcategoryLabel(updated[idx].label);
                              setNavigation(updated);
                            }}
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                          />
                          <p className="text-[10px] text-white/25 mt-1">
                            Dùng cho menu con và silo SEO. Ví dụ: Áo thun nam → Áo thun nam cotton.
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Đường dẫn (Link)</label>
                        <input 
                          type="text"
                          value={nav.link}
                          onChange={(e) => {
                            const updated = [...navigation];
                            updated[idx].link = e.target.value;
                            setNavigation(updated);
                          }}
                          className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#1e4b64]/50"
                        />
                      </div>
                      {nav.group === 'category' && (
                        <button
                          type="button"
                          onClick={() => addChildNavigationItem(nav)}
                          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#1e4b64]/50 bg-[#1e4b64]/15 px-3 py-2 text-xs font-bold text-white hover:bg-[#1e4b64]/25 transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" /> Tạo mục con
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        if(window.confirm('Xóa mục này?')) {
                          const updated = navigation.filter((_, i) => i !== idx);
                          handleSaveNavigation(updated);
                        }
                      }}
                      className="h-8 w-8 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {childItems.map(child => renderNavigationCard(child, true))}
                </div>
              );
            })
          )}
          {navigation.length > 0 && (
            <div className="col-span-full flex justify-end pt-2">
              <button 
                onClick={() => handleSaveNavigation(navigation)}
                className="px-6 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
              >
                Lưu Menu Navigation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
