/** User-facing copy when bundled Twitter CX report HTTP/stream fails (no .env required). */
export function twitterCxReportFailureMessage(apiMessage?: string): string {
  if (apiMessage === 'http_504' || apiMessage === 'http_502') {
    return 'The server took too long to build this report (gateway timeout). Try a shorter date range or refresh. If it keeps happening, the API gateway timeout on the host may need to be increased.';
  }
  if (apiMessage === 'timeout') {
    return 'This report took too long to finish loading. Try a narrower date range or retry in a moment.';
  }
  if (apiMessage?.startsWith('http_5')) {
    return 'The report service returned a server error. Please retry in a moment.';
  }
  return 'Could not load the Twitter CX report. Check your connection and try again.';
}
