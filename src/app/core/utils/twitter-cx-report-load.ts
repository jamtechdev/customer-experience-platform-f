/** User-facing copy when bundled Twitter CX report HTTP/stream fails (no .env required). */
export function twitterCxReportFailureMessage(apiMessage?: string): string {
  if (apiMessage === 'http_504' || apiMessage === 'http_502') {
    return 'The server took too long to build this report (gateway timeout). Try a shorter date range or refresh. If it keeps happening, the API gateway timeout on the host may need to be increased.';
  }
  if (apiMessage === 'snapshot_still_building') {
    return 'Your CX report is still building in the background after import. Wait 1–2 minutes, then click Retry or refresh this page.';
  }
  if (apiMessage === 'snapshot_failed' || apiMessage === 'snapshot_poll_failed') {
    return 'The report is still being prepared in the background. Please wait a moment and refresh the page.';
  }
  if (apiMessage === 'timeout') {
    return 'This report took too long to finish loading. Try a narrower date range or retry in a moment.';
  }
  if (apiMessage === 'http_503') {
    return 'The CX report is not ready yet. Wait for import processing to finish, or trigger a rebuild from Import history.';
  }
  if (apiMessage?.startsWith('http_5')) {
    return 'The report service returned a server error. Please retry in a moment.';
  }
  return 'Could not load the Twitter CX report. Check your connection and try again.';
}

export const CX_REPORT_BUILDING_TITLE = 'Preparing your saved CX report';
export const CX_REPORT_BUILDING_SUBTITLE =
  'Aggregating journey, touchpoints, and insights from your database. This runs once after CSV import—not on every visit.';

export const CX_REPORT_CACHED_TITLE = 'Loading saved report';
export const CX_REPORT_CACHED_SUBTITLE = 'Reading pre-calculated results from the database.';
