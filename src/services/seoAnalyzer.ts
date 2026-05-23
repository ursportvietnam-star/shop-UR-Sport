export type GscRowInput = {
  page?: unknown;
  url?: unknown;
  landingPage?: unknown;
  query?: unknown;
  keyword?: unknown;
  keys?: unknown;
  clicks?: unknown;
  impressions?: unknown;
  ctr?: unknown;
  CTR?: unknown;
  position?: unknown;
  avgPosition?: unknown;
  averagePosition?: unknown;
};

export type SeoGscRow = {
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SeoOpportunityType =
  | 'quick_win'
  | 'low_ctr'
  | 'content_gap'
  | 'losing_keyword'
  | 'cannibalization'
  | 'money_keyword'
  | 'monitor';

export type SeoOpportunityPriority = 'critical' | 'high' | 'medium' | 'low';

export type SeoActionType =
  | 'rewrite_title'
  | 'rewrite_meta'
  | 'add_faq'
  | 'expand_content'
  | 'internal_link'
  | 'new_blog'
  | 'merge_pages'
  | 'canonical_fix'
  | 'refresh_content'
  | 'commercial_boost';

export type SeoOpportunity = {
  id: string;
  page: string;
  query: string;
  type: SeoOpportunityType;
  priority: SeoOpportunityPriority;
  problem: string;
  aiAction: string;
  actionType: SeoActionType;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  moneyScore: number;
  impactScore: number;
  status: 'pending';
  reason: string;
  nextSteps: string[];
  competingPages?: string[];
  previous?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  delta?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
};

export type SeoAnalyzerSummary = {
  totalRows: number;
  totalOpportunities: number;
  quickWin: number;
  lowCtr: number;
  contentGap: number;
  losingKeyword: number;
  cannibalization: number;
  moneyKeyword: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type SeoAnalysisResult = {
  opportunities: SeoOpportunity[];
  summary: SeoAnalyzerSummary;
};

const normalizeText = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const slugifyId = (value: string) =>
  normalizeText(value)
    .replace(/\s+/g, '-')
    .slice(0, 90) || 'unknown';

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const rowKey = (row: SeoGscRow) => `${normalizeText(row.page)}::${normalizeText(row.query)}`;

export const normalizeGscRow = (row: GscRowInput): SeoGscRow | null => {
  const keys = Array.isArray(row.keys) ? row.keys.map(item => String(item || '').trim()) : [];
  const page = String(row.page || row.url || row.landingPage || keys.find(key => /^https?:\/\//i.test(key)) || keys[0] || '').trim();
  const query = String(row.query || row.keyword || keys.find(key => !/^https?:\/\//i.test(key)) || keys[1] || '').trim();
  const clicks = Math.max(0, Math.round(toNumber(row.clicks)));
  const impressions = Math.max(0, Math.round(toNumber(row.impressions)));
  const rawCtr = toNumber(row.ctr || row.CTR);
  const ctr = rawCtr > 1 ? rawCtr / 100 : Math.max(0, rawCtr);
  const position = Math.max(0, toNumber(row.position || row.avgPosition || row.averagePosition));

  if (!page && !query) return null;
  return { page, query, clicks, impressions, ctr, position };
};

export const validateGscRows = (value: unknown): SeoGscRow[] => {
  const rows = Array.isArray(value)
    ? value
    : Array.isArray((value as { rows?: unknown })?.rows)
      ? (value as { rows: unknown[] }).rows
      : null;

  if (!rows) {
    throw new Error('GSC JSON phai la array hoac object co field rows.');
  }

  const normalized = rows.map(row => normalizeGscRow(row as GscRowInput));
  const invalidIndex = normalized.findIndex(row => {
    if (!row) return true;
    return !row.page || !row.query || !Number.isFinite(row.impressions) || !Number.isFinite(row.position);
  });

  if (invalidIndex >= 0) {
    throw new Error(`Dong GSC ${invalidIndex + 1} thieu page, query, impressions hoac position.`);
  }

  return normalized as SeoGscRow[];
};

const COMMERCIAL_TERMS = [
  'ao thun',
  'ao gym',
  'ao the thao',
  'ao polo',
  'quick dry',
  'cotton',
  'quan the thao',
  'quan short',
  'do gym',
  'mua',
  'gia',
  'shop',
  'nam',
];

const INFO_TERMS = ['la gi', 'lich su', 'cach giat', 'bao quan', 'phoi do', 'review'];

const getConversionPotential = (query: string) => {
  const text = normalizeText(query);
  const commercialMatches = COMMERCIAL_TERMS.filter(term => text.includes(term)).length;
  const infoPenalty = INFO_TERMS.some(term => text.includes(term)) ? 0.68 : 1;
  return Math.min(3.2, 1 + commercialMatches * 0.42) * infoPenalty;
};

const getMoneyScore = (row: SeoGscRow) => {
  const rankMultiplier = Math.max(0.18, (34 - Math.min(row.position || 34, 34)) / 30);
  const ctrLift = row.ctr < 0.02 ? 1.18 : 1;
  return Math.round(row.impressions * getConversionPotential(row.query) * rankMultiplier * ctrLift);
};

const getPriority = (type: SeoOpportunityType, row: SeoGscRow, moneyScore: number): SeoOpportunityPriority => {
  if (type === 'losing_keyword') return moneyScore >= 250 || row.clicks >= 10 ? 'critical' : 'high';
  if (type === 'cannibalization') return row.impressions >= 300 ? 'high' : 'medium';
  if (type === 'money_keyword') return moneyScore >= 500 ? 'critical' : 'high';
  if (type === 'quick_win' && (row.position <= 10 || moneyScore >= 350)) return 'high';
  if (type === 'low_ctr' && row.impressions >= 500) return 'high';
  if (type === 'content_gap' && moneyScore >= 180) return 'medium';
  return moneyScore >= 180 ? 'medium' : 'low';
};

const createOpportunity = (
  row: SeoGscRow,
  type: SeoOpportunityType,
  problem: string,
  aiAction: string,
  actionType: SeoActionType,
  nextSteps: string[],
  extras: Partial<SeoOpportunity> = {},
): SeoOpportunity => {
  const moneyScore = extras.moneyScore ?? getMoneyScore(row);
  const impactScore = extras.impactScore ?? Math.round(moneyScore * (type === 'money_keyword' ? 1.35 : 1));
  const opportunity: SeoOpportunity = {
    id: `${type}-${slugifyId(row.query)}-${slugifyId(row.page)}`,
    page: row.page,
    query: row.query,
    type,
    priority: extras.priority ?? getPriority(type, row, moneyScore),
    problem,
    aiAction,
    actionType,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    moneyScore,
    impactScore,
    status: 'pending',
    reason: extras.reason || `${row.impressions} impressions, CTR ${(row.ctr * 100).toFixed(1)}%, position ${row.position.toFixed(1)}.`,
    nextSteps,
  };

  if (extras.competingPages?.length) opportunity.competingPages = extras.competingPages;
  if (extras.previous) opportunity.previous = extras.previous;
  if (extras.delta) opportunity.delta = extras.delta;

  return opportunity;
};

const buildSummary = (rows: SeoGscRow[], opportunities: SeoOpportunity[]): SeoAnalyzerSummary => ({
  totalRows: rows.length,
  totalOpportunities: opportunities.length,
  quickWin: opportunities.filter(item => item.type === 'quick_win').length,
  lowCtr: opportunities.filter(item => item.type === 'low_ctr').length,
  contentGap: opportunities.filter(item => item.type === 'content_gap').length,
  losingKeyword: opportunities.filter(item => item.type === 'losing_keyword').length,
  cannibalization: opportunities.filter(item => item.type === 'cannibalization').length,
  moneyKeyword: opportunities.filter(item => item.type === 'money_keyword').length,
  critical: opportunities.filter(item => item.priority === 'critical').length,
  high: opportunities.filter(item => item.priority === 'high').length,
  medium: opportunities.filter(item => item.priority === 'medium').length,
  low: opportunities.filter(item => item.priority === 'low').length,
});

export const analyzeGscRowsDetailed = (
  rows: SeoGscRow[],
  previousRows: SeoGscRow[] = [],
): SeoAnalysisResult => {
  const opportunities: SeoOpportunity[] = [];
  const previousMap = new Map(previousRows.map(row => [rowKey(row), row]));

  rows.forEach(row => {
    const moneyScore = getMoneyScore(row);

    if (row.position >= 4 && row.position <= 15 && row.impressions > 100) {
      opportunities.push(createOpportunity(
        row,
        'quick_win',
        'Keyword dang gan top, chi can toi uu dung diem la co the tang traffic nhanh.',
        'Toi uu title/meta, them answer block, FAQ va internal links ve URL nay.',
        'expand_content',
        [
          'Dua query vao title hoac H1 neu tu nhien.',
          'Them doan tra loi truc tiep 80-120 tu o dau noi dung.',
          'Gan 3 internal links tu blog/category cung intent.',
        ],
        { moneyScore },
      ));
    }

    if (row.impressions > 300 && row.ctr < 0.02) {
      opportunities.push(createOpportunity(
        row,
        'low_ctr',
        'Impressions cao nhung CTR thap, snippet chua hap dan hoac sai intent.',
        'Viet lai SEO title va meta description theo loi ich mua hang.',
        row.ctr < 0.012 ? 'rewrite_title' : 'rewrite_meta',
        [
          'Dat keyword o nua dau title.',
          'Them loi ich ro: thoang mat, co gian, nhanh kho, doi tra.',
          'Kiem tra meta description 120-165 ky tu.',
        ],
        { moneyScore },
      ));
    }

    if (row.position >= 11 && row.position <= 30) {
      opportunities.push(createOpportunity(
        row,
        'content_gap',
        'Keyword nam trang 2-3, noi dung hien tai thieu do sau hoac lien ket noi bo.',
        'Mo rong noi dung theo intent va tao cum internal link.',
        row.position > 20 ? 'new_blog' : 'add_faq',
        [
          'Them section H2 dung intent cua query.',
          'Bo sung FAQ/checklist/bang so sanh neu phu hop.',
          'Neu position > 20, tao blog ho tro va link ve URL chinh.',
        ],
        { moneyScore },
      ));
    }

    if (moneyScore >= 320 && getConversionPotential(row.query) >= 1.7) {
      opportunities.push(createOpportunity(
        row,
        'money_keyword',
        'Keyword co intent mua hang cao, nen uu tien hon keyword thong tin.',
        'Gan CTA, san pham lien quan va thong diep chuyen doi vao landing page.',
        'commercial_boost',
        [
          'Them CTA ve bo suu tap/san pham phu hop.',
          'Noi bat chat lieu, form dang, doi tra va giao hang.',
          'Chen product recommendation theo query.',
        ],
        { moneyScore, impactScore: Math.round(moneyScore * 1.45) },
      ));
    }

    const previous = previousMap.get(rowKey(row));
    if (previous) {
      const delta = {
        clicks: row.clicks - previous.clicks,
        impressions: row.impressions - previous.impressions,
        ctr: row.ctr - previous.ctr,
        position: row.position - previous.position,
      };
      const clicksDropped = previous.clicks >= 5 && delta.clicks <= -Math.max(3, previous.clicks * 0.3);
      const positionDropped = previous.position > 0 && delta.position >= 3;
      const ctrDropped = previous.ctr >= 0.02 && delta.ctr <= -0.01;

      if (clicksDropped || positionDropped || ctrDropped) {
        opportunities.push(createOpportunity(
          row,
          'losing_keyword',
          'Keyword dang giam so voi lan import truoc, can xu ly truoc khi mat them traffic.',
          'Refresh content, kiem tra SERP intent, title/meta va internal links.',
          'refresh_content',
          [
            'So sanh title/meta hien tai voi doi thu dang len hang.',
            'Cap nhat noi dung cu va ngay sua bai neu page la blog/category.',
            'Kiem tra technical: canonical, index, redirect, broken internal links.',
          ],
          {
            moneyScore,
            previous,
            delta,
            reason: `So voi lan truoc: clicks ${delta.clicks}, CTR ${(delta.ctr * 100).toFixed(1)} diem %, position ${delta.position >= 0 ? '+' : ''}${delta.position.toFixed(1)}.`,
          },
        ));
      }
    }
  });

  const byQuery = rows.reduce((map, row) => {
    const key = normalizeText(row.query);
    if (!key) return map;
    const current = map.get(key) || [];
    current.push(row);
    map.set(key, current);
    return map;
  }, new Map<string, SeoGscRow[]>());

  byQuery.forEach(queryRows => {
    const pages = [...new Set(queryRows.map(row => row.page))];
    if (pages.length < 2) return;

    const bestRow = [...queryRows].sort((a, b) => a.position - b.position || b.impressions - a.impressions)[0];
    opportunities.push(createOpportunity(
      bestRow,
      'cannibalization',
      'Nhieu page cung rank mot keyword, de lam loang tin hieu SEO va chia CTR.',
      'Chon URL chinh, merge intent neu trung lap, them canonical/internal link ve URL chinh.',
      'merge_pages',
      [
        'Chon URL co position tot nhat lam page chinh.',
        'Doi anchor/link noi bo de day ve URL chinh.',
        'Merge hoac canonical cac page trung intent.',
      ],
      { competingPages: pages },
    ));
  });

  const unique = new Map<string, SeoOpportunity>();
  opportunities.forEach(item => {
    const existing = unique.get(item.id);
    if (!existing || item.impactScore > existing.impactScore) unique.set(item.id, item);
  });

  const sorted = [...unique.values()].sort((a, b) => {
    const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityScore[b.priority] - priorityScore[a.priority] || b.impactScore - a.impactScore;
  });

  return {
    opportunities: sorted,
    summary: buildSummary(rows, sorted),
  };
};

export const analyzeGscRows = (rows: SeoGscRow[], previousRows: SeoGscRow[] = []) =>
  analyzeGscRowsDetailed(rows, previousRows).opportunities;
