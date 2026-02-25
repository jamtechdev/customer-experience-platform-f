import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
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
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
}

export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Extract error message from response
      let errorMessage = 'An error occurred';
      let errorDetails: any = null;

      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
          errorDetails = error.error;
        } else if (error.error.error) {
          errorMessage = error.error.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (error.status === 401) {
        // Token expired, try to refresh
        return authService.refreshToken().pipe(
          switchMap(() => {
            const token = authService.getToken();
            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
            return next(newReq);
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status === 403) {
        // Forbidden - user doesn't have permission
        // Only log in development
        if (!environment.production) {
          console.error('Access forbidden:', errorMessage, errorDetails);
        }
        errorMessage = errorMessage || 'You do not have permission to perform this action.';
      }

      if (error.status === 404) {
        // Only log in development - 404s are common and not always errors
        if (!environment.production) {
          console.warn('Resource not found:', req.url);
        }
        errorMessage = errorMessage || 'The requested resource was not found.';
      }

      if (error.status === 500) {
        // Log server errors
        console.error('Server error:', {
          url: req.url,
          method: req.method,
          message: errorMessage,
          details: errorDetails
        });
        errorMessage = errorMessage || 'Server error. Please try again later.';
      }

      if (error.status === 0) {
        // Network error or CORS issue
        console.error('Network error:', req.url);
        errorMessage = 'Network error. Please check your internet connection.';
      }

      // Create a more detailed error object
      const enhancedError = new HttpErrorResponse({
        error: {
          ...error.error,
          message: errorMessage,
          originalError: error.error
        },
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url || req.url
      });

      return throwError(() => enhancedError);
    })
  );
}

export function apiUrlInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  // If URL already starts with http, it's an absolute URL, don't modify
  if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
    return next(req);
  }

  // Prepend API URL if request starts with /api
  if (req.url.startsWith('/api')) {
    // Remove /api prefix from the URL if environment.apiUrl already includes it
    let urlPath = req.url;
    const apiBaseUrl = environment.apiUrl;

    // If apiBaseUrl already ends with /api, remove /api from the request URL
    if (apiBaseUrl.endsWith('/api')) {
      urlPath = req.url.replace(/^\/api/, '');
    }

    const apiReq = req.clone({
      url: `${apiBaseUrl}${urlPath}`
    });
    return next(apiReq);
  }
  
  return next(req);
}

export function languageInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  // Safely get language from localStorage (only in browser)
  let language = 'tr';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      language = localStorage.getItem('language') || 'tr';
    } catch (e) {
      // localStorage not available, use default
      language = 'tr';
    }
  }
  
  const modifiedReq = req.clone({
    setHeaders: {
      'Accept-Language': language
    }
  });
  
  return next(modifiedReq);
}
