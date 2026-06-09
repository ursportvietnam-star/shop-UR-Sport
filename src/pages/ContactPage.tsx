import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from 'lucide-react';
import { getDoc, doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { useSEO } from '../hooks/useSEO';
import { absoluteUrl } from '../lib/seo';
import { toast } from 'sonner';

interface PageConfig {
  slug: string;
  title: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  robots?: string;
  htmlContent?: string;
  isHtmlOnly?: boolean;
  address?: string;
  phone?: string;
  phoneSub?: string;
  email?: string;
  workingHours?: string;
  workingHoursSub?: string;
  formTitle?: string;
  mapTitle?: string;
  mapUrl?: string;
}

interface FooterSettings {
  address: string;
  phone: string;
  email: string;
  mapUrl: string;
  description?: string;
}

export default function ContactPage() {
  const [page, setPage] = useState<PageConfig>({
    slug: 'lien-he',
    title: 'Liên hệ với chúng tôi',
    description: 'UR Sport luôn sẵn sàng lắng nghe và hỗ trợ bạn. Gửi tin nhắn hoặc liên hệ trực tiếp với chúng tôi qua các kênh dưới đây.',
    robots: 'index, follow',
    isHtmlOnly: false,
    htmlContent: '',
    address: '',
    phone: '',
    phoneSub: '',
    email: '',
    workingHours: '',
    workingHoursSub: '',
    formTitle: '',
    mapTitle: '',
    mapUrl: ''
  });

  const [contactInfo, setContactInfo] = useState<FooterSettings>({
    address: '72 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
    phone: '+84 917 722 425',
    email: 'support@ursport.vn',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d15992569.001833983!2d80.0375699!3d11.8747132!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f523f5fc0e3%3A0x6654790e867462ee!2sUr%20Sport%20-%20%C3%81o%20thun%20th%E1%BB%83%20thao!5e0!3m2!1svi!2s!4v1778154966090!5m2!1svi!2s',
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load page configuration and contact info
  useEffect(() => {
    let isMounted = true;
    if (!db || !isFirebaseConfigured) return;

    // Load page details
    getDoc(doc(db, 'settings', 'supportPolicies')).then(snap => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data();
        const contactPage = data?.contact || Object.values(data).find((item: any) => item?.slug === 'lien-he');
        if (contactPage?.title) {
          setPage(prev => ({ ...prev, ...contactPage }));
        }
      }
    }).catch(console.error);

    // Load contact info from footer settings
    getDoc(doc(db, 'settings', 'footerSettings')).then(snap => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data() as FooterSettings;
        setContactInfo(prev => ({
          ...prev,
          address: data.address || prev.address,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
          mapUrl: data.mapUrl || prev.mapUrl,
        }));
      }
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  // SEO Setup
  useSEO({
    title: page.seoTitle || `${page.title} | UR Sport`,
    description: page.seoDescription || page.description,
    canonical: absoluteUrl('/lien-he'),
    robots: page.robots || 'index, follow',
    type: 'website'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc (Họ tên, Email, Lời nhắn).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (db && isFirebaseConfigured) {
        await addDoc(collection(db, 'contactSubmissions'), {
          ...formData,
          createdAt: serverTimestamp(),
          status: 'pending' // pending, resolved, etc.
        });
      } else {
        // Fallback for local demo if db is not connected
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      toast.success('Gửi liên hệ thành công! Chúng tôi sẽ phản hồi sớm nhất.');
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Contact submission error:', error);
      toast.error('Gửi tin nhắn thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Get current contact info with fallback cascade
  const activeAddress = page.address?.trim() || contactInfo.address;
  const activePhone = page.phone?.trim() || contactInfo.phone;
  const activePhoneSub = page.phoneSub?.trim() || 'Miễn phí tư vấn mua hàng';
  const activeEmail = page.email?.trim() || contactInfo.email;
  const activeWorkingHours = page.workingHours?.trim() || '8h30 - 22h00';
  const activeWorkingHoursSub = page.workingHoursSub?.trim() || 'Thứ 2 - Chủ Nhật (Kể cả ngày lễ)';
  const activeFormTitle = page.formTitle?.trim() || 'Gửi tin nhắn cho chúng tôi';
  const activeMapTitle = page.mapTitle?.trim() || 'Bản đồ vị trí cửa hàng';
  const activeMapUrl = page.mapUrl?.trim() || contactInfo.mapUrl;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 border-b border-zinc-200 pb-4 text-sm font-medium text-zinc-400">
        <Link to="/" className="transition-colors hover:text-zinc-900">Trang chủ</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-zinc-700">{page.title}</span>
      </nav>

      <div className="bg-white">
        {/* Header section */}
        <div className="mb-10">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#1e4b64]">Kết nối với UR Sport</p>
          <h1 className="mb-4 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">{page.title}</h1>
          <p className="max-w-4xl text-base font-medium leading-8 text-zinc-500 sm:text-lg">{page.description}</p>
        </div>

        {!page.isHtmlOnly && (
          <>
            {/* Grid Layout: Contact Info & Contact Form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
              {/* Left Column: Contact Cards */}
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-xl font-black text-zinc-950 mb-4 uppercase tracking-wider">Thông tin liên hệ</h2>
                
                {/* Address Card */}
                <div className="flex gap-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-[#1e4b64]/30 hover:bg-zinc-50/50 transition-all duration-300 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e4b64]/10 text-[#1e4b64]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Địa chỉ cửa hàng</h3>
                    <p className="text-sm font-bold text-zinc-800 leading-relaxed">{activeAddress}</p>
                  </div>
                </div>

                {/* Phone Card */}
                <div className="flex gap-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-[#1e4b64]/30 hover:bg-zinc-50/50 transition-all duration-300 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e4b64]/10 text-[#1e4b64]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Số điện thoại hotline</h3>
                    <a href={`tel:${activePhone.replace(/\s+/g, '')}`} className="text-base font-black text-zinc-800 hover:text-[#1e4b64] transition-colors leading-relaxed block">
                      {activePhone}
                    </a>
                    <span className="text-[11px] font-bold text-zinc-400 italic block mt-0.5">{activePhoneSub}</span>
                  </div>
                </div>

                {/* Email Card */}
                <div className="flex gap-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-[#1e4b64]/30 hover:bg-zinc-50/50 transition-all duration-300 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e4b64]/10 text-[#1e4b64]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Hộp thư điện tử</h3>
                    <a href={`mailto:${activeEmail}`} className="text-sm font-bold text-zinc-800 hover:text-[#1e4b64] transition-colors leading-relaxed block break-all">
                      {activeEmail}
                    </a>
                  </div>
                </div>

                {/* Workhours Card */}
                <div className="flex gap-4 p-5 rounded-2xl bg-[#1e4b64]/5 border border-[#1e4b64]/10 hover:border-[#1e4b64]/20 transition-all duration-300 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e4b64]/10 text-[#1e4b64]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1e4b64] uppercase tracking-widest mb-1">Giờ làm việc hỗ trợ</h3>
                    <p className="text-sm font-bold text-zinc-800 leading-relaxed">{activeWorkingHours}</p>
                    <span className="text-[11px] font-bold text-zinc-500 block">{activeWorkingHoursSub}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div className="lg:col-span-7">
                <div className="bg-white border border-zinc-100 rounded-3xl p-6 sm:p-8 shadow-lg shadow-zinc-100/60 relative overflow-hidden">
                  <h2 className="text-xl font-black text-zinc-950 mb-6 uppercase tracking-wider">{activeFormTitle}</h2>
                  
                  {submitSuccess ? (
                    <div className="py-12 text-center space-y-4">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                        <CheckCircle2 className="h-10 w-10" />
                      </div>
                      <h3 className="text-lg font-black text-zinc-950">Gửi lời nhắn thành công!</h3>
                      <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">Cảm ơn bạn đã liên hệ với UR Sport. Chúng tôi sẽ phản hồi lại bạn qua địa chỉ email hoặc điện thoại cung cấp sớm nhất.</p>
                      <button 
                        type="button" 
                        onClick={() => setSubmitSuccess(false)}
                        className="mt-4 px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-xs transition-colors"
                      >
                        Gửi lời nhắn mới
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="name" className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                            Họ tên của bạn <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            placeholder="Nhập họ và tên"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#1e4b64] focus:bg-white transition-all"
                          />
                        </div>
                        <div>
                          <label htmlFor="phone" className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                            Số điện thoại
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            placeholder="Nhập số điện thoại"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#1e4b64] focus:bg-white transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          Địa chỉ Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          placeholder="VD: email@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#1e4b64] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="subject" className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          Chủ đề liên hệ
                        </label>
                        <input
                          type="text"
                          id="subject"
                          name="subject"
                          placeholder="VD: Tư vấn kích thước áo, chính sách sỉ..."
                          value={formData.subject}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#1e4b64] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          Lời nhắn hoặc câu hỏi <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={4}
                          placeholder="Nhập nội dung lời nhắn cần hỗ trợ tại đây..."
                          value={formData.message}
                          onChange={handleInputChange}
                          className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm font-medium leading-relaxed text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#1e4b64] focus:bg-white transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1e4b64] px-6 text-sm font-black text-white hover:bg-[#153446] transition duration-300 disabled:opacity-55 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-95 shadow-md shadow-[#1e4b64]/10"
                      >
                        <Send className="h-4 w-4" />
                        {isSubmitting ? 'Đang gửi thông tin...' : 'Gửi lời nhắn hỗ trợ'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Embedded Google Map Section */}
            {activeMapUrl && (
              <div className="mb-12">
                <h2 className="text-xl font-black text-zinc-950 mb-6 uppercase tracking-wider">{activeMapTitle}</h2>
                <div className="overflow-hidden rounded-3xl border border-zinc-150 bg-zinc-50 shadow-md">
                  <iframe
                    src={activeMapUrl}
                    className="w-full h-[380px] sm:h-[450px] border-0"
                    loading="lazy"
                    title="Bản đồ chỉ dẫn UR Sport"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Custom HTML Content Section */}
        {page.htmlContent && page.htmlContent.trim() && (
          <div className="contact-custom-content mt-8 border-t border-zinc-100 pt-8">
            <div 
              dangerouslySetInnerHTML={{ __html: page.htmlContent }} 
              className="prose max-w-none prose-slate"
            />
          </div>
        )}
      </div>
    </div>
  );
}
