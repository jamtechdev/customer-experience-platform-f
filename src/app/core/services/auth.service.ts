import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Observable,
  tap,
  catchError,
  throwError,
  BehaviorSubject,
  of,
  map,
  finalize,
  shareReplay,
} from 'rxjs';
import { User, AuthResponse, LoginRequest, ApiResponse, UserRole } from '../models';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST } from '../http/http-context';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  /** In-memory only — never persisted (XSS-safe). HTTP uses httpOnly cookie. */
  private accessToken: string | null = null;
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly currentUser = signal<User | null>(null);
  readonly _isInitialized = signal<boolean>(false);
  private _isInitializing = false;
  private _isHydratingProfile = signal<boolean>(false);
  private ensureSessionInFlight: Observable<boolean> | null = null;
  private refreshInFlight: Observable<ApiResponse<AuthResponse>> | null = null;
  private sessionEndInProgress = false;

  /** True only when we have a loaded user — never while probing (avoids blink / fake logged-in). */
  readonly isAuthenticated = computed(() => !!this.currentUser());

  readonly authReady$ = new BehaviorSubject<boolean>(false);
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);

  constructor() {
    this.purgeLegacyStoredToken();
    this._isInitialized.set(true);
    this.authReady$.next(true);
  }

  hasActiveSessionHint(): boolean {
    return !!this.accessToken || !!this.currentUser();
  }

  ensureSession(): Observable<boolean> {
    if (this.currentUser()) return of(true);
    if (!isPlatformBrowser(this.platformId)) return of(false);
    if (this.ensureSessionInFlight) return this.ensureSessionInFlight;

    this._isInitializing = true;
    this._isHydratingProfile.set(true);

    this.ensureSessionInFlight = this.getProfile().pipe(
      map(() => true),
      catchError(() => {
        this.clearSessionState();
        return of(false);
      }),
      finalize(() => {
        this._isHydratingProfile.set(false);
        this._isInitializing = false;
        this.authReady$.next(true);
        this.ensureSessionInFlight = null;
      }),
      shareReplay(1)
    );
    return this.ensureSessionInFlight;
  }

  private clearSessionState(): void {
    this.currentUser.set(null);
    this.currentUserSubject.next(null);
    this._isHydratingProfile.set(false);
    this.accessToken = null;
    this.purgeLegacyStoredToken();
  }

  private purgeLegacyStoredToken(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      sessionStorage.removeItem(environment.auth.tokenKey);
    } catch {
      /* ignore */
    }
  }

  private get apiBase(): string {
    return environment.apiUrl || '/api';
  }

  private silentHttpContext(): HttpContext {
    return new HttpContext().set(SKIP_ERROR_TOAST, true);
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiBase}/auth/login`, credentials).pipe(
      tap((response) => {
        if (response.success && response.data?.user) {
          this.sessionEndInProgress = false;
          this.setSession(response.data);
        }
      }),
      catchError((error) => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /** One clean sign-out — no error toasts, no duplicate logout messages. */
  logout(): void {
    if (this.sessionEndInProgress) {
      this.clearSessionState();
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.sessionEndInProgress = true;
    this.clearSessionState();
    if (isPlatformBrowser(this.platformId)) {
      this.http
        .post<ApiResponse<null>>(`${this.apiBase}/auth/logout`, {}, { context: this.silentHttpContext() })
        .subscribe({
          error: () => undefined,
          complete: () => {
            this.sessionEndInProgress = false;
          },
        });
    } else {
      this.sessionEndInProgress = false;
    }
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  /** End session once without toast spam (401 refresh failures). */
  endSessionQuietly(redirectToLogin = true): void {
    if (this.sessionEndInProgress) {
      this.clearSessionState();
      return;
    }
    this.sessionEndInProgress = true;
    this.clearSessionState();
    if (isPlatformBrowser(this.platformId)) {
      this.http
        .post<ApiResponse<null>>(`${this.apiBase}/auth/logout`, {}, { context: this.silentHttpContext() })
        .subscribe({
          error: () => undefined,
          complete: () => {
            this.sessionEndInProgress = false;
          },
        });
    } else {
      this.sessionEndInProgress = false;
    }
    if (redirectToLogin && isPlatformBrowser(this.platformId)) {
      if (!this.router.url.startsWith('/login')) {
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.http
      .post<ApiResponse<AuthResponse>>(
        `${this.apiBase}/auth/refresh`,
        {},
        { context: this.silentHttpContext() }
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data?.user) {
            this.sessionEndInProgress = false;
            this.setSession(response.data);
          }
        }),
        finalize(() => {
          this.refreshInFlight = null;
        }),
        shareReplay(1)
      );
    return this.refreshInFlight;
  }

  getToken(): string | null {
    return this.accessToken;
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes(permission);
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.includes(user.role);
  }

  setSession(authResult: AuthResponse): void {
    const token = authResult.accessToken || (authResult as { token?: string }).token || null;
    this.accessToken = token;
    this.purgeLegacyStoredToken();
    this.currentUser.set(authResult.user ?? null);
    this.currentUserSubject.next(authResult.user ?? null);
    this._isHydratingProfile.set(false);
  }

  forgotPassword(email: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.apiBase}/auth/forgot-password`, { email }).pipe(
      catchError((error) => {
        console.error('Forgot password error:', error);
        return throwError(() => error);
      })
    );
  }

  resetPassword(data: {
    email: string;
    otp: string;
    newPassword: string;
  }): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.apiBase}/auth/reset-password`, data).pipe(
      catchError((error) => {
        console.error('Reset password error:', error);
        return throwError(() => error);
      })
    );
  }

  getProfile(): Observable<ApiResponse<User>> {
    return this.http
      .get<ApiResponse<User>>(`${this.apiBase}/auth/profile`, { context: this.silentHttpContext() })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.currentUser.set(response.data);
            this.currentUserSubject.next(response.data);
          }
        }),
        catchError((error) => {
          if (error.status === 401 || error.status === 403) {
            this.clearSessionState();
          } else {
            console.error('Get profile error:', error);
          }
          return throwError(() => error);
        })
      );
  }
}
