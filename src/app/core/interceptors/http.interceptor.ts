import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpRequest, HttpErrorResponse, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { LoaderService } from '../services/loader.service';

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

function shouldSuppressErrorToast(req: HttpRequest<unknown>): boolean {
  if (!isBackendApiRequest(req)) return true;
  if (isAuthFormEndpoint(req.url)) return true;
  return false;
}

function extractBodyMessage(error: HttpErrorResponse): string {
  let errorMessage = 'An error occurred';
  if (error.error) {
    if (typeof error.error === 'string') {
      errorMessage = error.error;
    } else if ((error.error as { message?: string }).message) {
      errorMessage = (error.error as { message: string }).message;
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
    console.error('Server error:', {
      url: logUrl,
      method: req.method,
      message: errorMessage,
      details: errorDetails,
    });
    errorMessage = errorMessage || 'Server error. Please try again later.';
  }

  if (error.status === 0) {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.warn('API unreachable:', logUrl, '(is the backend running?)');
    }
    errorMessage = 'Cannot reach API. Start the backend server to load data.';
  }

  // Avoid misleading provider-account text coming from third-party sync endpoints.
  if (CONNECTED_ACCOUNTS_MSG_RE.test(errorMessage)) {
    errorMessage = 'No source profiles available to sync right now.';
  }

  return errorMessage;
}

function notifyHttpError(
  snackBar: MatSnackBar,
  platformId: object,
  message: string,
  req: HttpRequest<unknown>
): void {
  if (!isPlatformBrowser(platformId)) return;
  if (shouldSuppressErrorToast(req)) return;
  const text =
    message.length > SNACKBAR_MAX_LEN ? `${message.slice(0, SNACKBAR_MAX_LEN)}…` : message;
  snackBar.open(text, 'Close', {
    duration: 6000,
    panelClass: ['http-error-snackbar'],
  });
}

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Don't add token to external requests
  const isApiRequest = req.url.startsWith('/api') || req.url.startsWith(environment.apiUrl);
  if (!isApiRequest) {
    return next(req);
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
}

export function loaderInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const loader = inject(LoaderService);

  const base = environment.apiUrl || '';
  const isBackendApi = req.url.startsWith('/api') || (base !== '' && req.url.startsWith(base));

  if (!isBackendApi) {
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
  const authService = inject(AuthService);
  const snackBar = inject(MatSnackBar);
  const platformId = inject(PLATFORM_ID);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const isRefreshRequest = req.url.includes('/auth/refresh');
        if (isRefreshRequest) {
          const errorMessage = normalizeHttpErrorMessage(error, req);
          authService.logout();
          notifyHttpError(snackBar, platformId, errorMessage, req);
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
          notifyHttpError(snackBar, platformId, errorMessage, req);
          return throwError(() => enhancedError);
        }
        return authService.refreshToken().pipe(
          switchMap(() => {
            const token = authService.getToken();
            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            });
            return next(newReq);
          }),
          catchError((refreshError: HttpErrorResponse) => {
            authService.logout();
            const refreshMsg = normalizeHttpErrorMessage(refreshError, req);
            const sessionMsg =
              refreshMsg && refreshMsg !== 'An error occurred'
                ? refreshMsg
                : 'Session expired. Please sign in again.';
            notifyHttpError(snackBar, platformId, sessionMsg, req);
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

      notifyHttpError(snackBar, platformId, errorMessage, req);

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
  let language = 'en';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      language =
        localStorage.getItem('preferredLanguage') ||
        localStorage.getItem('language') ||
        'en';
    } catch {
      language = 'en';
    }
  }

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
