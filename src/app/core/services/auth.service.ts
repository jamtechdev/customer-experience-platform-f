import { Injectable, inject, signal, computed, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject, of, filter, take } from 'rxjs';
import { User, AuthResponse, LoginRequest, ApiResponse, UserRole } from '../models';
import { environment } from '../../../environments/environment';
import { LoaderService } from './loader.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly loaderService = inject(LoaderService);
  
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly currentUser = signal<User | null>(null);
  readonly _isInitialized = signal<boolean>(false); // Made public for guard access
  private _isInitializing = false;

  readonly isAuthenticated = computed(() => {
    const hasToken = this.getToken() !== null;
    const hasUser = !!this.currentUser();
    const isInitialized = this._isInitialized();

    // After initialization, require both token and user
    if (isInitialized) {
      return hasToken && hasUser;
    }

    // During initialization, if token exists, consider authenticated temporarily
    // This prevents redirect loops during page refresh
    return hasToken;
  });

  // Observable that emits when auth state is ready (initialized)
  // Start with false, will be set to true after initialization
  readonly authReady$ = new BehaviorSubject<boolean>(false);
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  readonly isAnalyst = computed(() => this.currentUser()?.role === UserRole.ANALYST);
  readonly isViewer = computed(() => this.currentUser()?.role === UserRole.VIEWER);

  constructor() {
    // Initialize from storage only in browser
    // Use setTimeout to ensure initialization happens after Angular bootstrap
    if (isPlatformBrowser(this.platformId)) {
      // Initialize immediately for synchronous cases
      this.initializeAuth();
    } else {
      // For SSR, mark as ready immediately
      this._isInitialized.set(true);
      this.authReady$.next(true);
    }
  }

  private initializeAuth(): void {
    if (this._isInitializing) return;
    this._isInitializing = true;

    const token = this.getToken();
    const storedUser = this.getStoredUser();

    if (token && storedUser) {
      // Both token and user exist, initialize immediately
      this.currentUser.set(storedUser);
      this.currentUserSubject.next(storedUser);
      this._isInitialized.set(true);
      this._isInitializing = false;
      this.authReady$.next(true);
    } else if (token && !storedUser) {
      // Token exists but user data is missing, try to get profile
      // Set ready immediately to prevent navigation blocking
      // This allows guards to check and allow access while profile loads
      this._isInitialized.set(true);
      this._isInitializing = false;
      this.authReady$.next(true);
      
      // Load profile in background
      this.getProfile().subscribe({
        next: () => {
          // Profile loaded successfully
        },
        error: () => {
          // If profile fetch fails, clear invalid token
          this.logout();
        }
      });
    } else {
      // No token, clear any stale user data and initialize immediately
      this.currentUser.set(null);
      this.currentUserSubject.next(null);
      this._isInitialized.set(true);
      this._isInitializing = false;
      this.authReady$.next(true);
    }
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private get apiBase(): string {
    return environment.apiUrl || '/api';
  }

  register(data: { email: string; password: string; firstName: string; lastName: string; role?: string }): Observable<ApiResponse<AuthResponse>> {
    this.loaderService.show('Creating account...');
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiBase}/auth/register`, data).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Auto-login after successful registration
          this.setSession(response.data);
        }
        this.loaderService.hide();
      }),
      catchError(error => {
        console.error('Registration error:', error);
        this.loaderService.hide();
        return throwError(() => error);
      })
    );
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    this.loaderService.show('Signing in...');
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiBase}/auth/login`, credentials).pipe(
      tap(response => {
        // #region agent log
        try {
          fetch('http://127.0.0.1:7282/ingest/6408ea06-d2e1-4105-95ab-8cd74cbff087', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': '2f0b58',
            },
            body: JSON.stringify({
              sessionId: '2f0b58',
              runId: 'pre-fix',
              hypothesisId: 'H1',
              location: 'auth.service.ts:login',
              message: 'Login response (debug session 2f0b58)',
              data: {
                success: response?.success ?? null,
                hasData: !!response?.data,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        } catch {
          // ignore logging errors
        }
        // #endregion agent log
        // #region agent log
        fetch('http://127.0.0.1:7282/ingest/6408ea06-d2e1-4105-95ab-8cd74cbff087', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': 'a75a41',
          },
          body: JSON.stringify({
            sessionId: 'a75a41',
            runId: 'pre-fix',
            hypothesisId: 'H1',
            location: 'auth.service.ts:login',
            message: 'Login response received',
            data: {
              success: response?.success ?? null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log
        if (response.success) {
          this.setSession(response.data);
        }
        this.loaderService.hide();
      }),
      catchError(error => {
        console.error('Login error:', error);
        this.loaderService.hide();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUser.set(null);
    this.currentUserSubject.next(null);
    // Redirect to landing page after logout
    this.router.navigate(['/'], { replaceUrl: true });
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = this.isBrowser ? localStorage.getItem(this.REFRESH_TOKEN_KEY) : null;
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiBase}/auth/refresh`, { refreshToken }).pipe(
      tap(response => {
        if (response.success) {
          this.setSession(response.data);
        }
      })
    );
  }

  getToken(): string | null {
    const token = this.isBrowser ? localStorage.getItem(this.TOKEN_KEY) : null;
    // #region agent log
    try {
      fetch('http://127.0.0.1:7282/ingest/6408ea06-d2e1-4105-95ab-8cd74cbff087', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'a75a41',
        },
        body: JSON.stringify({
          sessionId: 'a75a41',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'auth.service.ts:getToken',
          message: 'Token read from storage',
          data: {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {
      // ignore logging errors
    }
    // #endregion agent log
    return token;
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.ANALYST && (permission.includes('read') || permission.includes('write'))) return true;
    return user.permissions.includes(permission);
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.includes(user.role);
  }

  setSession(authResult: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(this.TOKEN_KEY, authResult.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, authResult.refreshToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.user));
    }
    // #region agent log
    try {
      const accessToken = this.isBrowser ? localStorage.getItem(this.TOKEN_KEY) : null;
      fetch('http://127.0.0.1:7282/ingest/6408ea06-d2e1-4105-95ab-8cd74cbff087', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '2f0b58',
        },
        body: JSON.stringify({
          sessionId: '2f0b58',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'auth.service.ts:setSession',
          message: 'Session stored in browser (debug session 2f0b58)',
          data: {
            hasAccessToken: !!accessToken,
            accessTokenLength: accessToken ? accessToken.length : 0,
            hasUser: !!authResult?.user,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {
      // ignore logging errors
    }
    // #endregion agent log
    // #region agent log
    try {
      fetch('http://127.0.0.1:7282/ingest/6408ea06-d2e1-4105-95ab-8cd74cbff087', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'a75a41',
        },
        body: JSON.stringify({
          sessionId: 'a75a41',
          runId: 'pre-fix',
          hypothesisId: 'H3',
          location: 'auth.service.ts:setSession',
          message: 'Session set with user',
          data: {
            hasUser: !!authResult?.user,
            userId: authResult?.user?.id ?? null,
            userRole: authResult?.user?.role ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {
      // ignore logging errors
    }
    // #endregion agent log
    this.currentUser.set(authResult.user);
    this.currentUserSubject.next(authResult.user);
  }

  forgotPassword(email: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.apiBase}/auth/forgot-password`, { email }).pipe(
      catchError(error => {
        console.error('Forgot password error:', error);
        return throwError(() => error);
      })
    );
  }

  resetPassword(data: { email: string; otp: string; newPassword: string }): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.apiBase}/auth/reset-password`, data).pipe(
      catchError(error => {
        console.error('Reset password error:', error);
        return throwError(() => error);
      })
    );
  }

  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiBase}/auth/profile`).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
          this.currentUserSubject.next(response.data);
          if (this.isBrowser) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
          }
        }
      }),
      catchError(error => {
        console.error('Get profile error:', error);
        // If profile fetch fails (invalid token), clear session
        if (error.status === 401 || error.status === 403) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  private getStoredUser(): User | null {
    if (!this.isBrowser) return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}
