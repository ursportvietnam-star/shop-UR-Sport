import { analyzeGscRowsDetailed, validateGscRows } from './seoAnalyzer';
import type { SeoAnalysisResult, SeoGscRow } from '../types/seo';

export type GscImportPayload = {
  rows: SeoGscRow[];
  previousRows: SeoGscRow[];
  analysis: SeoAnalysisResult;
};

export const parseGscImport = (rawJson: string, previousRows: SeoGscRow[] = []): GscImportPayload => {
  const parsed = JSON.parse(rawJson);
  const rows = validateGscRows(parsed);
  const analysis = analyzeGscRowsDetailed(rows, previousRows);

  return {
    rows,
    previousRows,
    analysis,
  };
};
