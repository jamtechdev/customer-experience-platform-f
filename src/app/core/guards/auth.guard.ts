import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn, CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';
import { map, take, filter, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First, check token immediately (synchronous check)
  const hasToken = authService.getToken() !== null;

  // If token exists, allow access immediately - don't wait for initialization
  // This prevents redirect on page refresh
  if (hasToken) {
    const currentUser = authService.currentUser();
    const isInitialized = authService._isInitialized();

    // If user not loaded yet and we're initialized, try to load it in background
    if (!currentUser && isInitialized) {
      // Load profile in background without blocking
      authService.getProfile().subscribe({
        next: () => {
          // User loaded successfully - user stays on current page
        },
        error: () => {
          // Invalid token - clear session and redirect to login
          authService.logout();
          router.navigate(['/login'], { replaceUrl: true });
        }
      });
    }
  // Always allow access if token exists - prevents redirect on refresh
    return true;
  }

  // No token - redirect to login immediately for protected routes
  if (state.url.startsWith('/app')) {
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  // For non-protected routes, wait for initialization
  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    timeout(2000), // 2 second timeout
    catchError(() => {
      // If timeout and accessing protected route, redirect to login
      if (state.url.startsWith('/app')) {
        router.navigate(['/login'], { replaceUrl: true });
        return of(false);
      }
      return of(false);
    }),
    map(() => {
      // After initialization, check token again
      const tokenAfterInit = authService.getToken() !== null;

      // If no token and accessing protected route, redirect to login
      if (!tokenAfterInit && state.url.startsWith('/app')) {
        router.navigate(['/login'], { replaceUrl: true });
        return false;
      }

      return tokenAfterInit;
    })
  );
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Wait for auth initialization to complete (with timeout to prevent hanging)
  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    timeout(5000), // 5 second timeout
    catchError(() => {
      // If timeout, allow access and let auth service handle it
      return of(true);
    }),
    map(() => {
      const hasToken = authService.getToken() !== null;
      const isAuthenticated = authService.isAuthenticated();

      // If no token, allow access to guest routes
      if (!hasToken) {
        return true;
      }

      // If token exists but user not fully loaded yet, allow access temporarily
      if (hasToken && !isAuthenticated) {
        return true;
      }

      // User is fully authenticated, redirect to dashboard
      // Always redirect authenticated users away from login/signup pages
      if (isAuthenticated) {
        // Allow landing page access
        if (state.url === '/' || state.url === '') {
          return true;
        }
        // If user has token and is trying to access login/signup, redirect to dashboard
        if (state.url === '/login' || state.url === '/signup' || state.url === '/forgot-password' || state.url === '/reset-password') {
          router.navigate(['/app/dashboard'], { replaceUrl: true });
          return false;
        }
        // For other guest routes, allow access
        return true;
      }

      return true;
    })
  );
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as UserRole[];
  
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (authService.hasRole(requiredRoles)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

export const permissionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredPermission = route.data['permission'] as string;
  
  if (!requiredPermission) {
    return true;
  }

  if (authService.hasPermission(requiredPermission)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

export const checkerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  
  // Only admin can access checker routes (or we can remove this guard if not needed)
  if (user && user.role === UserRole.ADMIN) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
