import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject, of, map, finalize } from 'rxjs';
import { User, AuthResponse, LoginRequest, ApiResponse, UserRole } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly currentUser = signal<User | null>(null);
  readonly _isInitialized = signal<boolean>(false); // Made public for guard access
  private _isInitializing = false;
  private _isHydratingProfile = signal<boolean>(false);

  readonly isAuthenticated = computed(() => {
    const hasUser = !!this.currentUser();
    const isHydratingProfile = this._isHydratingProfile();
    return hasUser || isHydratingProfile;
  });

  // Observable that emits when auth state is ready (initialized)
  // Start with false, will be set to true after initialization
  readonly authReady$ = new BehaviorSubject<boolean>(false);
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  readonly isUser = computed(() => this.currentUser()?.role === UserRole.USER);

  constructor() {
    // Session validation is intentionally guard-driven. Public pages such as
    // login must not call /auth/profile because no cookie yet means a normal 401.
    this._isInitialized.set(true);
    this.authReady$.next(true);
  }

  ensureSession(): Observable<boolean> {
    if (this.currentUser()) return of(true);
    if (!isPlatformBrowser(this.platformId)) return of(false);
    this._isInitializing = true;
    this._isHydratingProfile.set(true);

    return this.getProfile().pipe(
      map(() => true),
      catchError(() => {
        this.clearSessionState();
        return of(false);
      }),
      finalize(() => {
        this._isHydratingProfile.set(false);
        this._isInitializing = false;
        this.authReady$.next(true);
      })
    );
  }

  private clearSessionState(): void {
    this.currentUser.set(null);
    this.currentUserSubject.next(null);
    this._isHydratingProfile.set(false);
  }

  private get apiBase(): string {
    return environment.apiUrl || '/api';
  }

  register(data: { email: string; password: string; firstName: string; lastName: string; role?: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiBase}/auth/register`, data).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setSession(response.data);
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiBase}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.success && response.data?.user) {
          this.setSession(response.data);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.http.post<ApiResponse<null>>(`${this.apiBase}/auth/logout`, {}).subscribe({
      error: () => {
        /* Clear local state even if the server session is already gone. */
      },
    });
    this.clearSessionState();
    // Redirect to landing page after logout
    this.router.navigate(['/'], { replaceUrl: true });
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiBase}/auth/refresh`, {}).pipe(
      tap(response => {
        if (response.success && response.data?.user) {
          this.setSession(response.data);
        }
      })
    );
  }

  getToken(): string | null {
    return null;
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.USER && (permission.includes('read') || permission.includes('write'))) return true;
    return user.permissions.includes(permission);
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.includes(user.role);
  }

  setSession(authResult: AuthResponse): void {
    this.currentUser.set(authResult.user ?? null);
    this.currentUserSubject.next(authResult.user ?? null);
    this._isHydratingProfile.set(false);
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
        }
      }),
      catchError(error => {
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
