import type express from "express";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

type AdminGuard = (req: express.Request) => Promise<boolean>;

type ProductFactoryDeps = {
  isAdminRequest: AdminGuard;
  getGeminiApiKey: () => string;
};

type ProductFactoryInput = {
  title: string;
  brand?: string;
  productType: string;
  material: string;
  fit: string;
  color: string;
  sizes: string[];
  price: number;
  quantity: number;
  images: Array<{ url: string; fileName?: string }>;
};

type ProductFactoryProduct = {
  id: string;
  title: string;
  slug: string;
  h1: string;
  shortDescription: string;
  fullDescriptionHtml: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  brand: string;
  productType: string;
  material: string;
  fit: string;
  color: string;
  sizes: string[];
  price: number;
  quantity: number;
  status: "draft" | "published";
  seoScore: number;
  createdAt: string;
  updatedAt: string;
};

type ProductImage = {
  id: string;
  productId: string;
  url: string;
  fileName: string;
  alt: string;
  title: string;
  caption: string;
  sortOrder: number;
};

type ProductBlueprint = {
  id: string;
  productId: string;
  rawInput: ProductFactoryInput;
  visionResult: Record<string, unknown>;
  ruleResult: RuleResult;
  seoPlan: SeoPlan;
  contentPlan: Record<string, unknown>;
  auditResult: AuditResult;
};

type ProductSchema = {
  id: string;
  productId: string;
  productJsonLd: Record<string, unknown>;
  breadcrumbJsonLd: Record<string, unknown>;
  faqJsonLd: Record<string, unknown>;
  organizationJsonLd: Record<string, unknown>;
};

type AIJob = {
  id: string;
  type: string;
  status: "running" | "success" | "failed";
  input: unknown;
  output?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type ProductFactoryDb = {
  products: ProductFactoryProduct[];
  productImages: ProductImage[];
  productBlueprints: ProductBlueprint[];
  productSchemas: ProductSchema[];
  aiJobs: AIJob[];
};

type RuleResult = {
  category: string;
  collection: string[];
  internalLinks: Array<{ href: string; anchor: string }>;
};

type SeoPlan = {
  title: string;
  slug: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  faq: Array<{ question: string; answer: string }>;
  internalLinks: Array<{ href: string; anchor: string }>;
};

type AuditResult = {
  score: number;
  checklist: Record<string, { passed: boolean; points: number; message: string }>;
  issues: string[];
  iterations: number;
  canPublish: boolean;
};

const EMPTY_DB: ProductFactoryDb = {
  products: [],
  productImages: [],
  productBlueprints: [],
  productSchemas: [],
  aiJobs: [],
};

const DB_PATH = path.join(process.cwd(), ".local", "product-factory-db.json");

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const parseJsonObject = (value: string) => {
  const clean = String(value || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("AI response is not valid JSON");
  }
};

const hasCjk = (value: string) => /[\u3400-\u9fff\uf900-\ufaff]/.test(value);

const sanitizeAiHtml = (value: string) =>
  String(value || "")
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+=["'][^"']*["']/gi, "")
    .trim();

const geminiModelCandidates = () => Array.from(new Set([
  process.env.GEMINI_MODEL,
  process.env.VITE_GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
].filter(Boolean) as string[]));

const slugify = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const limitText = (value: string, max: number) => {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).replace(/\s+\S*$/, "").trim();
};

const normalizeInput = (body: any): ProductFactoryInput => ({
  title: String(body?.title || body?.rawInput?.title || "").trim(),
  brand: String(body?.brand || body?.rawInput?.brand || "URSport").trim() || "URSport",
  productType: String(body?.productType || body?.rawInput?.productType || "ao-thun-nam").trim(),
  material: String(body?.material || body?.rawInput?.material || "").trim(),
  fit: String(body?.fit || body?.rawInput?.fit || "").trim(),
  color: String(body?.color || body?.rawInput?.color || "").trim(),
  sizes: Array.isArray(body?.sizes)
    ? body.sizes.map(String).map((item: string) => item.trim()).filter(Boolean)
    : String(body?.sizes || body?.rawInput?.sizes || "M,L,XL,XXL").split(",").map(item => item.trim()).filter(Boolean),
  price: Number(body?.price || body?.rawInput?.price || 0),
  quantity: Number(body?.quantity || body?.stock || body?.rawInput?.quantity || body?.rawInput?.stock || 0),
  images: Array.isArray(body?.images)
    ? body.images.map((item: any) => typeof item === "string" ? ({ url: item }) : item).filter((item: any) => item?.url)
    : [],
});

const productTypeLabel = (value: string) => {
  const normalized = slugify(value);
  const labels: Record<string, string> = {
    "ao-thun-nam": "áo thun nam",
    "ao-the-thao-nam": "áo thể thao nam",
    "ao-polo-nam": "áo polo nam",
    "quan-the-thao-nam": "quần thể thao nam",
  };
  return labels[normalized] || value.replace(/-/g, " ");
};

const readDb = async (): Promise<ProductFactoryDb> => {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return { ...EMPTY_DB, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_DB };
  }
};

const writeDb = async (db: ProductFactoryDb) => {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
};

const addJob = async (type: string, input: unknown): Promise<AIJob> => {
  const now = new Date().toISOString();
  const db = await readDb();
  const job: AIJob = { id: randomUUID(), type, status: "running", input, createdAt: now, updatedAt: now };
  db.aiJobs.unshift(job);
  await writeDb(db);
  return job;
};

const finishJob = async (jobId: string, status: AIJob["status"], output?: unknown, error?: string) => {
  const db = await readDb();
  db.aiJobs = db.aiJobs.map(job => job.id === jobId ? { ...job, status, output, error, updatedAt: new Date().toISOString() } : job);
  await writeDb(db);
};

const ensureAdmin = (guard: AdminGuard) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(await guard(req))) return res.status(403).json({ error: "Admin permission required" });
  next();
};

const imageUrlToDataUrl = async (url: string) => {
  if (/^data:/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const relativePath = url.replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "public", relativePath.replace(/^images\//, "images/"));
  const bytes = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${bytes.toString("base64")}`;
};

const runVision = async (input: ProductFactoryInput) => {
  const fallback = {
    product_type: input.productType || "ao-thun-nam",
    color: input.color || "chua-xac-dinh",
    logo_position: "unknown",
    style: input.fit || "basic",
    gender: "nam",
    image_quality: input.images.length ? "uploaded" : "no-image",
    main_image_suggestion: input.images[0]?.url || "",
  };

  if (!process.env.OPENAI_API_KEY || input.images.length === 0) return fallback;

  try {
    const imageParts = await Promise.all(input.images.slice(0, 4).map(async image => ({
      type: "image_url",
      image_url: { url: await imageUrlToDataUrl(image.url), detail: "low" },
    })));
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Analyze URSport product images. Return JSON only with product_type,color,logo_position,style,gender,image_quality,main_image_suggestion.',
              },
              ...imageParts,
            ],
          },
        ],
        temperature: 0.1,
      }),
    });
    const data = await response.json().catch(() => ({}));
    const text = data?.choices?.[0]?.message?.content || "";
    return text ? { ...fallback, ...JSON.parse(text) } : fallback;
  } catch (error) {
    console.warn("[product-factory] Vision fallback:", error);
    return fallback;
  }
};

const buildBlueprint = (input: ProductFactoryInput, visionResult: Record<string, unknown>) => {
  const productType = slugify(String(visionResult.product_type || input.productType || "ao-thun-nam")) || "ao-thun-nam";
  const material = input.material || "premium cotton";
  const productLabel = productTypeLabel(productType);
  const targetKeyword = [
    productLabel,
    material.toLowerCase(),
  ].filter(Boolean).join(" ").replace(/\s+/g, " ");

  return {
    brand: input.brand || "URSport",
    product_type: productType,
    category: productType.includes("the-thao") ? "/ao-thun-nam/the-thao" : "/ao-thun-nam",
    collection: productType.includes("cotton") || /cotton/i.test(material) ? ["/ao-thun-nam", "/ao-thun-nam/cotton"] : ["/ao-thun-nam"],
    material,
    fit: input.fit || "regular fit",
    target_keyword: targetKeyword,
    search_intent: "transactional",
    tone: "premium, ro rang, chuan SEO ecommerce",
  };
};

const runRuleEngine = (blueprint: any): RuleResult => {
  const productType = String(blueprint.product_type || "");
  const material = String(blueprint.material || "");

  if (productType === "ao-the-thao-nam" || productType.includes("the-thao")) {
    return {
      category: "/ao-thun-nam/the-thao",
      collection: ["/ao-thun-nam/the-thao", "/quan-the-thao-nam"],
      internalLinks: [
        { href: "/ao-thun-nam/the-thao", anchor: "áo thun thể thao nam" },
        { href: "/quan-the-thao-nam", anchor: "quần thể thao nam" },
        { href: "/blog/ao-thun-tap-gym-nen-chon-loai-nao", anchor: "cách chọn áo thun tập gym" },
      ],
    };
  }

  if (productType === "ao-thun-nam" && /cotton/i.test(material)) {
    return {
      category: "/ao-thun-nam/cotton",
      collection: ["/ao-thun-nam", "/ao-thun-nam/cotton"],
      internalLinks: [
        { href: "/ao-thun-nam", anchor: "áo thun nam" },
        { href: "/ao-thun-nam/cotton", anchor: "áo thun nam cotton" },
        { href: "/blog/bang-size-ao-thun-nam", anchor: "bảng size áo thun nam" },
      ],
    };
  }

  return {
    category: "/ao-thun-nam",
    collection: ["/ao-thun-nam"],
    internalLinks: [
      { href: "/ao-thun-nam", anchor: "áo thun nam" },
      { href: "/blog/bang-size-ao-thun-nam", anchor: "bảng size áo thun nam" },
    ],
  };
};

const buildSeoPlan = (input: ProductFactoryInput, blueprint: any, rules: RuleResult): SeoPlan => {
  const brand = input.brand || "URSport";
  const productLabel = productTypeLabel(blueprint.product_type);
  const material = input.material || blueprint.material;
  const targetKeyword = blueprint.target_keyword || `${productLabel} ${material}`.trim();
  const title = limitText(input.title || `${productLabel} ${brand} ${material}`.replace(/\s+/g, " "), 70);
  const h1 = input.title || title;
  const metaTitle = limitText(`${productLabel} ${material} ${brand}`.replace(/\s+/g, " "), 60);
  const metaDescription = limitText(`${h1} chất liệu ${material}, form ${input.fit || blueprint.fit}, dễ mặc hằng ngày. Xem size, màu và đặt mua tại URSport.`, 155);
  const secondaryKeywords = [
    `${productLabel} ${brand}`,
    `${productLabel} ${material}`,
    `${productLabel} ${input.fit || blueprint.fit}`,
    `áo nam ${input.color || "dễ phối"}`,
  ].map(item => item.toLowerCase());

  return {
    title,
    slug: slugify(input.title || `${productLabel}-${brand}-${material}`),
    h1,
    metaTitle,
    metaDescription,
    targetKeyword,
    secondaryKeywords,
    internalLinks: rules.internalLinks,
    faq: [
      { question: `${h1} phù hợp mặc khi nào?`, answer: "Sản phẩm phù hợp mặc hằng ngày, đi chơi, di chuyển nhẹ và phối cùng quần thể thao nam." },
      { question: `Nên chọn size ${productLabel} như thế nào?`, answer: "Bạn nên chọn theo số đo vai, ngực và thói quen mặc ôm hay rộng. Nếu phân vân giữa hai size, hãy ưu tiên size tạo cảm giác thoải mái khi vận động." },
      { question: `Chất liệu ${material} có dễ chăm sóc không?`, answer: "Nên giặt nhẹ, phơi nơi thoáng và tránh chất tẩy mạnh để giữ bề mặt vải và form dáng ổn định hơn." },
    ],
  };
};

const buildLongContent = (input: ProductFactoryInput, seo: SeoPlan, rules: RuleResult) => {
  const links = rules.internalLinks.slice(0, 4);
  const firstLink = links[0] || { href: "/ao-thun-nam", anchor: "áo thun nam" };
  const secondLink = links[1] || firstLink;
  const thirdLink = links[2] || firstLink;

  return [
    `<p><strong>${seo.h1}</strong> là lựa chọn dành cho nam giới muốn có một mẫu áo dễ mặc, gọn form và đủ chỉn chu cho nhiều hoàn cảnh. Sản phẩm tập trung vào cảm giác mặc thực tế: chất liệu ${input.material}, form ${input.fit}, màu ${input.color || "dễ phối"} và bảng size rõ ràng để người mua chọn nhanh hơn.</p>`,
    `<h2>Điểm nổi bật của ${seo.targetKeyword}</h2>`,
    `<p>Khi chọn <a href="${firstLink.href}">${firstLink.anchor}</a>, khách hàng thường quan tâm nhất đến độ thoải mái, độ bền form và khả năng phối đồ. ${seo.h1} được định vị theo hướng basic premium: không cầu kỳ, không quá phô trương, nhưng vẫn tạo cảm giác sạch, khỏe và nam tính.</p>`,
    `<ul><li><strong>Chất liệu:</strong> ${input.material} cho cảm giác mềm và dễ chịu khi mặc lâu.</li><li><strong>Form:</strong> ${input.fit} giúp tổng thể gọn hơn nhưng vẫn đủ khoảng thở khi vận động.</li><li><strong>Màu sắc:</strong> ${input.color || "tông dễ phối"} phù hợp nhiều kiểu quần và giày.</li><li><strong>Size:</strong> ${input.sizes.join(", ")} giúp khách dễ chọn theo vóc dáng.</li></ul>`,
    `<h2>Chất liệu và cảm giác mặc</h2>`,
    `<p>Với chất liệu ${input.material}, sản phẩm hướng đến cảm giác mặc ổn định trong nhịp sống hằng ngày. Nội dung sản phẩm không bịa thêm thông số kỹ thuật ngoài dữ liệu đầu vào, nhưng vẫn mô tả rõ giá trị mà khách hàng có thể cảm nhận: bề mặt vải dễ chịu, dễ phối và phù hợp phong cách thể thao nam hiện đại.</p>`,
    `<p>Nếu bạn đang xây dựng tủ đồ nam cơ bản, một mẫu áo có chất liệu tốt sẽ giúp giảm cảm giác phải thay đổi trang phục quá nhiều trong ngày. Áo có thể đi cùng jeans, jogger hoặc <a href="${secondLink.href}">${secondLink.anchor}</a> để tạo set đồ gọn, năng động.</p>`,
    `<h2>Form dáng và phong cách phối đồ</h2>`,
    `<p>Form ${input.fit} phù hợp người thích sự cân bằng giữa thoải mái và chỉn chu. Khi mặc đi làm môi trường thoải mái, đi cà phê, du lịch ngắn ngày hoặc tập luyện nhẹ, sản phẩm vẫn giữ được vẻ đơn giản, dễ gần và không bị quá xuề xòa.</p>`,
    `<p>Với màu ${input.color || "trung tính"}, bạn có thể phối theo 3 hướng: tối giản với quần đen, năng động với quần thể thao, hoặc casual với quần jeans. Cách phối này giúp sản phẩm có tính ứng dụng cao hơn thay vì chỉ dùng cho một bối cảnh.</p>`,
    `<h2>Ai nên chọn mẫu áo này?</h2>`,
    `<p>${seo.h1} phù hợp với người mua ưu tiên sự rõ ràng: biết mình cần chất liệu gì, form gì, màu gì và mức giá bao nhiêu. Đây là nhóm khách không muốn đọc lời quảng cáo quá đà, mà cần mô tả sản phẩm đủ cụ thể để ra quyết định nhanh. Vì vậy nội dung sản phẩm nên nói thẳng vào trải nghiệm mặc, khả năng phối đồ và cách chọn size.</p>`,
    `<p>Nếu khách hàng đang tìm một mẫu áo để mặc thường xuyên, đi chơi cuối tuần hoặc phối với outfit thể thao nhẹ, sản phẩm có lợi thế ở tính dễ dùng. Nếu khách cần một mẫu chuyên dụng cho vận động cường độ cao, trang sản phẩm nên bổ sung thêm dữ liệu thật về độ co giãn, độ thoáng hoặc ảnh test thực tế trước khi khẳng định sâu hơn.</p>`,
    `<h2>Checklist trước khi đặt mua</h2>`,
    `<ul><li>Kiểm tra đúng màu muốn mua: ${input.color || "màu đã chọn trong phân loại"}.</li><li>Đối chiếu size ${input.sizes.join(", ")} với số đo cá nhân.</li><li>Xem ảnh mặt trước, ảnh chi tiết chất liệu và ảnh mặc thật nếu shop đã bổ sung.</li><li>Đọc kỹ phần chất liệu ${input.material} và form ${input.fit} để tránh chọn sai kỳ vọng.</li></ul>`,
    `<p>Checklist này giúp khách hàng tự tin hơn trước khi thêm sản phẩm vào giỏ. Với ecommerce thời trang, mô tả tốt không chỉ để lên SEO mà còn phải giảm câu hỏi lặp lại về size, màu và cảm giác mặc.</p>`,
    `<h2>Gợi ý ảnh nên bổ sung cho sản phẩm</h2>`,
    `<p>Để trang sản phẩm mạnh hơn, nên có ít nhất 3 nhóm ảnh: ảnh chính rõ toàn bộ áo, ảnh cận chất liệu/đường may và ảnh mặc thật trên người mẫu nam. Nếu có đủ ảnh, hệ thống Image SEO sẽ tạo fileName, alt, title và caption riêng cho từng ảnh để hỗ trợ Google hiểu đúng sản phẩm.</p>`,
    `<p>Ảnh chính nên sạch nền, không che sản phẩm và không dùng chữ quá lớn trên ảnh. Ảnh lifestyle nên thể hiện cách phối thật với quần và giày để người mua hình dung sản phẩm trong đời sống hằng ngày.</p>`,
    `<h2>Hướng dẫn chọn size</h2>`,
    `<p>Các size hiện có gồm <strong>${input.sizes.join(", ")}</strong>. Khi chọn size, hãy ưu tiên số đo vai và vòng ngực trước, sau đó mới cân nhắc thói quen mặc ôm hay rộng. Người thích vận động hoặc muốn thoải mái cả ngày có thể chọn size tạo dư nhẹ ở vai và ngực.</p>`,
    `<p>Để chọn chính xác hơn, bạn có thể tham khảo <a href="${thirdLink.href}">${thirdLink.anchor}</a>. Nếu số đo nằm giữa hai size, lựa chọn an toàn thường là size lớn hơn, đặc biệt khi bạn thích mặc thoáng hoặc phối layer.</p>`,
    `<h2>Cách chăm sóc để áo bền đẹp</h2>`,
    `<ul><li>Giặt ở chế độ nhẹ, tránh ngâm quá lâu với chất tẩy mạnh.</li><li>Lộn trái áo trước khi giặt để giảm ma sát bề mặt.</li><li>Phơi nơi thoáng, hạn chế nắng gắt trực tiếp trong thời gian dài.</li><li>Ủi ở nhiệt độ phù hợp với chất liệu vải.</li></ul>`,
    `<h2>Câu hỏi thường gặp</h2>`,
    seo.faq.map(item => `<h3>${item.question}</h3><p>${item.answer}</p>`).join(""),
    `<p><strong>Gợi ý từ URSport:</strong> nếu bạn cần một mẫu áo nam dễ mặc, rõ chất liệu và dễ phối, ${seo.h1} là bản nháp sản phẩm tốt để tiếp tục bổ sung ảnh thật, bảng size và thông tin tồn kho trước khi xuất bản.</p>`,
  ].join("");
};

const insertInternalLinks = (html: string, links: RuleResult["internalLinks"]) => {
  let output = html;
  links.slice(0, 6).forEach(link => {
    if (output.includes(`href="${link.href}"`)) return;
    const pattern = new RegExp(`\\b${link.anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    output = output.replace(pattern, `<a href="${link.href}">${link.anchor}</a>`);
  });
  return output;
};

const buildImageSeo = (input: ProductFactoryInput, seo: SeoPlan): ProductImage[] => {
  const base = seo.slug || slugify(input.title);
  return input.images.map((image, index) => {
    const angle = index === 0 ? "mat-truoc" : index === 1 ? "chi-tiet" : index === 2 ? "phoi-do" : `anh-${index + 1}`;
    return {
      id: randomUUID(),
      productId: "",
      url: image.url,
      fileName: `${base}-${angle}.webp`,
      alt: limitText(`${seo.targetKeyword} ${input.brand || "URSport"} ${angle.replace(/-/g, " ")}`, 125),
      title: limitText(`${seo.targetKeyword} ${input.brand || "URSport"}`, 70),
      caption: index === 0
        ? "Thiết kế tối giản, dễ mặc hằng ngày và phù hợp phong cách thể thao nam hiện đại."
        : "Ảnh sản phẩm hỗ trợ người mua quan sát rõ hơn chất liệu, form dáng và cách phối.",
      sortOrder: index,
    };
  });
};

const buildSchemas = (product: ProductFactoryProduct, images: ProductImage[], seo: SeoPlan, rules: RuleResult): Omit<ProductSchema, "id" | "productId"> => ({
  productJsonLd: {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription,
    image: images.map(image => image.url),
    brand: { "@type": "Brand", name: product.brand },
    sku: product.id,
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      price: product.price,
      availability: product.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://www.ursport.vn/${product.slug}`,
    },
  },
  breadcrumbJsonLd: {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "https://www.ursport.vn/" },
      { "@type": "ListItem", position: 2, name: rules.category.replace(/^\//, ""), item: `https://www.ursport.vn${rules.category}` },
      { "@type": "ListItem", position: 3, name: product.title, item: `https://www.ursport.vn/${product.slug}` },
    ],
  },
  faqJsonLd: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faq.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
  organizationJsonLd: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "URSport",
    url: "https://www.ursport.vn",
  },
});

const auditProduct = (product: ProductFactoryProduct, images: ProductImage[], schema: ProductSchema | Omit<ProductSchema, "id" | "productId">, seo: SeoPlan): AuditResult => {
  const contentText = stripHtml(product.fullDescriptionHtml);
  const checklist: AuditResult["checklist"] = {
    h1: { passed: Boolean(product.h1), points: 10, message: "Có H1" },
    metaTitle: { passed: product.metaTitle.length > 0 && product.metaTitle.length <= 60, points: 10, message: "Meta title đúng độ dài" },
    metaDescription: { passed: product.metaDescription.length > 0 && product.metaDescription.length <= 155, points: 10, message: "Meta description đúng độ dài" },
    targetKeyword: { passed: contentText.toLowerCase().includes(product.targetKeyword.toLowerCase()), points: 10, message: "Có target keyword trong nội dung" },
    imageAlt: { passed: images.length > 0 && images.every(image => image.alt), points: 10, message: "Ảnh có ALT" },
    faq: { passed: seo.faq.length > 0 && /<h3>/.test(product.fullDescriptionHtml), points: 10, message: "Có FAQ" },
    schema: { passed: Boolean(schema.productJsonLd && schema.breadcrumbJsonLd && schema.faqJsonLd), points: 15, message: "Có schema JSON-LD" },
    internalLink: { passed: /<a\s+href=/.test(product.fullDescriptionHtml), points: 10, message: "Có internal link" },
    wordCount: { passed: contentText.split(/\s+/).filter(Boolean).length >= 900, points: 10, message: "Nội dung trên 900 chữ" },
    slug: { passed: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug), points: 5, message: "Slug chuẩn SEO" },
  };
  const score = Object.values(checklist).reduce((sum, item) => sum + (item.passed ? item.points : 0), 0);
  const issues = Object.entries(checklist).filter(([, item]) => !item.passed).map(([, item]) => item.message);
  return { score, checklist, issues, iterations: 0, canPublish: score >= 90 };
};

const repairDraft = (product: ProductFactoryProduct, images: ProductImage[], schema: Omit<ProductSchema, "id" | "productId">, seo: SeoPlan, rules: RuleResult) => {
  let repaired = { ...product };
  if (!repaired.h1) repaired.h1 = seo.h1;
  if (!repaired.metaTitle || repaired.metaTitle.length > 60) repaired.metaTitle = seo.metaTitle;
  if (!repaired.metaDescription || repaired.metaDescription.length > 155) repaired.metaDescription = seo.metaDescription;
  if (!repaired.fullDescriptionHtml.toLowerCase().includes(repaired.targetKeyword.toLowerCase())) {
    repaired.fullDescriptionHtml = `<p><strong>${repaired.targetKeyword}</strong> là trọng tâm của sản phẩm này.</p>${repaired.fullDescriptionHtml}`;
  }
  if (!/<a\s+href=/.test(repaired.fullDescriptionHtml)) repaired.fullDescriptionHtml = insertInternalLinks(repaired.fullDescriptionHtml, rules.internalLinks);
  if (!/<h3>/.test(repaired.fullDescriptionHtml)) {
    repaired.fullDescriptionHtml += `<h2>Câu hỏi thường gặp</h2>${seo.faq.map(item => `<h3>${item.question}</h3><p>${item.answer}</p>`).join("")}`;
  }
  const currentWords = stripHtml(repaired.fullDescriptionHtml).split(/\s+/).filter(Boolean).length;
  if (currentWords < 900) {
    repaired.fullDescriptionHtml += [
      `<p>Khi tối ưu trang sản phẩm, phần mô tả nên giúp khách trả lời ba câu hỏi: áo này mặc trong hoàn cảnh nào, có hợp vóc dáng của mình không và cần lưu ý gì trước khi mua. Cách viết này tự nhiên hơn việc nhồi từ khóa, đồng thời vẫn giữ nội dung đủ sâu cho SEO ecommerce.</p>`,
      `<p>Về trải nghiệm sau mua, khách hàng thường đánh giá cao những thông tin cụ thể như chất liệu, form, màu, size và cách chăm sóc. Nếu shop bổ sung ảnh thật theo từng màu, phần mô tả sẽ càng đáng tin hơn vì người mua có thể đối chiếu chữ viết với hình ảnh thực tế.</p>`,
      `<p>Với ${repaired.brand}, nội dung nên giữ giọng rõ ràng, gọn và có trách nhiệm: thông tin nào có trong input thì viết chắc, thông tin nào chưa có thì không tự bịa. Đây là nguyên tắc quan trọng để sản phẩm vừa bán hàng tốt vừa tránh gây hiểu nhầm cho khách.</p>`,
    ].join("");
  }
  return repaired;
};

const rewriteContentWithGemini = async (
  input: ProductFactoryInput,
  product: ProductFactoryProduct,
  seo: SeoPlan,
  rules: RuleResult,
  draftHtml: string,
  getGeminiApiKey: () => string,
) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { engine: "typescript", aiRewrite: false, aiRewriteError: "Gemini API key is not configured" };
  }

  const prompt = [
    "Bạn là senior ecommerce copywriter cho URSport.",
    "Nhiệm vụ: viết lại mô tả sản phẩm tiếng Việt tự nhiên, mềm hơn, có nhịp bán hàng tốt hơn, nhưng KHÔNG phá cấu trúc SEO đã kiểm soát.",
    "",
    "DỮ LIỆU SẢN PHẨM:",
    JSON.stringify({
      title: product.title,
      h1: product.h1,
      brand: product.brand,
      productType: product.productType,
      material: product.material,
      fit: product.fit,
      color: product.color,
      sizes: product.sizes,
      price: product.price,
      quantity: product.quantity,
      targetKeyword: product.targetKeyword,
      secondaryKeywords: product.secondaryKeywords,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      internalLinks: rules.internalLinks,
      faq: seo.faq,
      rawInput: input,
    }),
    "",
    "BẢN NHÁP CỨNG CẦN VIẾT LẠI:",
    draftHtml.slice(0, 18000),
    "",
    "YÊU CẦU BẮT BUỘC:",
    "- Chỉ viết tiếng Việt tự nhiên, không tiếng Trung, không tiếng Anh thừa, không emoji.",
    "- Không bịa thông số kỹ thuật, bảo hành, đổi trả, giảm giá, tồn kho hoặc cam kết nếu input không có.",
    "- Không để lọt code/source như const, function, value=>, return, JSON vào nội dung.",
    "- fullDescriptionHtml dài khoảng 900-1500 chữ.",
    "- HTML sạch, chỉ dùng p, h2, h3, ul, li, strong, a.",
    "- Bắt buộc có targetKeyword tự nhiên trong nội dung.",
    "- Bắt buộc giữ 4-6 internal links tối đa, anchor tự nhiên, dùng href được cung cấp.",
    "- Bắt buộc có phần Câu hỏi thường gặp bằng h2 và các câu hỏi bằng h3.",
    "- Không dùng markdown.",
    "",
    "TRẢ VỀ JSON HỢP LỆ DUY NHẤT:",
    '{"shortDescription":"2 câu mềm, bán hàng tốt, dưới 240 ký tự","fullDescriptionHtml":"HTML đã viết lại"}',
  ].join("\n");

  try {
    let text = "";
    let model = "";
    let lastError: any;
    for (const candidate of geminiModelCandidates()) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.35,
              },
            }),
          },
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error?.message || `${candidate} returned ${response.status}`);

        text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        model = candidate;
        break;
      } catch (modelError: any) {
        lastError = modelError;
      }
    }
    if (!text) throw lastError || new Error("Gemini returned empty content");

    const parsed = parseJsonObject(text);
    const html = insertInternalLinks(sanitizeAiHtml(String(parsed.fullDescriptionHtml || "")), rules.internalLinks);
    const plain = stripHtml(html);
    const issues: string[] = [];

    if (!html) issues.push("empty html");
    if (hasCjk(html)) issues.push("contains CJK characters");
    if (/(?:\bconst\b|\bfunction\b|\breturn\b|=>|value\s*=>|JSON\.|```)/i.test(html)) issues.push("contains code-like text");
    if (/<(?:script|style)\b/i.test(html)) issues.push("contains unsafe tags");
    if (!plain.toLowerCase().includes(product.targetKeyword.toLowerCase())) issues.push("missing target keyword");
    if (!/<a\s+href=/.test(html)) issues.push("missing internal links");
    if (!/<h2[^>]*>\s*Câu hỏi thường gặp\s*<\/h2>/i.test(html) || !/<h3[\s>]/i.test(html)) issues.push("missing FAQ section");
    if (plain.split(/\s+/).filter(Boolean).length < 850) issues.push("too short");

    if (issues.length > 0) {
      throw new Error(`AI rewrite rejected: ${issues.join(", ")}`);
    }

    return {
      engine: "gemini",
      aiRewrite: true,
      model,
      shortDescription: limitText(String(parsed.shortDescription || plain), 240),
      fullDescriptionHtml: html,
    };
  } catch (error: any) {
    console.warn("[product-factory] Gemini rewrite fallback:", error?.message || error);
    return {
      engine: "typescript",
      aiRewrite: false,
      aiRewriteError: error?.message || "Gemini rewrite failed",
    };
  }
};

const ensureUniqueSlug = async (slug: string, productId?: string) => {
  const db = await readDb();
  const existing = new Set(db.products.filter(product => product.id !== productId).map(product => product.slug));
  let candidate = slug || `san-pham-${Date.now()}`;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${slug}-${index}`;
    index += 1;
  }
  return candidate;
};

const generateDraft = async (input: ProductFactoryInput, deps: ProductFactoryDeps) => {
  const now = new Date().toISOString();
  const id = randomUUID();
  const visionResult = await runVision(input);
  const blueprint = buildBlueprint(input, visionResult);
  const ruleResult = runRuleEngine(blueprint);
  const seoPlan = buildSeoPlan(input, blueprint, ruleResult);
  const imageSeo = buildImageSeo(input, seoPlan).map(image => ({ ...image, productId: id }));
  let contentHtml = insertInternalLinks(buildLongContent(input, seoPlan, ruleResult), ruleResult.internalLinks);

  const productBase: ProductFactoryProduct = {
    id,
    title: seoPlan.title,
    slug: await ensureUniqueSlug(seoPlan.slug, id),
    h1: seoPlan.h1,
    shortDescription: limitText(stripHtml(contentHtml), 240),
    fullDescriptionHtml: contentHtml,
    metaTitle: seoPlan.metaTitle,
    metaDescription: seoPlan.metaDescription,
    targetKeyword: seoPlan.targetKeyword,
    secondaryKeywords: seoPlan.secondaryKeywords,
    brand: input.brand || "URSport",
    productType: blueprint.product_type,
    material: input.material || blueprint.material,
    fit: input.fit || blueprint.fit,
    color: input.color,
    sizes: input.sizes,
    price: input.price,
    quantity: input.quantity,
    status: "draft",
    seoScore: 0,
    createdAt: now,
    updatedAt: now,
  };

  const rewrite = await rewriteContentWithGemini(
    input,
    productBase,
    seoPlan,
    ruleResult,
    contentHtml,
    deps.getGeminiApiKey,
  );
  let product: ProductFactoryProduct = productBase;
  if (rewrite.aiRewrite && rewrite.fullDescriptionHtml) {
    product = {
      ...product,
      shortDescription: rewrite.shortDescription || product.shortDescription,
      fullDescriptionHtml: rewrite.fullDescriptionHtml,
      updatedAt: new Date().toISOString(),
    };
  }

  const schemaBase = buildSchemas(product, imageSeo, seoPlan, ruleResult);
  const contentPlan = {
    requiredWordRange: "900-1500",
    tone: blueprint.tone,
    engine: rewrite.engine,
    model: rewrite.model,
    aiRewrite: rewrite.aiRewrite,
    aiRewriteError: rewrite.aiRewriteError,
  };
  let audit = auditProduct(product, imageSeo, schemaBase, seoPlan);
  for (let i = 0; audit.score < 90 && i < 3; i += 1) {
    product = repairDraft(product, imageSeo, schemaBase, seoPlan, ruleResult);
    audit = { ...auditProduct(product, imageSeo, schemaBase, seoPlan), iterations: i + 1 };
  }
  product = { ...product, seoScore: audit.score, status: "draft", updatedAt: new Date().toISOString() };
  const schema: ProductSchema = { id: randomUUID(), productId: id, ...buildSchemas(product, imageSeo, seoPlan, ruleResult) };
  const blueprintRecord: ProductBlueprint = {
    id: randomUUID(),
    productId: id,
    rawInput: input,
    visionResult,
    ruleResult,
    seoPlan,
    contentPlan,
    auditResult: audit,
  };
  return { product, images: imageSeo, blueprint: blueprintRecord, schema, audit, job: null };
};

const upsertDraft = async (payload: Awaited<ReturnType<typeof generateDraft>>) => {
  const db = await readDb();
  db.products = [payload.product, ...db.products.filter(product => product.id !== payload.product.id)];
  db.productImages = [...payload.images, ...db.productImages.filter(image => image.productId !== payload.product.id)];
  db.productBlueprints = [payload.blueprint, ...db.productBlueprints.filter(item => item.productId !== payload.product.id)];
  db.productSchemas = [payload.schema, ...db.productSchemas.filter(item => item.productId !== payload.product.id)];
  await writeDb(db);
};

const toLegacyProduct = (product: ProductFactoryProduct, images: ProductImage[]) => ({
  id: product.id,
  productCode: `UR-${product.id.slice(0, 8).toUpperCase()}`,
  slug: product.slug,
  name: product.title,
  description: product.fullDescriptionHtml,
  price: product.price,
  images: images.map(image => image.url),
  category: product.productType.includes("the-thao") ? "Áo thun thể thao nam" : "Áo thun nam",
  colors: product.color ? product.color.split(",").map(item => item.trim()).filter(Boolean) : [],
  sizes: product.sizes,
  stock: product.quantity,
  rating: 0,
  reviewsCount: 0,
  features: [],
  seoTitle: product.metaTitle,
  metaDescription: product.metaDescription,
  keywords: [product.targetKeyword, ...product.secondaryKeywords].join(", "),
  brand: product.brand,
  material: product.material,
  style: product.fit,
});

export function registerProductFactoryRoutes(app: express.Express, deps: ProductFactoryDeps) {
  const adminOnly = ensureAdmin(deps.isAdminRequest);

  app.post("/api/admin/ai/product-factory/generate", adminOnly, async (req, res) => {
    const input = normalizeInput(req.body || {});
    if (!input.title || !input.productType || !input.material || !input.fit || !input.price) {
      return res.status(400).json({ error: "title, productType, material, fit and price are required" });
    }
    const job = await addJob("product-factory.generate", input);
    try {
      const output = await generateDraft(input, deps);
      await upsertDraft(output);
      await finishJob(job.id, "success", output);
      return res.json({ ...output, job: { ...job, status: "success", output } });
    } catch (error: any) {
      await finishJob(job.id, "failed", undefined, error.message || String(error));
      return res.status(500).json({ error: error.message || "Product factory failed" });
    }
  });

  app.post("/api/admin/ai/product-factory/audit", adminOnly, async (req, res) => {
    const product = req.body?.product as ProductFactoryProduct;
    const images = (req.body?.images || []) as ProductImage[];
    const schema = req.body?.schema as ProductSchema;
    const seoPlan = req.body?.seoPlan as SeoPlan;
    if (!product || !seoPlan) return res.status(400).json({ error: "product and seoPlan are required" });
    return res.json({ audit: auditProduct(product, images, schema, seoPlan) });
  });

  app.post("/api/admin/ai/product-factory/publish", adminOnly, async (req, res) => {
    const product = req.body?.product as ProductFactoryProduct;
    const images = (req.body?.images || []) as ProductImage[];
    const schema = req.body?.schema as ProductSchema;
    const blueprint = req.body?.blueprint as ProductBlueprint;
    if (!product?.id) return res.status(400).json({ error: "product is required" });

    const now = new Date().toISOString();
    const finalProduct: ProductFactoryProduct = {
      ...product,
      slug: await ensureUniqueSlug(product.slug, product.id),
      status: product.seoScore >= 90 ? "published" : "draft",
      updatedAt: now,
    };
    const db = await readDb();
    db.products = [finalProduct, ...db.products.filter(item => item.id !== finalProduct.id)];
    db.productImages = [...images.map(image => ({ ...image, productId: finalProduct.id })), ...db.productImages.filter(item => item.productId !== finalProduct.id)];
    if (schema?.productJsonLd) db.productSchemas = [{ ...schema, productId: finalProduct.id }, ...db.productSchemas.filter(item => item.productId !== finalProduct.id)];
    if (blueprint?.ruleResult) db.productBlueprints = [{ ...blueprint, productId: finalProduct.id }, ...db.productBlueprints.filter(item => item.productId !== finalProduct.id)];
    await writeDb(db);

    return res.json({
      product: finalProduct,
      images,
      schema,
      blueprint,
      legacyProduct: toLegacyProduct(finalProduct, images),
      published: finalProduct.status === "published",
    });
  });

  app.get("/api/admin/ai/jobs", adminOnly, async (_req, res) => {
    const db = await readDb();
    return res.json({ jobs: db.aiJobs.slice(0, 100) });
  });

  app.get("/api/admin/products", adminOnly, async (_req, res) => {
    const db = await readDb();
    return res.json({ products: db.products, images: db.productImages, schemas: db.productSchemas });
  });

  app.get("/api/products/:slug", async (req, res) => {
    const db = await readDb();
    const product = db.products.find(item => item.slug === req.params.slug && item.status === "published");
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({
      product,
      images: db.productImages.filter(image => image.productId === product.id),
      schema: db.productSchemas.find(schema => schema.productId === product.id) || null,
    });
  });
}
