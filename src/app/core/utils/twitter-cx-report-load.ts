import { MatSnackBar } from '@angular/material/snack-bar';
import { TwitterCxReportDto } from '../models';

/** User-facing copy when bundled Twitter CX report HTTP/stream fails (no .env required). */
export function twitterCxReportFailureMessage(apiMessage?: string): string {
  if (apiMessage === 'http_0' || apiMessage === 'network') {
    return 'Loading your saved report from the database. This page will refresh automatically.';
  }
  if (apiMessage === 'http_504' || apiMessage === 'http_502') {
    return 'The CX report build is taking longer than the server allows. Try again in a moment, or use a smaller date range.';
  }
  if (apiMessage === 'snapshot_still_building') {
    return 'Your imported CSV report is being saved to the database. Keep this page open — it will refresh automatically.';
  }
  if (apiMessage === 'snapshot_failed' || apiMessage === 'snapshot_poll_failed') {
    return 'The report build did not finish cleanly. Retry after import processing completes, or rebuild it from Import history.';
  }
  if (apiMessage === 'timeout') {
    return 'The report is still being read from your imported CSV. Click Refresh in a moment — your data is safe in the database.';
  }
  if (apiMessage === 'http_503') {
    return 'Import is still processing. Previous report data will appear when ready, or retry in a moment.';
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
  if (apiMessage?.toLowerCase().includes('company scope')) {
    return 'Company access is not configured on your account. Sign out and sign in again, or ask an admin to link your user to a company.';
  }
  return 'Could not load the CX report. Check that feedback has been imported, then try again.';
}

export const CX_REPORT_BUILDING_TITLE = 'AI report is preparing your CX insights';
export const CX_REPORT_BUILDING_SUBTITLE =
  'Aggregating feedback, sentiment, journey stages, and recommendations from the saved database report.';

export const CX_REPORT_CACHED_TITLE = 'Loading saved CX report';
export const CX_REPORT_CACHED_SUBTITLE = 'Reading the latest pre-calculated insights from the database.';

export const IMPORT_ANALYSIS_LOADER_TITLE = 'Please wait — AI is analyzing your data';
export const IMPORT_ANALYSIS_LOADER_SUBTITLE =
  'Sentiment, journey stages, and insights will appear automatically when analysis completes.';

export function hasCxReportPayload(data?: TwitterCxReportDto | null): boolean {
  if (!data) return false;
  return (
    (data.dataset?.total ?? 0) > 0 ||
    (data.touchpoints?.length ?? 0) > 0 ||
    (data.journeyRows?.length ?? 0) > 0 ||
    (data.actionPlan?.length ?? 0) > 0 ||
    (data.rootCauses?.length ?? 0) > 0 ||
    (data.sentiment?.total ?? 0) > 0 ||
    (data.heatmapPct?.length ?? 0) > 0
  );
}

/** Transient failures — auto-retry instead of showing an error card immediately. */
export function isTransientCxReportFailure(message?: string): boolean {
  return (
    message === 'http_0' ||
    message === 'network' ||
    message === 'timeout' ||
    message === 'http_502' ||
    message === 'http_504' ||
    message === 'http_503' ||
    message === 'snapshot_still_building'
  );
}

/** True while CSV import, AI analysis, or CX snapshot build is still in progress. */
export function isCxReportResponsePending(
  res: { message?: string; data?: TwitterCxReportDto | null } | undefined,
  importActive: boolean
): boolean {
  const msg = res?.message;
  if (msg === 'snapshot_still_building') return true;
  if (isTransientCxReportFailure(msg) && !hasCxReportPayload(res?.data)) return true;
  if (msg === 'import_processing' && !hasCxReportPayload(res?.data)) return true;
  if (importActive && !hasCxReportPayload(res?.data)) return true;
  return false;
}

/** @deprecated Use isCxReportResponsePending — do not block page loading with this. */
export function shouldKeepCxReportLoadingAfterResponse(
  res: { message?: string; success?: boolean } | undefined,
  importActive: boolean
): boolean {
  return isCxReportResponsePending(res, importActive);
}

/** Minimal empty report — used while CSV import is still running (no error toast). */
export function emptyTwitterCxReportDto(): TwitterCxReportDto {
  return {
    reportTitle: 'CX report',
    reportSubtitle: 'Data will appear after import and analysis complete.',
    dataset: {
      total: 0,
      cxRelated: 0,
      brandSupport: 0,
      originalCustomerCx: 0,
      primaryCohortSize: 0,
    },
    datasetProfileRows: [],
    sentiment: { positive: 0, negative: 0, neutral: 0, total: 0, averageScore: 0 },
    socialNpsProxy: 0,
    npsInterpretation: '',
    executiveSummaryBullets: [],
    scopeAndMethodBullets: [],
    section4Intro: '',
    section4Bullets: [],
    sentimentPatternRows: [],
    heatmapPct: [],
    heatmapFigureCaption: '',
    touchpoints: [],
    rootCauses: [],
    journeyRows: [],
    actionPlan: [],
    processImprovements: [],
    managementTakeaways: [],
    cohortTagsUsed: false,
    _snapshotMeta: { fallback: true },
  };
}

/** True when a failed CX report load should stay silent (import still running). */
export function shouldSuppressCxReportError(apiMessage?: string, importProcessing?: boolean): boolean {
  if (apiMessage === 'stale_response' || apiMessage === 'import_processing') return true;
  if (apiMessage === 'snapshot_still_building') return true;
  if (apiMessage === 'timeout') return true;
  if (apiMessage === 'http_0' || apiMessage === 'network') return true;
  if (importProcessing) return true;
  // CX report pages show an empty state — never flash error toasts for transient server errors.
  if (apiMessage === 'http_503' || apiMessage === 'http_502' || apiMessage === 'http_504') return true;
  if (apiMessage?.startsWith('http_5')) return true;
  return false;
}

/** Show snackbar only for real failures — never while CSV upload/analysis is in progress. */
export function notifyCxReportLoadFailure(
  snackBar: MatSnackBar,
  apiMessage: string | undefined,
  importProcessing: boolean,
  closeLabel = 'Close'
): void {
  if (shouldSuppressCxReportError(apiMessage, importProcessing)) return;
  snackBar.open(twitterCxReportFailureMessage(apiMessage), closeLabel, { duration: 8000 });
}