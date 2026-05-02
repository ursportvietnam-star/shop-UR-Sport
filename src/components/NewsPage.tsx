import React, { useState, useEffect } from 'react';
import { ChevronRight, Calendar, User, ArrowLeft, ArrowRight, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';

const POST_CATEGORIES = ['Tất cả', 'Xu hướng', 'Kinh nghiệm', 'Sự kiện'];

const POSTS = [
  {
    id: 1,
    title: "Dành cho những người yêu thích âm thanh và chuyển động: Trải nghiệm không giới hạn",
    category: "Xu hướng",
    date: "11/06/2026",
    author: "UrSport Team",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000",
    excerpt: "Khám phá sự giao thoa giữa công nghệ âm thanh đỉnh cao và phong cách sống hiện đại. Khi âm nhạc không chỉ là âm thanh mà là cảm hứng cho mọi chuyển động.",
    content: "Trong kỷ nguyên số, ranh giới giữa thể thao, thời trang và công nghệ đang dần mờ nhạt. Một chiếc tai nghe không còn đơn thuần là thiết bị phát nhạc; nó đã trở thành một biểu tượng phong cách, một người bạn đồng hành không thể thiếu trong hành trình rèn luyện bản thân.\n\nSự xuất hiện của các dòng sản phẩm âm thanh không dây thế hệ mới đã mở ra một hướng đi mới cho các tín đồ vận động. Không còn nỗi lo vướng víu dây dợ, người dùng giờ đây có thể tự do trải nghiệm mọi chuyển động, từ những bước chạy miệt mài trên vỉa hè đến những bài tập cường độ cao trong phòng gym.\n\nChất lượng âm thanh trung thực kết hợp cùng khả năng chống nước, chống mồ hôi vượt trội chính là những yếu tố then chốt. UrSport luôn nỗ lực tìm kiếm và giới thiệu những giải pháp tối ưu nhất, giúp bạn không chỉ tập luyện hiệu quả mà còn khẳng định cái tôi cá nhân mạnh mẽ."
  },
  {
    id: 2,
    title: "Thế giới trò chơi Nintendo Wii mới cập bến",
    category: "Sự kiện",
    date: "10/06/2026",
    author: "Admin",
    image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&q=80&w=600",
    excerpt: "Sự trở lại đầy ngoạn mục của dòng máy chơi game vận động huyền thoại, hứa hẹn mang đến những giờ phút giải trí sôi động.",
    content: "Chúng tôi vô cùng hào hứng thông báo về đợt hàng Nintendo Wii mới nhất đã chính thức có mặt tại UrSport. Đây không chỉ là một chiếc máy chơi game đơn thuần; đó là một thiết bị tuyệt vời để cả gia đình cùng vận động và vui chơi cùng nhau trong những ngày cuối tuần.\n\nVới các tựa game nổi tiếng như Wii Sports, Wii Fit, bạn có thể biến phòng khách nhà mình thành một sân vận động mini. Chơi tennis, chơi bowling hay tập yoga – tất cả đều được mô phỏng một cách trực quan và đầy hào hứng. Hãy ghé ngay cửa hàng để trải nghiệm trực tiếp!"
  },
  {
    id: 3,
    title: "Mẫu lều WeatherMaster nổi tiếng đã có mặt",
    category: "Kinh nghiệm",
    date: "09/06/2026",
    author: "UrSport Team",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600",
    excerpt: "Giải pháp trú ẩn hoàn hảo cho mọi chuyến dã ngoại, bất chấp mọi điều kiện thời tiết khắc nghiệt.",
    content: "Lều WeatherMaster từ lâu đã được giới xê dịch đánh giá là 'pháo đài di động'. Với công nghệ vải chống thấm tuyệt đối và hệ thống khung xương chắc chắn, chiếc lều này đảm bảo sự an toàn và thoải mái tối đa cho bạn cùng gia đình giữa thiên nhiên hoang dã.\n\nThiết kế rộng rãi với nhiều ngăn thông gió giúp không gian bên trong luôn thoáng đãng, ngay cả trong những ngày hè oi ả. Đặc biệt, quá trình lắp đặt cực kỳ nhanh chóng và đơn giản, giúp bạn tiết kiệm thời gian quý báu để tận hưởng chuyến đi."
  },
  {
    id: 4,
    title: "Những bản nhạc huyền thoại của B.B.King",
    category: "Xu hướng",
    date: "08/06/2026",
    author: "Admin",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600",
    excerpt: "Âm hưởng Blues nồng nàn dành cho những tâm hồn đam mê âm nhạc cổ điển và phong cách vintage.",
    content: "B.B. King, vị vua của dòng nhạc Blues, luôn biết cách làm say đắm lòng người bằng tiếng đàn guitar điện 'Lucille' đặc trưng của mình. Tại UrSport, chúng tôi tin rằng âm nhạc là linh hồn của mọi hoạt động, và việc lắng nghe những giai điệu Blues kinh điển sẽ giúp bạn thư giãn hiệu quả sau những giờ tập luyện căng thẳng.\n\nHãy cùng chúng tôi điểm qua top 10 bản nhạc bất hủ của ông và khám phá cách mà âm nhạc có thể thay đổi tâm trạng và nâng cao chất lượng cuộc sống hàng ngày của bạn."
  },
  {
    id: 5,
    title: "Tìm kiếm điện thoại Nokia phím bấm hoài cổ",
    category: "Kinh nghiệm",
    date: "07/06/2026",
    author: "Stylist",
    image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=600",
    excerpt: "Xu hướng quay trở lại với những giá trị bền vững và đơn giản trong kỷ nguyên số bủa vây.",
    content: "Giữa hàng loạt smartphone hào nhoáng, những chiếc điện thoại Nokia phím bấm hoài cổ như 3310 hay 8110 đang trở lại như một biểu tượng của lối sống tối giản. Nhiều người lựa chọn chúng như một thiết bị phụ để 'detox' khỏi mạng xã hội và tập trung hơn vào cuộc sống thực tại.\n\nĐộ bền bỉ huyền thoại, thời lượng pin tính bằng tuần và cảm giác bấm phím vật lý đặc trưng là những điều không bao giờ lỗi thời. Hãy cùng UrSport khám phá lý do tại sao dòng máy 'cục gạch' này vẫn có một vị thế vững chắc trong lòng người dùng."
  },
  {
    id: 6,
    title: "Chuẩn bị cho những tình huống khẩn cấp bất ngờ",
    category: "Kinh nghiệm",
    date: "06/06/2026",
    author: "UrSport Team",
    image: "https://images.unsplash.com/photo-1518310323263-d3434682054a?auto=format&fit=crop&q=80&w=600",
    excerpt: "Trang bị kiến thức và dụng cụ thiết yếu để đảm bảo an toàn cho bản thân và gia đình.",
    content: "Chúng ta không thể lường trước được những gì tương lai mang lại, nhưng chúng ta hoàn toàn có thể chuẩn bị cho chúng. Một bộ kit sinh tồn cơ bản, những kiến thức sơ cứu cơ bản và tinh thần vững vàng là những gì bạn cần khi đối mặt với các tình huống khó khăn.\n\nTrong bài viết này, chúng tôi sẽ hướng dẫn bạn cách xây dựng một 'túi thoát hiểm' (Go-bag) tiêu chuẩn và danh sách những vật dụng không thể thiếu giúp bạn duy trì sự sống và liên lạc trong trường hợp mất điện hoặc thiên tai."
  },
  {
    id: 7,
    title: "Xe đạp Drifter Cruiser: Đẳng cấp Mỹ cổ điển",
    category: "Sự kiện",
    date: "05/06/2026",
    author: "Admin",
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=600",
    excerpt: "Trải nghiệm cảm giác tự do phóng khoáng trên những cung đường ven biển với dòng xe đạp biểu tượng.",
    content: "Drifter Cruiser mang trong mình tinh thần tự do của nước Mỹ những thập niên trước. Với thiết kế khung cong mềm mại, tay lái rộng và yên xe cực kỳ thoải mái, đây là người bạn đồng hành lý tưởng cho những buổi dạo phố chậm rãi hay ngắm hoàng hôn bên bờ biển.\n\nKhông chỉ là phương tiện di chuyển, Drifter Cruiser còn là một phụ kiện thời trang đẳng cấp, giúp bạn nổi bật trong mọi khung hình. Hãy đến UrSport để chọn cho mình sắc màu yêu thích nhất của dòng xe này."
  }
];

export function NewsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedPost, setSelectedPost] = useState<any>(null);

  useEffect(() => {
    if (id) {
      const post = POSTS.find(p => p.id === parseInt(id));
      if (post) {
        setSelectedPost(post);
        window.scrollTo(0, 0);
      } else {
        navigate('/news');
      }
    } else {
      setSelectedPost(null);
    }
  }, [id, navigate]);

  const filteredPosts = activeCategory === 'Tất cả' 
    ? POSTS 
    : POSTS.filter(p => p.category === activeCategory);

  if (selectedPost) {
    const relatedPosts = POSTS.filter(p => p.id !== selectedPost.id).slice(0, 5);

    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-8 pb-4 border-b border-zinc-100">
          <button onClick={() => navigate("/")} className="hover:text-black transition-colors">Home</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate("/news")} className="hover:text-black transition-colors">Blog</button>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate max-w-[200px] sm:max-w-md">{selectedPost.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-16">
          {/* Main Content */}
          <div className="min-w-0">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black leading-tight tracking-tight mb-4">
              {selectedPost.title}
            </h1>

            {/* Post Metadata - Screenshot Style */}
            <div className="flex items-center gap-2 mb-10">
              <div className="flex items-center gap-1.5 bg-zinc-100 px-2 py-1 rounded text-[11px] font-bold text-zinc-500 uppercase">
                <Calendar className="h-3 w-3" />
                {selectedPost.date}
              </div>
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded uppercase">
                {selectedPost.category}
              </span>
            </div>

            {/* Author and Social */}
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

            {/* Image */}
            <div className="relative aspect-[16/9] overflow-hidden rounded-[32px] mb-12 shadow-2xl">
              <img 
                src={selectedPost.image} 
                alt={selectedPost.title} 
                className="h-full w-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              {selectedPost.content.split("\n\n").map((para: string, i: number) => (
                <p key={i} className="text-zinc-600 text-lg leading-relaxed mb-8 font-medium">
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-12">
            {/* Related Posts with Images */}
            <div>
              <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6 border-b border-zinc-100 pb-2">
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
                       <img 
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
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-[40px] font-black text-black leading-tight tracking-tight mb-4">
          Tin tức & <span className="text-[#16a34a]">Bài viết</span>
        </h1>
        <p className="text-zinc-500 max-w-2xl font-medium">
          Cập nhật những xu hướng thời trang mới nhất, kinh nghiệm phối đồ và các sự kiện sôi nổi từ cộng đồng UrSport.
        </p>
      </div>

      {/* Categories Filter */}
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

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        {filteredPosts.map(post => (
          <article 
            key={post.id} 
            className="group cursor-pointer"
            onClick={() => navigate(`/news/${post.id}`)}
          >
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl mb-6 shadow-sm">
              <img 
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
            
            <div className="flex items-center gap-4 text-[12px] font-bold text-zinc-400 mb-3 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {post.date}
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {post.author}
              </div>
            </div>

            <h2 className="text-2xl font-black text-zinc-900 group-hover:text-[#16a34a] transition-colors leading-tight mb-4">
              {post.title}
            </h2>
            
            <p className="text-zinc-500 font-medium line-clamp-2 mb-6">
              {post.excerpt}
            </p>

            <button 
              className="flex items-center gap-2 text-sm font-black text-black group-hover:gap-4 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/news/${post.id}`);
              }}
            >
              ĐỌC THÊM <ArrowRight className="h-4 w-4" />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
