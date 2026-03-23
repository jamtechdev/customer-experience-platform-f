/** Mirrors backend buildReportDatePresets for offline / API-failure fallback */
export interface ReportDatePreset {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export function buildClientReportDatePresets(now: Date = new Date()): ReportDatePreset[] {
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const last7Start = new Date(now);
  last7Start.setDate(last7Start.getDate() - 6);
  last7Start.setHours(0, 0, 0, 0);
  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 29);
  last30Start.setHours(0, 0, 0, 0);
  const firstPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  ytdStart.setHours(0, 0, 0, 0);
  return [
    { id: 'all_time', label: 'All time', startDate: new Date('1970-01-01T00:00:00.000Z').toISOString(), endDate: endToday.toISOString() },
    { id: 'last_7_days', label: 'Last 7 days', startDate: last7Start.toISOString(), endDate: endToday.toISOString() },
    { id: 'last_30_days', label: 'Last 30 days', startDate: last30Start.toISOString(), endDate: endToday.toISOString() },
    {
      id: 'last_calendar_month',
      label: 'Last calendar month',
      startDate: firstPrevMonth.toISOString(),
      endDate: lastPrevMonth.toISOString(),
    },
    { id: 'ytd', label: 'Year to date', startDate: ytdStart.toISOString(), endDate: endToday.toISOString() },
  ];
}

export function toIsoRangeFromYmd(startYmd: string, endYmd: string): { startDate: string; endDate: string } {
  return {
    startDate: new Date(`${startYmd}T00:00:00`).toISOString(),
    endDate: new Date(`${endYmd}T23:59:59.999`).toISOString(),
  };
}

/** Inclusive day count between yyyy-mm-dd strings (UTC date parts). */
export function inclusiveDaysBetweenYmd(startYmd: string, endYmd: string): number {
  const s = new Date(`${startYmd}T00:00:00.000Z`).getTime();
  const e = new Date(`${endYmd}T00:00:00.000Z`).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 30;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((e - s) / msPerDay) + 1;
}
