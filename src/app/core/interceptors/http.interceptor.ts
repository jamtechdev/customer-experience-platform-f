import { Injector, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpRequest, HttpErrorResponse, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { LoaderService } from '../services/loader.service';
import { ImportProcessingService } from '../services/import-processing.service';
import { SKIP_ERROR_TOAST } from '../http/http-context';

const AUTH_FORM_PATH_RE = /(^|\/)auth\/(login|register|forgot-password|reset-password)(\/|\?|$)/i;
const SNACKBAR_MAX_LEN = 500;
const CONNECTED_ACCOUNTS_MSG_RE = /no connected platform accounts found to sync/i;

function getRequestPath(url: string): string {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new URL(url).pathname;
    }
  } catch {
    /* use raw */
  }
  return url.split('?')[0];
}

function isBackendApiRequest(req: HttpRequest<unknown>): boolean {
  const base = environment.apiUrl || '';
  return req.url.startsWith('/api') || (base !== '' && req.url.startsWith(base));
}

function isAuthFormEndpoint(url: string): boolean {
  return AUTH_FORM_PATH_RE.test(getRequestPath(url));
}

function isAuthProfileEndpoint(url: string): boolean {
  return /(^|\/)auth\/profile(\/|\?|$)/i.test(getRequestPath(url));
}

function isTwitterCxReportEndpoint(url: string): boolean {
  return /\/twitter-cx-report(\/|\?|$)/i.test(getRequestPath(url));
}

function isAnalysisApiEndpoint(url: string): boolean {
  return /\/analysis\//i.test(getRequestPath(url));
}

function isImportOrCxReportErrorMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('cx report') ||
    m.includes('import processing') ||
    m.includes('import history') ||
    m.includes('batch processing') ||
    m.includes('rebuild from import')
  );
}

function shouldSuppressErrorToast(
  req: HttpRequest<unknown>,
  importProcessing: ImportProcessingService,
  error?: HttpErrorResponse
): boolean {
  if (req.context.get(SKIP_ERROR_TOAST)) return true;
  if (!isBackendApiRequest(req)) return true;
  // In local/dev, show auth endpoint failures so debugging is visible immediately.
  if (isAuthFormEndpoint(req.url) && environment.production) return true;
  // CX report pages handle load failures in-component; never toast for these APIs.
  if (isTwitterCxReportEndpoint(req.url)) return true;
  if (importProcessing.isActive() && isAnalysisApiEndpoint(req.url)) return true;
  if (error?.status === 503 && isAnalysisApiEndpoint(req.url)) return true;
  if (error && isImportOrCxReportErrorMessage(extractBodyMessage(error))) return true;
  return false;
}

function isHtmlErrorBody(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.includes('<title>504') || t.includes('gateway time-out');
}

function extractBodyMessage(error: HttpErrorResponse): string {
  let errorMessage = 'An error occurred';
  if (error.error) {
    if (typeof error.error === 'string') {
      errorMessage = isHtmlErrorBody(error.error) ? '' : error.error;
    } else if ((error.error as { message?: string }).message) {
      errorMessage = (error.error as { message: string }).message;
      const debugMessage = (error.error as { debug?: { message?: string } }).debug?.message;
      if (!environment.production && debugMessage) {
        errorMessage = debugMessage;
      }
    } else if ((error.error as { error?: string }).error) {
      errorMessage = (error.error as { error: string }).error;
    }
  } else if (error.message) {
    errorMessage = error.message;
  }
  return errorMessage;
}

function normalizeHttpErrorMessage(error: HttpErrorResponse, req: HttpRequest<unknown>): string {
  let errorMessage = extractBodyMessage(error);
  let errorDetails: unknown = null;

  if (error.error && typeof error.error === 'object' && error.error !== null) {
    errorDetails = error.error;
  }

  const logUrl = error.url || req.url;

  if (error.status === 403) {
    if (!environment.production) {
      console.error('Access forbidden:', errorMessage, errorDetails);
    }
    errorMessage = errorMessage || 'You do not have permission to perform this action.';
  }

  if (error.status === 404) {
    if (!environment.production) {
      console.warn('Resource not found:', logUrl);
    }
    errorMessage = errorMessage || 'The requested resource was not found.';
  }

  if (error.status === 500) {
    console.error(`Server error: ${req.method} ${logUrl} - ${errorMessage || 'Internal Server Error'}`);
    console.error('Server error:', {
      url: logUrl,
      method: req.method,
      message: errorMessage,
      details: errorDetails,
    });
    errorMessage = errorMessage || 'Server error. Please try again later.';
  }

  if (error.status === 502 || error.status === 504) {
    errorMessage =
      'The server took too long to respond (gateway timeout). Try a shorter date range such as Last 30 days, then click Apply.';
  }

  if (error.status === 503) {
    errorMessage =
      errorMessage && !isHtmlErrorBody(errorMessage)
        ? errorMessage
        : 'The service is temporarily unavailable. Wait for batch processing to finish, then refresh.';
  }

  if (isHtmlErrorBody(errorMessage)) {
    errorMessage =
      error.status === 502 || error.status === 504
        ? 'The server took too long to respond (gateway timeout). Try again in a moment.'
        : 'The server returned an error. Please try again.';
  }

  if (error.status === 0) {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.warn('API unreachable:', logUrl, '(is the backend running?)');
    }
    errorMessage = environment.production
      ? 'Could not reach the server (network, VPN, or firewall). Try again in a moment.'
      : 'Cannot reach API. Start the backend server to load data.';
  }

  // Avoid misleading provider-account text coming from third-party sync endpoints.
  if (CONNECTED_ACCOUNTS_MSG_RE.test(errorMessage)) {
    errorMessage = 'No source profiles available to sync right now.';
  }

  return errorMessage;
}

function notifyHttpError(
  toastr: ToastrService,
  platformId: object,
  message: string,
  req: HttpRequest<unknown>,
  importProcessing: ImportProcessingService,
  error?: HttpErrorResponse
): void {
  if (!isPlatformBrowser(platformId)) return;
  if (shouldSuppressErrorToast(req, importProcessing, error)) return;
  if (!message || !message.trim()) return;
  const text =
    message.length > SNACKBAR_MAX_LEN ? `${message.slice(0, SNACKBAR_MAX_LEN)}…` : message;
  toastr.error(text, 'Request failed', {
    timeOut: 6500,
    extendedTimeOut: 2000,
    progressBar: true,
  });
}

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  // Don't add token to external requests
  const base = environment.apiUrl || '';
  const isApiRequest = req.url.startsWith('/api') || (base !== '' && req.url.startsWith(base));
  if (!isApiRequest) {
    return next(req);
  }

  req = req.clone({ withCredentials: true });

  return next(req);
}

function shouldSkipGlobalLoader(url: string): boolean {
  if (isTwitterCxReportEndpoint(url)) return true;
  const path = getRequestPath(url);
  return /\/analysis\/(twitter-cx-report|sentiment|root-cause)/i.test(path);
}

export function loaderInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const loader = inject(LoaderService);

  const base = environment.apiUrl || '';
  const isBackendApi = req.url.startsWith('/api') || (base !== '' && req.url.startsWith(base));

  if (!isBackendApi || shouldSkipGlobalLoader(req.url)) {
    return next(req);
  }

  loader.show('Loading...');

  return next(req).pipe(
    finalize(() => {
      loader.hide();
    })
  );
}

export function errorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const injector = inject(Injector);
  const toastr = inject(ToastrService);
  const platformId = inject(PLATFORM_ID);
  const importProcessing = inject(ImportProcessingService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const isRefreshRequest = req.url.includes('/auth/refresh');
        if (isRefreshRequest) {
          const authService = injector.get(AuthService);
          const errorMessage = normalizeHttpErrorMessage(error, req);
          authService.logout();
          notifyHttpError(toastr, platformId, errorMessage, req, importProcessing, error);
          return throwError(() => error);
        }
        // Login/register/etc. can return 401 for wrong credentials — not an expired session.
        if (isAuthFormEndpoint(req.url)) {
          const errorMessage = normalizeHttpErrorMessage(error, req);
          const enhancedErrorBody =
            typeof error.error === 'object' && error.error !== null && !Array.isArray(error.error)
              ? { ...(error.error as object) }
              : {};
          const enhancedError = new HttpErrorResponse({
            error: {
              ...enhancedErrorBody,
              message: errorMessage,
              originalError: error.error,
            },
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url || req.url,
          });
          notifyHttpError(toastr, platformId, errorMessage, req, importProcessing, error);
          return throwError(() => enhancedError);
        }
        if (isAuthProfileEndpoint(req.url)) {
          return throwError(() => error);
        }
        const authService = injector.get(AuthService);
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newReq = req.clone({ withCredentials: true });
            return next(newReq);
          }),
          catchError((refreshError: HttpErrorResponse) => {
            authService.logout();
            const refreshMsg = normalizeHttpErrorMessage(refreshError, req);
            const sessionMsg =
              refreshMsg && refreshMsg !== 'An error occurred'
                ? refreshMsg
                : 'Session expired. Please sign in again.';
            notifyHttpError(toastr, platformId, sessionMsg, req, importProcessing, refreshError);
            return throwError(() => refreshError);
          })
        );
      }

      const errorMessage = normalizeHttpErrorMessage(error, req);

      const enhancedErrorBody =
        typeof error.error === 'object' && error.error !== null && !Array.isArray(error.error)
          ? { ...(error.error as object) }
          : {};

      const enhancedError = new HttpErrorResponse({
        error: {
          ...enhancedErrorBody,
          message: errorMessage,
          originalError: error.error,
        },
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url || req.url,
      });

      notifyHttpError(toastr, platformId, errorMessage, req, importProcessing, error);

      return throwError(() => enhancedError);
    })
  );
}

export function apiUrlInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const apiBaseUrl = environment.apiUrl;

  if (
    typeof window !== 'undefined' &&
    window.location.origin.startsWith('http://localhost') &&
    apiBaseUrl &&
    req.url.startsWith(apiBaseUrl)
  ) {
    const relativePath = req.url.substring(apiBaseUrl.length) || '';
    const proxiedReq = req.clone({
      url: `/api${relativePath}`,
    });
    return next(proxiedReq);
  }

  if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
    return next(req);
  }

  if (req.url.startsWith('/api')) {
    let urlPath = req.url;

    if (apiBaseUrl.endsWith('/api')) {
      urlPath = req.url.replace(/^\/api/, '');
    }

    const apiReq = req.clone({
      url: `${apiBaseUrl}${urlPath}`,
    });
    return next(apiReq);
  }

  return next(req);
}

export function languageInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  let language =
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('lang') || 'en'
      : 'en';

  // Normalize and whitelist language to avoid invalid headers
  // from legacy/localized values (e.g. "Türkçe", "tr-TR", etc.).
  const normalized = String(language).trim().toLowerCase().replace('_', '-');
  if (normalized.startsWith('tr')) {
    language = 'tr';
  } else if (normalized.startsWith('ar')) {
    language = 'ar';
  } else if (normalized.startsWith('en')) {
    language = 'en';
  } else {
    language = 'en';
  }

  const modifiedReq = req.clone({
    setHeaders: {
      'Accept-Language': language,
    },
  });

  return next(modifiedReq);
}
