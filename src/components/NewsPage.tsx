import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Calendar, User, ArrowLeft, ArrowRight, Share2, MessageCircle, ShoppingBag, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { SITE_URL, absoluteUrl, buildBreadcrumbSchema, buildSeoGraph, cleanSeoText } from '../lib/seo';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { STATIC_BLOG_POSTS as POSTS } from '../data';
import { useProducts } from '../ProductsContext';
import { LazyImage } from './LazyImage';

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

const POST_CATEGORIES = ['Tất cả', 'Xu hướng', 'Kinh nghiệm', 'Sự kiện'];

export function NewsPage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>(POSTS);
  const [contentHtml, setContentHtml] = useState('');
  const [tocHeadings, setTocHeadings] = useState<TocHeading[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { products } = useProducts();

  useEffect(() => {
    setIsExpanded(false);
  }, [slug]);

  useEffect(() => {
    const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const fallbackPosts = POSTS.filter(staticPost =>
        !loaded.some(post => post.slug === staticPost.slug || post.id === staticPost.id)
      );
      setPosts(loaded.length > 0 ? [...loaded, ...fallbackPosts] : POSTS);
    }, () => {
      setPosts(POSTS);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (slug) {
      const post = posts.find(p => p.slug === slug) || posts.find(p => p.id === slug);
      if (post) {
        setSelectedPost(post);
        window.scrollTo(0, 0);
      } else {
        navigate('/blog');
      }
    } else {
      setSelectedPost(null);
    }
  }, [slug, posts, navigate]);

  useEffect(() => {
    if (!selectedPost) {
      setContentHtml('');
      setTocHeadings([]);
      return;
    }

    const slugifyHeading = (text: string) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    let rawHtml = selectedPost.content || '';
    if (!rawHtml.trim().startsWith('<')) {
      rawHtml = rawHtml
        .split('\n\n')
        .map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
        .join('');
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
    const wrapper = document.body.firstElementChild as HTMLElement;
    if (!wrapper) {
      setContentHtml(rawHtml);
      setTocHeadings([]);
      return;
    }

    const seenIds = new Set<string>();
    const headings = Array.from(wrapper.querySelectorAll('h2, h3, h4')).map((heading) => {
      const level = Number(heading.tagName.charAt(1));
      const text = heading.textContent?.trim() || '';
      let id = heading.id || slugifyHeading(text || 'heading');
      let uniqueId = id;
      let counter = 1;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter += 1;
      }
      seenIds.add(uniqueId);
      heading.id = uniqueId;
      return { id: uniqueId, text, level };
    });

    setTocHeadings(headings);
    setContentHtml(wrapper.innerHTML);
  }, [selectedPost]);

  useEffect(() => {
    if (!selectedPost) return;

    const handleScroll = () => {
      const heroImageContainer = document.querySelector('.blog-hero-image');
      if (!heroImageContainer) return;

      const heroImage = heroImageContainer.querySelector('img') as HTMLImageElement;
      if (!heroImage) return;

      const imageRect = heroImage.getBoundingClientRect();
      const imageHeight = imageRect.height;
      const scrolledDistance = -imageRect.top;
      const scrollProgress = imageHeight > 0 ? scrolledDistance / imageHeight : 0;
      
      setShowToc(scrollProgress >= 0.7);

      const headingElements = Array.from(document.querySelectorAll('h2[id], h3[id], h4[id]')) as HTMLElement[];
      let currentActiveId = '';

      headingElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.25) {
          currentActiveId = element.id;
        }
      });

      if (!currentActiveId && headingElements.length > 0) {
        currentActiveId = headingElements[0].id;
      }

      setActiveHeadingId(currentActiveId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedPost]);

  useEffect(() => {
    if (!selectedPost) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('animate-underline');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    const headings = document.querySelectorAll('.blog-content h2, .blog-content h3');
    headings.forEach((heading) => {
      observer.observe(heading);
    });

    return () => {
      headings.forEach((heading) => {
        observer.unobserve(heading);
      });
      observer.disconnect();
    };
  }, [selectedPost, contentHtml]);

  const postCanonical = selectedPost ? `/blog/${selectedPost.slug}` : '/blog';
  const blogSchema = selectedPost ? buildSeoGraph(
    {
      '@type': 'Article',
      '@id': `${absoluteUrl(postCanonical)}#article`,
      headline: selectedPost.title,
      description: cleanSeoText(selectedPost.excerpt || selectedPost.content, 220),
      image: [absoluteUrl(selectedPost.image)],
      url: absoluteUrl(postCanonical),
      mainEntityOfPage: absoluteUrl(postCanonical),
      datePublished: selectedPost.createdAt && typeof selectedPost.createdAt.toDate === 'function' 
        ? selectedPost.createdAt.toDate().toISOString() 
        : (selectedPost.createdAt?.seconds ? new Date(selectedPost.createdAt.seconds * 1000).toISOString() : new Date().toISOString()),
      author: {
        '@type': 'Organization',
        name: selectedPost.author || 'UR Sport',
        url: SITE_URL
      },
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'vi-VN'
    },
    buildBreadcrumbSchema([
      { name: 'Trang chủ', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: selectedPost.title, url: postCanonical }
    ])
  ) : buildSeoGraph({
    '@type': 'Blog',
    '@id': `${SITE_URL}/blog#blog`,
    url: absoluteUrl('/blog'),
    name: 'Blog UR Sport',
    inLanguage: 'vi-VN',
    publisher: { '@id': `${SITE_URL}/#organization` }
  });

  useSEO({
    title: selectedPost ? `${selectedPost.title} | Blog UR Sport` : "Tin tức & Bài viết | UR Sport",
    description: selectedPost ? (selectedPost.excerpt || selectedPost.title) : "Cập nhật những xu hướng thời trang mới nhất, kinh nghiệm phối đồ và các sự kiện sôi nổi từ cộng đồng UrSport.",
    canonical: postCanonical,
    image: selectedPost?.image,
    type: selectedPost ? "article" : "website",
    schema: blogSchema
  });

  const filteredPosts = activeCategory === 'Tất cả' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  if (selectedPost) {
    const relatedPosts = posts.filter(p => p.id !== selectedPost.id).slice(0, 5);

    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-8 pb-4 border-b border-zinc-100">
          <button onClick={() => navigate("/")} className="hover:text-black transition-colors">Home</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate("/blog")} className="hover:text-black transition-colors">Blog</button>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate max-w-[200px] sm:max-w-md">{selectedPost.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-16">
          <div className="min-w-0 w-full">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black leading-tight tracking-tight mb-4">
              {selectedPost.title}
            </h1>

            <div className="flex items-center gap-2 mb-10">
              <div className="flex items-center gap-1.5 bg-zinc-100 px-2 py-1 rounded text-[11px] font-bold text-zinc-500 uppercase">
                <Calendar className="h-3 w-3" />
                {selectedPost.date}
              </div>
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded uppercase">
                {selectedPost.category}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 border-b border-zinc-100 pb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-lg">
                  {selectedPost.author.charAt(0)}
                </div>
                <div>
                  <div className="font-black text-zinc-900 leading-none mb-1">{selectedPost.author}</div>
                  <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest">UrSport Specialist</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {[Share2, MessageCircle].map((Icon, i) => (
                  <button key={i} className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-black transition-all">
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="blog-hero-image relative aspect-[1024/682] overflow-hidden rounded-[32px] mb-12 shadow-2xl w-full">
              <img 
                src={selectedPost.image} 
                alt={selectedPost.title} 
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="relative w-full overflow-x-hidden">
              <div 
                className={cn(
                  "blog-content product-description-container notranslate prose prose-lg max-w-none w-full text-zinc-600 transition-[max-height] duration-700 ease-in-out overflow-x-hidden",
                  !isExpanded ? "max-h-[1000px] overflow-y-hidden" : "max-h-none overflow-y-visible"
                )}
              >
                <div dangerouslySetInnerHTML={{ 
                  __html: contentHtml
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\u00a0/g, ' ')
                }} />
              </div>
              
              {!isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
              )}
            </div>

            <div className="flex justify-center pt-8 mb-12">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-8 py-3 bg-white text-[#1e4b64] border border-zinc-200 text-sm font-bold rounded-full shadow-sm hover:text-[#153446] hover:border-[#1e4b64] hover:-translate-y-1 transition-all flex items-center gap-2 group"
              >
                {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                <ChevronDown className={cn("h-4 w-4 transition-all duration-300", isExpanded && "rotate-180")} />
              </button>
            </div>

            {selectedPost.images?.length > 0 && (
              <div className="grid gap-4 mt-10 sm:grid-cols-2 w-full">
                {selectedPost.images.map((img: string, index: number) => (
                  <div key={index} className="overflow-hidden rounded-[28px] bg-zinc-100 shadow-sm w-full">
                    <img src={img} alt={`${selectedPost.title} - Ảnh ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {selectedPost.videos?.length > 0 && (
              <div className="mt-10 space-y-6 w-full">
                {selectedPost.videos.map((video: string, index: number) => (
                  <div key={index} className="overflow-hidden rounded-[28px] bg-black shadow-lg w-full">
                    <video controls src={video} className="w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Suggested Products Section */}
            <div className="mt-20 pt-16 border-t border-zinc-100">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 leading-tight mb-2">Sản phẩm cho bạn</h3>
                  <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest italic">Gợi ý từ UR SPORT</p>
                </div>
                <Button 
                  onClick={() => navigate('/shop')}
                  variant="outline" 
                  className="rounded-full border-zinc-200 text-xs font-bold uppercase tracking-widest hover:border-[#1e4b64] hover:text-[#1e4b64] transition-all"
                >
                  Xem tất cả <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {products.slice(0, 3).map((product) => (
                  <div 
                    key={product.id}
                    onClick={() => {
                      const catSlug = product.category
                        ? product.category.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                        : 'san-pham';
                      navigate(`/apparel/${catSlug}/${product.slug}`);
                    }}
                    className="group cursor-pointer space-y-4"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-zinc-100 border border-zinc-100 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-2">
                      <LazyImage 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      <button className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white text-zinc-900 shadow-xl flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        <ShoppingBag className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{product.category}</p>
                      <h4 className="text-[13px] font-bold text-zinc-900 leading-tight line-clamp-2 group-hover:text-[#1e4b64] transition-colors">{product.name}</h4>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[14px] font-black text-[#ff3b30]">{(product.discountPrice || product.price).toLocaleString('vi-VN')}₫</span>
                        {product.discountPrice && (
                          <span className="text-[11px] text-zinc-300 line-through font-bold">{product.price.toLocaleString('vi-VN')}₫</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-12 w-full lg:w-[320px]">
            {showToc && tocHeadings.length > 0 && (
              <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm lg:sticky top-28 transition-all duration-300 animate-in fade-in overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.3em] mb-5 border-b border-zinc-200 pb-3 flex items-center gap-2">
                    📋 MỤC LỤC BÀI VIẾT
                  </h3>
                  <div className="space-y-2">
                    {tocHeadings.map((heading, idx) => (
                      <button
                        key={heading.id}
                        onClick={(e) => {
                          e.preventDefault();
                          const element = document.getElementById(heading.id);
                          if (element) {
                            const offset = 120;
                            const targetPosition = element.getBoundingClientRect().top + window.scrollY - offset;
                            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
                          }
                        }}
                        className={cn(
                          'block w-full text-left text-sm font-medium transition-all duration-300 py-2 px-3 rounded relative overflow-hidden group',
                          heading.level === 3 && 'ml-4 text-xs',
                          heading.level === 4 && 'ml-8 text-[11px]',
                          activeHeadingId === heading.id 
                            ? 'bg-zinc-100 text-zinc-900 font-bold' 
                            : 'text-zinc-600 hover:bg-zinc-50'
                        )}
                        title={heading.text}
                      >
                        <span className="truncate">{heading.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6 border-b border-zinc-100 pb-2 truncate">
                BÀI VIẾT LIÊN QUAN
              </h3>
              <div className="space-y-6">
                {relatedPosts.slice(0, 3).map((post) => (
                  <div 
                    key={post.id} 
                    className="flex gap-4 group cursor-pointer"
                    onClick={() => navigate(`/news/${post.id}`)}
                  >
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl">
                       <LazyImage 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                       />
                    </div>
                    <div className="flex flex-col justify-center">
                       <h4 className="font-black text-xs text-zinc-900 group-hover:text-orange-600 transition-colors leading-tight line-clamp-2">
                         {post.title}
                       </h4>
                       <span className="text-[10px] font-bold text-zinc-400 mt-1">{post.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-[32px] sm:text-[40px] font-black text-black leading-tight tracking-tight mb-4">
          Tin tức & <span className="text-[#16a34a]">Bài viết</span>
        </h1>
        <p className="text-zinc-500 max-w-2xl font-medium text-sm sm:text-base">
          Cập nhật những xu hướng thời trang mới nhất, kinh nghiệm phối đồ và các sự kiện sôi nổi từ cộng đồng UrSport.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {POST_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
              activeCategory === cat 
                ? "bg-[#16a34a] text-white shadow-lg" 
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        {filteredPosts.map(post => (
          <article 
            key={post.id} 
            className="group cursor-pointer"
            onClick={() => navigate(`/news/${post.id}`)}
          >
            <div className="relative aspect-[1024/682] overflow-hidden rounded-3xl mb-6 shadow-sm">
              <LazyImage 
                src={post.image} 
                alt={post.title} 
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-md text-black px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm">
                  {post.category}
                </span>
              </div>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 group-hover:text-[#16a34a] transition-colors leading-tight mb-4 line-clamp-2 min-h-[3.5rem]">
              {post.title}
            </h2>
            
            <p className="text-zinc-500 font-medium line-clamp-2 mb-6">
              {post.excerpt}
            </p>

          </article>
        ))}
      </div>
    </div>
  );
}
