import { generateSeoContentDraft } from '../lib/gemini';
import type { AISeoActionPlan, AISeoContentDraft } from '../lib/gemini';
import type { SeoOpportunity } from '../types/seo';

export type CurrentSeoContent = {
  slug: string;
  heading?: string;
  seoTitle?: string;
  seoDescription?: string;
  content?: string;
};

export const getSlugFromPageUrl = (page: string) => {
  try {
    const url = new URL(page);
    return url.pathname.replace(/^\/+|\/+$/g, '') || 'homepage';
  } catch {
    return String(page || '').replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, '') || 'homepage';
  }
};

export const buildSeoDraftPrompt = (
  opportunity: SeoOpportunity,
  actionPlan: AISeoActionPlan | undefined,
  current: CurrentSeoContent,
) => JSON.stringify({
  brand: 'URSport',
  workflow: 'AI Suggest -> Admin Review -> Apply',
  page: opportunity.page,
  slug: current.slug,
  query: opportunity.query,
  problem: opportunity.problem,
  actionPlan,
  currentContent: {
    heading: current.heading || '',
    seoTitle: current.seoTitle || '',
    seoDescription: current.seoDescription || '',
    contentHtml: current.content || '',
  },
  outputGoal: 'Create a safer optimized category/landing-page draft for admin review.',
}, null, 2);

export const createSeoContentDraft = async (
  opportunity: SeoOpportunity,
  actionPlan: AISeoActionPlan | undefined,
  current: CurrentSeoContent,
): Promise<AISeoContentDraft> => generateSeoContentDraft(buildSeoDraftPrompt(opportunity, actionPlan, current));
