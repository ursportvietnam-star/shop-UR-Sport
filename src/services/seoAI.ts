import { generateSeoActionPlan } from '../lib/gemini';
import type { AISeoActionPlan } from '../lib/gemini';
import type { SeoOpportunity } from '../types/seo';
import type { BlogPost, Product } from '../types';

const normalizeText = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const buildSeoActionPrompt = (
  opportunity: SeoOpportunity,
  products: Product[],
  blogPosts: BlogPost[],
) => {
  const firstTerm = normalizeText(opportunity.query).split(' ')[0] || '';
  const relatedProducts = products
    .filter(product => normalizeText(`${product.name} ${product.category} ${product.keywords}`).includes(firstTerm))
    .slice(0, 5)
    .map(product => ({
      name: product.name,
      category: product.category,
      slug: product.slug,
      material: product.material,
      price: product.discountPrice || product.price,
    }));

  const relatedBlogs = blogPosts
    .filter(post => normalizeText(`${post.title} ${post.excerpt} ${post.category}`).split(' ').some(term => normalizeText(opportunity.query).includes(term) && term.length > 3))
    .slice(0, 5)
    .map(post => ({
      title: post.title,
      slug: post.slug || post.id,
      category: post.category,
    }));

  return JSON.stringify({
    brand: 'URSport',
    site: 'https://shop-ur-sport.vercel.app',
    opportunity,
    relatedProducts,
    relatedBlogs,
    requiredActions: [
      'rewrite_title',
      'rewrite_meta',
      'add_h2',
      'add_faq',
      'internal_link',
      'image_seo',
      'schema',
      'blog_or_landing_page_if_needed',
    ],
  }, null, 2);
};

export const createSeoActionPlan = async (
  opportunity: SeoOpportunity,
  products: Product[],
  blogPosts: BlogPost[],
): Promise<AISeoActionPlan> => generateSeoActionPlan(buildSeoActionPrompt(opportunity, products, blogPosts));
