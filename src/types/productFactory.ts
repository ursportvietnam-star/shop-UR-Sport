export type ProductFactoryStatus = 'draft' | 'published';

export interface ProductFactoryInput {
  title: string;
  brand: string;
  productType: string;
  material: string;
  fit: string;
  color: string;
  sizes: string[];
  price: number;
  quantity: number;
  images: Array<{ url: string; fileName?: string }>;
}

export interface ProductFactoryProduct {
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
  status: ProductFactoryStatus;
  seoScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFactoryImage {
  id: string;
  productId: string;
  url: string;
  fileName: string;
  alt: string;
  title: string;
  caption: string;
  sortOrder: number;
}

export interface ProductFactoryAudit {
  score: number;
  checklist: Record<string, { passed: boolean; points: number; message: string }>;
  issues: string[];
  iterations: number;
  canPublish: boolean;
}

export interface ProductFactoryBlueprint {
  id: string;
  productId: string;
  rawInput: ProductFactoryInput;
  visionResult: Record<string, unknown>;
  ruleResult: {
    category: string;
    collection: string[];
    internalLinks: Array<{ href: string; anchor: string }>;
  };
  seoPlan: {
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
  contentPlan: Record<string, unknown>;
  auditResult: ProductFactoryAudit;
}

export interface ProductFactorySchema {
  id: string;
  productId: string;
  productJsonLd: Record<string, unknown>;
  breadcrumbJsonLd: Record<string, unknown>;
  faqJsonLd: Record<string, unknown>;
  organizationJsonLd: Record<string, unknown>;
}

export interface ProductFactoryResult {
  product: ProductFactoryProduct;
  images: ProductFactoryImage[];
  blueprint: ProductFactoryBlueprint;
  schema: ProductFactorySchema;
  audit: ProductFactoryAudit;
  job?: unknown;
}
