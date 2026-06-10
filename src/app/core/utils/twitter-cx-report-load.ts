/** User-facing copy when bundled Twitter CX report HTTP/stream fails (no .env required). */
export function twitterCxReportFailureMessage(apiMessage?: string): string {
  if (apiMessage === 'http_0' || apiMessage === 'network') {
    return 'Could not reach the API server. Wait a moment and retry; if it repeats, check that the backend service is running.';
  }
  if (apiMessage === 'http_504' || apiMessage === 'http_502') {
    return 'The CX report build is taking longer than the server allows. Try again in a moment, or use a smaller date range.';
  }
  if (apiMessage === 'snapshot_still_building') {
    return 'Your CX report is still being prepared. Keep this page open or retry in 1-2 minutes.';
  }
  if (apiMessage === 'snapshot_failed' || apiMessage === 'snapshot_poll_failed') {
    return 'The report build did not finish cleanly. Retry after import processing completes, or rebuild it from Import history.';
  }
  if (apiMessage === 'timeout') {
    return 'This report took too long to load. Try a narrower date range or retry in a moment.';
  }
  if (apiMessage === 'http_503') {
    return 'The CX report service is temporarily unavailable. Wait for import processing to finish, then retry or rebuild from Import history.';
  }
  if (apiMessage?.startsWith('http_5')) {
    return 'The report service returned a server error. Retry in a moment; if it repeats, rebuild the report from Import history.';
  }
  if (apiMessage === 'empty_response') {
    return 'The report service returned an empty response. Refresh the page and try again.';
  }
  if (apiMessage === 'stale_response') {
    return 'The report changed while this page was loading. Refreshing the latest data now.';
  }
  return 'Could not load the CX report. Check that feedback has been imported, then try again.';
}

export const CX_REPORT_BUILDING_TITLE = 'AI report is preparing your CX insights';
export const CX_REPORT_BUILDING_SUBTITLE =
  'Aggregating feedback, sentiment, journey stages, and recommendations from the saved database report.';

export const CX_REPORT_CACHED_TITLE = 'Loading saved CX report';
export const CX_REPORT_CACHED_SUBTITLE = 'Reading the latest pre-calculated insights from the database.';
