import { Check as CheckIcon, Code2, Copy, Download, Eye, Plus, Search, Trash2, Upload } from 'lucide-react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImageUpload } from '../ImageUpload';
import { CATEGORY_METADATA } from '../../data';
import { DEFAULT_SEO_SUBCATEGORIES, linkForCategoryLabel, linkForSubcategoryLabel } from '../../lib/categoryConfig';
import { saveAdminSetting } from '../../services/adminData';
import type { BannerItem, FloatingMenuSettings, NavigationItem } from '../../types/admin';
import type { Product, BlogPost } from '../../types';

interface AdminSettingsTabProps {
  banners: BannerItem[];
  blogPosts: BlogPost[];
  cssSaved: boolean;
  customCss: string;
  floatingMenu: FloatingMenuSettings;
  generateSitemapString: () => string;
  handleDeleteCss: () => void;
  handleGenerateRobots: () => void;
  handleGenerateSitemap: () => void;
  handleSaveBanners: (banners: BannerItem[]) => void;
  handleSaveCss: () => void;
  handleSaveFloatingMenu: () => void;
  handleSaveNavigation: (navigation: NavigationItem[]) => void;
  navigation: NavigationItem[];
  parentNavigationItems: NavigationItem[];
  products: Product[];
  renderNavigationCard: (nav: NavigationItem, isChild?: boolean) => ReactNode;
  setBanners: Dispatch<SetStateAction<BannerItem[]>>;
  setCustomCss: Dispatch<SetStateAction<string>>;
  setFloatingMenu: Dispatch<SetStateAction<FloatingMenuSettings>>;
  setNavigation: Dispatch<SetStateAction<NavigationItem[]>>;
  setShowSitemapPreview: Dispatch<SetStateAction<boolean>>;
  showSitemapPreview: boolean;
  getChildNavigationItems: (parent: NavigationItem) => NavigationItem[];
  addChildNavigationItem: (parent: NavigationItem) => void;
}

export function AdminSettingsTab({
  banners,
  blogPosts,
  cssSaved,
  customCss,
  floatingMenu,
  generateSitemapString,
  handleDeleteCss,
  handleGenerateRobots,
  handleGenerateSitemap,
  handleSaveBanners,
  handleSaveCss,
  handleSaveFloatingMenu,
  handleSaveNavigation,
  navigation,
  parentNavigationItems,
  products,
  renderNavigationCard,
  setBanners,
  setCustomCss,
  setFloatingMenu,
  setNavigation,
  setShowSitemapPreview,
  showSitemapPreview,
  getChildNavigationItems,
  addChildNavigationItem,
}: AdminSettingsTabProps) {
  return (
            <div className="space-y-6">
              {/* Custom CSS */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Code2 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-widest">Tùy biến giao diện (Custom CSS)</h3>
                      <p className="text-white/30 text-xs font-medium mt-0.5">CSS sẽ được chèn vào trang qua thẻ <code className="text-purple-400">#custom-global-css</code></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteCss}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </button>
                    <button
                      onClick={handleSaveCss}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        cssSaved
                          ? "bg-emerald-500 text-white"
                          : "bg-[#1e4b64] hover:bg-[#153446] text-white"
                      )}
                    >
                      {cssSaved ? <CheckIcon className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                      {cssSaved ? 'Đã lưu!' : 'Lưu & Áp dụng'}
                    </button>
                  </div>
                </div>

                {/* Code editor area */}
                <div className="relative">
                  {/* Line numbers */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/[0.02] border-r border-white/5 pointer-events-none flex flex-col items-end pt-4 pb-4 pr-2 select-none overflow-hidden">
                    {Array.from({ length: Math.max(customCss.split('\n').length, 20) }, (_, i) => (
                      <span key={i} className="text-white/15 text-xs font-mono leading-6">{i + 1}</span>
                    ))}
                  </div>
                  <textarea
                    value={customCss}
                    onChange={e => setCustomCss(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const val = customCss;
                        setCustomCss(val.substring(0, start) + '  ' + val.substring(end));
                        setTimeout(() => e.currentTarget.setSelectionRange(start + 2, start + 2), 0);
                      }
                      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        handleSaveCss();
                      }
                    }}
                    spellCheck={false}
                    placeholder={`/* Nhập CSS tùy biến của bạn vào đây... */\n\n/* Ví dụ: */\n.product-card {\n  border-radius: 16px;\n}\n\nbody {\n  font-family: 'Inter', sans-serif;\n}`}
                    className="w-full min-h-[400px] bg-transparent pl-14 pr-6 pt-4 pb-4 text-[13px] font-mono text-green-300 leading-6 resize-y outline-none placeholder:text-white/15 border-none"
                    style={{ caretColor: '#4ade80' }}
                  />
                </div>

                <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                  <p className="text-white/25 text-[11px] font-medium">
                    {customCss.split('\n').length} dòng • {customCss.length} ký tự • Lưu nhanh: <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/40">Ctrl+S</kbd>
                  </p>
                  <p className="text-white/25 text-[11px]">Tab = 2 spaces</p>
                </div>
              </div>

              {/* Banner Management */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Quản lý Hero Banners</h3>
                    <p className="text-white/30 text-xs mt-1">Tùy chỉnh các hình ảnh và tiêu đề chạy ở đầu trang chủ</p>
                  </div>
                  <button 
                    onClick={() => handleSaveBanners([...banners, { id: Date.now(), image: '', title: 'TIÊU ĐỀ MỚI', subtitle: 'Subtitle', link: '' }])}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm Banner
                  </button>
                </div>

                <div className="space-y-4">
                  {banners.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-white/20 text-sm font-medium">Chưa có banner nào. Hãy thêm banner đầu tiên.</p>
                    </div>
                  ) : (
                    banners.map((banner, idx) => (
                      <div key={banner.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-48 shrink-0">
                            <ImageUpload 
                              folder="banners"
                              label=""
                              externalPreview={banner.image}
                              onUploadComplete={(url) => {
                                const updated = [...banners];
                                updated[idx].image = url;
                                setBanners(updated);
                              }}
                            />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Tiêu đề (Dùng \n để xuống dòng)</label>
                              <input 
                                type="text"
                                value={banner.title}
                                onChange={(e) => {
                                  const updated = [...banners];
                                  updated[idx].title = e.target.value;
                                  setBanners(updated);
                                }}
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Phụ đề (Subtitle)</label>
                              <input 
                                type="text"
                                value={banner.subtitle || ''}
                                onChange={(e) => {
                                  const updated = [...banners];
                                  updated[idx].subtitle = e.target.value;
                                  setBanners(updated);
                                }}
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Đường dẫn (Link - Ví dụ: /ao-thun)</label>
                              <input 
                                type="text"
                                value={banner.link || ''}
                                onChange={(e) => {
                                  const updated = [...banners];
                                  updated[idx].link = e.target.value;
                                  setBanners(updated);
                                }}
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if(window.confirm('Xóa banner này?')) {
                                const updated = banners.filter((_, i) => i !== idx);
                                handleSaveBanners(updated);
                              }
                            }}
                            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {banners.length > 0 && (
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={() => handleSaveBanners(banners)}
                        className="px-6 py-2 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
                      >
                        Lưu thay đổi Banner
                      </button>
                    </div>
                  )}
                </div>
              </div>

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

              {/* Floating Contact Settings */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6">Cài đặt Menu Liên hệ (Nút nổi)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Số điện thoại Zalo</label>
                      <input 
                        type="text"
                        value={floatingMenu.zaloPhone}
                        onChange={(e) => setFloatingMenu({...floatingMenu, zaloPhone: e.target.value})}
                        placeholder="0917722425"
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Số điện thoại Hotline</label>
                      <input 
                        type="text"
                        value={floatingMenu.callPhone}
                        onChange={(e) => setFloatingMenu({...floatingMenu, callPhone: e.target.value})}
                        placeholder="0917722425"
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1e4b64]/50"
                      />
                    </div>
                    <button 
                      onClick={handleSaveFloatingMenu}
                      className="px-6 py-2.5 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
                    >
                      Lưu thông tin liên hệ
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/30 block">Ảnh Icon Zalo</label>
                      <ImageUpload 
                        folder="settings"
                        label=""
                        externalPreview={floatingMenu.zaloIcon}
                        onUploadComplete={(url) => {
                          const updated = {...floatingMenu, zaloIcon: url};
                          setFloatingMenu(updated);
                          saveAdminSetting('floatingMenu', updated);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/30 block">Ảnh Icon Tổng (Nút chính)</label>
                      <ImageUpload 
                        folder="settings"
                        label=""
                        externalPreview={floatingMenu.callIcon}
                        onUploadComplete={(url) => {
                          const updated = {...floatingMenu, callIcon: url};
                          setFloatingMenu(updated);
                          saveAdminSetting('floatingMenu', updated);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick snippets */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4">Snippets gợi ý</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: 'Bo góc card', css: '.product-card { border-radius: 20px; }' },
                    { label: 'Ẩn footer', css: 'footer { display: none; }' },
                    { label: 'Font hệ thống', css: 'body { font-family: \'Inter\', sans-serif; }' },
                    { label: 'Responsive Video', css: '.video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; }\n.video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }' },
                    { label: 'Scrollbar tùy biến', css: '::-webkit-scrollbar { width: 6px; }\n::-webkit-scrollbar-thumb { background: #1e4b64; border-radius: 3px; }' },
                    { label: 'Nút CTA nổi bật', css: '.btn-primary { background: linear-gradient(135deg, #1e4b64, #153446); box-shadow: 0 4px 15px rgba(30,75,100,0.4); }' },
                  ].map((snippet, i) => (
                    <button
                      key={i}
                      onClick={() => setCustomCss(prev => prev + (prev ? '\n\n' : '') + '/* ' + snippet.label + ' */\n' + snippet.css)}
                      className="text-left p-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/30 rounded-xl transition-all group"
                    >
                      <p className="text-white/80 text-xs font-bold group-hover:text-purple-400 transition-colors">{snippet.label}</p>
                      <p className="text-white/25 text-[10px] font-mono mt-1 truncate">{snippet.css.split('\n')[0]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* SEO & Sitemap */}
              <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Search className="h-5 w-5 text-[#1e4b64]" />
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Cập nhật Sitemap & Robots.txt</h3>
                    <p className="text-white/30 text-xs mt-1">Tự động tạo sitemap chứa tất cả danh mục, sản phẩm, và bài viết mới nhất để tải xuống.</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 mb-6">
                  <button 
                    onClick={() => setShowSitemapPreview(!showSitemapPreview)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/5 transition-all flex items-center gap-2 group"
                  >
                    <Eye className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    {showSitemapPreview ? 'Đóng Xem Trước' : 'Xem trước Sitemap & Cập nhật'}
                  </button>
                  <button 
                    onClick={handleGenerateSitemap}
                    className="px-6 py-3 bg-[#1e4b64] hover:bg-[#153446] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#1e4b64]/20 transition-all flex items-center gap-2 group"
                  >
                    <Download className="h-4 w-4 group-hover:-translate-y-1 transition-transform" />
                    Tải Sitemap.xml Mới Nhất
                  </button>
                  <button 
                    onClick={handleGenerateRobots}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/5 transition-all flex items-center gap-2 group"
                  >
                    <Download className="h-4 w-4 group-hover:-translate-y-1 transition-transform" />
                    Tải Robots.txt
                  </button>
                </div>
                
                {showSitemapPreview && (
                  <div className="mt-6 border-t border-white/5 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4">
                    <div className="lg:col-span-1 space-y-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                          <CheckIcon className="h-3.5 w-3.5" />
                          Tổng quan sitemap
                        </h4>
                        <div className="space-y-2 text-sm text-white/70">
                          <div className="flex justify-between"><span>Sản phẩm:</span> <span className="text-white font-bold">{products.length} mục</span></div>
                          <div className="flex justify-between"><span>Bài viết:</span> <span className="text-white font-bold">{blogPosts.length} mục</span></div>
                          <div className="flex justify-between"><span>Danh mục:</span> <span className="text-white font-bold">{CATEGORY_METADATA.length} mục</span></div>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                        <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-3">Vừa cập nhật gần đây</h4>
                        <ul className="space-y-3">
                          {products.slice(0, 3).map(p => (
                            <li key={p.id} className="flex gap-3 text-sm">
                              <span className="text-[#1e4b64] mt-0.5">•</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{p.name}</p>
                                <p className="text-white/30 text-[10px]">{p.category}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="lg:col-span-2">
                      <div className="bg-[#0f1117] rounded-xl border border-white/10 overflow-hidden flex flex-col h-[400px]">
                        <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                          <span className="text-white/50 text-xs font-mono">sitemap.xml</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(generateSitemapString());
                              toast.success('Đã copy sitemap!');
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-md text-white/50 hover:text-white transition-colors"
                            title="Copy toàn bộ"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="p-4 overflow-auto flex-1 custom-scrollbar">
                          <pre className="text-emerald-400/80 text-[11px] sm:text-xs font-mono whitespace-pre-wrap leading-relaxed">
                            {generateSitemapString()}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
  );
}

