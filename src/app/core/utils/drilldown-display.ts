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

/**
 * Format a share percentage so small-but-non-zero values never collapse to a flat "0%"
 * (Finding 3). Only a genuine zero count renders "0%"; otherwise precision escalates until a
 * non-zero digit is shown (e.g. 4 of 2163 -> "0.18%").
 */
export function formatCellPct(count: number, stageTotal: number): string {
  if (!count || count <= 0 || !stageTotal || stageTotal <= 0) return '0%';
  const pct = (count / stageTotal) * 100;
  if (Math.round(pct) > 0) return `${Math.round(pct)}%`;
  for (const digits of [1, 2, 3]) {
    const fixed = pct.toFixed(digits);
    if (parseFloat(fixed) > 0) return `${fixed}%`;
  }
  return '<0.001%';
}

export function extractQuotedTheme(text: string): string {
  const m = text.match(/[“"]([^”"]+)[”"]/);
  return m?.[1]?.trim() || 'this theme';
}

/**
 * Preserve the backend-generated, cluster-specific recommendation and only align the linked-row
 * count (Finding 4). Previously this replaced every recommendation with an identical
 * "Run a focused sprint on ..." template, which is what made all clusters read the same.
 */
export function formatProcessImprovementText(text: string, count: number): string {
  return alignLinkedCountInText(text, count, 'negative-linked row(s)');
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
