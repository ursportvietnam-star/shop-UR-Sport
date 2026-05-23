export type {
  GscRowInput,
  SeoActionType,
  SeoAnalysisResult,
  SeoAnalyzerSummary,
  SeoGscRow,
  SeoOpportunity,
  SeoOpportunityPriority,
  SeoOpportunityType,
} from '../services/seoAnalyzer';

export type SeoOpportunityStatus = 'pending' | 'approved' | 'applied' | 'rejected';

export type SeoAuditLogAction =
  | 'gsc_import'
  | 'opportunity_created'
  | 'ai_action_generated'
  | 'draft_created'
  | 'draft_applied'
  | 'draft_rejected';
