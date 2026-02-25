import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject, of } from 'rxjs';
import { User, AuthResponse, LoginRequest, ApiResponse, UserRole } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  readonly isMaker = computed(() => this.currentUser()?.role === UserRole.MAKER);
  readonly isChecker = computed(() => this.currentUser()?.role === UserRole.CHECKER);

  constructor() {
    // Initialize from storage only in browser
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = this.getStoredUser();
      this.currentUser.set(storedUser);
      this.currentUserSubject.next(storedUser);
    }
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  register(data: { email: string; password: string; firstName: string; lastName: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap(response => {
        if (response.success) {
  // Don't auto-login on registration, let user login manually
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.success) {
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
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUser.set(null);
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = this.isBrowser ? localStorage.getItem(this.REFRESH_TOKEN_KEY) : null;
    return this.http.post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap(response => {
        if (response.success) {
          this.setSession(response.data);
        }
      })
    );
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(this.TOKEN_KEY) : null;
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    
    if (user.role === UserRole.ADMIN) return true;
    return user.permissions.includes(permission);
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.includes(user.role);
  }

  private setSession(authResult: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(this.TOKEN_KEY, authResult.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, authResult.refreshToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.user));
    }
    this.currentUser.set(authResult.user);
    this.currentUserSubject.next(authResult.user);
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
