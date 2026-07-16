import type { TwitterCxReportDto } from '../models';

/** Counts shown in UI must match drilldown ID lists exactly. */
export function drilldownIdCount(linked?: number[], reference?: number[]): number {
  const ids = linked?.length ? linked : reference ?? [];
  return normalizeDrilldownIds(ids).length;
}

/** Count shown in UI must match drilldown ID lists; legacy linkedCount is fallback only. */
export function effectiveLinkedCount(
  linkedCount?: number,
  linked?: number[],
  reference?: number[]
): number {
  const idCount = drilldownIdCount(linked, reference);
  if (idCount > 0) return idCount;
  if (typeof linkedCount === 'number' && linkedCount > 0) return linkedCount;
  return 0;
}

export function resolveDrilldownIds(
  linked?: number[],
  reference?: number[],
  fallback?: number[]
): number[] {
  const ids = linked?.length ? linked : reference?.length ? reference : fallback ?? [];
  return normalizeDrilldownIds(ids);
}

export function normalizeDrilldownIds(ids?: number[]): number[] {
  return [...new Set((ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
}

/** Modal footer total must match the count shown on the clickable drilldown control. */
export function drilldownModalTotal(requestedIds: number[]): number {
  return normalizeDrilldownIds(requestedIds).length;
}

export function heatmapSharePct(count: number, stageTotal: number): number {
  if (!count || count <= 0 || !stageTotal || stageTotal <= 0) return 0;
  const pct = (count / stageTotal) * 100;
  if (Math.round(pct) > 0) return Math.round(pct);
  for (const digits of [1, 2, 3]) {
    const fixed = parseFloat(pct.toFixed(digits));
    if (fixed > 0) return fixed;
  }
  return parseFloat(pct.toFixed(3));
}

/**
 * Format a share percentage so small-but-non-zero values never collapse to a flat "0%"
 * (Finding 3). Only a genuine zero count renders "0%"; otherwise precision escalates until a
 * non-zero digit is shown (e.g. 4 of 2163 -> "0.2%").
 */
export function formatCellPct(count: number, stageTotal: number): string {
  const pct = heatmapSharePct(count, stageTotal);
  if (pct <= 0) return '0%';
  if (Number.isInteger(pct)) return `${pct}%`;
  const text = String(pct);
  return `${text.includes('.') ? text.replace(/\.?0+$/, '') : text}%`;
}

export interface HeatmapStageCountInput {
  total?: number;
  positiveCount?: number;
  neutralCount?: number;
  negativeCount?: number;
  positiveFeedbackIds?: number[];
  neutralFeedbackIds?: number[];
  negativeFeedbackIds?: number[];
  feedbackIds?: number[];
  positive?: number;
  neutral?: number;
  negative?: number;
}

/** Align stage totals with positive / neutral / negative counts for heatmap UI. */
export function reconcileHeatmapStageCounts(input: HeatmapStageCountInput): {
  total: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
} {
  const posIds = normalizeDrilldownIds(input.positiveFeedbackIds);
  const neuIds = normalizeDrilldownIds(input.neutralFeedbackIds);
  const negIds = normalizeDrilldownIds(input.negativeFeedbackIds);
  const allIds = normalizeDrilldownIds(input.feedbackIds);

  let pos = posIds.length > 0 ? posIds.length : Math.max(0, Number(input.positiveCount) || 0);
  let neu = neuIds.length > 0 ? neuIds.length : Math.max(0, Number(input.neutralCount) || 0);
  let neg = negIds.length > 0 ? negIds.length : Math.max(0, Number(input.negativeCount) || 0);

  let total = Number(input.total) || 0;
  if (total <= 0) total = allIds.length > 0 ? allIds.length : pos + neu + neg;

  const classified = pos + neu + neg;
  if (total > classified) neu += total - classified;

  if (total > 0 && pos + neu + neg === 0) {
    const pPct = Number(input.positive) || 0;
    const nPct = Number(input.negative) || 0;
    const uPct = Number(input.neutral) || 0;
    if (pPct + nPct + uPct > 0) {
      pos = pPct > 0 ? Math.max(1, Math.round((pPct / 100) * total)) : 0;
      neg = nPct > 0 ? Math.max(1, Math.round((nPct / 100) * total)) : 0;
      neu = Math.max(0, total - pos - neg);
    } else if (allIds.length > 0) {
      neu = allIds.length;
    }
  }

  return { total, positiveCount: pos, neutralCount: neu, negativeCount: neg };
}

/** Count is source of truth — never show stale backend "0%" when count > 0. */
export function resolveHeatmapDisplayPct(
  count: number,
  stageTotal: number,
  backendDisplay?: string | null
): string {
  const computed = formatCellPct(count, stageTotal);
  if (count > 0 && stageTotal > 0) return computed;
  const stored = backendDisplay?.trim();
  return stored || computed;
}

/** Heatmap cell color intensity — always derive from counts when available. */
export function heatmapCellIntensityPct(count: number, stageTotal: number, fallbackPct = 0): number {
  if (count > 0 && stageTotal > 0) return heatmapSharePct(count, stageTotal);
  return fallbackPct;
}

/** Reject legacy label-only action / process-improvement text (Findings 2 & 4). */
export function isStaleGenericActionText(action: string): boolean {
  const t = String(action || '').trim();
  if (!t || t.length < 25) return true;
  if (/^address\b/i.test(t)) return true;
  if (/:\s*—\s*(\(|$)/.test(t)) return true;
  if (/^run a focused sprint on\b/i.test(t)) return true;
  if (/^(resolve|fix|handle|improve|enhance|manage|tackle|deal with|look into|review)\b/i.test(t)) return true;
  const concrete =
    /(implement|introduce|create|deploy|hire|staff|reassign|automate|standardi[sz]e|define an sla|set an sla|escalat|retrain|renegotiat|replace|redesign|audit|schedule|proactively|notify|refund|compensat|root-cause|checklist|policy|playbook|workflow|dashboard|triage|route|monitor|reduce|track|call back|follow up|inspect|test protocol|spare part|inventory|batch isolation|executive sponsor)/i;
  return !concrete.test(t);
}

export function isTemplatedReliabilityAction(action: string): boolean {
  return /run a product-reliability intervention for/i.test(String(action || ''));
}

export function isOwnerFallbackAction(action: string): boolean {
  return /assign a named owner to/i.test(String(action || ''));
}

export function actionTemplateFingerprint(action: string): string {
  return String(action || '')
    .toLowerCase()
    .replace(/\(\d+[^)]*linked[^)]*\)/g, '')
    .replace(/[“"']([^”"']+)[”"']/g, '<<theme>>')
    .replace(/\b\d+\b/g, 'n')
    .replace(/\s+/g, ' ')
    .trim();
}

export function actionsShareTemplate(a: string, b: string): boolean {
  const left = actionTemplateFingerprint(a);
  const right = actionTemplateFingerprint(b);
  if (!left || !right) return false;
  return left === right;
}

/** Coarse template family — catches near-duplicates that only differ by quoted theme. */
export function actionTemplateFamilyKey(action: string): string {
  const t = String(action || '').toLowerCase();
  if (/product-reliability intervention/.test(t)) return 'reliability-intervention';
  if (/assign a named owner/.test(t)) return 'named-owner';
  if (/dedicated remediation workstream/.test(t)) return 'remediation-workstream';
  if (/48-hour repair-closure sla|repair-closure sla/.test(t)) return 'repair-closure-sla';
  if (/brand-trust recovery/.test(t)) return 'brand-trust';
  if (/dedicated support cell/.test(t)) return 'support-cell';
  if (/billing and pricing friction/.test(t)) return 'billing-friction';
  if (/washing-machine field-quality/.test(t)) return 'wm-field-quality';
  if (/tighten delivery operations/.test(t)) return 'delivery-ops';
  if (/audit refrigerator compressor/.test(t)) return 'fridge-reliability';
  if (/coffee-machine pre-shipment/.test(t)) return 'coffee-reliability';
  if (/oven and microwave quality/.test(t)) return 'oven-reliability';
  if (/vacuum-cleaner reliability/.test(t)) return 'vacuum-reliability';
  if (/same-week repair recovery/.test(t)) return 'repair-recovery-lane';
  if (/pre-position critical spare/.test(t)) return 'spare-parts-preposition';
  if (/technician callback discipline/.test(t)) return 'tech-callback';
  if (/priority callback queue/.test(t)) return 'priority-callback';
  if (/defect-containment sprint/.test(t)) return 'defect-containment';
  return actionTemplateFingerprint(action);
}

export function actionsShareTemplateFamily(a: string, b: string): boolean {
  const left = actionTemplateFamilyKey(a);
  const right = actionTemplateFamilyKey(b);
  if (!left || !right) return false;
  return left === right;
}

function mergePositiveIds(...lists: Array<number[] | undefined | null | Array<string | number>>): number[] {
  return [
    ...new Set(
      lists
        .flatMap((list) => list || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
}

export type RootCauseLike = {
  cause?: string;
  interpretation?: string;
  feedbackIds?: number[];
};

export type ActionRowLike = {
  action?: string;
  causeTheme?: string;
  cause?: string;
  interpretation?: string;
  linkedFeedbackIds?: number[];
  referenceFeedbackIds?: number[];
};

/**
 * Pair an action-plan row to its root-cause metadata by causeTheme / feedback-ID overlap,
 * falling back to index only when no better signal exists.
 */
export function resolveActionPlanRootCauseMeta(
  row: ActionRowLike,
  rootCauses: RootCauseLike[],
  index: number
): {
  cause: string;
  interpretation: string;
  feedbackIds: number[];
  matchedBy: 'causeTheme' | 'feedbackIds' | 'index' | 'none';
} {
  const rowIds = mergePositiveIds(row.linkedFeedbackIds, row.referenceFeedbackIds);
  const explicitTheme = String(row.causeTheme || row.cause || '').trim();

  if (explicitTheme && rootCauses.length) {
    const explicitBucket = rootCauseThemeBucket(explicitTheme, row.interpretation, row.action);
    if (explicitBucket) {
      const bucketMatches = rootCauses.filter(
        (rc) => rootCauseThemeBucket(String(rc.cause || ''), String(rc.interpretation || '')) === explicitBucket
      );
      if (bucketMatches.length) {
        const bestInterpretation = bucketMatches
          .map((rc) => String(rc.interpretation || '').trim())
          .sort((a, b) => b.length - a.length)[0] || String(row.interpretation || '').trim();
        return {
          cause:
            explicitBucket === 'brand-perception'
              ? 'Negative Brand Perception & Customer Dissatisfaction'
              : String(bucketMatches[0].cause || explicitTheme).trim(),
          interpretation: bestInterpretation,
          feedbackIds: mergePositiveIds(
            rowIds,
            ...bucketMatches.map((rc) => rc.feedbackIds)
          ),
          matchedBy: 'causeTheme',
        };
      }
    }
    const byTheme = rootCauses.find(
      (rc) => String(rc.cause || '').trim().toLocaleLowerCase() === explicitTheme.toLocaleLowerCase()
    );
    if (byTheme) {
      return {
        cause: String(byTheme.cause || explicitTheme).trim(),
        interpretation: String(byTheme.interpretation || row.interpretation || '').trim(),
        feedbackIds: mergePositiveIds(byTheme.feedbackIds, rowIds),
        matchedBy: 'causeTheme',
      };
    }
  }

  if (rowIds.length && rootCauses.length) {
    const rowSet = new Set(rowIds);
    let bestIdx = -1;
    let bestOverlap = 0;
    rootCauses.forEach((rc, i) => {
      const ids = (rc.feedbackIds || []).filter((id) => Number.isFinite(id) && id > 0);
      const overlap = ids.reduce((n, id) => n + (rowSet.has(Number(id)) ? 1 : 0), 0);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && bestOverlap > 0) {
      const rc = rootCauses[bestIdx];
      return {
        cause: String(rc.cause || explicitTheme || '').trim(),
        interpretation: String(rc.interpretation || row.interpretation || '').trim(),
        feedbackIds: mergePositiveIds(rc.feedbackIds, rowIds),
        matchedBy: 'feedbackIds',
      };
    }
  }

  const indexed = rootCauses[index];
  if (indexed) {
    return {
      cause: explicitTheme || String(indexed.cause || '').trim(),
      interpretation: String(indexed.interpretation || row.interpretation || '').trim(),
      feedbackIds: mergePositiveIds(indexed.feedbackIds, rowIds),
      matchedBy: 'index',
    };
  }

  return {
    cause: explicitTheme || extractQuotedTheme(String(row.action || '')),
    interpretation: String(row.interpretation || '').trim(),
    feedbackIds: rowIds,
    matchedBy: 'none',
  };
}

export function alignActionTextToCauseTheme(action: string, causeTheme: string): string {
  if (!action || !causeTheme) return action;
  const quoted = extractQuotedTheme(action);
  if (!quoted || quoted === causeTheme) return action;
  const weak =
    /^(product|ürün|urun|this theme)$/i.test(quoted) ||
    (quoted.length <= 8 && causeTheme.length > quoted.length + 4);
  if (!weak) return action;
  return action.replace(
    new RegExp(`[“"']${quoted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[”"']`, 'i'),
    `"${causeTheme}"`
  );
}

function actionPlanCollapseKey(cause: string, interpretation?: string, action?: string): string {
  const bucket = rootCauseThemeBucket(cause, interpretation, action);
  if (bucket) return bucket;
  const family = actionTemplateFamilyKey(String(action || ''));
  const fingerprint = actionTemplateFingerprint(String(action || ''));
  if (family && family !== fingerprint) return `action-family:${family}`;
  const lower = String(cause || '').toLowerCase();
  if (/negative brand|brand perception|customer dissatisfaction/.test(lower)) return 'brand-perception';
  if (/customer support|support gap|unresponsive.*(service|support)|unresponsive customer/i.test(lower)) {
    return 'action-family:priority-callback';
  }
  if (/reliability|product defect|after long use|compressor|door-seal/i.test(lower)) {
    if (/refrigerator|fridge|buzdolab/i.test(`${cause} ${interpretation || ''}`)) {
      return 'action-family:fridge-reliability';
    }
  }
  return lower.replace(/\s+/g, ' ').trim();
}

function distinctReliabilityAction(theme: string, family: string | null, detail: string, attempt: number): string {
  const base = clusterSpecificActionText(theme, detail);
  if (attempt === 0) return base;
  const focus = family || theme;
  const variants = [
    `Launch a failure-mode containment review for "${focus}": rank repeat defects by SKU and serial range, quarantine the highest-risk lots, and verify corrective actions with return-unit teardown evidence.`,
    `Establish a return-unit root-cause lab for "${focus}": sample early-life failures weekly, trace each defect to supplier or assembly stage, and close the loop with documented production-line countermeasures.`,
    `Deploy an early-life defect prevention program for "${focus}": flag units failing within 90 days, tighten end-of-line stress tests, and authorize rapid exchange for recurring failure codes.`,
    `Create a serial-range quality gate for "${focus}": correlate complaints with production lots, hold suspect inventory before shipment, and release batches only after repeat-failure validation passes.`,
  ];
  return variants[(attempt - 1) % variants.length];
}

function distinctKindAction(
  kind: string,
  theme: string,
  family: string | null,
  interpretation: string | undefined,
  attempt: number
): string {
  const detail = String(interpretation || '').replace(/\s+/g, ' ').trim();
  if (kind === 'reliability') {
    return distinctReliabilityAction(theme, family, detail, attempt);
  }
  if (kind === 'service') {
    const focus = family ? `${family} service` : theme;
    const variants = [
      `Introduce a 48-hour repair-closure SLA for "${focus}": pre-position spare parts for top failure codes, require technician callback within 24h on reopened tickets, and publish weekly resolution-rate dashboards to service leadership.`,
      `Stand up a same-week repair recovery lane for "${theme}": triage reopened tickets daily, reserve technician capacity for top failure codes, and escalate any job open longer than 48 hours to a named service lead.`,
      `Pre-position critical spare parts for "${theme}": lock stock for the top 5 failure codes, auto-dispatch parts with first visit, and track first-time-fix rate until it exceeds 85%.`,
      `Enforce technician callback discipline for "${theme}": require a customer update within 24h on every reopened ticket and review missed callbacks in the weekly service huddle.`,
    ];
    return variants[attempt % variants.length];
  }
  if (kind === 'support') {
    const variants = [
      `Stand up a dedicated support cell for "${theme}": cap queue wait times, enforce first-contact resolution scripts, and track repeat-contact rate until it drops below 15%.`,
      `Create a priority callback queue for "${theme}": answer escalations within 4 hours, publish a weekly reopen report, and coach agents on the top 3 unresolved complaint patterns.`,
      `Deploy an escalation playbook for "${theme}": route repeat contacts to a senior pod, measure first-contact resolution daily, and close the week with a coaching review on reopen drivers.`,
    ];
    return variants[attempt % variants.length];
  }
  if (kind === 'billing') {
    const variants = [
      `Audit disputed charges for "${theme}": reconcile every case against published price lists, authorize frontline refunds up to a defined threshold, and retrain stores on consistent discount communication.`,
      `Publish a clear price-promise checklist for "${theme}": reconcile POS vs advertised offers weekly, empower stores to correct mismatches on the spot, and log every dispute reason for merchandising review.`,
      `Tighten refund authorization for "${theme}": set a documented threshold for frontline goodwill credits, escalate above-threshold cases in 24h, and audit the top dispute codes monthly.`,
    ];
    return variants[attempt % variants.length];
  }
  if (kind === 'delivery') {
    const variants = [
      `Tighten delivery operations for "${theme}": audit carrier SLAs end-to-end, send proactive delay notifications, and offer compensation when promised delivery windows are missed.`,
      `Install a delivery-exception war room for "${theme}": monitor late shipments hourly, notify customers before the promised window slips, and auto-trigger goodwill credits for missed slots.`,
    ];
    return variants[attempt % variants.length];
  }
  const base = clusterSpecificActionText(theme, interpretation);
  return `${base.replace(/\.\s*$/, '')} — prioritize the dominant complaint pattern in "${theme}".`;
}

function inferClusterActionKind(cause: string, interpretation?: string, sampleText?: string): string {
  const blob = `${cause} ${interpretation || ''} ${sampleText || ''}`.toLowerCase();
  if (/negative brand|brand perception|customer dissatisfaction|marka alg/i.test(blob)) return 'brand-perception';
  if (/unfair charge|billing|pricing|ücret|ucret|fiyat|invoice|refund|overcharg|\bcharge/i.test(blob)) return 'billing';
  if (/customer support|support gap|destek|call center|müşteri hizmet|musteri hizmet|iletisim/i.test(blob)) return 'support';
  if (/service resolution|resolution gap|repair delay|warranty resolution|garanti.*(gecik|redd)|tamir.*(gecik|süre|sure)/i.test(blob)) return 'service';
  if (/delivery|teslimat|logistics|kargo|shipment|shipping/i.test(blob)) return 'delivery';
  return 'reliability';
}

function detectProductFamilyHint(text: string): string | null {
  const blob = String(text || '');
  if (/refrigerator|fridge|buzdolab/i.test(blob)) return 'refrigerator';
  if (/washing|çamaşır|camasir/i.test(blob)) return 'washing machine';
  if (/coffee|kahve/i.test(blob)) return 'coffee machine';
  if (/microwave|oven|fırın|firin|mikrodalga/i.test(blob)) return 'oven';
  if (/vacuum|süpürge|supurge/i.test(blob)) return 'vacuum cleaner';
  return null;
}

export function repairWeakClusterCauseTitle(cause: string, interpretation?: string, actionHint?: string): string {
  let title = String(cause || '').trim();
  if (!title && actionHint) {
    title = extractQuotedTheme(actionHint);
  }
  const generic = /^(product|ürün|urun|service|servis|customer|müşteri|musteri|issue|complaint|şikayet|sikayet|problem|quality|kalite|support|destek)$/i;
  if (!generic.test(title)) return title;
  const combined = `${interpretation || ''} ${actionHint || ''}`.trim();
  if (/brand perception|customer dissatisfaction|marka alg|negative brand|hayal kırık|pişman|pisman|never buy|regret/i.test(combined)) {
    return 'Negative Brand Perception & Customer Dissatisfaction';
  }
  if (/unfair charge|billing|pricing|ücret|ucret|fiyat|invoice|refund|overcharg|\bcharge\b/i.test(combined)) {
    return 'Unfair Charges Complaints';
  }
  if (/(garanti|warranty).*(redd|delay|gecik|ücret|ucret|dispute)|warranty claim/i.test(combined)) {
    return 'Warranty Claim Problems';
  }
  if (/(servis|service|tamir|repair|destek|support|çağrı|cagri|call center|yanıt yok|cevap yok)/i.test(combined)) {
    return 'Customer Service Delays';
  }
  const family = detectProductFamilyHint(combined);
  if (family) {
    if (/arıza|ariza|bozuk|defect|broken|faulty|failure/i.test(combined) && family === 'refrigerator') {
      return 'Refrigerator Defects';
    }
    return `${family.charAt(0).toUpperCase()}${family.slice(1)} Reliability Issues`;
  }
  if (/arıza|ariza|bozuk|defect|broken|faulty|failure|reliability/i.test(combined)) {
    return 'Product Reliability Issues';
  }
  return 'Recurring Customer Experience Issue';
}

export function rootCauseThemeBucket(title: string, interpretation?: string, action?: string): string | null {
  const blob = `${title} ${interpretation || ''} ${action || ''}`.toLowerCase();
  if (
    /negative brand|brand perception|customer dissatisfaction|marka alg|brand-trust recovery|hayal kırık|hayal kirik|tavsiye etmem|pişman|pisman|kalite.?fiyat|quality.?price|fiyat.?performans|değmez|degmez|never buy|regret|worst brand/i.test(
      blob
    )
  ) {
    return 'brand-perception';
  }
  if (/^(product|ürün|urun)$/i.test(title.trim().toLowerCase())) return 'product-reliability';
  if (/unfair charge|billing|pricing|ücret|ucret|fiyat|invoice|refund|overcharg|\bcharge\b/i.test(blob)) return 'billing';
  return null;
}

export function priorityLabelFromClusterSize(count: number): 'P1' | 'P2' | 'P3' {
  if (count >= 15) return 'P1';
  if (count >= 5) return 'P2';
  return 'P3';
}

export function fallbackClusterActionText(cause: string, interpretation?: string): string {
  const theme = String(cause || 'this theme').trim();
  const detail = (interpretation || '').replace(/\s+/g, ' ').trim();
  const focus =
    detail && detail !== '—' && detail.length >= 12
      ? detail.slice(0, 140)
      : `the dominant complaint pattern in "${theme}"`;
  return `Stand up a dedicated remediation workstream for "${theme}": diagnose ${focus}, set a measurable weekly closure target for that exact pattern, and escalate unresolved cases after 7 days.`;
}

/** Tailored next-step text per cluster theme — never a bare "Address …" label (Finding 2). */
export function clusterSpecificActionText(cause: string, interpretation?: string, sampleText?: string): string {
  const theme = String(cause || 'this theme').trim();
  const detail = (interpretation || '').replace(/\s+/g, ' ').trim();
  const blob = `${theme} ${detail} ${sampleText || ''}`.toLowerCase();
  const family = detectProductFamilyHint(blob);

  if (/brand perception|customer dissatisfaction|marka alg|negative brand/i.test(blob)) {
    return `Launch a brand-trust recovery program for "${theme}": publish a transparent response playbook for recurring dissatisfaction themes, assign an executive sponsor, and track sentiment recovery on matched complaints monthly.`;
  }
  if (/unfair charge|billing|pricing|ücret|ucret|fiyat|invoice|refund|overcharg/i.test(blob)) {
    return `Audit disputed charges for "${theme}": reconcile every case against published price lists, authorize frontline refunds up to a defined threshold, and retrain stores on consistent discount communication.`;
  }
  if (/customer support|support gap|destek|call center|müşteri hizmet|musteri hizmet|iletisim/.test(blob)) {
    return `Stand up a dedicated support cell for "${theme}": cap queue wait times, enforce first-contact resolution scripts, and track repeat-contact rate until it drops below 15%.`;
  }
  if (/service resolution|resolution gap|repair delay|warranty resolution|garanti.*(gecik|redd)|tamir.*(gecik|süre|sure)/.test(blob)) {
    const focus = family ? `${family} service` : theme;
    return `Introduce a 48-hour repair-closure SLA for "${focus}": pre-position spare parts for top failure codes, require technician callback within 24h on reopened tickets, and publish weekly resolution-rate dashboards to service leadership.`;
  }
  if (/delivery|teslimat|logistics|kargo|shipment|shipping/.test(blob)) {
    return `Tighten delivery operations for "${theme}": audit carrier SLAs end-to-end, send proactive delay notifications, and offer compensation when promised delivery windows are missed.`;
  }
  if (/refrigerator|fridge|buzdolab/i.test(blob) || family === 'refrigerator') {
    return `Audit refrigerator compressor and door-seal failure codes for "${theme}": quarantine repeat-return batches, complete cold-chain performance tests on returned units, and proactively replace units with recurring thermostat faults.`;
  }
  if (/washing|çamaşır|camasir/i.test(blob) || family === 'washing machine') {
    return `Launch a washing-machine field-quality review for "${theme}": inspect drum-bearing and motor batches tied to repeat failures, publish a targeted service bulletin, and offer no-cost inspections for affected serial ranges.`;
  }
  if (/coffee|kahve/i.test(blob) || family === 'coffee machine') {
    return `Tighten coffee-machine pre-shipment QC for "${theme}": add brew-pressure and leak tests on the affected production line, recall inspection for returned units, and replace machines that fail repeat heat-cycle checks.`;
  }
  if (/microwave|oven|fırın|firin|mikrodalga/i.test(blob) || family === 'oven') {
    return `Contain oven and microwave quality escapes for "${theme}": isolate affected production lots, run thermal-cycle validation on returns, and authorize immediate swap for units with repeat control-panel or heating failures.`;
  }
  if (/vacuum|süpürge|supurge/i.test(blob) || family === 'vacuum cleaner') {
    return `Contain vacuum-cleaner reliability complaints in "${theme}": sample returned motors and filters for premature wear, tighten supplier incoming QC, and publish a rapid-exchange policy for repeat suction-motor failures.`;
  }
  if (/reliability|defect|quality|arıza|ariza|bozuk|failure|breakdown|unresolved/i.test(blob)) {
    const productHint = theme.replace(/\b(issue|concern|gap|reliability|defects?|problems?)\b/gi, '').trim();
    const focus = productHint.length >= 4 ? productHint : theme;
    return `Establish a defect-containment sprint for "${theme}": rank repeat failures involving ${focus}, quarantine the highest-risk production lots, and close each mode with documented hardware countermeasures and customer replacement criteria.`;
  }

  return fallbackClusterActionText(theme, interpretation);
}

export function ensureDistinctClusterActions(
  items: Array<{ cause: string; interpretation?: string; action: string; sampleText?: string }>
): void {
  const used = new Set<string>();
  const usedFamilies = new Set<string>();
  for (const item of items) {
    const fresh = clusterSpecificActionText(item.cause, item.interpretation, item.sampleText);
    let action = item.action.trim();
    if (
      !action ||
      isStaleGenericActionText(action) ||
      isTemplatedReliabilityAction(action) ||
      isOwnerFallbackAction(action) ||
      actionsShareTemplate(action, fresh) ||
      actionsShareTemplateFamily(action, fresh)
    ) {
      action = fresh;
    }
    const family = detectProductFamilyHint(`${item.cause} ${item.interpretation || ''} ${item.sampleText || ''}`);
    const kind = inferClusterActionKind(item.cause, item.interpretation, item.sampleText);
    let attempt = 0;
    while (
      (used.has(actionTemplateFingerprint(action)) || usedFamilies.has(actionTemplateFamilyKey(action))) &&
      attempt < 12
    ) {
      action = distinctKindAction(kind, item.cause, family, item.interpretation || item.sampleText, attempt + 1);
      if (used.has(actionTemplateFingerprint(action)) || usedFamilies.has(actionTemplateFamilyKey(action))) {
        action = `${action.replace(/\.\s*$/, '')} — prioritize the dominant complaint pattern in "${item.cause}".`;
      }
      attempt += 1;
    }
    used.add(actionTemplateFingerprint(action));
    usedFamilies.add(actionTemplateFamilyKey(action));
    item.action = action;
  }
}

export function collapseActionPlanRows<T extends {
  priority: string;
  action: string;
  impact?: string;
  linkedFeedbackIds?: number[];
  referenceFeedbackIds?: number[];
  linkedCount?: number;
  causeTheme?: string;
  cause?: string;
}>(rows: T[], causes: string[], interpretations: string[] = []): T[] {
  const merged: T[] = [];
  const indexByKey = new Map<string, number>();
  rows.forEach((row, i) => {
    const cause = String(causes[i] || '').trim();
    const interpretation = String(interpretations[i] || '').trim();
    const key = actionPlanCollapseKey(cause, interpretation, String(row.action || ''));
    const existingIdx = indexByKey.get(key);
    if (existingIdx === undefined) {
      indexByKey.set(key, merged.length);
      const count = normalizeDrilldownIds([
        ...(row.linkedFeedbackIds || []),
        ...(row.referenceFeedbackIds || []),
      ]).length || row.linkedCount || 0;
      merged.push({
        ...row,
        linkedCount: count || row.linkedCount,
        impact: count > 0 ? `${count} customer feedback row(s) clustered in this theme` : row.impact,
      });
      return;
    }
    const existing = merged[existingIdx];
    const ids = [
      ...new Set(
        [...(existing.linkedFeedbackIds || existing.referenceFeedbackIds || []), ...(row.linkedFeedbackIds || row.referenceFeedbackIds || [])].filter(
          (id) => Number.isFinite(id) && id > 0
        )
      ),
    ];
    const count = ids.length || Math.max(existing.linkedCount || 0, row.linkedCount || 0);
    const actionCore = String(existing.action || '').replace(/\(\d+ linked feedback row\(s\)\)/i, '').trim();
    const mergedRow = {
      ...existing,
      priority: priorityLabelFromClusterSize(count),
      linkedFeedbackIds: ids.length ? ids : existing.linkedFeedbackIds,
      referenceFeedbackIds: ids.length ? ids : existing.referenceFeedbackIds,
      linkedCount: count,
      action: count > 0 ? `${actionCore} (${count} linked feedback row(s))` : actionCore,
      impact: `${count} customer feedback row(s) clustered in this theme`,
    } as T & { causeTheme?: string };
    if (key === 'brand-perception' && 'causeTheme' in mergedRow) {
      mergedRow.causeTheme = 'Negative Brand Perception & Customer Dissatisfaction';
    }
    merged[existingIdx] = mergedRow;
  });

  const byFamily: T[] = [];
  const familyIndex = new Map<string, number>();
  for (const row of merged) {
    const family = actionTemplateFamilyKey(String(row.action || ''));
    const fingerprint = actionTemplateFingerprint(String(row.action || ''));
    const familyKey = family && family !== fingerprint ? `action-family:${family}` : fingerprint;
    const existingIdx = familyIndex.get(familyKey);
    if (existingIdx === undefined) {
      familyIndex.set(familyKey, byFamily.length);
      byFamily.push(row);
      continue;
    }
    const existing = byFamily[existingIdx];
    const ids = normalizeDrilldownIds([
      ...(existing.linkedFeedbackIds || []),
      ...(existing.referenceFeedbackIds || []),
      ...(row.linkedFeedbackIds || []),
      ...(row.referenceFeedbackIds || []),
    ]);
    const count = ids.length || Math.max(existing.linkedCount || 0, row.linkedCount || 0);
    const actionCore = String(existing.action || '').replace(/\(\d+ linked feedback row\(s\)\)/i, '').trim();
    const cause = String(row.causeTheme || row.cause || '');
    byFamily[existingIdx] = {
      ...existing,
      priority: priorityLabelFromClusterSize(count),
      linkedFeedbackIds: ids.length ? ids : existing.linkedFeedbackIds,
      referenceFeedbackIds: ids.length ? ids : existing.referenceFeedbackIds,
      linkedCount: count,
      action: count > 0 ? `${actionCore} (${count} linked feedback row(s))` : actionCore,
      impact: `${count} customer feedback row(s) clustered in this theme`,
      ...(cause && count >= (existing.linkedCount || 0) ? { causeTheme: cause, cause } : {}),
    } as T;
  }
  return byFamily;
}

export type FinalizableActionPlanRow = {
  priority: string;
  action: string;
  owner?: string;
  impact?: string;
  horizon?: string;
  causeTheme?: string;
  cause?: string;
  interpretation?: string;
  sampleText?: string;
  referenceFeedbackIds?: number[];
  linkedFeedbackIds?: number[];
  linkedCount?: number;
};

/** Repair titles, dedupe action templates, and collapse duplicate themes for display. */
export function finalizeActionPlanRows<T extends FinalizableActionPlanRow>(drafts: T[]): T[] {
  const prepared = drafts.map((draft) => {
    const causeTheme = repairWeakClusterCauseTitle(
      String(draft.causeTheme || draft.cause || extractQuotedTheme(draft.action) || '').trim(),
      draft.interpretation,
      draft.action
    );
    let action = repairStaleActionText(
      String(draft.action || '')
        .replace(/\(\d+ linked feedback row\(s\)\)/i, '')
        .replace(/\(\d+ negative-linked row\(s\)\)/i, '')
        .trim(),
      causeTheme,
      draft.interpretation,
      draft.sampleText || draft.interpretation
    );
    action = alignActionTextToCauseTheme(action, causeTheme);
    const idCount = normalizeDrilldownIds(
      draft.linkedFeedbackIds?.length ? draft.linkedFeedbackIds : draft.referenceFeedbackIds
    ).length;
    // Prefer real ID lists over a phantom linkedCount (Process Improvement 194-of-0 bug).
    const linkedCount = idCount > 0 ? idCount : 0;
    return {
      ...draft,
      causeTheme,
      cause: causeTheme,
      action,
      linkedCount,
      priority: priorityLabelFromClusterSize(linkedCount),
    };
  });

  const repairItems = prepared.map((d) => ({
    cause: d.causeTheme || d.cause || 'this theme',
    interpretation: d.interpretation,
    action: d.action,
    sampleText: d.sampleText || d.interpretation,
  }));
  ensureDistinctClusterActions(repairItems);
  repairItems.forEach((item, i) => {
    prepared[i].action = alignActionTextToCauseTheme(item.action, prepared[i].causeTheme || prepared[i].cause || '');
  });

  return collapseActionPlanRows(
    prepared,
    prepared.map((d) => d.causeTheme || d.cause || ''),
    prepared.map((d) => d.interpretation || '')
  ).map((row) => {
    const theme = (row as FinalizableActionPlanRow).causeTheme || (row as FinalizableActionPlanRow).cause || '';
    const count =
      normalizeDrilldownIds([
        ...(row.linkedFeedbackIds || []),
        ...(row.referenceFeedbackIds || []),
      ]).length || row.linkedCount || 0;
    const core = String(row.action || '').replace(/\(\d+ linked feedback row\(s\)\)/i, '').trim();
    const aligned = sanitizeTurkishFocusInActionText(alignActionTextToCauseTheme(core, theme));
    return {
      ...row,
      causeTheme:
        actionPlanCollapseKey(theme, (row as FinalizableActionPlanRow).interpretation, aligned) === 'brand-perception'
          ? 'Negative Brand Perception & Customer Dissatisfaction'
          : theme,
      linkedCount: count,
      priority: priorityLabelFromClusterSize(count),
      impact: count > 0 ? `${count} customer feedback row(s) clustered in this theme` : row.impact,
      action: count > 0 ? `${aligned} (${count} linked feedback row(s))` : aligned,
    };
  });
}

/** Same dedupe/collapse pipeline as action plans, with process-improvement count suffix. */
export function finalizeProcessImprovementRows<T extends FinalizableActionPlanRow>(
  drafts: T[]
): Array<T & { text: string; causeTheme?: string }> {
  return finalizeActionPlanRows(drafts).map((row) => {
    const count = row.linkedCount || row.linkedFeedbackIds?.length || row.referenceFeedbackIds?.length || 0;
    const core = String(row.action || '').replace(/\(\d+ linked feedback row\(s\)\)/i, '').trim();
    const text = count > 0 ? `${core} (${count} negative-linked row(s))` : core;
    return {
      ...row,
      text,
      causeTheme: (row as FinalizableActionPlanRow).causeTheme || row.cause,
    };
  });
}

function normalizeThemeKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9ğüşıöç\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Resolve root-cause feedback IDs for a process-improvement row (quoted labels often differ from cluster titles). */
export function resolveRootCauseIdsForProcessItem(
  rootCauses: Array<{ cause?: string; interpretation?: string; feedbackIds?: number[] }>,
  opts: {
    causeTheme?: string;
    quotedTheme?: string;
    index: number;
    itemIds?: number[];
  }
): number[] {
  const itemIds = normalizeDrilldownIds(opts.itemIds);
  const cause = String(opts.causeTheme || '').trim();
  const quoted = String(opts.quotedTheme || '').trim();
  const bucket = rootCauseThemeBucket(cause, '', quoted) || rootCauseThemeBucket(quoted, '', '');

  // Always union brand-perception root-cause IDs — process items often keep a stale/partial list
  // while the UI count (194) comes from collapsed theme membership.
  if (bucket === 'brand-perception') {
    const merged: number[] = [...itemIds];
    for (const rc of rootCauses) {
      if (rootCauseThemeBucket(String(rc.cause || ''), String(rc.interpretation || '')) === 'brand-perception') {
        merged.push(...(rc.feedbackIds || []));
      }
    }
    const brandIds = normalizeDrilldownIds(merged);
    if (brandIds.length) return brandIds;
  }

  if (itemIds.length) return itemIds;

  if (bucket) {
    const match = rootCauses.find(
      (rc) => rootCauseThemeBucket(String(rc.cause || ''), String(rc.interpretation || '')) === bucket
    );
    const bucketIds = normalizeDrilldownIds(match?.feedbackIds);
    if (bucketIds.length) return bucketIds;
  }

  const keys = [normalizeThemeKey(cause), normalizeThemeKey(quoted)].filter(Boolean);
  for (const rc of rootCauses) {
    const rcKey = normalizeThemeKey(String(rc.cause || ''));
    if (keys.some((key) => key && (rcKey === key || rcKey.includes(key) || key.includes(rcKey)))) {
      const ids = normalizeDrilldownIds(rc.feedbackIds);
      if (ids.length) return ids;
    }
  }

  return normalizeDrilldownIds(rootCauses[opts.index]?.feedbackIds);
}

/** Merge thematically duplicate root causes (esp. brand perception split across P1/P2). */
export function mergeRootCausesForDisplay(
  rootCauses: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const merged: Array<Record<string, unknown>> = [];
  const indexByBucket = new Map<string, number>();

  const titleTokens = (title: string): Set<string> =>
    new Set(
      String(title || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  const titlesSimilar = (a: string, b: string): boolean => {
    const left = String(a || '').toLocaleLowerCase('tr-TR').trim();
    const right = String(b || '').toLocaleLowerCase('tr-TR').trim();
    if (!left || !right) return false;
    if (left === right) return true;
    if (left.length >= 12 && right.length >= 12 && (left.includes(right) || right.includes(left))) return true;
    const ta = titleTokens(left);
    const tb = titleTokens(right);
    if (!ta.size || !tb.size) return false;
    let overlap = 0;
    for (const w of ta) if (tb.has(w)) overlap += 1;
    return overlap / Math.max(ta.size, tb.size) >= 0.72;
  };

  for (const rc of rootCauses) {
    const interpretation = String(rc['interpretation'] || '').trim();
    const cause = repairWeakClusterCauseTitle(String(rc['cause'] || '').trim(), interpretation, '');
    const feedbackIds = mergePositiveIds(
      Array.isArray(rc['feedbackIds']) ? (rc['feedbackIds'] as number[]) : undefined
    );
    const bucket = rootCauseThemeBucket(cause, interpretation) || '';

    let existingIdx = bucket ? indexByBucket.get(bucket) : undefined;
    if (existingIdx === undefined) {
      existingIdx = merged.findIndex((row) => titlesSimilar(String(row['cause'] || ''), cause));
    }

    if (existingIdx === undefined || existingIdx < 0) {
      const key = bucket || cause.toLocaleLowerCase();
      indexByBucket.set(key, merged.length);
      merged.push({
        ...rc,
        cause: bucket === 'brand-perception' ? 'Negative Brand Perception & Customer Dissatisfaction' : cause,
        interpretation,
        feedbackIds,
        count: feedbackIds.length || Number(rc['count']) || 0,
      });
      continue;
    }

    const existing = merged[existingIdx];
    const ids = mergePositiveIds(
      Array.isArray(existing['feedbackIds']) ? (existing['feedbackIds'] as number[]) : undefined,
      feedbackIds
    );
    const existingInterp = String(existing['interpretation'] || '').trim();
    const existingCause = String(existing['cause'] || cause);
    merged[existingIdx] = {
      ...existing,
      cause:
        bucket === 'brand-perception'
          ? 'Negative Brand Perception & Customer Dissatisfaction'
          : existingCause.length >= cause.length
            ? existingCause
            : cause,
      interpretation: existingInterp.length >= interpretation.length ? existingInterp : interpretation,
      feedbackIds: ids,
      count: ids.length,
    };
  }

  return merged;
}

/** Repair legacy snapshot rows in the UI without requiring a full CX rebuild. */
export function repairStaleActionText(
  action: string,
  causeHint?: string,
  interpretationHint?: string,
  sampleText?: string
): string {
  const theme = (causeHint || extractQuotedTheme(action) || 'this theme').trim();
  const fresh = clusterSpecificActionText(theme, interpretationHint, sampleText);
  if (
    isStaleGenericActionText(action) ||
    isTemplatedReliabilityAction(action) ||
    isOwnerFallbackAction(action) ||
    hasTurkishLeakInActionText(action) ||
    actionsShareTemplate(action, fresh)
  ) {
    return sanitizeTurkishFocusInActionText(fresh);
  }
  return sanitizeTurkishFocusInActionText(alignActionTextToCauseTheme(action, theme));
}

/** Detect Turkish sample keywords leaked into English action templates (client QA). */
export function hasTurkishLeakInActionText(action: string): boolean {
  return /[ğüşıöçĞÜŞİÖÇ]/.test(String(action || '')) || /\b(ürünü|urunu|arızalı|arizali|ürün|urun)\b/i.test(String(action || ''));
}

/** Replace leaked Turkish focus phrases with English operational terms. */
export function sanitizeTurkishFocusInActionText(action: string): string {
  let text = String(action || '');
  if (!text) return text;
  const replacements: Array<[RegExp, string]> = [
    [/\bürünü\/arızalı\b/gi, 'defect/product'],
    [/\burunu\/arizali\b/gi, 'defect/product'],
    [/\bürünü\b/gi, 'product'],
    [/\burunu\b/gi, 'product'],
    [/\barızalı\b/gi, 'defect'],
    [/\barizali\b/gi, 'defect'],
    [/\bürün\b/gi, 'product'],
    [/\burun\b/gi, 'product'],
    [/\bservis\b/gi, 'service'],
    [/\bgaranti\b/gi, 'warranty'],
  ];
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export function extractQuotedTheme(text: string): string {
  const m = text.match(/[“"']([^”"']+)[”"']/);
  return m?.[1]?.trim() || 'this theme';
}

/** Pull journey theme label from satisfaction/dissatisfaction summary text. */
export function extractJourneyThemeFromSummary(text: string): string | null {
  const raw = String(text || '').trim().replace(/\)+$/g, '');
  if (!raw || raw === '—' || raw === '-') return null;
  const withoutCount = raw
    .replace(/\s*\(\d+[^)]*linked[^)]*\)\.?\s*/gi, '')
    .replace(/\s*\(\d+[^)]*\)\.?\s*$/g, '')
    .replace(/\)+$/g, '')
    .trim();
  return withoutCount.length >= 3 ? withoutCount : null;
}

/**
 * Preserve the backend-generated, cluster-specific recommendation and only align the linked-row
 * count (Finding 4). Previously this replaced every recommendation with an identical
 * "Run a focused sprint on ..." template, which is what made all clusters read the same.
 */
export function formatProcessImprovementText(
  text: string,
  count: number,
  causeHint?: string,
  interpretationHint?: string
): string {
  const stripped = String(text || '')
    .replace(/\(\d+ negative-linked row\(s\)\)/gi, '')
    .replace(/\(\d+ linked feedback row\(s\)\)/gi, '')
    .trim();
  const repaired = repairStaleActionText(stripped, causeHint, interpretationHint);
  return alignLinkedCountInText(repaired, count, 'negative-linked row(s)');
}

export function alignLinkedCountInText(text: string, count: number, label = 'linked feedback row(s)'): string {
  if (!text) return '';
  if (count <= 0) return text.replace(/\(\d+[^)]*$/, '').replace(/\(\d+[^)]*\)/, '').trim();
  // Repair truncated suffixes like "(118 linked feedback row(s" missing the closing ")".
  let stripped = String(text)
    .replace(/\(\d+\s*(?:negative-)?linked(?:\s+feedback)?\s+row\(s\)?\s*$/i, '')
    .replace(/\)+$/g, '')
    .trim();
  const replaced = stripped
    .replace(/\(\d+ negative-linked row\(s\)\)/g, `(${count} ${label})`)
    .replace(/\(\d+ linked row\(s\)\)/g, `(${count} ${label})`)
    .replace(/\(\d+ linked feedback row\(s\)\)/g, `(${count} ${label})`)
    .replace(/\d+ brand-relevant mention\(s\)/gi, `${count} ${label}`);
  if (!/\(\d+/.test(replaced)) {
    return `${replaced} (${count} ${label})`;
  }
  if (/\(\d+[^)]*$/.test(replaced)) {
    return replaced.replace(/\(\d+[^)]*$/, `(${count} ${label})`);
  }
  return replaced;
}

/** Strip misleading product-specific wording when label entity is not dominant (Finding 7). */
export function generalizeMisleadingJourneyThemeLabel(label: string, sampleTexts?: string[]): string {
  const raw = String(label || '').trim();
  if (!raw) return raw;

  const campaignContext = /campaign|awareness|brand|discount|indirim|kampanya|promotion|promo/i.test(raw);

  if (/coffee\s*machine/i.test(raw) && campaignContext) {
    const generalized = raw
      .replace(/\bcoffee\s*machine\b\s*&?\s*/gi, '')
      .replace(/^\s*&\s*/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (generalized.length >= 8) return generalized;
    return 'Campaign & Brand Awareness';
  }

  if (sampleTexts && sampleTexts.length >= 3) {
    const entityPattern = /\b(refrigerator|fridge|oven|dishwasher|washing machine|coffee machine|television|vacuum|air conditioner|klima|buzdolabı|fırın|çamaşır)\b/i;
    const labelEntity = raw.match(entityPattern)?.[0];
    if (labelEntity && campaignContext) {
      const hits = sampleTexts.filter((t) => new RegExp(labelEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(t)).length;
      const coverage = hits / sampleTexts.length;
      if (coverage < 0.3) {
        const stripped = raw
          .replace(new RegExp(`\\b${labelEntity}\\b\\s*&?\\s*`, 'gi'), '')
          .replace(/^\s*&\s*/, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (stripped.length >= 8) return stripped;
        if (campaignContext) return 'Campaign & Brand Awareness';
      }
    }
  } else if (campaignContext && /coffee\s*machine|refrigerator|fridge|oven\b/i.test(raw)) {
    const stripped = raw
      .replace(/\b(coffee\s*machine|refrigerator|fridge|oven)\b\s*&?\s*/gi, '')
      .replace(/^\s*&\s*/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (stripped.length >= 8) return stripped;
  }

  return raw;
}

function fallbackJourneyStageSummary(
  stage: string,
  polarity: 'satisfaction' | 'dissatisfaction',
  linkedCount: number,
  stageTotal: number
): string {
  if (polarity === 'satisfaction') {
    if (linkedCount > 0) {
      return linkedCount >= 3
        ? `Positive signals at ${stage} — ${linkedCount} linked feedback row(s).`
        : `Early positive signals at ${stage} — ${linkedCount} linked feedback row(s); more data needed for a confident theme.`;
    }
    if (stageTotal > 0) {
      return `No strong positive themes among ${stageTotal} mapped row(s) at ${stage} — mostly neutral feedback.`;
    }
    return '—';
  }
  if (linkedCount > 0) {
    return linkedCount >= 3
      ? `Negative themes at ${stage} — ${linkedCount} linked feedback row(s).`
      : `Early negative signals at ${stage} — ${linkedCount} linked feedback row(s); more data needed for a confident theme.`;
  }
  if (stageTotal > 0) {
    return `No negative themes among ${stageTotal} mapped row(s) at ${stage}.`;
  }
  return '—';
}

function isBrokenJourneySummary(text: string, linkedCount: number, stageTotal: number): boolean {
  const raw = String(text || '').trim();
  if (!raw || stageTotal <= 0) return false;
  if (/0 linked feedback row/i.test(raw) && stageTotal > linkedCount) return true;
  if (linkedCount <= 0 && /early (positive|negative) signals/i.test(raw)) return true;
  return false;
}

/** Journey theme labels need at least three linked rows (Finding 7). */
export function repairJourneyThemeDisplay(
  summary: string,
  linkedCount: number,
  stage: string,
  polarity: 'satisfaction' | 'dissatisfaction',
  stageTotal = 0
): string {
  const raw = String(summary || '').trim();
  if (isBrokenJourneySummary(raw, linkedCount, stageTotal)) {
    return fallbackJourneyStageSummary(stage, polarity, linkedCount, stageTotal);
  }
  if (!raw || raw === '—') {
    return stageTotal > 0 ? fallbackJourneyStageSummary(stage, polarity, linkedCount, stageTotal) : raw;
  }
  if (linkedCount <= 0) {
    return stageTotal > 0 ? fallbackJourneyStageSummary(stage, polarity, 0, stageTotal) : raw;
  }
  if (linkedCount >= 3) {
    const themeOnly = raw.replace(/\s*\(\d+[^)]*linked[^)]*\)\.?\s*$/i, '').trim();
    const generalized = generalizeMisleadingJourneyThemeLabel(themeOnly);
    if (generalized && generalized !== themeOnly) {
      return raw.replace(themeOnly, generalized);
    }
    return raw;
  }
  if (/early (positive|negative) signals/i.test(raw)) return raw;
  return fallbackJourneyStageSummary(stage, polarity, linkedCount, stageTotal);
}

/** Repair legacy snapshot payloads on the client without requiring a full CX rebuild. */
export function repairCxReportPayload(data: TwitterCxReportDto): TwitterCxReportDto;
export function repairCxReportPayload<T extends Record<string, unknown>>(data: T): T;
export function repairCxReportPayload(
  data: TwitterCxReportDto | Record<string, unknown>
): TwitterCxReportDto | Record<string, unknown> {
  if (!data || typeof data !== 'object') return data;
  const rawRootCauses = Array.isArray(data['rootCauses']) ? (data['rootCauses'] as Array<Record<string, unknown>>) : [];
  const rootCauses = mergeRootCausesForDisplay(rawRootCauses);

  const heatmapPct = Array.isArray(data['heatmapPct'])
    ? (data['heatmapPct'] as Array<Record<string, unknown>>).map((row) => {
        const counts = reconcileHeatmapStageCounts({
          total: Number(row['total']) || 0,
          positiveCount: Number(row['positiveCount']) || 0,
          neutralCount: Number(row['neutralCount']) || 0,
          negativeCount: Number(row['negativeCount']) || 0,
          positiveFeedbackIds: row['positiveFeedbackIds'] as number[] | undefined,
          neutralFeedbackIds: row['neutralFeedbackIds'] as number[] | undefined,
          negativeFeedbackIds: row['negativeFeedbackIds'] as number[] | undefined,
          feedbackIds: row['feedbackIds'] as number[] | undefined,
        });
        const stageTotal = counts.total;
        return {
          ...row,
          ...counts,
          positive: heatmapSharePct(counts.positiveCount, stageTotal),
          neutral: heatmapSharePct(counts.neutralCount, stageTotal),
          negative: heatmapSharePct(counts.negativeCount, stageTotal),
          positiveDisplayPct: formatCellPct(counts.positiveCount, stageTotal),
          neutralDisplayPct: formatCellPct(counts.neutralCount, stageTotal),
          negativeDisplayPct: formatCellPct(counts.negativeCount, stageTotal),
        };
      })
    : data['heatmapPct'];

  const rootCauseLikes: RootCauseLike[] = rootCauses.map((rc) => ({
    cause: String(rc['cause'] || '').trim(),
    interpretation: String(rc['interpretation'] || '').trim(),
    feedbackIds: Array.isArray(rc['feedbackIds'])
      ? (rc['feedbackIds'] as number[]).filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
      : [],
  }));

  const actionPlan = Array.isArray(data['actionPlan'])
    ? (() => {
        const drafts = (data['actionPlan'] as Array<Record<string, unknown>>).map((row, i) => {
          const meta = resolveActionPlanRootCauseMeta(
            {
              action: String(row['action'] || ''),
              causeTheme: String(row['causeTheme'] || row['cause'] || '').trim() || undefined,
              linkedFeedbackIds: Array.isArray(row['linkedFeedbackIds']) ? (row['linkedFeedbackIds'] as number[]) : undefined,
              referenceFeedbackIds: Array.isArray(row['referenceFeedbackIds'])
                ? (row['referenceFeedbackIds'] as number[])
                : undefined,
            },
            rootCauseLikes,
            i
          );
          const linkedCount = meta.feedbackIds.length || Number(row['linkedCount']) || 0;
          return {
            ...row,
            priority: priorityLabelFromClusterSize(linkedCount),
            action: String(row['action'] ?? '').replace(/\(\d+ linked feedback row\(s\)\)/i, '').trim(),
            causeTheme: meta.cause,
            cause: meta.cause,
            interpretation: meta.interpretation || undefined,
            sampleText: meta.interpretation || undefined,
            linkedFeedbackIds: meta.feedbackIds,
            referenceFeedbackIds: meta.feedbackIds,
            linkedCount,
          };
        });
        return finalizeActionPlanRows(drafts);
      })()
    : data['actionPlan'];

  const processImprovementItems = Array.isArray(data['processImprovementItems'])
    ? (() => {
        const drafts = (data['processImprovementItems'] as Array<Record<string, unknown>>).map((item, i) => {
          const meta = resolveActionPlanRootCauseMeta(
            {
              action: String(item['text'] || ''),
              causeTheme: String(item['causeTheme'] || '').trim() || undefined,
              linkedFeedbackIds: Array.isArray(item['linkedFeedbackIds']) ? (item['linkedFeedbackIds'] as number[]) : undefined,
              referenceFeedbackIds: Array.isArray(item['referenceFeedbackIds'])
                ? (item['referenceFeedbackIds'] as number[])
                : undefined,
            },
            rootCauseLikes,
            i
          );
          const cause = meta.cause || extractQuotedTheme(String(item['text'] || ''));
          const interpretation = meta.interpretation || undefined;
          const linkedCount = meta.feedbackIds.length || Number(item['linkedCount']) || 0;
          return {
            ...item,
            priority: priorityLabelFromClusterSize(linkedCount),
            action: String(item['text'] ?? '').replace(/\(\d+ negative-linked row\(s\)\)/i, '').trim(),
            causeTheme: cause,
            cause,
            interpretation,
            sampleText: interpretation,
            linkedFeedbackIds: meta.feedbackIds,
            referenceFeedbackIds: meta.feedbackIds,
            linkedCount,
          };
        });
        return finalizeProcessImprovementRows(drafts).map((row) => ({
          text: row.text,
          causeTheme: row.causeTheme || row.cause,
          linkedFeedbackIds: row.linkedFeedbackIds,
          referenceFeedbackIds: row.referenceFeedbackIds,
          linkedCount: row.linkedCount,
        }));
      })()
    : data['processImprovementItems'];

  const journeyRows = Array.isArray(data['journeyRows'])
    ? (data['journeyRows'] as Array<Record<string, unknown>>).map((row) => {
        const stage = String(row['stage'] || '');
        const stageTotal = Number(row['feedbackCount']) || 0;
        const satN = Number(row['satisfactionCount']) || 0;
        const disN = Number(row['dissatisfactionCount']) || 0;
        const satisfaction = repairJourneyThemeDisplay(
          String(row['satisfactionSummary'] ?? row['satisfaction'] ?? ''),
          satN,
          stage,
          'satisfaction',
          stageTotal
        );
        const dissatisfaction = repairJourneyThemeDisplay(
          String(row['dissatisfactionSummary'] ?? row['dissatisfaction'] ?? ''),
          disN,
          stage,
          'dissatisfaction',
          stageTotal
        );
        return {
          ...row,
          satisfaction,
          dissatisfaction,
          satisfactionSummary: satisfaction,
          dissatisfactionSummary: dissatisfaction,
        };
      })
    : data['journeyRows'];

  return {
    ...data,
    rootCauses,
    heatmapPct,
    actionPlan,
    processImprovementItems,
    processImprovements: Array.isArray(processImprovementItems)
      ? processImprovementItems.map((item) => String((item as Record<string, unknown>)['text'] || ''))
      : data['processImprovements'],
    journeyRows,
  };
}
