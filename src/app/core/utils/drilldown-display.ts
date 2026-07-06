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
    /(implement|introduce|create|deploy|hire|staff|reassign|automate|standardi[sz]e|define an sla|set an sla|escalat|retrain|renegotiat|replace|redesign|audit|schedule|proactively|notify|refund|compensat|root-cause|checklist|policy|playbook|workflow|dashboard|triage|route|monitor|reduce|track|call back|follow up|inspect|test protocol|spare part|inventory|assign a named owner)/i;
  return !concrete.test(t);
}

export function fallbackClusterActionText(cause: string, interpretation?: string): string {
  const detail = (interpretation || '').replace(/\s+/g, ' ').trim();
  const base =
    detail && detail !== '—'
      ? detail
      : `recurring "${cause || 'this theme'}" complaints from the linked feedback`;
  return `Assign a named owner to ${base.charAt(0).toLowerCase()}${base.slice(1, 300)} — define an SLA, add a resolution checklist, and track repeat-contact rate.`;
}

/** Tailored next-step text per cluster theme — never a bare "Address …" label (Finding 2). */
export function clusterSpecificActionText(cause: string, interpretation?: string): string {
  const theme = String(cause || 'this theme').trim();
  const detail = (interpretation || '').replace(/\s+/g, ' ').trim();
  const blob = `${theme} ${detail}`.toLowerCase();

  if (/customer support|support gap|destek|call center|müşteri hizmet|musteri hizmet|iletisim/.test(blob)) {
    return `Stand up a dedicated support cell for "${theme}": cap queue wait times, enforce first-contact resolution scripts, and track repeat-contact rate until it drops below 15%.`;
  }
  if (/service resolution|resolution gap|repair delay|warranty resolution|garanti.*(gecik|redd)|tamir.*(gecik|süre|sure)/.test(blob)) {
    return `Introduce a 48-hour repair-closure SLA for "${theme}": pre-position spare parts for top failure codes, require technician callback within 24h on reopened tickets, and publish weekly resolution-rate dashboards to service leadership.`;
  }
  if (/reliability|defect|quality|arıza|ariza|bozuk|failure|breakdown/.test(blob)) {
    return `Run a product-reliability intervention for "${theme}": isolate affected batches, complete root-cause hardware tests on returns, and proactively replace or repair units for customers with repeat failures.`;
  }
  if (/delivery|teslimat|logistics|kargo|shipment|shipping/.test(blob)) {
    return `Tighten delivery operations for "${theme}": audit carrier SLAs end-to-end, send proactive delay notifications, and offer compensation when promised delivery windows are missed.`;
  }
  if (/billing|pricing|ücret|ucret|fiyat|invoice|refund/.test(blob)) {
    return `Resolve billing and pricing friction for "${theme}": audit disputed charges against published price lists, authorize frontline refunds up to a defined threshold, and retrain stores on consistent discount communication.`;
  }

  return fallbackClusterActionText(theme, interpretation);
}

/** Repair legacy snapshot rows in the UI without requiring a full CX rebuild. */
export function repairStaleActionText(
  action: string,
  causeHint?: string,
  interpretationHint?: string
): string {
  const theme = (causeHint || extractQuotedTheme(action) || 'this theme').trim();
  if (isStaleGenericActionText(action)) {
    return clusterSpecificActionText(theme, interpretationHint);
  }
  return action;
}

export function extractQuotedTheme(text: string): string {
  const m = text.match(/[“"']([^”"']+)[”"']/);
  return m?.[1]?.trim() || 'this theme';
}

/** Pull journey theme label from satisfaction/dissatisfaction summary text. */
export function extractJourneyThemeFromSummary(text: string): string | null {
  const raw = String(text || '').trim();
  if (!raw || raw === '—' || raw === '-') return null;
  const withoutCount = raw
    .replace(/\s*\(\d+[^)]*linked[^)]*\)\.?\s*$/i, '')
    .replace(/\s*\(\d+[^)]*\)\.?\s*$/g, '')
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
  const repaired = repairStaleActionText(text, causeHint, interpretationHint);
  return alignLinkedCountInText(repaired, count, 'negative-linked row(s)');
}

export function alignLinkedCountInText(text: string, count: number, label = 'linked feedback row(s)'): string {
  if (!text) return '';
  if (count <= 0) return text.replace(/\(\d+[^)]*\)/, '').trim();
  const replaced = text
    .replace(/\(\d+ negative-linked row\(s\)\)/g, `(${count} ${label})`)
    .replace(/\(\d+ linked row\(s\)\)/g, `(${count} ${label})`)
    .replace(/\(\d+ linked feedback row\(s\)\)/g, `(${count} ${label})`)
    .replace(/\d+ brand-relevant mention\(s\)/gi, `${count} ${label}`);
  if (!replaced.match(/\(\d+/)) {
    return `${replaced} (${count} ${label})`;
  }
  return replaced;
}
