/**
 * Normalizes API / JSON date values for tables and forms without extra libraries.
 * Handles ISO strings, Unix seconds/ms, Date instances, and date-only ISO (local calendar).
 */

export type ApiDateFormatMode = 'date' | 'datetime' | 'time';

export interface FormatApiDateOptions {
  mode?: ApiDateFormatMode;
  /** BCP 47 locale; omit for runtime default */
  locale?: string;
  empty?: string;
}

function isUnixSeconds(n: number): boolean {
  return n > 0 && n < 1e11;
}

/**
 * Parse arbitrary API values into a valid Date, or null.
 */
export function parseApiDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = isUnixSeconds(value) ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    // ISO date-only: parse as local calendar day (avoid UTC midnight shifting the displayed day).
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return parseIsoDateOnlyLocal(s);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value !== null && 'toISOString' in value) {
    const fn = (value as { toISOString?: () => string }).toISOString;
    if (typeof fn === 'function') {
      try {
        const d = new Date(fn.call(value));
        return Number.isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * YYYY-MM-DD interpreted as local calendar date (avoids UTC-midnight day shift in UI).
 */
export function parseIsoDateOnlyLocal(ymd: string): Date | null {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

/** Stable ISO string for storage in signals/state, or empty string if unparseable. */
export function normalizeApiDateToIso(value: unknown): string {
  const d = parseApiDate(value);
  return d ? d.toISOString() : '';
}

/** HTML &lt;input type="date"&gt; value (yyyy-MM-dd in local calendar), or null. */
export function toInputDateValue(value: unknown): string | null {
  const d = parseApiDate(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatApiDate(value: unknown, options?: FormatApiDateOptions): string {
  const { mode = 'date', locale, empty = '—' } = options ?? {};
  const d = parseApiDate(value);
  if (!d) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return empty;
  }
  const loc = locale;
  if (mode === 'time') {
    return d.toLocaleTimeString(loc, { timeStyle: 'short' });
  }
  if (mode === 'datetime') {
    return d.toLocaleString(loc, { dateStyle: 'short', timeStyle: 'short' });
  }
  return d.toLocaleDateString(loc, { dateStyle: 'short' });
}
