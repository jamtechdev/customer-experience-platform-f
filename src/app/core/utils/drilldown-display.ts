/** Counts shown in UI must match drilldown ID lists exactly. */
export function drilldownIdCount(linked?: number[], reference?: number[]): number {
  const ids = linked?.length ? linked : reference ?? [];
  return normalizeDrilldownIds(ids).length;
}

export function normalizeDrilldownIds(ids?: number[]): number[] {
  return [...new Set((ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
}

/** Modal footer total must match the count shown on the clickable drilldown control. */
export function drilldownModalTotal(requestedIds: number[]): number {
  return normalizeDrilldownIds(requestedIds).length;
}

export function extractQuotedTheme(text: string): string {
  const m = text.match(/[“"]([^”"]+)[”"]/);
  return m?.[1]?.trim() || 'this theme';
}

export function formatProcessImprovementText(text: string, count: number): string {
  const theme = extractQuotedTheme(text);
  if (count <= 0) {
    return text.replace(/\s*\(\d+ negative-linked row\(s\)\)/, '');
  }
  return `Run a focused sprint on "${theme}" (${count} negative-linked row(s)): assign owner, define SLA, and track repeat-contact rate.`;
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
