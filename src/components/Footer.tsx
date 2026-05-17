import React, { FormEvent, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Moon,
  Music2,
  Phone,
  Send,
  Sun,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

type Category = 'Áo thun nam' | 'Áo thun thể thao nam' | 'Áo polo nam' | 'Quần thể thao nam' | 'Phụ kiện thể thao' | 'All';

interface FooterProps {
  onPageChange: (page: string) => void;
  onCategorySelect: (category: Category) => void;
}

const categoryLinks = [
  { label: "Áo thun nam", value: "Áo thun nam" as Category },
  { label: "Áo thun thể thao nam", value: "Áo thun thể thao nam" as Category },
  { label: "Áo polo nam", value: "Áo polo nam" as Category },
  { label: "Quần thể thao nam", value: "Quần thể thao nam" as Category },
  { label: "Phụ kiện thể thao", value: "Phụ kiện thể thao" as Category }
];

const supportLinks = [
  { label: "Blog", href: "blog" },
  { label: "Chính sách đổi trả", href: "#" },
  { label: "Chính sách bảo hành", href: "#" },
  { label: "Hướng dẫn mua hàng", href: "#" },
  { label: "Liên hệ", href: "contact" }
];

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com", icon: Facebook },
  { label: "Instagram", href: "https://instagram.com", icon: Instagram },
  { label: "TikTok", href: "https://tiktok.com", icon: Music2 }
];



const Logo = ({ inverse }: { inverse?: boolean }) => (
  <div className="flex flex-col items-start mb-2">
    <div className={`text-4xl font-black italic tracking-tighter uppercase leading-none ${inverse ? 'text-white' : 'text-black'}`}>
      <span className="text-[#1e4b64]">UR</span>
      <span>SPORT</span>
    </div>
    <span className={`text-xs font-bold italic uppercase tracking-tighter mt-1 ${inverse ? 'text-white/70' : 'text-zinc-500'}`}>
      Phong Cách Thể Thao
    </span>
  </div>
);

export function Footer({ onPageChange, onCategorySelect }: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [visible, setVisible] = useState(false);
  const [openSection, setOpenSection] = useState("Danh mục sản phẩm");
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setIsSubscribing(true);
    setSubscribeMessage("");

    try {
      await setDoc(doc(db, "newsletterSubscribers", encodeURIComponent(normalizedEmail)), {
        email: normalizedEmail,
        status: "active",
        source: "footer",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });

      setEmail("");
      setSubscribeMessage("Cám ơn quý khách đã đăng ký.");
    } catch (error) {
      console.error("Newsletter subscribe failed:", error);
      setSubscribeMessage("Chưa thể lưu email. Vui lòng thử lại sau.");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer
      className={cn(
        "relative mt-4 overflow-hidden border-t border-blue-400/20 bg-slate-950 text-white transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}
      ref={footerRef}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(0,71,255,0.1),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,1))]" />

      <div className="relative mx-auto max-w-[1440px] px-4 pt-8 pb-12 sm:px-6 lg:px-8 lg:pt-10 lg:pb-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_0.9fr_0.95fr_1.15fr_0.85fr] xl:gap-14">
          <div>
            <div onClick={() => onPageChange('home')} className="cursor-pointer">
              <Logo inverse />
            </div>
            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-300">
              Chuyên cung cấp đồ thể thao chất lượng cao, phong cách hiện đại.
            </p>

            <form className="mt-6 flex max-w-sm gap-2" onSubmit={subscribe}>
              <label className="sr-only" htmlFor="footer-email">
                Email
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/[0.08] px-3">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  id="footer-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email của bạn"
                  type="email"
                  value={email}
                />
              </div>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1e4b64] px-4 text-sm font-black text-white hover:bg-[#153446] transition duration-300 hover:scale-[1.02] active:scale-95"
                disabled={isSubscribing}
                type="submit"
              >
                <Send className="h-4 w-4" />
                {isSubscribing ? "Đang lưu" : "Đăng ký"}
              </button>
            </form>
            {subscribeMessage && (
              <p className="mt-3 text-xs font-semibold text-slate-300">{subscribeMessage}</p>
            )}
          </div>

          <div className="hidden md:block">
            <h3 className="text-base font-black">Danh mục sản phẩm</h3>
            <ul className="mt-5 space-y-3">
              {categoryLinks.map((link) => (
                <li key={link.value}>
                  <button
                    onClick={() => onCategorySelect(link.value)}
                    className="group/link inline-flex w-fit items-center text-sm font-semibold text-slate-300 transition duration-300 hover:translate-x-1 hover:text-[#1e4b64]"
                  >
                    <span className="bg-gradient-to-r from-[#1e4b64] to-[#1e4b64] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover/link:bg-[length:100%_1px]">
                      {link.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:block">
            <h3 className="text-base font-black">Hỗ trợ khách hàng</h3>
            <ul className="mt-5 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => link.href !== '#' && onPageChange(link.href)}
                    className="group/link inline-flex w-fit items-center text-sm font-semibold text-slate-300 transition duration-300 hover:translate-x-1 hover:text-[#1e4b64]"
                  >
                    <span className="bg-gradient-to-r from-[#1e4b64] to-[#1e4b64] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover/link:bg-[length:100%_1px]">
                      {link.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-black">Thông tin liên hệ</h3>
            <ul className="mt-5 space-y-4 text-sm font-semibold text-slate-300">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#1e4b64]" />
                <span>72 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#1e4b64]" />
                <a className="transition hover:text-[#1e4b64]" href="tel:+84917722425">
                  +84 917 722 425
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#1e4b64]" />
                <a
                  className="transition hover:text-[#1e4b64]"
                  href="mailto:support@ursport.vn"
                >
                  support@ursport.vn
                </a>
              </li>
            </ul>

            <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-slate-900">
              <iframe
                className="h-32 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-same-origin"
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d15992569.001833983!2d80.0375699!3d11.8747132!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f523f5fc0e3%3A0x6654790e867462ee!2sUr%20Sport%20-%20%C3%81o%20thun%20th%E1%BB%83%20thao!5e0!3m2!1svi!2s!4v1778154966090!5m2!1svi!2s"
                title="UR SPORT Google Map"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black">Mạng xã hội</h3>
              <button
                aria-label="Chuyển dark mode"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-[#1e4b64] transition duration-300 hover:scale-105 hover:bg-white/[0.12]"
                onClick={() => setIsDark((current) => !current)}
                type="button"
              >
                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
            </div>

            <div className="mt-5 flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    aria-label={social.label}
                    className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08] text-slate-200 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-[#1e4b64] hover:text-white"
                    href={social.href}
                    key={social.label}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>

            <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1e4b64]">
                Thanh toán
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["COD", "BANK", "MOMO", "ZALO"].map((item) => (
                  <span
                    className="rounded border border-white/10 bg-white px-2.5 py-1 text-[10px] font-black text-slate-950 uppercase tracking-tighter"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 md:hidden">
          {[
            { title: "Danh mục sản phẩm", links: categoryLinks, isCategory: true },
            { title: "Hỗ trợ khách hàng", links: supportLinks, isCategory: false }
          ].map((section) => {
            const isOpen = openSection === section.title;
            return (
              <div className="border-b border-white/10" key={section.title}>
                <button
                  className="flex w-full items-center justify-between py-4 text-left text-sm font-black"
                  onClick={() => setOpenSection(isOpen ? "" : section.title)}
                  type="button"
                >
                  {section.title}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 overflow-hidden",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <ul className="min-h-0 space-y-3 pb-4">
                    {section.links.map((link: any) => (
                      <li key={section.isCategory ? link.value : link.label}>
                        <button
                          onClick={() => section.isCategory ? onCategorySelect(link.value) : (link.href !== '#' && onPageChange(link.href))}
                          className="text-sm font-semibold text-slate-300 hover:text-[#1e4b64] transition-colors"
                        >
                          {link.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 UR SPORT. All rights reserved</p>
          <div className="flex flex-wrap items-center gap-2">
            {["COD", "Bank Transfer", "E-Wallet"].map((item) => (
              <span
                className="rounded-md border border-white/10 px-3 py-1 text-[10px] font-black text-slate-300 uppercase tracking-widest"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
